/*
  Granny Open Source - System 5

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we also added extra comments here so people can follow the route logic without guessing
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 5 - Basement Handoff */

var GC1_BASEMENT_DROP_GROUP = "gc1_basement_drop";
var GC1_BASEMENT_DROP_STEP = 0.13;
var GC1_BASEMENT_DROP_STAIR_STEP = 0.24;
var GC1_BASEMENT_DROP_REACHED = 0.18;
var GC1_BASEMENT_DROP_REACHED_SQ =
  GC1_BASEMENT_DROP_REACHED * GC1_BASEMENT_DROP_REACHED;
var GC1_BASEMENT_STAIR_MATCH_DIST = 2.35;
var GC1_BASEMENT_DROP_STAIRS = [
  [17.5, 56, 23.5],
  [17.5, 55, 22.5],
  [17.5, 54, 21.5],
  [17.5, 53, 20.5],
  [17.5, 52, 19.5],
  [17.5, 51, 18.5],
];
// this is the basement graph
// each string is one row and each character is one tile in the route map
//
// what the numbers mean here:
// 1 = blocked tile or wall
// 0 = normal walkable floor
// 4 = waypoint tile we can reuse for patrols or route helpers
// 5 = extra walkable helper tile if we ever mark one in later
//
// this file mostly exists for one job:
// get granny safely from the main floor stairs into the basement,
// then let her keep walking once she is down there
var GC1_BASEMENT_ROWS = [
  "1111111111111111",
  "1000000000000001",
  "1000000000000001",
  "1001111111111001",
  "1001111111110001",
  "1001111100000001",
  "1001111100000001",
  "1001111000400011",
  "1001110000000011",
  "1000000000010011",
  "1000000000011001",
  "1000001000011001",
  "1040000000000001",
  "1000000000000001",
  "1111111111111111",
];
var GC1_BASEMENT_BASE_X = 13.5;
var GC1_BASEMENT_BASE_Y = 51;
var GC1_BASEMENT_BASE_Z = 27.5;
var GC1_BASEMENT_CELL_BASE_X = GC1_BASEMENT_BASE_X - 0.5;
var GC1_BASEMENT_CELL_BASE_Z = GC1_BASEMENT_BASE_Z - 0.5;

globalThis.gc1BasementDropState = Object.assign(
  {
    active: false,
    route: null,
    routeIndex: 0,
    pending: null,
    taskId: null,
    walkableCache: null,
    prepTaskId: null,
    prepSerial: 0,
    prepared: null,
    entryTaskId: null,
    stairEntryCell: null,
    ascentPoints: null,
    waypointCells: null,
  },
  typeof globalThis.gc1BasementDropState === "object" &&
    globalThis.gc1BasementDropState
    ? globalThis.gc1BasementDropState
    : {},
);
var gc1BasementDropState = globalThis.gc1BasementDropState;

// tiny shared helper so we can read granny position from the GC cache when it exists
function gc1MobPos(mobId) {
  return typeof GC !== "undefined" && GC && typeof GC.getPos === "function"
    ? GC.getPos(mobId)
    : (function () {
        try {
          return api.getPosition(mobId);
        } catch (e) {}
        return null;
      })();
}

// turn a cell into a string key so objects can store it
function gc1BasementCellKey(x, z) {
  return x + "," + z;
}

// squared distance is cheaper than full distance when we only compare values
function gc1BasementPointDistSq(a, b) {
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function gc1BasementPointDist(a, b) {
  return Math.sqrt(gc1BasementPointDistSq(a, b));
}

// convert graph row and col into basement cell coords
function gc1BasementCellAt(row, col) {
  return [GC1_BASEMENT_CELL_BASE_X + col, GC1_BASEMENT_CELL_BASE_Z - row];
}

// only these tile types count as legal path tiles
function gc1BasementIsWalkable(cell) {
  return cell === "0" || cell === "4" || cell === "5";
}

// simple bounds so the path search does not wander outside the basement grid
function gc1BasementBounds() {
  return {
    minX: GC1_BASEMENT_CELL_BASE_X,
    maxX: GC1_BASEMENT_CELL_BASE_X + GC1_BASEMENT_ROWS[0].length - 1,
    minZ: GC1_BASEMENT_CELL_BASE_Z - GC1_BASEMENT_ROWS.length + 1,
    maxZ: GC1_BASEMENT_CELL_BASE_Z,
  };
}

// build a quick lookup table of every walkable basement tile
function gc1BasementBuildWalkable() {
  if (gc1BasementDropState.walkableCache)
    return gc1BasementDropState.walkableCache;
  var walkable = {};
  for (var row = 0; row < GC1_BASEMENT_ROWS.length; row++) {
    var cells = GC1_BASEMENT_ROWS[row];
    for (var col = 0; col < cells.length; col++) {
      if (!gc1BasementIsWalkable(cells.charAt(col))) continue;
      var cell = gc1BasementCellAt(row, col);
      walkable[gc1BasementCellKey(cell[0], cell[1])] = true;
    }
  }
  gc1BasementDropState.walkableCache = walkable;
  return walkable;
}

// if a target lands inside a wall, scan outward until we find the nearest usable tile
function gc1BasementNearestWalkable(targetCell, walkable, maxRadius) {
  if (!targetCell || !walkable) return null;
  var tx = targetCell[0],
    tz = targetCell[1];
  if (walkable[gc1BasementCellKey(tx, tz)]) return [tx, tz];
  maxRadius = maxRadius || 4;
  for (var radius = 1; radius <= maxRadius; radius++) {
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dz = -radius; dz <= radius; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        var x = tx + dx,
          z = tz + dz;
        if (walkable[gc1BasementCellKey(x, z)]) return [x, z];
      }
    }
  }
  return null;
}

// diagonals are only allowed when both side tiles are also open
function gc1BasementCanStep(task, x, z, nx, nz) {
  if (!task.walkable[gc1BasementCellKey(nx, nz)]) return false;
  if (nx === x || nz === z) return true;
  return !!(
    task.walkable[gc1BasementCellKey(nx, z)] &&
    task.walkable[gc1BasementCellKey(x, nz)]
  );
}

// A* guess cost
// this helps the search prefer cells that are closer to the goal
function gc1BasementHeuristic(x, z, gx, gz) {
  var dx = Math.abs(gx - x),
    dz = Math.abs(gz - z),
    diag = Math.min(dx, dz);
  return diag * 1.41421356237 + (Math.max(dx, dz) - diag);
}

// once A* reaches the goal, walk backward through cameFrom and rebuild the route
function gc1BasementBuildPath(task, endKey) {
  var path = [],
    key = endKey;
  while (key) {
    var parts = key.split(",");
    path.push([Number(parts[0]), Number(parts[1])]);
    key = task.cameFrom[key] || null;
  }
  path.reverse();
  return path;
}

// remove straight line spam so the final route is shorter and easier to move along
function gc1BasementCompressPath(path) {
  if (!path || path.length <= 2) return path;
  var out = [path[0]],
    lastDx = path[1][0] - path[0][0],
    lastDz = path[1][1] - path[0][1];
  for (var i = 2; i < path.length; i++) {
    var dx = path[i][0] - path[i - 1][0],
      dz = path[i][1] - path[i - 1][1];
    if (dx !== lastDx || dz !== lastDz) {
      out.push(path[i - 1]);
      lastDx = dx;
      lastDz = dz;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

// pick the best open cell so A* can keep expanding from the cheapest choice
function gc1BasementPopBestOpen(task) {
  if (!task.open.length) return null;
  var bestIndex = 0,
    bestKey = task.open[0],
    bestScore = task.fScore[bestKey];
  for (var i = 1; i < task.open.length; i++) {
    var key = task.open[i],
      score = task.fScore[key];
    if (score < bestScore) {
      bestIndex = i;
      bestKey = key;
      bestScore = score;
    }
  }
  task.open.splice(bestIndex, 1);
  delete task.openSet[bestKey];
  return bestKey;
}

// this is the full basement A* search
// startCell = where granny begins on the basement graph
// goalCell = where we want her to end up
function gc1BasementBuildFloorPath(startCell, goalCell) {
  if (!startCell || !goalCell) return null;
  var task = {
    walkable: gc1BasementBuildWalkable(),
    open: [gc1BasementCellKey(startCell[0], startCell[1])],
    openSet: {},
    cameFrom: {},
    gScore: {},
    fScore: {},
    goal: goalCell.slice(),
    bounds: gc1BasementBounds(),
  };
  var startKey = task.open[0],
    goalKey = gc1BasementCellKey(goalCell[0], goalCell[1]);
  task.openSet[startKey] = true;
  task.gScore[startKey] = 0;
  task.fScore[startKey] = gc1BasementHeuristic(
    startCell[0],
    startCell[1],
    goalCell[0],
    goalCell[1],
  );
  while (task.open.length) {
    var bestKey = gc1BasementPopBestOpen(task);
    if (!bestKey) break;
    if (bestKey === goalKey)
      return gc1BasementCompressPath(gc1BasementBuildPath(task, goalKey));
    var parts = bestKey.split(","),
      x = Number(parts[0]),
      z = Number(parts[1]);
    for (var d = 0; d < GC1_DIRS.length; d++) {
      var dir = GC1_DIRS[d],
        nx = x + dir[0],
        nz = z + dir[1];
      if (
        nx < task.bounds.minX ||
        nx > task.bounds.maxX ||
        nz < task.bounds.minZ ||
        nz > task.bounds.maxZ
      )
        continue;
      if (!gc1BasementCanStep(task, x, z, nx, nz)) continue;
      var neighborKey = gc1BasementCellKey(nx, nz),
        tentative = task.gScore[bestKey] + dir[2];
      if (
        task.gScore[neighborKey] !== undefined &&
        tentative >= task.gScore[neighborKey]
      )
        continue;
      task.cameFrom[neighborKey] = bestKey;
      task.gScore[neighborKey] = tentative;
      task.fScore[neighborKey] =
        tentative + gc1BasementHeuristic(nx, nz, task.goal[0], task.goal[1]);
      if (!task.openSet[neighborKey]) {
        task.open.push(neighborKey);
        task.openSet[neighborKey] = true;
      }
    }
  }
  return null;
}

// convert a basement graph cell back into a real world position
function gc1BasementWorldFromCell(cell) {
  return cell ? [cell[0] + 0.5, GC1_BASEMENT_BASE_Y, cell[1] + 0.5] : null;
}

// only push if this point is actually new so the route does not repeat nodes
function gc1BasementPushUnique(route, point) {
  if (!route || !point) return;
  if (!route.length) {
    route.push(point.slice());
    return;
  }
  var last = route[route.length - 1];
  if (
    Math.abs(last[0] - point[0]) < 0.001 &&
    Math.abs(last[1] - point[1]) < 0.001 &&
    Math.abs(last[2] - point[2]) < 0.001
  )
    return;
  route.push(point.slice());
}

// find which basement stair point granny is closest to right now
function gc1BasementClosestStairIndex(pos, maxDist) {
  if (!pos || pos.length < 3) return -1;
  var bestIndex = -1,
    bestDistSq = Infinity;
  for (var i = 0; i < GC1_BASEMENT_DROP_STAIRS.length; i++) {
    var distSq = gc1BasementPointDistSq(pos, GC1_BASEMENT_DROP_STAIRS[i]);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }
  if (typeof maxDist === "number" && bestDistSq > maxDist * maxDist) return -1;
  return bestIndex;
}

// main fallback target for basement handoff if another system did not provide one
function gc1GetBasementHandoffTarget() {
  if (typeof globalThis.gc1GetBasementMainFloorLandingPoint === "function") {
    var landing = globalThis.gc1GetBasementMainFloorLandingPoint();
    if (landing && landing.length >= 3) return landing.slice();
  }
  return GC1_BASEMENT_DROP_STAIRS_ROUTE_TOP();
}

function GC1_BASEMENT_DROP_STAIRS_ROUTE_TOP() {
  return GC1_BASEMENT_DROP_STAIRS[0].slice();
}

// this is the tile at the bottom area of the basement stairs where the floor route begins
function gc1GetBasementStairEntryCellLite() {
  if (gc1BasementDropState.stairEntryCell)
    return gc1BasementDropState.stairEntryCell.slice();
  var walkable = gc1BasementBuildWalkable();
  var stairEntryCell = gc1BasementNearestWalkable([17, 18], walkable, 2) || [
    17, 18,
  ];
  gc1BasementDropState.stairEntryCell = stairEntryCell.slice();
  return stairEntryCell;
}

function gc1IsBasementLevelPos(pos) {
  return !!(pos && pos.length >= 3 && pos[1] <= 53.5);
}

function gc1GetBasementStairBottomPoint() {
  return GC1_BASEMENT_DROP_STAIRS[GC1_BASEMENT_DROP_STAIRS.length - 1].slice();
}

// same stair points as the drop route, but reversed for going back upward later
function gc1BuildBasementAscentPoints() {
  if (gc1BasementDropState.ascentPoints) {
    var cached = [];
    for (var c = 0; c < gc1BasementDropState.ascentPoints.length; c++)
      cached.push(gc1BasementDropState.ascentPoints[c].slice());
    return cached;
  }
  var out = [];
  for (var i = GC1_BASEMENT_DROP_STAIRS.length - 1; i >= 0; i--)
    out.push(GC1_BASEMENT_DROP_STAIRS[i].slice());
  gc1BasementDropState.ascentPoints = out;
  return out;
}

// collect all 4 tiles so patrol logic can reuse them as interesting route targets
function gc1GetBasementWaypointCells() {
  if (gc1BasementDropState.waypointCells)
    return gc1BasementDropState.waypointCells;
  var out = [];
  for (var row = 0; row < GC1_BASEMENT_ROWS.length; row++) {
    var cells = GC1_BASEMENT_ROWS[row];
    for (var col = 0; col < cells.length; col++) {
      if (cells.charAt(col) === "4") out.push(gc1BasementCellAt(row, col));
    }
  }
  gc1BasementDropState.waypointCells = out;
  return out;
}

// phase 1
// take a fully built route and arm the basement mover with it
function gc1StartBasementRoute(mobId, pending, route, onDone) {
  if (!route || route.length < 2 || !mobId || !api.checkValid(mobId))
    return false;
  gc1StopBasementDropRoute();
  gc1BasementDropState.active = true;
  gc1BasementDropState.prepSerial = (pending && pending.serial) || 0;
  gc1BasementDropState.route = route;
  gc1BasementDropState.routeIndex = 1;
  gc1BasementDropState.pending = {
    mobId: mobId,
    serial: (pending && pending.serial) || 0,
    pos: pending && pending.pos ? pending.pos.slice() : null,
    meshId: (pending && pending.meshId) || null,
    meta: (pending && pending.meta) || null,
    onDone: typeof onDone === "function" ? onDone : null,
  };
  gc1BasementDropState.taskId = TS.run(
    gc1BasementDropMoveTick,
    50,
    GC1_BASEMENT_DROP_GROUP,
  );
  return true;
}

// small safety clone so retries do not mutate the original pending target object
function gc1BasementClonePending(pending) {
  if (!pending) return null;
  return {
    serial: pending.serial || 0,
    pos: pending.pos ? pending.pos.slice() : null,
    meshId: pending.meshId || null,
    meta: pending.meta || null,
  };
}

// if the target is a moving mesh target, refresh its live position before routing
function gc1BasementResolvePendingPos(pending) {
  if (!pending || !pending.pos) return null;
  if (pending.meshId) {
    var livePos = gc1MobPos(pending.meshId);
    if (livePos && livePos.length >= 3)
      return [livePos[0], livePos[1], livePos[2]];
  }
  return pending.pos.slice
    ? pending.pos.slice()
    : [pending.pos[0], pending.pos[1], pending.pos[2]];
}

// if the runtime is busy, retry the prep step a little later
function gc1QueueBasementPrepRetry(fn, delayMs) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return false;
  if (
    gc1BasementDropState.prepTaskId &&
    typeof TS.isTaskActive === "function" &&
    TS.isTaskActive(gc1BasementDropState.prepTaskId)
  )
    return true;
  gc1BasementDropState.prepTaskId = TS.run(
    function () {
      gc1BasementDropState.prepTaskId = null;
      fn();
    },
    delayMs || 200,
    GC1_BASEMENT_DROP_GROUP,
  );
  return true;
}

// quick "is prep already waiting?" check
function gc1BasementPrepTaskActive() {
  return !!(
    gc1BasementDropState.prepTaskId &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.isTaskActive === "function" &&
    TS.isTaskActive(gc1BasementDropState.prepTaskId)
  );
}

// same idea but for the stair entry handoff step
function gc1QueueBasementEntryRetry(mobId, pending, delayMs) {
  if (
    !mobId ||
    !pending ||
    typeof TS === "undefined" ||
    !TS ||
    typeof TS.run !== "function"
  )
    return false;
  if (
    gc1BasementDropState.entryTaskId &&
    typeof TS.isTaskActive === "function" &&
    TS.isTaskActive(gc1BasementDropState.entryTaskId)
  )
    return true;
  var delayedPending = gc1BasementClonePending(pending) || pending;
  gc1BasementDropState.entryTaskId = TS.run(
    function () {
      gc1BasementDropState.entryTaskId = null;
      gc1OnBasementDropEntryReached(mobId, delayedPending);
    },
    delayMs || 150,
    GC1_BASEMENT_DROP_GROUP,
  );
  return true;
}

// phase 2
// prebuild the basement only tail route from the stair entry tile to the final basement target
function gc1BuildPreparedBasementTail(pending) {
  if (!pending || !pending.pos) return null;
  var targetPos = gc1BasementResolvePendingPos(pending);
  if (!targetPos) return null;
  var walkable = gc1BasementBuildWalkable();
  var startCell = gc1GetBasementStairEntryCellLite();
  var goalCell = gc1BasementNearestWalkable(
    [Math.floor(targetPos[0]), Math.floor(targetPos[2])],
    walkable,
    4,
  );
  if (!startCell || !goalCell) return null;
  var tailRoute = gc1BuildBasementTailRouteFromCells(startCell, goalCell);
  if (!tailRoute) return null;
  gc1BasementPushUnique(tailRoute, [
    targetPos[0],
    GC1_BASEMENT_BASE_Y,
    targetPos[2],
  ]);
  return {
    serial: pending.serial || 0,
    meshId: pending.meshId || null,
    meta: pending.meta || null,
    targetPos: targetPos,
    tailRoute: tailRoute,
  };
}

// convert basement graph cells into world points after A* finishes
function gc1BuildBasementTailRouteFromCells(startCell, goalCell) {
  var floorPath = gc1BasementBuildFloorPath(startCell, goalCell);
  if (!floorPath || !floorPath.length) return null;
  var tailRoute = [];
  for (var j = 1; j < floorPath.length; j++) {
    var worldPoint = gc1BasementWorldFromCell(floorPath[j]);
    gc1BasementPushUnique(tailRoute, worldPoint);
  }
  return tailRoute;
}

// if granny is already in the basement, skip the stair drop and route directly on this floor
function gc1BeginBasementRouteToTarget(mobId, pending, currentPos) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  if (!pending.meta || pending.meta.floorId !== "basement") return false;
  currentPos = currentPos || gc1MobPos(mobId);
  var stairIndex = gc1BasementClosestStairIndex(
    currentPos,
    GC1_BASEMENT_STAIR_MATCH_DIST,
  );
  if (stairIndex >= 0 && !gc1IsBasementLevelPos(currentPos))
    return gc1OnBasementDropEntryReached(mobId, pending);
  if (!gc1IsBasementLevelPos(currentPos)) return false;
  var targetPos = gc1BasementResolvePendingPos(pending);
  if (!targetPos) return false;
  var walkable = gc1BasementBuildWalkable();
  var startCell = gc1BasementNearestWalkable(
    [Math.floor(currentPos[0]), Math.floor(currentPos[2])],
    walkable,
    4,
  );
  var goalCell = gc1BasementNearestWalkable(
    [Math.floor(targetPos[0]), Math.floor(targetPos[2])],
    walkable,
    4,
  );
  if (!startCell || !goalCell) return false;
  var tailRoute = gc1BuildBasementTailRouteFromCells(startCell, goalCell);
  if (!tailRoute) return false;
  var route = [];
  gc1BasementPushUnique(route, currentPos);
  for (var i = 0; i < tailRoute.length; i++)
    gc1BasementPushUnique(route, tailRoute[i]);
  gc1BasementPushUnique(route, [
    targetPos[0],
    GC1_BASEMENT_BASE_Y,
    targetPos[2],
  ]);
  var clonedPending = gc1BasementClonePending(pending) || pending;
  clonedPending.pos = targetPos.slice();
  return gc1StartBasementRoute(mobId, clonedPending, route, null);
}

// warm up the basement tail route early so the later handoff feels smoother
function gc1PrepareBasementDropPath(pending) {
  if (!pending || !pending.pos) return false;
  if (
    gc1BasementDropState.prepared &&
    gc1BasementDropState.prepared.serial === (pending.serial || 0)
  )
    return true;
  gc1BasementDropState.prepSerial = pending.serial || 0;
  if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
    var delayed = gc1BasementClonePending(pending);
    return gc1QueueBasementPrepRetry(function () {
      gc1PrepareBasementDropPath(delayed);
    }, 100);
  }
  var prepared = gc1BuildPreparedBasementTail(pending);
  if (prepared) {
    gc1BasementDropState.prepared = prepared;
    gc1BasementDropState.prepSerial = 0;
    return true;
  }
  return false;
}

// full reset for basement movement state
function gc1StopBasementDropRoute() {
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_BASEMENT_DROP_GROUP);
  gc1BasementDropState.active = false;
  gc1BasementDropState.route = null;
  gc1BasementDropState.routeIndex = 0;
  gc1BasementDropState.pending = null;
  gc1BasementDropState.taskId = null;
  gc1BasementDropState.prepTaskId = null;
  gc1BasementDropState.entryTaskId = null;
  gc1BasementDropState.prepSerial = 0;
  gc1BasementDropState.prepared = null;
  return true;
}

function gc1BasementDropMoveTick() {
  gc1BasementDropState.taskId = null;
  if (
    !gc1BasementDropState.active ||
    !gc1BasementDropState.route ||
    !gc1BasementDropState.pending
  )
    return false;
  var mobId = gc1BasementDropState.pending.mobId;
  if (!mobId || !api.checkValid(mobId)) {
    gc1StopBasementDropRoute();
    return false;
  }
  var nextPoint = gc1BasementDropState.route[gc1BasementDropState.routeIndex];
  if (!nextPoint) {
    gc1StopBasementDropRoute();
    return false;
  }
  var currentPos = gc1MobPos(mobId);
  if (!currentPos) {
    gc1BasementDropState.taskId = TS.run(
      gc1BasementDropMoveTick,
      50,
      GC1_BASEMENT_DROP_GROUP,
    );
    return true;
  }
  var dx = nextPoint[0] - currentPos[0];
  var dy = nextPoint[1] - currentPos[1];
  var dz = nextPoint[2] - currentPos[2];
  var distSq = dx * dx + dy * dy + dz * dz;
  if (distSq <= GC1_BASEMENT_DROP_REACHED_SQ) {
    try {
      api.setPosition(mobId, nextPoint[0], nextPoint[1], nextPoint[2]);
    } catch (e) {}
    gc1BasementDropState.routeIndex++;
    if (gc1BasementDropState.routeIndex >= gc1BasementDropState.route.length) {
      var finishedPending = gc1BasementDropState.pending;
      var done = finishedPending && finishedPending.onDone;
      gc1StopBasementDropRoute();
      if (typeof done === "function") return !!done(mobId);
      if (
        finishedPending &&
        typeof globalThis.gc1OnGrannyTargetReached === "function" &&
        globalThis.gc1OnGrannyTargetReached(mobId, finishedPending)
      )
        return true;
      if (
        finishedPending &&
        typeof globalThis.gc1ClearMainFloorMeshTarget === "function"
      )
        globalThis.gc1ClearMainFloorMeshTarget(finishedPending.serial || 0);
      return true;
    }
    gc1BasementDropState.taskId = TS.run(
      gc1BasementDropMoveTick,
      50,
      GC1_BASEMENT_DROP_GROUP,
    );
    return true;
  }
  var dist = Math.sqrt(distSq);
  var moveStep = GC1_BASEMENT_DROP_STEP;
  if (Math.abs(dy) > 0.2)
    moveStep = Math.max(moveStep, GC1_BASEMENT_DROP_STAIR_STEP);
  var step = Math.min(moveStep, dist);
  var inv = step / (dist || 1);
  var nextY = Math.abs(dy) > 0.2 ? nextPoint[1] : currentPos[1] + dy * inv;
  try {
    api.setPosition(
      mobId,
      currentPos[0] + dx * inv,
      nextY,
      currentPos[2] + dz * inv,
    );
    var meta =
      gc1BasementDropState.pending && gc1BasementDropState.pending.meta
        ? gc1BasementDropState.pending.meta
        : null;
    var facedPlayer =
      meta &&
      meta.kind === "alert" &&
      meta.playerId != null &&
      typeof globalThis.gc1VisionFacePlayer === "function" &&
      globalThis.gc1VisionFacePlayer(mobId, meta.playerId);
    if (!facedPlayer) api.setEntityRotation(mobId, 0, Math.atan2(dx, dz), 0);
  } catch (e) {}
  gc1BasementDropState.taskId = TS.run(
    gc1BasementDropMoveTick,
    50,
    GC1_BASEMENT_DROP_GROUP,
  );
  return true;
}

function gc1OnBasementDropEntryReached(mobId, pending) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  if (
    gc1BasementDropState.prepSerial &&
    pending.serial &&
    gc1BasementDropState.prepSerial === pending.serial
  ) {
    if (gc1BasementDropState.active) return true;
    if (gc1BasementPrepTaskActive())
      return gc1QueueBasementEntryRetry(mobId, pending, 150);
  }
  gc1PrepareBasementDropPath(pending);
  var prepared =
    gc1BasementDropState.prepared &&
    gc1BasementDropState.prepared.serial === (pending.serial || 0)
      ? gc1BasementDropState.prepared
      : null;
  if (!prepared) {
    gc1BasementDropState.prepSerial = pending.serial || 0;
    if (gc1BasementPrepTaskActive())
      return gc1QueueBasementEntryRetry(mobId, pending, 150);
    if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
      return gc1QueueBasementEntryRetry(mobId, pending, 150);
    }
    prepared = gc1BuildPreparedBasementTail(pending);
    if (!prepared) {
      if (gc1BasementPrepTaskActive())
        return gc1QueueBasementEntryRetry(mobId, pending, 150);
      return false;
    }
    gc1BasementDropState.prepared = prepared;
    gc1BasementDropState.prepSerial = 0;
  }
  var route = [];
  var currentPos = gc1MobPos(mobId);
  var stairStart = gc1BasementClosestStairIndex(
    currentPos,
    GC1_BASEMENT_STAIR_MATCH_DIST,
  );
  if (stairStart < 0) stairStart = 0;
  gc1BasementPushUnique(route, currentPos || GC1_BASEMENT_DROP_STAIRS[0]);
  for (var i = stairStart; i < GC1_BASEMENT_DROP_STAIRS.length; i++)
    gc1BasementPushUnique(route, GC1_BASEMENT_DROP_STAIRS[i]);
  for (var k = 0; k < prepared.tailRoute.length; k++)
    gc1BasementPushUnique(route, prepared.tailRoute[k]);
  var clonedPending = gc1BasementClonePending(pending) || pending;
  clonedPending.pos = prepared.targetPos.slice();
  gc1BasementDropState.prepared = null;
  return gc1StartBasementRoute(mobId, clonedPending, route, null);
}

function gc1BeginBasementExitToMainFloor(mobId, pending, currentPos) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  if (pending.meta && pending.meta.floorId === "basement") return false;
  currentPos = currentPos || gc1MobPos(mobId);
  if (!gc1IsBasementLevelPos(currentPos)) {
    var stairIndex = gc1BasementClosestStairIndex(
      currentPos,
      GC1_BASEMENT_STAIR_MATCH_DIST,
    );
    if (stairIndex < 0) return false;
    var stairRoute = [];
    gc1BasementPushUnique(stairRoute, currentPos);
    for (var s = stairIndex - 1; s >= 0; s--)
      gc1BasementPushUnique(stairRoute, GC1_BASEMENT_DROP_STAIRS[s]);
    var landingPoint =
      typeof globalThis.gc1GetBasementMainFloorLandingPoint === "function"
        ? globalThis.gc1GetBasementMainFloorLandingPoint()
        : GC1_BASEMENT_DROP_STAIRS_ROUTE_TOP();
    gc1BasementPushUnique(stairRoute, landingPoint);
    if (stairRoute.length < 2) {
      if (typeof globalThis.gc1ResumeMainFloorMeshTarget === "function")
        return !!globalThis.gc1ResumeMainFloorMeshTarget(pending);
      if (typeof globalThis.gc1SignalMainFloorMeshTarget === "function") {
        return !!globalThis.gc1SignalMainFloorMeshTarget(
          pending.pos,
          pending.meshId || null,
          pending.meta || null,
        );
      }
      return false;
    }
    return gc1StartBasementRoute(mobId, pending, stairRoute, function () {
      if (typeof globalThis.gc1SignalMainFloorMeshTarget === "function") {
        return !!globalThis.gc1SignalMainFloorMeshTarget(
          pending.pos,
          pending.meshId || null,
          pending.meta || null,
        );
      }
      return false;
    });
  }
  var walkable = gc1BasementBuildWalkable();
  var startCell = gc1BasementNearestWalkable(
    [Math.floor(currentPos[0]), Math.floor(currentPos[2])],
    walkable,
    4,
  );
  var goalCell = gc1GetBasementStairEntryCellLite();
  if (!startCell || !goalCell) return false;
  var floorPath = gc1BasementBuildFloorPath(startCell, goalCell);
  if (!floorPath || !floorPath.length) return false;
  var route = [];
  gc1BasementPushUnique(route, currentPos);
  for (var i = 1; i < floorPath.length; i++)
    gc1BasementPushUnique(route, gc1BasementWorldFromCell(floorPath[i]));
  var ascent = gc1BuildBasementAscentPoints();
  for (var j = 1; j < ascent.length; j++)
    gc1BasementPushUnique(route, ascent[j]);
  var landingPoint =
    typeof globalThis.gc1GetBasementMainFloorLandingPoint === "function"
      ? globalThis.gc1GetBasementMainFloorLandingPoint()
      : GC1_BASEMENT_DROP_STAIRS_ROUTE_TOP();
  gc1BasementPushUnique(route, landingPoint);
  return gc1StartBasementRoute(mobId, pending, route, function () {
    if (typeof globalThis.gc1SignalMainFloorMeshTarget === "function") {
      return !!globalThis.gc1SignalMainFloorMeshTarget(
        pending.pos,
        pending.meshId || null,
        pending.meta || null,
      );
    }
    return false;
  });
}

globalThis.gc1GetBasementHandoffTarget = gc1GetBasementHandoffTarget;
globalThis.gc1OnBasementDropEntryReached = gc1OnBasementDropEntryReached;
globalThis.gc1StopBasementDropRoute = gc1StopBasementDropRoute;
globalThis.gc1BeginBasementRouteToTarget = gc1BeginBasementRouteToTarget;
globalThis.gc1BeginBasementExitToMainFloor = gc1BeginBasementExitToMainFloor;
globalThis.gc1PrepareBasementDropPath = gc1PrepareBasementDropPath;
globalThis.gc1GetBasementWaypointCells = gc1GetBasementWaypointCells;
globalThis.gc1GetBasementFloorY = function () {
  return GC1_BASEMENT_BASE_Y;
};
globalThis.gc1IsBasementDropBusy = function () {
  if (gc1BasementDropState.active) return true;
  if (
    gc1BasementDropState.prepTaskId &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.isTaskActive === "function"
  )
    return !!TS.isTaskActive(gc1BasementDropState.prepTaskId);
  if (
    gc1BasementDropState.entryTaskId &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.isTaskActive === "function"
  )
    return !!TS.isTaskActive(gc1BasementDropState.entryTaskId);
  return false;
};
