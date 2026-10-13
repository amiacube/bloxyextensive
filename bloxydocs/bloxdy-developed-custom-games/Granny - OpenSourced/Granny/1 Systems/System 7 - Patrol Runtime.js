/*
  Granny Open Source - System 7

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we also added extra comments here so the patrol flow is easier to follow from top to bottom
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 7 - Patrol Runtime */

// this whole system is granny's idle brain
// if she is not actively chasing someone, this is what picks places to wander to
// and what makes her stop, look around, then keep walking again
var GC1_MAIN_PATROL_GROUP = "gc1_main_patrol";
var GC1_MAIN_PATROL_SEARCH_GROUP = "gc1_main_patrol_search";
var GC1_MAIN_PATROL_RETRY_DELAY = 900;
var GC1_MAIN_PATROL_SEARCH_IDLE_MS = 950;
var GC1_MAIN_PATROL_SEARCH_LOOK_MS = 700;
var GC1_MAIN_PATROL_SEARCH_RETURN_MS = 250;
var GC1_MAIN_PATROL_SEARCH_TURN_RAD = Math.PI * 0.38;
var GC1_MAIN_PATROL_ALERT_SEARCH_MS = 7000;
var GC1_MAIN_PATROL_ALERT_LOOK_MS = 650;

globalThis.gc1PatrolState = Object.assign(
  {
    enabled: true,
    armed: false,
    routeVisitSerial: 0,
    lastWaypointFloorId: null,
    lastWaypointCell: null,
    searchActive: false,
    searchToken: 0,
    searchTaskId: null,
    scheduleTaskId: null,
    alertSerial: 0,
  },
  typeof globalThis.gc1PatrolState === "object" && globalThis.gc1PatrolState
    ? globalThis.gc1PatrolState
    : {},
);
var gc1PatrolState = globalThis.gc1PatrolState;

function gc1MainFloorWaypointCellsEqual(a, b) {
  return !!(a && b && a[0] === b[0] && a[1] === b[1]);
}

// collect every reusable waypoint from every floor into one patrol list
function gc1BuildPatrolTargets() {
  var out = [];
  var mainY =
    typeof globalThis.gc1MainFloorY === "function"
      ? globalThis.gc1MainFloorY()
      : typeof globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y === "number"
        ? globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y
        : 56;
  var floor1Y =
    typeof globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y === "number"
      ? globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y
      : 62;
  var basementY =
    typeof globalThis.gc1GetBasementFloorY === "function"
      ? globalThis.gc1GetBasementFloorY()
      : 51;
  var mainWaypoints =
    typeof globalThis.gc1GetMainFloorWaypointCells === "function"
      ? globalThis.gc1GetMainFloorWaypointCells()
      : null;
  var floor1Waypoints =
    typeof globalThis.gc1GetFloor1WaypointCells === "function"
      ? globalThis.gc1GetFloor1WaypointCells()
      : null;
  var basementWaypoints =
    typeof globalThis.gc1GetBasementWaypointCells === "function"
      ? globalThis.gc1GetBasementWaypointCells()
      : null;
  var i = 0;
  if (mainWaypoints && mainWaypoints.length) {
    for (i = 0; i < mainWaypoints.length; i++)
      out.push({
        floorId: "ground",
        areaType: "ground_floor",
        cell: mainWaypoints[i].slice(),
        pos: [mainWaypoints[i][0] + 0.5, mainY, mainWaypoints[i][1] + 0.5],
      });
  }
  if (floor1Waypoints && floor1Waypoints.length) {
    for (i = 0; i < floor1Waypoints.length; i++)
      out.push({
        floorId: "floor1",
        areaType: "floor1",
        cell: floor1Waypoints[i].slice(),
        pos: [
          floor1Waypoints[i][0] + 0.5,
          floor1Y,
          floor1Waypoints[i][1] + 0.5,
        ],
      });
  }
  if (basementWaypoints && basementWaypoints.length) {
    for (i = 0; i < basementWaypoints.length; i++)
      out.push({
        floorId: "basement",
        areaType: "basement",
        cell: basementWaypoints[i].slice(),
        pos: [
          basementWaypoints[i][0] + 0.5,
          basementY,
          basementWaypoints[i][1] + 0.5,
        ],
      });
  }
  return out;
}

// guess which floor a sound or alert happened on from the world position
function gc1PatrolClassifyAlertFloor(pos) {
  var mainY =
    typeof globalThis.gc1MainFloorY === "function"
      ? globalThis.gc1MainFloorY()
      : typeof globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y === "number"
        ? globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y
        : 56;
  var floor1Y =
    typeof globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y === "number"
      ? globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y
      : 62;
  var basementY =
    typeof globalThis.gc1GetBasementFloorY === "function"
      ? globalThis.gc1GetBasementFloorY()
      : 51;
  if (!pos || pos.length < 3)
    return { floorId: "ground", areaType: "ground_floor" };
  if (pos[1] >= floor1Y - 2) return { floorId: "floor1", areaType: "floor1" };
  if (pos[1] <= basementY + 2)
    return { floorId: "basement", areaType: "basement" };
  if (
    Math.abs(pos[1] - mainY) <= 3 &&
    pos[0] >= 16 &&
    pos[0] <= 28 &&
    pos[2] >= 18 &&
    pos[2] <= 27
  )
    return { floorId: "ground", areaType: "stairs" };
  return { floorId: "ground", areaType: "ground_floor" };
}

// pick a random patrol point, but try not to pick the exact same one we just used
function gc1PickRandomPatrolTarget(excludedFloorId, excludedCell) {
  var targets = gc1BuildPatrolTargets();
  if (!targets.length) return null;
  var options = [];
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i];
    if (
      target.floorId === excludedFloorId &&
      gc1MainFloorWaypointCellsEqual(target.cell, excludedCell)
    )
      continue;
    options.push(target);
  }
  if (!options.length) options = targets;
  var picked = options[Math.floor(Math.random() * options.length)];
  return picked
    ? {
        floorId: picked.floorId,
        areaType: picked.areaType,
        cell: picked.cell.slice(),
        pos: picked.pos.slice(),
      }
    : null;
}

// if any route system is already busy, leave it alone and do not start another patrol
function gc1PatrolRouteBusy() {
  if (
    globalThis.gc1MainFloorMeshState &&
    (globalThis.gc1MainFloorMeshState.active ||
      globalThis.gc1MainFloorMeshState.search ||
      globalThis.gc1MainFloorMeshState.route)
  )
    return true;
  if (
    typeof globalThis.gc1IsBasementDropBusy === "function" &&
    globalThis.gc1IsBasementDropBusy()
  )
    return true;
  if (
    typeof globalThis.gc1IsFloor1DropBusy === "function" &&
    globalThis.gc1IsFloor1DropBusy()
  )
    return true;
  return false;
}

// reset the little look around search state
function gc1PatrolClearSearchState() {
  gc1PatrolState.searchActive = false;
  gc1PatrolState.searchTaskId = null;
}

// stop movement and force granny to stay still for searching / looking around
function gc1PatrolHoldMobIdle(mobId) {
  if (!mobId || !api.checkValid(mobId)) return;
  try {
    api.setVelocity(mobId, 0, 0, 0);
    api.setMobAiState(mobId, "idle", null);
  } catch (e) {}
}

// read current facing so we can rotate granny left and right during patrol scans
function gc1PatrolGetBodyYaw(mobId) {
  if (!mobId || !api.checkValid(mobId)) return 0;
  try {
    var rotation = api.getEntityRotation(mobId);
    if (rotation && rotation.length >= 2 && typeof rotation[1] === "number")
      return rotation[1];
  } catch (e) {}
  return 0;
}

// turn granny's body without changing the rest of the route state
function gc1PatrolSetBodyYaw(mobId, targetYaw) {
  if (!mobId || !api.checkValid(mobId) || typeof targetYaw !== "number")
    return false;
  var currentYaw = gc1PatrolGetBodyYaw(mobId);
  while (targetYaw - currentYaw > Math.PI) targetYaw -= Math.PI * 2;
  while (targetYaw - currentYaw < -Math.PI) targetYaw += Math.PI * 2;
  try {
    api.setEntityRotation(mobId, 0, targetYaw, 0);
  } catch (e) {
    return false;
  }
  return true;
}

// hard stop any patrol search animation that is already running
function gc1StopGrannyPatrolSearch() {
  gc1PatrolState.searchToken++;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_MAIN_PATROL_SEARCH_GROUP);
  gc1PatrolClearSearchState();
  return true;
}

// queue the next patrol attempt
function gc1ScheduleGrannyPatrol(delayMs) {
  if (!gc1PatrolState.enabled || !gc1PatrolState.armed) return false;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return false;
  delayMs = typeof delayMs === "number" ? delayMs : GC1_MAIN_PATROL_RETRY_DELAY;
  if (typeof globalThis.gc1QueueLatestTask === "function") {
    gc1PatrolState.scheduleTaskId = globalThis.gc1QueueLatestTask(
      GC1_MAIN_PATROL_GROUP,
      gc1EnsureGrannyPatrol,
      delayMs,
    );
    return !!gc1PatrolState.scheduleTaskId;
  }
  if (typeof TS.stop === "function") TS.stop(GC1_MAIN_PATROL_GROUP);
  gc1PatrolState.scheduleTaskId = TS.run(
    gc1EnsureGrannyPatrol,
    delayMs,
    GC1_MAIN_PATROL_GROUP,
  );
  return !!gc1PatrolState.scheduleTaskId;
}

// simple 4 phase patrol search:
// 0 = wait
// 1 = look left
// 2 = look right
// 3 = face forward again then continue patrol
function gc1RunGrannyPatrolSearch(token, mobId, baseYaw, phase) {
  if (token !== gc1PatrolState.searchToken) return false;
  if (!mobId || !api.checkValid(mobId)) {
    gc1PatrolClearSearchState();
    return false;
  }
  gc1PatrolState.searchTaskId = null;
  gc1PatrolHoldMobIdle(mobId);
  if (phase === 0) {
    gc1PatrolState.searchTaskId = TS.run(
      function () {
        gc1RunGrannyPatrolSearch(token, mobId, baseYaw, 1);
      },
      GC1_MAIN_PATROL_SEARCH_IDLE_MS,
      GC1_MAIN_PATROL_SEARCH_GROUP,
    );
    return true;
  }
  if (phase === 1) {
    gc1PatrolSetBodyYaw(mobId, baseYaw - GC1_MAIN_PATROL_SEARCH_TURN_RAD);
    gc1PatrolState.searchTaskId = TS.run(
      function () {
        gc1RunGrannyPatrolSearch(token, mobId, baseYaw, 2);
      },
      GC1_MAIN_PATROL_SEARCH_LOOK_MS,
      GC1_MAIN_PATROL_SEARCH_GROUP,
    );
    return true;
  }
  if (phase === 2) {
    gc1PatrolSetBodyYaw(mobId, baseYaw + GC1_MAIN_PATROL_SEARCH_TURN_RAD);
    gc1PatrolState.searchTaskId = TS.run(
      function () {
        gc1RunGrannyPatrolSearch(token, mobId, baseYaw, 3);
      },
      GC1_MAIN_PATROL_SEARCH_LOOK_MS,
      GC1_MAIN_PATROL_SEARCH_GROUP,
    );
    return true;
  }
  if (phase === 3) {
    gc1PatrolSetBodyYaw(mobId, baseYaw);
    gc1PatrolState.searchTaskId = TS.run(
      function () {
        if (token !== gc1PatrolState.searchToken) return;
        gc1PatrolClearSearchState();
        gc1ScheduleGrannyPatrol(350);
      },
      GC1_MAIN_PATROL_SEARCH_RETURN_MS,
      GC1_MAIN_PATROL_SEARCH_GROUP,
    );
    return true;
  }
  gc1PatrolClearSearchState();
  gc1ScheduleGrannyPatrol(350);
  return true;
}

// start the little idle search after granny reaches a patrol target
function gc1BeginGrannyPatrolSearch(mobId, pending) {
  gc1StopGrannyPatrolSearch();
  if (!mobId || !api.checkValid(mobId)) return false;
  var meta = pending && pending.meta ? pending.meta : null;
  if (meta && meta.patrolCell && meta.patrolCell.length >= 2) {
    gc1PatrolState.lastWaypointFloorId = meta.floorId || "ground";
    gc1PatrolState.lastWaypointCell = [meta.patrolCell[0], meta.patrolCell[1]];
  }
  gc1PatrolState.searchActive = true;
  gc1PatrolState.searchToken++;
  var token = gc1PatrolState.searchToken;
  var baseYaw = gc1PatrolGetBodyYaw(mobId);
  gc1PatrolHoldMobIdle(mobId);
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    gc1PatrolClearSearchState();
    gc1ScheduleGrannyPatrol(350);
    return true;
  }
  return gc1RunGrannyPatrolSearch(token, mobId, baseYaw, 0);
}

// alert search is the more paranoid version
// granny keeps looking around for a few seconds after hearing or losing something
function gc1RunGrannyAlertSearch(token, mobId, baseYaw, phase, untilAt) {
  if (token !== gc1PatrolState.searchToken) return false;
  if (!mobId || !api.checkValid(mobId)) {
    gc1PatrolClearSearchState();
    return false;
  }
  gc1PatrolState.searchTaskId = null;
  if (Date.now() >= untilAt) {
    gc1PatrolSetBodyYaw(mobId, baseYaw);
    gc1PatrolClearSearchState();
    gc1ScheduleGrannyPatrol(350);
    return true;
  }
  gc1PatrolHoldMobIdle(mobId);
  var yaws = [0, -0.62, 0.62, -1.05, 1.05, 0.28, -0.28];
  gc1PatrolSetBodyYaw(mobId, baseYaw + yaws[phase % yaws.length]);
  gc1PatrolState.searchTaskId = TS.run(
    function () {
      gc1RunGrannyAlertSearch(token, mobId, baseYaw, phase + 1, untilAt);
    },
    GC1_MAIN_PATROL_ALERT_LOOK_MS,
    GC1_MAIN_PATROL_SEARCH_GROUP,
  );
  return true;
}

// kick off the alert search state
function gc1BeginGrannyAlertSearch(mobId, pending) {
  gc1StopGrannyPatrolSearch();
  if (!mobId || !api.checkValid(mobId)) return false;
  gc1PatrolState.searchActive = true;
  gc1PatrolState.searchToken++;
  var token = gc1PatrolState.searchToken;
  var baseYaw = gc1PatrolGetBodyYaw(mobId);
  var untilAt = Date.now() + GC1_MAIN_PATROL_ALERT_SEARCH_MS;
  gc1PatrolHoldMobIdle(mobId);
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    gc1PatrolClearSearchState();
    gc1ScheduleGrannyPatrol(350);
    return true;
  }
  return gc1RunGrannyAlertSearch(token, mobId, baseYaw, 0, untilAt);
}

// send a chase/alert target into the mesh system
// this is how vision and sound tell patrol where granny should head next
function gc1SignalGrannyAlert(pos, meta) {
  if (!gc1PatrolState.enabled || !gc1PatrolState.armed) return false;
  if (
    !pos ||
    pos.length < 3 ||
    typeof globalThis.gc1SignalMainFloorMeshTarget !== "function"
  )
    return false;
  var floorInfo = gc1PatrolClassifyAlertFloor(pos);
  meta = meta || {};
  gc1PatrolState.alertSerial++;
  return globalThis.gc1SignalMainFloorMeshTarget(pos, meta.meshId || null, {
    kind: "alert",
    alertSerial: gc1PatrolState.alertSerial,
    alertKind: meta.alertKind || "sound",
    playerId: meta.playerId,
    floorId: meta.floorId || floorInfo.floorId,
    areaType: meta.areaType || floorInfo.areaType,
    seenAt: meta.seenAt || Date.now(),
  });
}

// ask the mesh route system to move granny to a random waypoint
function gc1BeginRandomMainFloorPatrol(excludedCell) {
  if (typeof globalThis.gc1SignalMainFloorMeshTarget !== "function")
    return false;
  var target = gc1PickRandomPatrolTarget(
    gc1PatrolState.lastWaypointFloorId,
    excludedCell || gc1PatrolState.lastWaypointCell,
  );
  if (!target) return false;
  gc1PatrolState.routeVisitSerial++;
  return globalThis.gc1SignalMainFloorMeshTarget(target.pos, null, {
    kind: "patrol",
    floorId: target.floorId,
    areaType: target.areaType,
    patrolCell: target.cell.slice(),
    patrolVisitSerial: gc1PatrolState.routeVisitSerial,
  });
}

// main patrol heartbeat
// if nothing more important is happening, keep granny roaming
function gc1EnsureGrannyPatrol() {
  gc1PatrolState.scheduleTaskId = null;
  if (!gc1PatrolState.enabled || !gc1PatrolState.armed) return false;
  if (gc1PatrolState.searchActive) {
    gc1ScheduleGrannyPatrol(GC1_MAIN_PATROL_RETRY_DELAY);
    return false;
  }
  var pending = globalThis.gc1MainFloorMeshState
    ? globalThis.gc1MainFloorMeshState.pendingTarget
    : null;
  if (pending && pending.meta && pending.meta.kind === "patrol") return true;
  if (pending && (!pending.meta || pending.meta.kind !== "patrol")) {
    gc1ScheduleGrannyPatrol(GC1_MAIN_PATROL_RETRY_DELAY);
    return false;
  }
  if (gc1PatrolRouteBusy()) {
    gc1ScheduleGrannyPatrol(GC1_MAIN_PATROL_RETRY_DELAY);
    return false;
  }
  if (
    !(
      typeof globalThis.gc1GrannyExists === "function" &&
      globalThis.gc1GrannyExists()
    ) &&
    !(
      typeof globalThis.gc1SpawnGranny === "function" &&
      globalThis.gc1SpawnGranny()
    )
  ) {
    gc1ScheduleGrannyPatrol(GC1_MAIN_PATROL_RETRY_DELAY);
    return false;
  }
  if (!gc1BeginRandomMainFloorPatrol(gc1PatrolState.lastWaypointCell)) {
    gc1ScheduleGrannyPatrol(GC1_MAIN_PATROL_RETRY_DELAY);
    return false;
  }
  return true;
}

function gc1OnGrannyTargetReached(mobId, pending) {
  if (!gc1PatrolState.enabled || !gc1PatrolState.armed) return false;
  var meta = pending && pending.meta ? pending.meta : null;
  if (!meta) return false;
  if (meta.kind === "alert") {
    var startedAlertSearch = gc1BeginGrannyAlertSearch(mobId, pending);
    if (typeof globalThis.gc1ClearMainFloorMeshTarget === "function")
      globalThis.gc1ClearMainFloorMeshTarget(pending.serial || 0);
    return startedAlertSearch;
  }
  if (meta.kind !== "patrol" && !meta.dropSerial) return false;
  if (typeof globalThis.gc1ClearMainFloorMeshTarget === "function")
    globalThis.gc1ClearMainFloorMeshTarget(pending.serial || 0);
  return gc1BeginGrannyPatrolSearch(mobId, pending);
}

function gc1OnMainFloorTargetSignaled(meta) {
  if (!gc1PatrolState.enabled || !gc1PatrolState.armed) return true;
  gc1StopGrannyPatrolSearch();
  if (
    (!meta || meta.kind !== "patrol") &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.stop === "function"
  )
    TS.stop(GC1_MAIN_PATROL_GROUP);
  return true;
}

function gc1OnMainFloorTargetCleared(clearedPending) {
  if (
    !gc1PatrolState.enabled ||
    !gc1PatrolState.armed ||
    gc1PatrolState.searchActive
  )
    return false;
  var meta = clearedPending && clearedPending.meta ? clearedPending.meta : null;
  if (
    !meta ||
    meta.kind === "patrol" ||
    meta.kind === "alert" ||
    meta.dropSerial
  )
    return gc1ScheduleGrannyPatrol(450);
  return false;
}

function gc1ArmGrannyPatrol(delayMs) {
  gc1PatrolState.armed = true;
  return gc1ScheduleGrannyPatrol(delayMs);
}

function gc1DisarmGrannyPatrol() {
  gc1StopGrannyPatrolSearch();
  gc1PatrolState.armed = false;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_MAIN_PATROL_GROUP);
  gc1PatrolState.scheduleTaskId = null;
  return true;
}

gc1OnGrannyTargetReached.gc1PatrolRuntime = true;
gc1OnMainFloorTargetSignaled.gc1PatrolRuntime = true;
gc1OnMainFloorTargetCleared.gc1PatrolRuntime = true;
gc1SignalGrannyAlert.gc1PatrolRuntime = true;

globalThis.gc1ScheduleGrannyPatrol = gc1ScheduleGrannyPatrol;
globalThis.gc1ArmGrannyPatrol = gc1ArmGrannyPatrol;
globalThis.gc1DisarmGrannyPatrol = gc1DisarmGrannyPatrol;
globalThis.gc1EnsureGrannyPatrol = gc1EnsureGrannyPatrol;
globalThis.gc1StopGrannyPatrolSearch = gc1StopGrannyPatrolSearch;
globalThis.gc1SignalGrannyAlert = gc1SignalGrannyAlert;
globalThis.gc1OnGrannyTargetReached = gc1OnGrannyTargetReached;
globalThis.gc1OnMainFloorTargetSignaled = gc1OnMainFloorTargetSignaled;
globalThis.gc1OnMainFloorTargetCleared = gc1OnMainFloorTargetCleared;
