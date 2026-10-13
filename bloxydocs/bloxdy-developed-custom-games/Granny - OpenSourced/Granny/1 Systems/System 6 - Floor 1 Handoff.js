/*
  Granny Open Source - System 6

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we also added extra comments here so people can follow the floor 1 route handoff step by step
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 6 - Floor 1 Handoff */
// (floor 1 took the longest and it was a pain 😔🙏)

var GC1_FLOOR1_GROUP = "gc1_floor1_handoff";
var GC1_FLOOR1_STEP = 0.13;
var GC1_FLOOR1_STAIR_STEP = 0.24;
var GC1_FLOOR1_REACHED = 0.18;
var GC1_FLOOR1_REACHED_SQ = GC1_FLOOR1_REACHED * GC1_FLOOR1_REACHED;
var GC1_FLOOR1_STAIR_REACHED = 0.32;
var GC1_FLOOR1_STAIR_REACHED_SQ =
  GC1_FLOOR1_STAIR_REACHED * GC1_FLOOR1_STAIR_REACHED;
var GC1_FLOOR1_SEARCH_NODES_PER_TICK = 8;
var GC1_FLOOR1_STAIR_MATCH_DIST = 2.35;
var GC1_FLOOR1_STAIRS = [
  [26.0, 57, 25.5],
  [26.0, 58, 24.5],
  [26.0, 59, 23.5],
  [26.0, 60, 22.5],
  [26.0, 61, 21.5],
  [26.0, 62, 20.5],
];
// this is the floor 1 graph
// each string is one row and each character is one tile in the route map
//
// what the numbers mean here:
// 1 = blocked tile or wall
// 0 = normal walkable floor
// 2 = stairs
// 3 = doorway / room entry tile
// 4 = waypoint tile we can reuse later
// 5 = extra walkable helper tile if we ever mark one in later
// 8 = closet or hide spot
//
// this file handles the handoff when granny needs to leave the main floor
// and continue pathing on floor 1 without the route snapping or breaking
var GC1_FLOOR1_ROWS = [
  "11111111111111111111111111111111111111",
  "11111111111111111111111111111111111111",
  "11111111111111111111111111111111111111",
  "11110000000011001111111111111111111111",
  "11110000000003001111111111111111111111",
  "11110000000011001111111111111111111111",
  "11110000001111001111111111111111111111",
  "11100040001111001111111111111111111111",
  "10000000001111001111111111110000001011",
  "11000000001111401111111111110000000011",
  "11000000000011001111111111100000000011",
  "11000000000011001111111221110004000011",
  "11000111110111001111111001110000000011",
  "11001111111111001111111001100000000111",
  "11001111111111000000000003000000001811",
  "11000111111111000000000001100000000111",
  "11000111111111131111113111111111111111",
  "11000111111111101111110111111111111111",
  "11000110011110000111100011111011111111",
  "11040110000000000111100011111011111111",
  "11000110000000000111100000000011111111",
  "11000110040000001111100000000011111111",
  "11000110000011111111100000000001111111",
  "11000000000111111111100000000000011111",
  "11110000000111111111100100100000111111",
  "11111111111111111111101810000111111111",
  "11111111111111111111111111111111111111",
  "11111111111111111111111111111111111111",
  "11111111111111111111111111111111111111",
];
var GC1_FLOOR1_BASE_X = 2.5;
var GC1_FLOOR1_BASE_Y = 62;
var GC1_FLOOR1_BASE_Z = 31.5;
var GC1_FLOOR1_CELL_BASE_X = GC1_FLOOR1_BASE_X - 0.5;
var GC1_FLOOR1_CELL_BASE_Z = GC1_FLOOR1_BASE_Z - 0.5;

globalThis.gc1Floor1State = Object.assign(
  {
    active: false,
    route: null,
    routeIndex: 0,
    pending: null,
    taskId: null,
    walkableCache: null,
    stairCells: null,
    prepTaskId: null,
    prepSerial: 0,
    prepared: null,
    search: null,
    searchTaskId: null,
    searchSerial: 0,
    stairEntryCell: null,
    descentPoints: null,
    waypointCells: null,
  },
  typeof globalThis.gc1Floor1State === "object" && globalThis.gc1Floor1State
    ? globalThis.gc1Floor1State
    : {},
);
var gc1Floor1State = globalThis.gc1Floor1State;
gc1Floor1State.walkableCache = null;
gc1Floor1State.stairCells = null;
gc1Floor1State.descentPoints = null;
gc1Floor1State.waypointCells = null;
gc1Floor1State.stairEntryCell = null;

// read mob pos from the GC cache when possible
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

// object key for a floor tile
function gc1Floor1Key(x, z) {
  return x + "," + z;
}

// convert row and col from the graph into floor 1 cell coords
function gc1Floor1CellAt(row, col) {
  return [GC1_FLOOR1_CELL_BASE_X + col, GC1_FLOOR1_CELL_BASE_Z - row];
}

// legal floor 1 path tiles
function gc1Floor1IsWalkable(cell) {
  return cell === "0" || cell === "3" || cell === "4" || cell === "5";
}

// hard map bounds for the path search
function gc1Floor1Bounds() {
  return {
    minX: GC1_FLOOR1_CELL_BASE_X,
    maxX: GC1_FLOOR1_CELL_BASE_X + GC1_FLOOR1_ROWS[0].length - 1,
    minZ: GC1_FLOOR1_CELL_BASE_Z - GC1_FLOOR1_ROWS.length + 1,
    maxZ: GC1_FLOOR1_CELL_BASE_Z,
  };
}

// build a fast lookup table of every tile granny can stand on
function gc1Floor1BuildWalkable() {
  if (gc1Floor1State.walkableCache) return gc1Floor1State.walkableCache;
  var walkable = {};
  for (var row = 0; row < GC1_FLOOR1_ROWS.length; row++) {
    var cells = GC1_FLOOR1_ROWS[row];
    for (var col = 0; col < cells.length; col++) {
      if (!gc1Floor1IsWalkable(cells.charAt(col))) continue;
      var cell = gc1Floor1CellAt(row, col);
      walkable[gc1Floor1Key(cell[0], cell[1])] = true;
    }
  }
  gc1Floor1State.walkableCache = walkable;
  return walkable;
}

// if the target is slightly off the graph, search nearby cells until we find a valid one
function gc1Floor1NearestWalkable(targetCell, walkable, maxRadius) {
  if (!targetCell || !walkable) return null;
  var tx = targetCell[0],
    tz = targetCell[1];
  if (walkable[gc1Floor1Key(tx, tz)]) return [tx, tz];
  maxRadius = maxRadius || 4;
  for (var radius = 1; radius <= maxRadius; radius++) {
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dz = -radius; dz <= radius; dz++) {
        if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
          return null;
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        var x = tx + dx,
          z = tz + dz;
        if (walkable[gc1Floor1Key(x, z)]) return [x, z];
      }
    }
  }
  return null;
}

// same diagonal rule as the other floor systems
// no cutting through corners if the side cells are blocked
function gc1Floor1CanStep(task, x, z, nx, nz) {
  if (!task.walkable[gc1Floor1Key(nx, nz)]) return false;
  if (nx === x || nz === z) return true;
  return !!(
    task.walkable[gc1Floor1Key(nx, z)] && task.walkable[gc1Floor1Key(x, nz)]
  );
}

// A* guess cost so the search heads toward the goal instead of exploring everything
function gc1Floor1Heuristic(x, z, gx, gz) {
  var dx = Math.abs(gx - x),
    dz = Math.abs(gz - z),
    diag = Math.min(dx, dz);
  return diag * 1.41421356237 + (Math.max(dx, dz) - diag);
}

// rebuild the finished path from the end node back to the start
function gc1Floor1BuildPath(task, endKey) {
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

// trim the path down to turning points so movement is cleaner
function gc1Floor1CompressPath(path) {
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

// choose the open node with the best score
function gc1Floor1PopBestOpen(task) {
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

// create a fresh A* search job for floor 1
function gc1Floor1MakeSearch(startCell, goalCell) {
  if (!startCell || !goalCell) return null;
  var walkable = gc1Floor1BuildWalkable();
  var startKey = gc1Floor1Key(startCell[0], startCell[1]),
    goalKey = gc1Floor1Key(goalCell[0], goalCell[1]);
  if (!walkable[startKey] || !walkable[goalKey]) return null;
  var task = {
    walkable: walkable,
    open: [startKey],
    openSet: {},
    cameFrom: {},
    gScore: {},
    fScore: {},
    goal: goalCell.slice(),
    bounds: gc1Floor1Bounds(),
  };
  task.openSet[startKey] = true;
  task.gScore[startKey] = 0;
  task.fScore[startKey] = gc1Floor1Heuristic(
    startCell[0],
    startCell[1],
    goalCell[0],
    goalCell[1],
  );
  return task;
}

function gc1Floor1BuildRouteFromPath(
  currentPos,
  path,
  targetPos,
  mode,
  prefix,
) {
  // convert the raw graph path into real world points granny can actually move through
  // prefix is usually used for stair points before the floor route begins
  path = gc1Floor1CompressPath(path);
  if (!path || !path.length) return null;
  var route = [];
  gc1Floor1PushUnique(route, currentPos || gc1Floor1WorldFromCell(path[0]));
  if (prefix && prefix.length) {
    for (var p = 0; p < prefix.length; p++)
      gc1Floor1PushUnique(route, prefix[p]);
  }
  for (var i = 0; i < path.length; i++)
    gc1Floor1PushUnique(route, gc1Floor1WorldFromCell(path[i]));
  if (mode === "exit") {
    var descent = gc1BuildFloor1DescentPoints();
    for (var j = 0; j < descent.length; j++)
      gc1Floor1PushUnique(route, descent[j]);
    gc1Floor1PushUnique(route, gc1GetFloor1MainFloorLandingPoint());
  } else if (targetPos) {
    gc1Floor1PushUnique(route, [targetPos[0], GC1_FLOOR1_BASE_Y, targetPos[2]]);
  }
  return route;
}

function gc1Floor1BeginSearchRoute(
  mobId,
  pending,
  currentPos,
  startCell,
  goalCell,
  targetPos,
  mode,
  prefix,
) {
  // start a chunked floor 1 search
  // we chunk it so a bigger route does not freeze the script in one tick
  if (!mobId || !api.checkValid(mobId) || !pending || !startCell || !goalCell)
    return false;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return false;
  var search = gc1Floor1MakeSearch(startCell, goalCell);
  if (!search) return false;
  if (typeof TS.stop === "function") TS.stop(GC1_FLOOR1_GROUP);
  gc1Floor1State.active = false;
  gc1Floor1State.route = null;
  gc1Floor1State.routeIndex = 0;
  gc1Floor1State.pending = null;
  gc1Floor1State.taskId = null;
  gc1Floor1State.prepTaskId = null;
  gc1Floor1State.prepared = null;
  gc1Floor1State.searchSerial = (gc1Floor1State.searchSerial || 0) + 1;
  gc1Floor1State.search = {
    serial: gc1Floor1State.searchSerial,
    mobId: mobId,
    pending: gc1Floor1ClonePending(pending) || pending,
    currentPos: currentPos ? currentPos.slice() : null,
    targetPos: targetPos ? targetPos.slice() : null,
    mode: mode || "target",
    prefix: prefix && prefix.length ? prefix : null,
    task: search,
  };
  gc1Floor1State.searchTaskId = TS.run(
    gc1Floor1SearchTick,
    50,
    GC1_FLOOR1_GROUP,
  );
  return true;
}

// every tick we expand a few nodes until we either finish or need another slice
function gc1Floor1SearchTick() {
  gc1Floor1State.searchTaskId = null;
  var job = gc1Floor1State.search;
  if (!job || !job.task || !job.mobId || !api.checkValid(job.mobId)) {
    gc1Floor1State.search = null;
    return false;
  }
  var task = job.task,
    goalKey = gc1Floor1Key(task.goal[0], task.goal[1]);
  for (var step = 0; step < GC1_FLOOR1_SEARCH_NODES_PER_TICK; step++) {
    if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
      gc1Floor1State.searchTaskId = TS.run(
        gc1Floor1SearchTick,
        100,
        GC1_FLOOR1_GROUP,
      );
      return true;
    }
    var bestKey = gc1Floor1PopBestOpen(task);
    if (!bestKey) {
      gc1Floor1State.search = null;
      return false;
    }
    if (bestKey === goalKey) {
      var path = gc1Floor1BuildPath(task, goalKey);
      var route = gc1Floor1BuildRouteFromPath(
        job.currentPos,
        path,
        job.targetPos,
        job.mode,
        job.prefix,
      );
      var pending = job.pending;
      if (job.targetPos && pending) pending.pos = job.targetPos.slice();
      gc1Floor1State.search = null;
      if (job.mode === "exit") {
        return gc1StartFloor1Route(job.mobId, pending, route, function () {
          return gc1SignalMainAfterFloor1Exit(pending);
        });
      }
      return gc1StartFloor1Route(job.mobId, pending, route, null);
    }
    var parts = bestKey.split(","),
      x = Number(parts[0]),
      z = Number(parts[1]);
    for (var d = 0; d < GC1_DIRS.length; d++) {
      if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
        gc1Floor1State.searchTaskId = TS.run(
          gc1Floor1SearchTick,
          100,
          GC1_FLOOR1_GROUP,
        );
        return true;
      }
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
      if (!gc1Floor1CanStep(task, x, z, nx, nz)) continue;
      var neighborKey = gc1Floor1Key(nx, nz),
        tentative = task.gScore[bestKey] + dir[2];
      if (
        task.gScore[neighborKey] !== undefined &&
        tentative >= task.gScore[neighborKey]
      )
        continue;
      task.cameFrom[neighborKey] = bestKey;
      task.gScore[neighborKey] = tentative;
      task.fScore[neighborKey] =
        tentative + gc1Floor1Heuristic(nx, nz, task.goal[0], task.goal[1]);
      if (!task.openSet[neighborKey]) {
        task.open.push(neighborKey);
        task.openSet[neighborKey] = true;
      }
    }
  }
  gc1Floor1State.searchTaskId = TS.run(
    gc1Floor1SearchTick,
    50,
    GC1_FLOOR1_GROUP,
  );
  return true;
}

// convert a floor 1 graph cell into a world position
function gc1Floor1WorldFromCell(cell) {
  return cell ? [cell[0] + 0.5, GC1_FLOOR1_BASE_Y, cell[1] + 0.5] : null;
}

// same route dedupe helper used in the other floor systems
function gc1Floor1PushUnique(route, point) {
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

// real distance here because we use it for tiny stair anchor checks
function gc1Floor1PointDist(a, b) {
  if (!a || !b) return Infinity;
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// figure out which stair point granny is currently nearest to
function gc1Floor1ClosestStairIndex(pos, maxDist) {
  if (!pos || pos.length < 3) return -1;
  var bestIndex = -1,
    bestDistSq = Infinity;
  for (var i = 0; i < GC1_FLOOR1_STAIRS.length; i++) {
    var dx = pos[0] - GC1_FLOOR1_STAIRS[i][0],
      dy = pos[1] - GC1_FLOOR1_STAIRS[i][1],
      dz = pos[2] - GC1_FLOOR1_STAIRS[i][2];
    var distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }
  if (typeof maxDist === "number" && bestDistSq > maxDist * maxDist) return -1;
  return bestIndex;
}

// build the little stair segment before the real floor route starts
// direction down = heading to main floor, up = heading deeper onto floor 1
function gc1Floor1BuildStairPrefix(currentPos, stairIndex, direction) {
  var out = [];
  if (stairIndex < 0) return out;
  var anchor = GC1_FLOOR1_STAIRS[stairIndex];
  if (gc1Floor1PointDist(currentPos, anchor) > 0.08)
    gc1Floor1PushUnique(out, anchor);
  if (direction === "down") {
    for (var d = stairIndex - 1; d >= 0; d--)
      gc1Floor1PushUnique(out, GC1_FLOOR1_STAIRS[d]);
  } else {
    for (var u = stairIndex + 1; u < GC1_FLOOR1_STAIRS.length; u++)
      gc1Floor1PushUnique(out, GC1_FLOOR1_STAIRS[u]);
  }
  return out;
}

// fallback handoff target for the floor 1 stair top
function gc1GetFloor1HandoffTarget() {
  return GC1_FLOOR1_STAIRS[GC1_FLOOR1_STAIRS.length - 1].slice();
}

// collect all tiles marked as stairs in the floor 1 graph
function gc1GetFloor1StairCellsLite() {
  if (gc1Floor1State.stairCells) return gc1Floor1State.stairCells;
  var out = [];
  for (var row = 0; row < GC1_FLOOR1_ROWS.length; row++) {
    var cells = GC1_FLOOR1_ROWS[row];
    for (var col = 0; col < cells.length; col++) {
      if (cells.charAt(col) === "2") out.push(gc1Floor1CellAt(row, col));
    }
  }
  gc1Floor1State.stairCells = out;
  return out;
}

// collect every 4 tile so patrol can reuse them later
function gc1GetFloor1WaypointCells() {
  if (gc1Floor1State.waypointCells) return gc1Floor1State.waypointCells;
  var out = [];
  for (var row = 0; row < GC1_FLOOR1_ROWS.length; row++) {
    var cells = GC1_FLOOR1_ROWS[row];
    for (var col = 0; col < cells.length; col++) {
      if (cells.charAt(col) === "4") out.push(gc1Floor1CellAt(row, col));
    }
  }
  gc1Floor1State.waypointCells = out;
  return out;
}

// find the best walkable tile right beside the top stair area
function gc1GetFloor1StairEntryCellLite() {
  var walkable = gc1Floor1BuildWalkable();
  var top = GC1_FLOOR1_STAIRS[GC1_FLOOR1_STAIRS.length - 1];
  var topCell = [Math.floor(top[0]), Math.floor(top[2])];
  var stairCells = gc1GetFloor1StairCellsLite();
  if (stairCells && stairCells.length) {
    var best = stairCells[0],
      bestDist = Infinity;
    for (var i = 0; i < stairCells.length; i++) {
      var cell = stairCells[i],
        dx = cell[0] - topCell[0],
        dz = cell[1] - topCell[1],
        dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        best = cell;
        bestDist = dist;
      }
    }
    var stairEntry = gc1Floor1NearestWalkable(best, walkable, 4) || best;
    gc1Floor1State.stairEntryCell = stairEntry.slice();
    return stairEntry;
  }
  var fallback = gc1Floor1NearestWalkable(topCell, walkable, 4) || topCell;
  gc1Floor1State.stairEntryCell = fallback.slice();
  return fallback;
}

function gc1IsFloor1LevelPos(pos) {
  return !!(pos && pos.length >= 3 && pos[1] >= GC1_FLOOR1_BASE_Y - 1.5);
}

// stair points reversed for walking back down to the main floor
function gc1BuildFloor1DescentPoints() {
  if (gc1Floor1State.descentPoints) {
    var cached = [];
    for (var c = 0; c < gc1Floor1State.descentPoints.length; c++)
      cached.push(gc1Floor1State.descentPoints[c].slice());
    return cached;
  }
  var out = [];
  for (var i = GC1_FLOOR1_STAIRS.length - 1; i >= 0; i--)
    out.push(GC1_FLOOR1_STAIRS[i].slice());
  gc1Floor1State.descentPoints = out;
  return out;
}

// where granny should land once she exits floor 1 back onto the main floor
function gc1GetFloor1MainFloorLandingPoint() {
  if (typeof globalThis.gc1GetMainFloorUpstairsLandingPoint === "function") {
    var landing = globalThis.gc1GetMainFloorUpstairsLandingPoint();
    if (landing && landing.length >= 3) return landing.slice();
  }
  return [25.5, 56, 26.5];
}

// once floor 1 is done, hand control back to the main floor route system
function gc1SignalMainAfterFloor1Exit(pending) {
  if (
    pending &&
    pending.pos &&
    typeof globalThis.gc1ResumeMainFloorMeshTarget === "function"
  ) {
    return !!globalThis.gc1ResumeMainFloorMeshTarget(pending);
  }
  if (
    pending &&
    pending.pos &&
    typeof globalThis.gc1SignalMainFloorMeshTarget === "function"
  ) {
    return !!globalThis.gc1SignalMainFloorMeshTarget(
      pending.pos,
      pending.meshId || null,
      pending.meta || null,
    );
  }
  return false;
}

// phase 1
// arm the floor 1 mover with a rtw route
function gc1StartFloor1Route(mobId, pending, route, onDone) {
  if (!route || route.length < 2 || !mobId || !api.checkValid(mobId))
    return false;
  gc1StopFloor1Route();
  gc1Floor1State.active = true;
  gc1Floor1State.prepSerial = (pending && pending.serial) || 0;
  gc1Floor1State.route = route;
  gc1Floor1State.routeIndex = 1;
  gc1Floor1State.pending = {
    mobId: mobId,
    serial: (pending && pending.serial) || 0,
    pos: pending && pending.pos ? pending.pos.slice() : null,
    meshId: (pending && pending.meshId) || null,
    meta: (pending && pending.meta) || null,
    onDone: typeof onDone === "function" ? onDone : null,
  };
  gc1Floor1State.taskId = TS.run(gc1Floor1MoveTick, 50, GC1_FLOOR1_GROUP);
  return true;
}

// safety clone for retries and route rebuilds
function gc1Floor1ClonePending(pending) {
  if (!pending) return null;
  return {
    serial: pending.serial || 0,
    pos: pending.pos ? pending.pos.slice() : null,
    meshId: pending.meshId || null,
    meta: pending.meta || null,
  };
}

// refresh live target position when the target belongs to a moving mesh entity
function gc1Floor1ResolvePendingPos(pending) {
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

// placeholder prep hook
// right now this mostly keeps the same serial bookkeeping as the other handoff systems
function gc1PrepareFloor1Path(pending) {
  if (!pending || !pending.pos) return false;
  if (
    gc1Floor1State.prepared &&
    gc1Floor1State.prepared.serial === (pending.serial || 0)
  )
    return true;
  gc1Floor1State.prepSerial = pending.serial || 0;
  return true;
}

// full reset of floor 1 route state
function gc1StopFloor1Route() {
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_FLOOR1_GROUP);
  gc1Floor1State.active = false;
  gc1Floor1State.route = null;
  gc1Floor1State.routeIndex = 0;
  gc1Floor1State.pending = null;
  gc1Floor1State.taskId = null;
  gc1Floor1State.prepTaskId = null;
  gc1Floor1State.prepSerial = 0;
  gc1Floor1State.prepared = null;
  gc1Floor1State.search = null;
  gc1Floor1State.searchTaskId = null;
  return true;
}

// phase 2
// move granny one route point at a time until she reaches the end
function gc1Floor1MoveTick() {
  gc1Floor1State.taskId = null;
  if (
    !gc1Floor1State.active ||
    !gc1Floor1State.route ||
    !gc1Floor1State.pending
  )
    return false;
  var mobId = gc1Floor1State.pending.mobId;
  if (!mobId || !api.checkValid(mobId)) {
    gc1StopFloor1Route();
    return false;
  }
  var nextPoint = gc1Floor1State.route[gc1Floor1State.routeIndex];
  if (!nextPoint) {
    gc1StopFloor1Route();
    return false;
  }
  var currentPos = gc1MobPos(mobId);
  if (!currentPos) {
    gc1Floor1State.taskId = TS.run(gc1Floor1MoveTick, 50, GC1_FLOOR1_GROUP);
    return true;
  }
  var dx = nextPoint[0] - currentPos[0],
    dy = nextPoint[1] - currentPos[1],
    dz = nextPoint[2] - currentPos[2];
  var distSq = dx * dx + dy * dy + dz * dz;
  var isVerticalMove = Math.abs(dy) > 0.2;
  if (
    distSq <=
    (isVerticalMove ? GC1_FLOOR1_STAIR_REACHED_SQ : GC1_FLOOR1_REACHED_SQ)
  ) {
    try {
      api.setPosition(mobId, nextPoint[0], nextPoint[1], nextPoint[2]);
    } catch (e) {}
    gc1Floor1State.routeIndex++;
    if (gc1Floor1State.routeIndex >= gc1Floor1State.route.length) {
      var finishedPending = gc1Floor1State.pending;
      var done = finishedPending && finishedPending.onDone;
      gc1StopFloor1Route();
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
    gc1Floor1State.taskId = TS.run(gc1Floor1MoveTick, 50, GC1_FLOOR1_GROUP);
    return true;
  }
  var dist = Math.sqrt(distSq);
  var moveStep = GC1_FLOOR1_STEP;
  if (isVerticalMove) moveStep = Math.max(moveStep, GC1_FLOOR1_STAIR_STEP);
  var step = Math.min(moveStep, dist);
  var inv = step / (dist || 1);
  var nextY = isVerticalMove ? nextPoint[1] : currentPos[1] + dy * inv;
  try {
    api.setPosition(
      mobId,
      currentPos[0] + dx * inv,
      nextY,
      currentPos[2] + dz * inv,
    );
    var meta =
      gc1Floor1State.pending && gc1Floor1State.pending.meta
        ? gc1Floor1State.pending.meta
        : null;
    var facedPlayer =
      meta &&
      meta.kind === "alert" &&
      meta.playerId != null &&
      typeof globalThis.gc1VisionFacePlayer === "function" &&
      globalThis.gc1VisionFacePlayer(mobId, meta.playerId);
    if (!facedPlayer) api.setEntityRotation(mobId, 0, Math.atan2(dx, dz), 0);
  } catch (e) {}
  gc1Floor1State.taskId = TS.run(gc1Floor1MoveTick, 50, GC1_FLOOR1_GROUP);
  return true;
}

function gc1OnFloor1EntryReached(mobId, pending) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  var currentPos = gc1MobPos(mobId);
  return gc1BeginFloor1RouteToTarget(
    mobId,
    pending,
    currentPos || GC1_FLOOR1_STAIRS[GC1_FLOOR1_STAIRS.length - 1],
  );
}

function gc1BeginFloor1RouteToTarget(mobId, pending, currentPos) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  currentPos = currentPos || gc1MobPos(mobId);
  var stairIndex = gc1IsFloor1LevelPos(currentPos)
    ? -1
    : gc1Floor1ClosestStairIndex(currentPos, GC1_FLOOR1_STAIR_MATCH_DIST);
  var stairPrefix = null;
  if (!gc1IsFloor1LevelPos(currentPos)) {
    if (stairIndex < 0) return false;
    stairPrefix = gc1Floor1BuildStairPrefix(currentPos, stairIndex, "up");
  }
  var targetPos = gc1Floor1ResolvePendingPos(pending);
  if (!targetPos) return false;
  var walkable = gc1Floor1BuildWalkable();
  var startCell =
    stairIndex >= 0
      ? gc1GetFloor1StairEntryCellLite()
      : gc1Floor1NearestWalkable(
          [Math.floor(currentPos[0]), Math.floor(currentPos[2])],
          walkable,
          4,
        );
  var goalCell = gc1Floor1NearestWalkable(
    [Math.floor(targetPos[0]), Math.floor(targetPos[2])],
    walkable,
    4,
  );
  if (!startCell || !goalCell) return false;
  return gc1Floor1BeginSearchRoute(
    mobId,
    pending,
    currentPos,
    startCell,
    goalCell,
    targetPos,
    "target",
    stairPrefix,
  );
}

function gc1BeginFloor1ExitToMainFloor(mobId, pending, currentPos) {
  if (!pending || !pending.pos || !mobId || !api.checkValid(mobId))
    return false;
  if (pending.meta && pending.meta.floorId === "floor1") return false;
  currentPos = currentPos || gc1MobPos(mobId);
  if (!gc1IsFloor1LevelPos(currentPos)) {
    var stairIndex = gc1Floor1ClosestStairIndex(
      currentPos,
      GC1_FLOOR1_STAIR_MATCH_DIST,
    );
    if (stairIndex < 0) return false;
    var stairRoute = [];
    gc1Floor1PushUnique(stairRoute, currentPos);
    var downPrefix = gc1Floor1BuildStairPrefix(currentPos, stairIndex, "down");
    for (var s = 0; s < downPrefix.length; s++)
      gc1Floor1PushUnique(stairRoute, downPrefix[s]);
    gc1Floor1PushUnique(stairRoute, gc1GetFloor1MainFloorLandingPoint());
    if (stairRoute.length < 2) return gc1SignalMainAfterFloor1Exit(pending);
    return gc1StartFloor1Route(mobId, pending, stairRoute, function () {
      return gc1SignalMainAfterFloor1Exit(pending);
    });
  }
  var walkable = gc1Floor1BuildWalkable();
  var startCell = gc1Floor1NearestWalkable(
    [Math.floor(currentPos[0]), Math.floor(currentPos[2])],
    walkable,
    4,
  );
  var goalCell = gc1GetFloor1StairEntryCellLite();
  if (!startCell || !goalCell) return false;
  return gc1Floor1BeginSearchRoute(
    mobId,
    pending,
    currentPos,
    startCell,
    goalCell,
    null,
    "exit",
  );
}

globalThis.GRANNY_FLOOR_1_DEBUG_ROWS = GC1_FLOOR1_ROWS;
globalThis.GRANNY_FLOOR_1_DEBUG_BASE_X = GC1_FLOOR1_BASE_X;
globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y = GC1_FLOOR1_BASE_Y;
globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Z = GC1_FLOOR1_BASE_Z;
globalThis.gc1GetFloor1HandoffTarget = gc1GetFloor1HandoffTarget;
globalThis.gc1OnFloor1EntryReached = gc1OnFloor1EntryReached;
globalThis.gc1StopFloor1Route = gc1StopFloor1Route;
globalThis.gc1BeginFloor1RouteToTarget = gc1BeginFloor1RouteToTarget;
globalThis.gc1BeginFloor1ExitToMainFloor = gc1BeginFloor1ExitToMainFloor;
globalThis.gc1PrepareFloor1Path = gc1PrepareFloor1Path;
globalThis.gc1IsFloor1LevelPos = gc1IsFloor1LevelPos;
globalThis.gc1GetFloor1WaypointCells = gc1GetFloor1WaypointCells;
globalThis.gc1IsFloor1DropBusy = function () {
  if (gc1Floor1State.active) return true;
  if (gc1Floor1State.search) return true;
  if (
    gc1Floor1State.searchTaskId &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.isTaskActive === "function"
  )
    return !!TS.isTaskActive(gc1Floor1State.searchTaskId);
  if (
    gc1Floor1State.prepTaskId &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.isTaskActive === "function"
  )
    return !!TS.isTaskActive(gc1Floor1State.prepTaskId);
  return false;
};
