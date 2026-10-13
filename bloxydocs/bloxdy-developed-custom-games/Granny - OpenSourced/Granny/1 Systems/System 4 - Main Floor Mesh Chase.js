// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// we added a lot more comments here so it is easier to follow now
// if you try to paste the full file into one code block, it may go over the 32,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// make sure to join bloxdhub.com hehe

/* System 4 - Main Floor Mesh Chase */

// quick idea of what this file does:
// puzzle items or alerts can signal a target
// this system turns that target into a route on the main floor
// then granny walks that route until she reaches the target or hands off to another floor system

// these values control how fast the route search and movement update
// smaller values r smoother, but thy also cost more ticks

var GC1_MAIN_FLOOR_MESH_GROUP = "gc1_main_floor_mesh";
var GC1_MAIN_FLOOR_SEARCH_NODES_PER_TICK = 8;
var GC1_MAIN_FLOOR_MOVE_STEP = 0.13;
var GC1_MAIN_FLOOR_STAIR_STEP = 0.24;
var GC1_MAIN_FLOOR_REACHED_DIST = 0.18;
var GC1_MAIN_FLOOR_REACHED_DIST_SQ =
  GC1_MAIN_FLOOR_REACHED_DIST * GC1_MAIN_FLOOR_REACHED_DIST;
var GC1_MAIN_FLOOR_STAIR_REACHED_DIST = 0.32;
var GC1_MAIN_FLOOR_STAIR_REACHED_DIST_SQ =
  GC1_MAIN_FLOOR_STAIR_REACHED_DIST * GC1_MAIN_FLOOR_STAIR_REACHED_DIST;
var GC1_MAIN_FLOOR_REPATH_DELAY = 140;
var GC1_MAIN_STAIR_APPROACH_RADIUS = 4.5;
var GC1_STAIRS_APPROACH_CELL = [26, 25];
var GC1_STAIRS_UP_POINTS = [
  [26.0, 57, 25.5],
  [26.0, 58, 24.5],
  [26.0, 59, 23.5],
  [26.0, 60, 22.5],
  [26.0, 61, 21.5],
  [26.0, 62, 20.5],
];
var GC1_STAIRS_DOWN_POINTS = [
  [17.5, 56, 23.5],
  [17.5, 55, 22.5],
  [17.5, 54, 21.5],
  [17.5, 53, 20.5],
  [17.5, 52, 19.5],
  [17.5, 51, 18.5],
];

// this is the main floor graph
// each string is one row and each character is one tile in the route map
//
// what the numbers mean:
// 1 = blocked tile or wall
// 0 = normal walkable floor
// 4 = waypoint tile we can reuse as a route marker
// 2 = stairs
// 3 = doors to the room
// 8 = a spot u can hide which granny will ignore
//
globalThis.GRANNY_MAIN_FLOOR_DEBUG_ROWS = [
  "1111111111111111110111111111111111",
  "1111100000000000000000000000000011",
  "1000000000000000000000000000004011",
  "1000000000111000000000011000000011",
  "1000000000111000000111111001110011",
  "1000040000111310040011111001110011",
  "1000000000111010000011111001110011",
  "1000000000111011000011111001110011",
  "1110000000011018100011111000000011",
  "1110000000011011000110011000000011",
  "1111111100111010000030011001111111",
  "1111111100111111111111111001111111",
  "1111110000000000001000000000011111",
  "1000000000000000000000000000011111",
  "1004000111000040000001111110001111",
  "1000000111000000000001111110001111",
  "1111111111100000000000000004011111",
  "1111111111110111101000000000011111",
  "1111111111111111111111111111111111",
];
globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_X = 4.5;
globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y = 56;
globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Z = 29.5;
// these base coords line the graph up with the real house position in the world
var GC1_MAIN_FLOOR_CELL_BASE_X =
  globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_X - 0.5;
var GC1_MAIN_FLOOR_CELL_BASE_Z =
  globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Z - 0.5;
// 8 direction movement
// straight steps cost 1 and diagonals cost about 1.414
globalThis.GC1_DIRS = globalThis.GC1_DIRS || [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.41421356237],
  [1, -1, 1.41421356237],
  [-1, 1, 1.41421356237],
  [-1, -1, 1.41421356237],
];
globalThis.gc1MainFloorMeshState = Object.assign(
  {
    pendingTarget: null,
    pendingSerial: 0,
    activeSerial: 0,
    route: null,
    routeIndex: 0,
    search: null,
    searchTaskId: null,
    moveTaskId: null,
    dispatchTaskId: null,
    active: false,
    lastRepathAt: 0,
    routeIsStairs: false,
    routeStairIndex: -1,
  },
  typeof globalThis.gc1MainFloorMeshState === "object" &&
    globalThis.gc1MainFloorMeshState
    ? globalThis.gc1MainFloorMeshState
    : {},
);
var gc1MainFloorMeshState = globalThis.gc1MainFloorMeshState;
globalThis.gc1MainFloorMeshWalkableCache = null;
globalThis.gc1MainFloorMeshWaypointCache = null;

// this file is the granny chase brain for the main floor
// it turns the debug map into routes and then walks granny along them one step at a time
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

// the grid helper keeps cell lookups tiny and easy to read
function gc1MainFloorMeshCellKey(x, z) {
  return x + "," + z;
}

// the Y helper keeps the route math aligned with the main floor height
function gc1MainFloorMeshY() {
  return globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y;
}

// walkable cells are the spaces granny can actually move through
function gc1MainFloorMeshIsWalkableCell(cell) {
  // we keep the old source markers, but only some of them count as real floor
  return (
    cell === "0" || cell === "2" || cell === "3" || cell === "4" || cell === "5"
  );
}

// the debug grid is stored as rows and columns, so this turns the cell coords back into world coords
function gc1MainFloorMeshGetCellAt(row, col) {
  return [GC1_MAIN_FLOOR_CELL_BASE_X + col, GC1_MAIN_FLOOR_CELL_BASE_Z - row];
}

// bounds are used by the search logic when it needs to stay inside the floor area
function gc1MainFloorMeshGetBounds() {
  var rows = globalThis.GRANNY_MAIN_FLOOR_DEBUG_ROWS;
  return {
    minX: GC1_MAIN_FLOOR_CELL_BASE_X,
    maxX: GC1_MAIN_FLOOR_CELL_BASE_X + rows[0].length - 1,
    minZ: GC1_MAIN_FLOOR_CELL_BASE_Z - rows.length + 1,
    maxZ: GC1_MAIN_FLOOR_CELL_BASE_Z,
  };
}

// this builds a cached set of walkable cells so the path search does not keep rebuilding it
function gc1MainFloorMeshBuildWalkableSet() {
  // this is basically a fast lookup table
  // if a cell key exists in this object, granny is allowed to step there
  if (globalThis.gc1MainFloorMeshWalkableCache)
    return globalThis.gc1MainFloorMeshWalkableCache;
  var task = { walkable: {} };
  var rows = globalThis.GRANNY_MAIN_FLOOR_DEBUG_ROWS;
  for (var row = 0; row < rows.length; row++) {
    var cells = rows[row];
    for (var col = 0; col < cells.length; col++) {
      if (!gc1MainFloorMeshIsWalkableCell(cells.charAt(col))) continue;
      var cell = gc1MainFloorMeshGetCellAt(row, col);
      task.walkable[gc1MainFloorMeshCellKey(cell[0], cell[1])] = true;
    }
  }
  globalThis.gc1MainFloorMeshWalkableCache = task.walkable;
  return task.walkable;
}

// waypoints are the special grid cells the chase system can use as route anchors
function gc1MainFloorMeshGetWaypointCells() {
  if (globalThis.gc1MainFloorMeshWaypointCache)
    return globalThis.gc1MainFloorMeshWaypointCache;
  var waypoints = [];
  var rows = globalThis.GRANNY_MAIN_FLOOR_DEBUG_ROWS;
  for (var row = 0; row < rows.length; row++) {
    var cells = rows[row];
    for (var col = 0; col < cells.length; col++) {
      if (cells.charAt(col) !== "4") continue;
      waypoints.push(gc1MainFloorMeshGetCellAt(row, col));
    }
  }
  globalThis.gc1MainFloorMeshWaypointCache = waypoints;
  return waypoints;
}

// nearest-walkable search keeps the path from starting inside a wall or dead cell
function gc1MainFloorMeshNearestWalkable(targetCell, walkable, maxRadius) {
  // if the exact target is blocked, we search outward in rings until we find a good floor tile
  if (!targetCell || !walkable) return null;
  var tx = targetCell[0],
    tz = targetCell[1];
  if (walkable[gc1MainFloorMeshCellKey(tx, tz)]) return [tx, tz];
  maxRadius = maxRadius || 4;
  for (var radius = 1; radius <= maxRadius; radius++) {
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dz = -radius; dz <= radius; dz++) {
        if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
          return null;
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        var x = tx + dx,
          z = tz + dz;
        if (walkable[gc1MainFloorMeshCellKey(x, z)]) return [x, z];
      }
    }
  }
  return null;
}

function gc1MainFloorMeshCanStepTo(task, x, z, nx, nz) {
  // diagonal steps only work if both side neighbors are open too
  // this stops granny from clipping through wall corners
  if (!task.walkable[gc1MainFloorMeshCellKey(nx, nz)]) return false;
  if (nx === x || nz === z) return true;
  return !!(
    task.walkable[gc1MainFloorMeshCellKey(nx, z)] &&
    task.walkable[gc1MainFloorMeshCellKey(x, nz)]
  );
}

function gc1MainFloorMeshHeuristic(x, z, gx, gz) {
  // simple diagonal distance guess for the route search
  var dx = Math.abs(gx - x),
    dz = Math.abs(gz - z),
    diag = Math.min(dx, dz);
  return diag * 1.41421356237 + (Math.max(dx, dz) - diag);
}

// path helpers keep the route search readable even though the logic is doing a lot under the hood
function gc1MainFloorMeshPointDistSq(a, b) {
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function gc1MainFloorMeshPointDist(a, b) {
  return Math.sqrt(gc1MainFloorMeshPointDistSq(a, b));
}

function gc1MainFloorMeshBuildPath(task, endKey) {
  // once the goal is reached, we walk backward through cameFrom and rebuild the route
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

function gc1MainFloorMeshCompressPath(path) {
  // remove useless middle points on straight lines
  // this makes the route smaller and easier for the movement loop to follow
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

function gc1MainFloorMeshWorldPoint(point) {
  if (!point) return null;
  if (point.length >= 3) return [point[0], point[1], point[2]];
  return [point[0] + 0.5, gc1MainFloorMeshY(), point[1] + 0.5];
}

function gc1MainFloorMeshClosestPointIndex(points, worldPos, maxDist) {
  // used a lot by the stair logic when we need the nearest stair point
  if (!points || !points.length || !worldPos) return -1;
  var bestIndex = -1,
    bestDistSq = Infinity;
  for (var i = 0; i < points.length; i++) {
    var distSq = gc1MainFloorMeshPointDistSq(points[i], worldPos);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }
  if (typeof maxDist === "number" && bestDistSq > maxDist * maxDist) return -1;
  return bestIndex;
}

function gc1MainFloorMeshBuildStairRoute(pendingPos) {
  // if the target is above or below the main floor, we route to stairs first
  if (!pendingPos || pendingPos.length < 3) return null;
  var py = pendingPos[1];
  var mainY = gc1MainFloorMeshY();
  var onMainFloor = py >= mainY - 1.5 && py <= mainY + 1.5;
  if (onMainFloor) return null;
  var upIndex = gc1MainFloorMeshClosestPointIndex(
    GC1_STAIRS_UP_POINTS,
    pendingPos,
    GC1_MAIN_STAIR_APPROACH_RADIUS,
  );
  var downIndex = gc1MainFloorMeshClosestPointIndex(
    GC1_STAIRS_DOWN_POINTS,
    pendingPos,
    GC1_MAIN_STAIR_APPROACH_RADIUS,
  );
  if (upIndex < 0 && downIndex < 0) return null;
  var upDistSq =
    upIndex >= 0
      ? gc1MainFloorMeshPointDistSq(GC1_STAIRS_UP_POINTS[upIndex], pendingPos)
      : Infinity;
  var downDistSq =
    downIndex >= 0
      ? gc1MainFloorMeshPointDistSq(
          GC1_STAIRS_DOWN_POINTS[downIndex],
          pendingPos,
        )
      : Infinity;
  if (downIndex >= 0 && (upIndex < 0 || downDistSq < upDistSq)) {
    return {
      isStairs: true,
      points: GC1_STAIRS_DOWN_POINTS,
      stairIndex: downIndex,
    };
  }
  return { isStairs: true, points: GC1_STAIRS_UP_POINTS, stairIndex: upIndex };
}

// the main floor target sometimes needs a landing cell instead of a raw position
function gc1MainFloorMeshFindApproachCell(targetPos) {
  var walkable = gc1MainFloorMeshBuildWalkableSet();
  return gc1MainFloorMeshNearestWalkable(
    [Math.floor(targetPos[0]), Math.floor(targetPos[2])],
    walkable,
    6,
  );
}

// route assembly stitches the path and the stair steps together into one chase path
function gc1MainFloorMeshAssembleRoute(task, endKey) {
  var route = gc1MainFloorMeshBuildPath(task, endKey);
  if (!route || !route.length) return route;
  if (
    !gc1MainFloorMeshState.routeIsStairs ||
    gc1MainFloorMeshState.routeStairIndex < 0
  )
    return gc1MainFloorMeshCompressPath(route);
  var stairPoints = gc1MainFloorMeshState.routeStairs || null;
  if (!stairPoints || !stairPoints.length)
    return gc1MainFloorMeshCompressPath(route);
  var out = gc1MainFloorMeshCompressPath(route);
  for (
    var i = 0;
    i <= gc1MainFloorMeshState.routeStairIndex && i < stairPoints.length;
    i++
  )
    out.push(stairPoints[i].slice());
  return out;
}

function gc1MainFloorMeshInitialRouteIndex(route) {
  // route point 0 is usually where granny already is, so most routes start at point 1
  return route && route.length > 1 ? 1 : 0;
}

function gc1MainFloorMeshResetRouteMeta() {
  // clear any stair-only route info before a fresh route starts
  gc1MainFloorMeshState.routeIsStairs = false;
  gc1MainFloorMeshState.routeStairIndex = -1;
  gc1MainFloorMeshState.routeStairs = null;
}

// clearing a target wipes the live route so the next signal can start clean
function gc1MainFloorMeshClearTarget(serial) {
  var pending = gc1MainFloorMeshState.pendingTarget;
  if (serial && pending && pending.serial && pending.serial !== serial)
    return false;
  var clearedPending = pending;
  gc1MainFloorMeshState.pendingTarget = null;
  gc1MainFloorMeshState.active = false;
  gc1MainFloorMeshState.route = null;
  gc1MainFloorMeshState.routeIndex = 0;
  gc1MainFloorMeshState.search = null;
  gc1MainFloorMeshState.searchTaskId = null;
  gc1MainFloorMeshState.moveTaskId = null;
  gc1MainFloorMeshState.dispatchTaskId = null;
  gc1MainFloorMeshResetRouteMeta();
  if (typeof globalThis.gc1OnMainFloorTargetCleared === "function")
    globalThis.gc1OnMainFloorTargetCleared(clearedPending);
  return true;
}

function gc1MainFloorMeshPopBestOpen(task) {
  // tiny priority queue step for A*
  // pick the open cell with the best f score right now
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

function gc1MainFloorMeshEnsureGranny() {
  // if granny is missing for some reason, try to recover or respawn her first
  if (
    typeof globalThis.gc1GrannyExists === "function" &&
    globalThis.gc1GrannyExists()
  )
    return true;
  if (typeof globalThis.gc1SpawnGranny === "function")
    return !!globalThis.gc1SpawnGranny();
  return false;
}

function gc1MainFloorMeshTargetPos(pending) {
  // some targets need a handoff point instead of their raw world position
  // basement and floor 1 use that a lot
  if (!pending || !pending.pos) return null;
  if (
    pending.meta &&
    pending.meta.floorId === "floor1" &&
    typeof globalThis.gc1GetFloor1HandoffTarget === "function"
  ) {
    var floor1Handoff = globalThis.gc1GetFloor1HandoffTarget(pending);
    if (floor1Handoff && floor1Handoff.length >= 3) return floor1Handoff;
  }
  if (
    pending.meta &&
    pending.meta.floorId === "basement" &&
    typeof globalThis.gc1GetBasementHandoffTarget === "function"
  ) {
    var handoff = globalThis.gc1GetBasementHandoffTarget(pending);
    if (handoff && handoff.length >= 3) return handoff;
  }
  return pending.pos;
}

function gc1MainFloorMeshHandleArrival(mobId, pending) {
  // once granny reaches the route end, another system might take over
  if (!pending || !pending.meta) return false;
  if (
    pending.meta.floorId === "floor1" &&
    typeof globalThis.gc1OnFloor1EntryReached === "function"
  ) {
    return !!globalThis.gc1OnFloor1EntryReached(mobId, pending);
  }
  if (
    pending.meta.floorId === "basement" &&
    typeof globalThis.gc1OnBasementDropEntryReached === "function"
  ) {
    return !!globalThis.gc1OnBasementDropEntryReached(mobId, pending);
  }
  return false;
}

function gc1MainFloorMeshHandleFloor1Exit(mobId, pending, currentPos) {
  // this starts the "come back down to main floor" path from floor 1
  if (!pending || !pending.meta || pending.meta.floorId === "floor1")
    return false;
  if (typeof globalThis.gc1BeginFloor1ExitToMainFloor !== "function")
    return false;
  if (
    !currentPos ||
    currentPos.length < 3 ||
    currentPos[1] <= gc1MainFloorMeshY() + 0.2
  )
    return false;
  return !!globalThis.gc1BeginFloor1ExitToMainFloor(mobId, pending, currentPos);
}

function gc1MainFloorMeshHandleBasementExit(mobId, pending, currentPos) {
  // same idea here, but for basement to main floor
  if (!pending || !pending.meta || pending.meta.floorId === "basement")
    return false;
  if (typeof globalThis.gc1BeginBasementExitToMainFloor !== "function")
    return false;
  if (
    !currentPos ||
    currentPos.length < 3 ||
    currentPos[1] >= gc1MainFloorMeshY() - 0.2
  )
    return false;
  return !!globalThis.gc1BeginBasementExitToMainFloor(
    mobId,
    pending,
    currentPos,
  );
}

function gc1MainFloorMeshDispatchPendingTarget() {
  // this is the main route setup function
  // it takes the pending target, picks the goal cell, and starts the graph search
  gc1MainFloorMeshState.dispatchTaskId = null;
  var pending = gc1MainFloorMeshState.pendingTarget;
  if (!pending || !pending.pos) return false;
  if (!gc1MainFloorMeshEnsureGranny()) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      gc1MainFloorMeshState.dispatchTaskId = TS.run(
        gc1MainFloorMeshDispatchPendingTarget,
        100,
        GC1_MAIN_FLOOR_MESH_GROUP,
      );
    return false;
  }
  var mobId =
    typeof globalThis.gc1GrannyId === "function"
      ? globalThis.gc1GrannyId()
      : globalThis.gc1GrannyMobId;
  if (!mobId || !api.checkValid(mobId)) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      gc1MainFloorMeshState.dispatchTaskId = TS.run(
        gc1MainFloorMeshDispatchPendingTarget,
        100,
        GC1_MAIN_FLOOR_MESH_GROUP,
      );
    return false;
  }
  var currentPos = gc1MobPos(mobId);
  if (!currentPos) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      gc1MainFloorMeshState.dispatchTaskId = TS.run(
        gc1MainFloorMeshDispatchPendingTarget,
        100,
        GC1_MAIN_FLOOR_MESH_GROUP,
      );
    return false;
  }
  if (
    pending.meta &&
    pending.meta.floorId === "floor1" &&
    typeof globalThis.gc1BeginFloor1RouteToTarget === "function" &&
    globalThis.gc1BeginFloor1RouteToTarget(mobId, pending, currentPos)
  ) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshState.routeIndex = 0;
    gc1MainFloorMeshState.search = null;
    gc1MainFloorMeshResetRouteMeta();
    return true;
  }
  if (
    pending.meta &&
    pending.meta.floorId === "basement" &&
    typeof globalThis.gc1BeginBasementRouteToTarget === "function" &&
    globalThis.gc1BeginBasementRouteToTarget(mobId, pending, currentPos)
  ) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshState.routeIndex = 0;
    gc1MainFloorMeshState.search = null;
    gc1MainFloorMeshResetRouteMeta();
    return true;
  }
  if (gc1MainFloorMeshHandleFloor1Exit(mobId, pending, currentPos)) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshState.routeIndex = 0;
    gc1MainFloorMeshState.search = null;
    gc1MainFloorMeshResetRouteMeta();
    return true;
  }
  if (gc1MainFloorMeshHandleBasementExit(mobId, pending, currentPos)) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshState.routeIndex = 0;
    gc1MainFloorMeshState.search = null;
    gc1MainFloorMeshResetRouteMeta();
    return true;
  }
  var targetPos = gc1MainFloorMeshTargetPos(pending);
  if (!targetPos) return false;
  if (
    pending.meta &&
    pending.meta.floorId === "basement" &&
    typeof globalThis.gc1PrepareBasementDropPath === "function"
  ) {
    globalThis.gc1PrepareBasementDropPath(pending);
  }
  if (
    pending.meta &&
    pending.meta.floorId === "floor1" &&
    typeof globalThis.gc1PrepareFloor1Path === "function"
  ) {
    globalThis.gc1PrepareFloor1Path(pending);
  }
  var walkable = gc1MainFloorMeshBuildWalkableSet();
  var stairPlan = gc1MainFloorMeshBuildStairRoute(targetPos);
  // if stairPlan exists, the first goal is the stairs, not the final off-floor target
  gc1MainFloorMeshResetRouteMeta();
  if (stairPlan) {
    gc1MainFloorMeshState.routeIsStairs = true;
    gc1MainFloorMeshState.routeStairs = stairPlan.points;
    gc1MainFloorMeshState.routeStairIndex = stairPlan.stairIndex;
  }
  var startCell = gc1MainFloorMeshNearestWalkable(
    [Math.floor(currentPos[0]), Math.floor(currentPos[2])],
    walkable,
    4,
  );
  var approachCell = stairPlan
    ? gc1MainFloorMeshFindApproachCell(stairPlan.points[0])
    : gc1MainFloorMeshNearestWalkable(
        [Math.floor(targetPos[0]), Math.floor(targetPos[2])],
        walkable,
        6,
      );
  var goalCell = approachCell;
  // if we cannot find a safe start or goal cell, there is no route to build
  if (!startCell || !goalCell) return false;
  if (
    !stairPlan &&
    startCell[0] === goalCell[0] &&
    startCell[1] === goalCell[1]
  ) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshState.routeIndex = 0;
    gc1MainFloorMeshState.search = null;
    gc1MainFloorMeshResetRouteMeta();
    if (gc1MainFloorMeshHandleArrival(mobId, pending)) return true;
    if (
      typeof globalThis.gc1OnGrannyTargetReached === "function" &&
      globalThis.gc1OnGrannyTargetReached(mobId, pending)
    )
      return true;
    gc1MainFloorMeshClearTarget(pending.serial || 0);
    return true;
  }
  gc1MainFloorMeshState.active = true;
  gc1MainFloorMeshState.activeSerial = pending.serial;
  gc1MainFloorMeshState.route = null;
  gc1MainFloorMeshState.routeIndex = 0;
  gc1MainFloorMeshState.search = {
    // open = cells we still need to explore
    // cameFrom = back pointers for rebuilding the final path
    // gScore = cost from start to this cell
    // fScore = gScore plus the heuristic guess to the goal
    serial: pending.serial,
    walkable: walkable,
    open: [gc1MainFloorMeshCellKey(startCell[0], startCell[1])],
    openSet: {},
    cameFrom: {},
    gScore: {},
    fScore: {},
    goal: goalCell.slice(),
    bounds: gc1MainFloorMeshGetBounds(),
  };
  var search = gc1MainFloorMeshState.search;
  search.openSet[gc1MainFloorMeshCellKey(startCell[0], startCell[1])] = true;
  search.gScore[gc1MainFloorMeshCellKey(startCell[0], startCell[1])] = 0;
  search.fScore[gc1MainFloorMeshCellKey(startCell[0], startCell[1])] =
    gc1MainFloorMeshHeuristic(
      startCell[0],
      startCell[1],
      goalCell[0],
      goalCell[1],
    );
  gc1MainFloorMeshState.searchTaskId = TS.run(
    gc1MainFloorMeshSearchTick,
    50,
    GC1_MAIN_FLOOR_MESH_GROUP,
  );
  return true;
}

// the search tick grows the route from the start cell to the goal cell
function gc1MainFloorMeshSearchTick() {
  // this is basically a chunked A* search
  // we only expand a few cells per tick so the world does not get interrupted
  gc1MainFloorMeshState.searchTaskId = null;
  var task = gc1MainFloorMeshState.search;
  if (!task || task.serial !== gc1MainFloorMeshState.activeSerial) return false;
  var goalKey = gc1MainFloorMeshCellKey(task.goal[0], task.goal[1]);
  for (var step = 0; step < GC1_MAIN_FLOOR_SEARCH_NODES_PER_TICK; step++) {
    if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
      if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
        gc1MainFloorMeshState.searchTaskId = TS.run(
          gc1MainFloorMeshSearchTick,
          100,
          GC1_MAIN_FLOOR_MESH_GROUP,
        );
      return true;
    }
    var bestKey = gc1MainFloorMeshPopBestOpen(task);
    if (!bestKey) {
      // no route found
      gc1MainFloorMeshState.search = null;
      gc1MainFloorMeshState.active = false;
      return false;
    }
    if (bestKey === goalKey) {
      // route found, so we switch from search mode into movement mode (yay)
      var path = gc1MainFloorMeshAssembleRoute(task, goalKey);
      gc1MainFloorMeshState.search = null;
      gc1MainFloorMeshState.route = path;
      gc1MainFloorMeshState.routeIndex =
        gc1MainFloorMeshInitialRouteIndex(path);
      if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
        gc1MainFloorMeshState.moveTaskId = TS.run(
          gc1MainFloorMeshMoveTick,
          50,
          GC1_MAIN_FLOOR_MESH_GROUP,
        );
      return true;
    }
    var parts = bestKey.split(","),
      x = Number(parts[0]),
      z = Number(parts[1]);
    for (var d = 0; d < GC1_DIRS.length; d++) {
      // try every straight and diagonal neighbor around the current cell
      if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          gc1MainFloorMeshState.searchTaskId = TS.run(
            gc1MainFloorMeshSearchTick,
            100,
            GC1_MAIN_FLOOR_MESH_GROUP,
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
      if (!gc1MainFloorMeshCanStepTo(task, x, z, nx, nz)) continue;
      var neighborKey = gc1MainFloorMeshCellKey(nx, nz),
        tentative = task.gScore[bestKey] + dir[2];
      if (
        task.gScore[neighborKey] !== undefined &&
        tentative >= task.gScore[neighborKey]
      )
        continue;
      task.cameFrom[neighborKey] = bestKey;
      task.gScore[neighborKey] = tentative;
      task.fScore[neighborKey] =
        tentative +
        gc1MainFloorMeshHeuristic(nx, nz, task.goal[0], task.goal[1]);
      if (!task.openSet[neighborKey]) {
        task.open.push(neighborKey);
        task.openSet[neighborKey] = true;
      }
    }
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    gc1MainFloorMeshState.searchTaskId = TS.run(
      gc1MainFloorMeshSearchTick,
      50,
      GC1_MAIN_FLOOR_MESH_GROUP,
    );
  return true;
}

// the move tick walks the mob along the current route, one small step at a time
function gc1MainFloorMeshMoveTick() {
  // once the route exists, this function just keeps nudging granny toward the next point
  gc1MainFloorMeshState.moveTaskId = null;
  var route = gc1MainFloorMeshState.route;
  var pending = gc1MainFloorMeshState.pendingTarget;
  var mobId =
    typeof globalThis.gc1GrannyId === "function"
      ? globalThis.gc1GrannyId()
      : globalThis.gc1GrannyMobId;
  if (
    !route ||
    !pending ||
    !mobId ||
    !api.checkValid(mobId) ||
    pending.serial !== gc1MainFloorMeshState.activeSerial
  ) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    return false;
  }
  var nextCell = route[gc1MainFloorMeshState.routeIndex];
  // route points can be normal 2d grid cells or full 3d stair points
  if (!nextCell) {
    gc1MainFloorMeshState.active = false;
    gc1MainFloorMeshState.route = null;
    gc1MainFloorMeshResetRouteMeta();
    return false;
  }
  var currentPos = gc1MobPos(mobId);
  if (!currentPos) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      gc1MainFloorMeshState.moveTaskId = TS.run(
        gc1MainFloorMeshMoveTick,
        50,
        GC1_MAIN_FLOOR_MESH_GROUP,
      );
    return true;
  }
  var goalPos =
    nextCell.length >= 3
      ? [nextCell[0], nextCell[1], nextCell[2]]
      : [nextCell[0] + 0.5, gc1MainFloorMeshY(), nextCell[1] + 0.5];
  var dx = goalPos[0] - currentPos[0];
  var dy = goalPos[1] - currentPos[1];
  var dz = goalPos[2] - currentPos[2];
  var distSq = dx * dx + dy * dy + dz * dz;
  var isStairPoint =
    gc1MainFloorMeshState.routeIsStairs && nextCell.length >= 3;
  var isVerticalMove = isStairPoint || Math.abs(dy) > 0.2;
  // stairs need a bigger reach distance because vertical movement is rougher
  var reachedDistSq = isVerticalMove
    ? GC1_MAIN_FLOOR_STAIR_REACHED_DIST_SQ
    : GC1_MAIN_FLOOR_REACHED_DIST_SQ;
  if (distSq <= reachedDistSq) {
    try {
      api.setPosition(mobId, goalPos[0], goalPos[1], goalPos[2]);
    } catch (e) {}
    gc1MainFloorMeshState.routeIndex++;
    if (gc1MainFloorMeshState.routeIndex >= route.length) {
      var finishedSerial = pending.serial || 0;
      if (gc1MainFloorMeshHandleArrival(mobId, pending)) {
        gc1MainFloorMeshState.active = false;
        gc1MainFloorMeshState.route = null;
        gc1MainFloorMeshResetRouteMeta();
        return true;
      }
      if (
        typeof globalThis.gc1OnGrannyTargetReached === "function" &&
        globalThis.gc1OnGrannyTargetReached(mobId, pending)
      )
        return true;
      gc1MainFloorMeshClearTarget(finishedSerial);
      return true;
    }
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      gc1MainFloorMeshState.moveTaskId = TS.run(
        gc1MainFloorMeshMoveTick,
        50,
        GC1_MAIN_FLOOR_MESH_GROUP,
      );
    return true;
  }
  var dist = Math.sqrt(distSq);
  var moveStep = GC1_MAIN_FLOOR_MOVE_STEP;
  // stair points move a little differently so granny does not jitter on the steps
  if (gc1MainFloorMeshState.routeIsStairs || isVerticalMove)
    moveStep = Math.max(moveStep, GC1_MAIN_FLOOR_STAIR_STEP);
  var step = Math.min(moveStep, dist);
  var inv = step / (dist || 1);
  var nextY = isVerticalMove ? goalPos[1] : currentPos[1] + dy * inv;
  try {
    api.setPosition(
      mobId,
      currentPos[0] + dx * inv,
      nextY,
      currentPos[2] + dz * inv,
    );
    var facedPlayer =
      pending.meta &&
      pending.meta.kind === "alert" &&
      pending.meta.playerId != null &&
      typeof globalThis.gc1VisionFacePlayer === "function" &&
      globalThis.gc1VisionFacePlayer(mobId, pending.meta.playerId);
    if (!facedPlayer) api.setEntityRotation(mobId, 0, Math.atan2(dx, dz), 0);
  } catch (e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    gc1MainFloorMeshState.moveTaskId = TS.run(
      gc1MainFloorMeshMoveTick,
      50,
      GC1_MAIN_FLOOR_MESH_GROUP,
    );
  return true;
}

// this is the signal entry point other systems call when granny needs a new target
function gc1MainFloorMeshSignalTarget(worldPos, meshId, meta) {
  // examples of targets:
  // dropped puzzle items
  // alert points
  // handoff targets from another floor system
  if (!worldPos || worldPos.length < 3) return false;
  var now = Date.now();
  if (
    gc1MainFloorMeshState.pendingTarget &&
    gc1MainFloorMeshState.pendingTarget.meshId === meshId &&
    now - (gc1MainFloorMeshState.pendingTarget.createdAt || 0) < 80
  ) {
    return true;
  }
  if (typeof globalThis.gc1OnMainFloorTargetSignaled === "function")
    globalThis.gc1OnMainFloorTargetSignaled(meta || null);
  gc1MainFloorMeshState.pendingSerial++;
  gc1MainFloorMeshState.pendingTarget = {
    pos: [worldPos[0], worldPos[1], worldPos[2]],
    meshId: meshId || null,
    meta: meta || null,
    serial: gc1MainFloorMeshState.pendingSerial,
    createdAt: now,
  };
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_MAIN_FLOOR_MESH_GROUP);
  gc1MainFloorMeshState.active = false;
  gc1MainFloorMeshState.route = null;
  gc1MainFloorMeshState.routeIndex = 0;
  gc1MainFloorMeshState.search = null;
  gc1MainFloorMeshState.searchTaskId = null;
  gc1MainFloorMeshState.moveTaskId = null;
  gc1MainFloorMeshState.dispatchTaskId = null;
  if (typeof globalThis.gc1StopBasementDropRoute === "function")
    globalThis.gc1StopBasementDropRoute();
  if (typeof globalThis.gc1StopFloor1Route === "function")
    globalThis.gc1StopFloor1Route();
  gc1MainFloorMeshResetRouteMeta();
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    gc1MainFloorMeshState.dispatchTaskId = TS.run(
      gc1MainFloorMeshDispatchPendingTarget,
      50,
      GC1_MAIN_FLOOR_MESH_GROUP,
    );
    return true;
  }
  var ran = gc1MainFloorMeshDispatchPendingTarget();
  return ran;
}

function gc1MainFloorMeshResumeTarget(pending) {
  // this lets another system hand the same target back after a transition
  var src =
    pending && pending.pos ? pending : gc1MainFloorMeshState.pendingTarget;
  if (!src || !src.pos) return false;
  var now = Date.now();
  var serial = src.serial || 0;
  if (!serial) {
    gc1MainFloorMeshState.pendingSerial++;
    serial = gc1MainFloorMeshState.pendingSerial;
  } else if (serial > gc1MainFloorMeshState.pendingSerial) {
    gc1MainFloorMeshState.pendingSerial = serial;
  }
  if (
    !gc1MainFloorMeshState.pendingTarget ||
    gc1MainFloorMeshState.pendingTarget.serial !== serial
  ) {
    gc1MainFloorMeshState.pendingTarget = {
      pos: [src.pos[0], src.pos[1], src.pos[2]],
      meshId: src.meshId || null,
      meta: src.meta || null,
      serial: serial,
      createdAt: now - 100,
    };
  } else {
    gc1MainFloorMeshState.pendingTarget.createdAt = now - 100;
  }
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_MAIN_FLOOR_MESH_GROUP);
  gc1MainFloorMeshState.active = false;
  gc1MainFloorMeshState.route = null;
  gc1MainFloorMeshState.routeIndex = 0;
  gc1MainFloorMeshState.search = null;
  gc1MainFloorMeshState.searchTaskId = null;
  gc1MainFloorMeshState.moveTaskId = null;
  gc1MainFloorMeshState.dispatchTaskId = null;
  gc1MainFloorMeshResetRouteMeta();
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    gc1MainFloorMeshState.dispatchTaskId = TS.run(
      gc1MainFloorMeshDispatchPendingTarget,
      50,
      GC1_MAIN_FLOOR_MESH_GROUP,
    );
    return true;
  }
  var resumed = gc1MainFloorMeshDispatchPendingTarget();
  return resumed;
}

function gc1GetMainFloorUpstairsLandingPoint() {
  var approachCell = gc1MainFloorMeshFindApproachCell(GC1_STAIRS_UP_POINTS[0]);
  return approachCell
    ? gc1MainFloorMeshWorldPoint(approachCell)
    : [25.5, gc1MainFloorMeshY(), 26.5];
}

function gc1GetBasementMainFloorLandingPoint() {
  var approachCell = gc1MainFloorMeshFindApproachCell([
    17.5,
    gc1MainFloorMeshY(),
    23.5,
  ]);
  return approachCell
    ? gc1MainFloorMeshWorldPoint(approachCell)
    : [17.5, gc1MainFloorMeshY(), 24.5];
}

globalThis.gc1MainFloorMeshBuildStairRoute = gc1MainFloorMeshBuildStairRoute;
globalThis.gc1GetMainFloorWaypointCells = gc1MainFloorMeshGetWaypointCells;

globalThis.gc1SignalMainFloorMeshTarget = gc1MainFloorMeshSignalTarget;
globalThis.gc1MainFloorMeshSignalTarget = gc1MainFloorMeshSignalTarget;
globalThis.gc1ResumeMainFloorMeshTarget = gc1MainFloorMeshResumeTarget;
globalThis.gc1ClearMainFloorMeshTarget = gc1MainFloorMeshClearTarget;
globalThis.gc1GetMainFloorUpstairsLandingPoint =
  gc1GetMainFloorUpstairsLandingPoint;
globalThis.gc1GetBasementMainFloorLandingPoint =
  gc1GetBasementMainFloorLandingPoint;
// make sure to join bloxdhub.com hehe
