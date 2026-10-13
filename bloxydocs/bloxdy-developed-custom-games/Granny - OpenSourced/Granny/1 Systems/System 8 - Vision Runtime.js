/*
  Granny Open Source - System 8

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we also added extra comments here so the sight and memory logic is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 8 - Vision Runtime */

// this is granny's vision system
// it checks who she can see, who she remembers, and when to send a new chase signal
var GC1_VISION_GROUP = "gc1_granny_vision";
var GC1_VISION_SEARCH_GROUP = "gc1_granny_vision_search";
var GC1_VISION_IDLE_DELAY = 1000;
var GC1_VISION_PATROL_DELAY = 500;
var GC1_VISION_TRACK_DELAY = 350;
var GC1_VISION_RANGE = 19;
var GC1_VISION_RANGE_SQ = GC1_VISION_RANGE * GC1_VISION_RANGE;
var GC1_VISION_CROUCH_RANGE_MULT = 0.58;
var GC1_VISION_MIN_DOT = 0.1;
var GC1_VISION_SAMPLE_STEP = 0.9;
var GC1_VISION_MAX_SAMPLES = 24;
var GC1_VISION_REPATH_MS = 900;
var GC1_VISION_TARGET_MOVE_SQ = 2.25;
var GC1_VISION_MEMORY_MS = 2000;
var GC1_VISION_FORGET_MISSES = 22;

var gc1OldVisionState =
  typeof globalThis.gc1VisionState === "object" && globalThis.gc1VisionState
    ? globalThis.gc1VisionState
    : null;
var gc1VisionHookIsFreshPatrol = !!(
  globalThis.gc1OnGrannyTargetReached &&
  globalThis.gc1OnGrannyTargetReached.gc1PatrolRuntime
);
if (
  !gc1VisionHookIsFreshPatrol &&
  gc1OldVisionState &&
  gc1OldVisionState.prevHooks
) {
  if (typeof gc1OldVisionState.prevHooks.targetReached === "function")
    globalThis.gc1OnGrannyTargetReached =
      gc1OldVisionState.prevHooks.targetReached;
  if (typeof gc1OldVisionState.prevHooks.targetSignaled === "function")
    globalThis.gc1OnMainFloorTargetSignaled =
      gc1OldVisionState.prevHooks.targetSignaled;
  if (typeof gc1OldVisionState.prevHooks.targetCleared === "function")
    globalThis.gc1OnMainFloorTargetCleared =
      gc1OldVisionState.prevHooks.targetCleared;
}
if (typeof TS !== "undefined" && TS && typeof TS.stop === "function") {
  TS.stop(GC1_VISION_GROUP);
  TS.stop(GC1_VISION_SEARCH_GROUP);
}

globalThis.gc1VisionState = {
  enabled: !(gc1OldVisionState && gc1OldVisionState.enabled === false),
  taskId: null,
  activePlayerId: null,
  lastSeenPos: null,
  lastSeenAt: 0,
  lostAt: 0,
  lastSignalPos: null,
  lastSignalAt: 0,
  misses: 0,
  scanCursor:
    gc1OldVisionState && typeof gc1OldVisionState.scanCursor === "number"
      ? gc1OldVisionState.scanCursor
      : 0,
  interrupted: false,
  lostSignalSent: false,
  prevHooks: null,
};
var gc1VisionState = globalThis.gc1VisionState;

// quick helper so long loops can back off before the runtime interrupts
function gc1VisionNearInterrupt() {
  return typeof api.isNearInterrupt === "function" && api.isNearInterrupt();
}

// tiny wrapper just so the rest of the file reads cleaner
function gc1VisionNow() {
  return Date.now();
}

// clone a position so later edits do not mutate the original array
function gc1VisionClonePos(pos) {
  return pos && pos.length >= 3 ? [pos[0], pos[1], pos[2]] : null;
}

// squared distance again for cheaper comparisons
function gc1VisionDistSq(a, b) {
  if (!a || !b) return Infinity;
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

// find granny's entity id from whichever global is currently active
function gc1VisionGetMobId() {
  return typeof globalThis.gc1GrannyId === "function"
    ? globalThis.gc1GrannyId()
    : globalThis.gc1GrannyMobId;
}

// use GC cache if it exists, otherwise hit the api directly
function gc1VisionGetPos(entityId) {
  return typeof GC !== "undefined" && GC && typeof GC.getPos === "function"
    ? GC.getPos(entityId)
    : (function () {
        try {
          return api.getPosition(entityId);
        } catch (e) {}
        return null;
      })();
}

// same idea here but for the player list
function gc1VisionGetPlayerIds() {
  return typeof GC !== "undefined" &&
    GC &&
    typeof GC.getPlayerIds === "function"
    ? GC.getPlayerIds()
    : (function () {
        try {
          return api.getPlayerIds() || [];
        } catch (e) {}
        return [];
      })();
}

// eye height is used for the main line of sight test
function gc1VisionEyePos(pos) {
  return pos && pos.length >= 3 ? [pos[0], pos[1] + 1.15, pos[2]] : null;
}

// body height gives us a second check so tiny edge cases do not count as visible
function gc1VisionBodyPos(pos) {
  return pos && pos.length >= 3 ? [pos[0], pos[1] + 0.62, pos[2]] : null;
}

// crouching players are harder to see, so their sight range is shorter
function gc1VisionRangeSqForPlayer(playerId) {
  var range = GC1_VISION_RANGE;
  try {
    if (
      typeof api.isPlayerCrouching === "function" &&
      api.isPlayerCrouching(playerId)
    )
      range *= GC1_VISION_CROUCH_RANGE_MULT;
  } catch (e) {}
  return range * range;
}

// read which way granny is facing
function gc1VisionYaw(mobId) {
  if (!mobId || !api.checkValid(mobId)) return 0;
  try {
    var rotation = api.getEntityRotation(mobId);
    if (rotation && rotation.length >= 2 && typeof rotation[1] === "number")
      return rotation[1];
  } catch (e) {}
  try {
    var heading = api.getEntityHeading(mobId);
    if (typeof heading === "number")
      return (heading * Math.PI) / 180 - Math.PI * 0.5;
  } catch (e) {}
  return 0;
}

// helper for forcing granny to turn toward a player
function gc1VisionFacePlayer(mobId, playerId) {
  if (!mobId || !api.checkValid(mobId)) return false;
  if (playerId == null) playerId = gc1VisionState.activePlayerId;
  if (playerId == null) return false;
  var mobPos = gc1VisionGetPos(mobId);
  var playerPos = gc1VisionGetPos(playerId);
  if (!mobPos || !playerPos) return false;
  var dx = playerPos[0] - mobPos[0],
    dz = playerPos[2] - mobPos[2];
  if (dx * dx + dz * dz < 0.0001) return false;
  try {
    api.setEntityRotation(mobId, 0, Math.atan2(dx, dz), 0);
    return true;
  } catch (e) {}
  return false;
}

// turn one yaw number into a flat forward vector
function gc1VisionForward(yaw) {
  return [Math.sin(yaw), Math.cos(yaw)];
}

// some blocks should not count as vision blockers (due to them not being full blocks)
// carpets and invisible helpers are the main examples 
function gc1VisionIgnoredBlock(blockName) {
  if (!blockName || blockName === "Air") return true;
  if (
    blockName === "Invisible Solid" ||
    blockName === "Dangling Rope" ||
    blockName === "Engraved Diorite Slab"
  )
    return true;
  var lower = String(blockName).toLowerCase();
  return lower.indexOf("carpet") >= 0 || lower.indexOf("invisible solid") >= 0;
}

// sample blocks along the line between granny and the target
// if any solid block is in the way, sight is blocked
function gc1VisionBlocked(fromPos, toPos) {
  if (!fromPos || !toPos) return true;
  var dx = toPos[0] - fromPos[0],
    dy = toPos[1] - fromPos[1],
    dz = toPos[2] - fromPos[2];
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (!dist) return false;
  var samples = Math.min(
    GC1_VISION_MAX_SAMPLES,
    Math.max(1, Math.floor(dist / GC1_VISION_SAMPLE_STEP)),
  );
  for (var i = 1; i < samples; i++) {
    if (gc1VisionNearInterrupt()) {
      gc1VisionState.interrupted = true;
      return true;
    }
    var t = i / samples;
    var bx = Math.floor(fromPos[0] + dx * t);
    var by = Math.floor(fromPos[1] + dy * t);
    var bz = Math.floor(fromPos[2] + dz * t);
    var blockName = null;
    try {
      blockName = api.getBlock(bx, by, bz);
    } catch (e) {}
    if (gc1VisionIgnoredBlock(blockName)) continue;
    try {
      if (
        typeof api.getBlockSolidity === "function" &&
        !api.getBlockSolidity(bx, by, bz)
      )
        continue;
    } catch (e) {}
    return true;
  }
  return false;
}

// test one player and decide if they are a valid seen target
// this checks distance, facing cone, and line of sight
function gc1VisionCandidate(playerId, grannyEye, forward) {
  if (playerId == null || !grannyEye || !forward) return null;
  var pos = gc1VisionGetPos(playerId);
  if (!pos) return null;
  var eye = gc1VisionEyePos(pos);
  if (!eye) return null;
  var dx = eye[0] - grannyEye[0],
    dy = eye[1] - grannyEye[1],
    dz = eye[2] - grannyEye[2];
  var distSq = dx * dx + dy * dy + dz * dz;
  if (distSq > gc1VisionRangeSqForPlayer(playerId)) return null;
  var flatSq = dx * dx + dz * dz;
  if (flatSq > 0.0001) {
    var dot = (dx * forward[0] + dz * forward[1]) / Math.sqrt(flatSq);
    if (dot < GC1_VISION_MIN_DOT) return null;
  }
  if (gc1VisionBlocked(grannyEye, eye)) return null;
  var body = gc1VisionBodyPos(pos);
  if (body && gc1VisionBlocked(grannyEye, body)) return null;
  return { playerId: playerId, pos: gc1VisionClonePos(pos), distSq: distSq };
}

// pick who granny should focus on this tick
// active target gets first dibs, then we scan one more player per loop
function gc1VisionPickCandidate(mobId, grannyPos) {
  var grannyEye = gc1VisionEyePos(grannyPos);
  if (!grannyEye) return null;
  var forward = gc1VisionForward(gc1VisionYaw(mobId));
  var ids = gc1VisionGetPlayerIds();
  if (!ids || !ids.length) return null;
  if (gc1VisionState.activePlayerId != null) {
    var active = gc1VisionCandidate(
      gc1VisionState.activePlayerId,
      grannyEye,
      forward,
    );
    if (active || gc1VisionState.interrupted) return active;
  }
  var len = ids.length;
  var start = ((gc1VisionState.scanCursor % len) + len) % len;
  for (var scanned = 0; scanned < len && scanned < 1; scanned++) {
    if (gc1VisionNearInterrupt()) {
      gc1VisionState.interrupted = true;
      return null;
    }
    var playerId = ids[(start + scanned) % len];
    if (playerId === gc1VisionState.activePlayerId) continue;
    var info = gc1VisionCandidate(playerId, grannyEye, forward);
    gc1VisionState.scanCursor = (start + scanned + 1) % len;
    if (info || gc1VisionState.interrupted) return info;
  }
  gc1VisionState.scanCursor = (start + 1) % len;
  return null;
}

// current chase target from the mesh system
function gc1VisionCurrentPending() {
  return globalThis.gc1MainFloorMeshState
    ? globalThis.gc1MainFloorMeshState.pendingTarget
    : null;
}

// do not spam new alerts while another floor handoff is already in progress
function gc1VisionRouteBusyWithHandoff(floorId) {
  if (floorId === "floor1") {
    if (
      globalThis.gc1MainFloorMeshState &&
      (globalThis.gc1MainFloorMeshState.routeIsStairs ||
        (globalThis.gc1MainFloorMeshState.search &&
          globalThis.gc1MainFloorMeshState.pendingTarget &&
          globalThis.gc1MainFloorMeshState.pendingTarget.meta &&
          globalThis.gc1MainFloorMeshState.pendingTarget.meta.floorId ===
            "floor1"))
    )
      return true;
    if (
      globalThis.gc1Floor1State &&
      (globalThis.gc1Floor1State.active ||
        globalThis.gc1Floor1State.search ||
        globalThis.gc1Floor1State.searchTaskId)
    )
      return true;
  }
  if (floorId === "basement") {
    if (
      globalThis.gc1MainFloorMeshState &&
      (globalThis.gc1MainFloorMeshState.routeIsStairs ||
        (globalThis.gc1MainFloorMeshState.search &&
          globalThis.gc1MainFloorMeshState.pendingTarget &&
          globalThis.gc1MainFloorMeshState.pendingTarget.meta &&
          globalThis.gc1MainFloorMeshState.pendingTarget.meta.floorId ===
            "basement"))
    )
      return true;
    if (
      globalThis.gc1BasementDropState &&
      (globalThis.gc1BasementDropState.active ||
        globalThis.gc1BasementDropState.route ||
        globalThis.gc1BasementDropState.taskId)
    )
      return true;
  }
  return false;
}

// decide if we should send a fresh alert route
// we skip it when the target barely moved or we just repathed a second ago
function gc1VisionShouldSignal(info) {
  if (!info || !info.pos) return false;
  var pending = gc1VisionCurrentPending();
  if (!pending || !pending.meta || pending.meta.kind !== "alert") return true;
  if (pending.meta.playerId !== info.playerId) return true;
  if (!gc1VisionState.lastSignalPos) return true;
  if (gc1VisionRouteBusyWithHandoff(pending.meta.floorId)) return false;
  if (gc1VisionNow() - gc1VisionState.lastSignalAt < GC1_VISION_REPATH_MS)
    return false;
  return (
    gc1VisionDistSq(gc1VisionState.lastSignalPos, info.pos) >=
    GC1_VISION_TARGET_MOVE_SQ
  );
}

// send the current seen target into the chase route system
function gc1VisionSignal(info, alertKind) {
  if (
    !info ||
    !info.pos ||
    typeof globalThis.gc1SignalGrannyAlert !== "function"
  )
    return false;
  var ok = !!globalThis.gc1SignalGrannyAlert(info.pos, {
    alertKind: alertKind || "vision",
    playerId: info.playerId,
    seenAt: gc1VisionNow(),
  });
  if (ok) {
    gc1VisionState.lastSignalPos = gc1VisionClonePos(info.pos);
    gc1VisionState.lastSignalAt = gc1VisionNow();
  }
  return ok;
}

// update memory when we can still see the player
function gc1VisionOnSeen(info) {
  gc1VisionState.activePlayerId = info.playerId;
  gc1VisionState.lastSeenPos = gc1VisionClonePos(info.pos);
  gc1VisionState.lastSeenAt = gc1VisionNow();
  gc1VisionState.lostAt = 0;
  gc1VisionState.misses = 0;
  gc1VisionState.lostSignalSent = false;
  if (gc1VisionShouldSignal(info)) gc1VisionSignal(info, "vision");
}

// once granny loses sight, she does not forget instantly
// she keeps a short memory, then falls back to the last seen spot
function gc1VisionOnMiss() {
  if (gc1VisionState.activePlayerId == null) return;
  var now = gc1VisionNow();
  if (!gc1VisionState.lostAt) gc1VisionState.lostAt = now;
  gc1VisionState.misses++;
  if (now - gc1VisionState.lostAt <= GC1_VISION_MEMORY_MS) {
    var memoryPos = gc1VisionGetPos(gc1VisionState.activePlayerId);
    if (memoryPos) {
      var memoryInfo = {
        playerId: gc1VisionState.activePlayerId,
        pos: gc1VisionClonePos(memoryPos),
      };
      gc1VisionState.lastSeenPos = gc1VisionClonePos(memoryPos);
      gc1VisionState.lastSeenAt = now;
      if (gc1VisionShouldSignal(memoryInfo))
        gc1VisionSignal(memoryInfo, "memory");
    }
    return;
  }
  if (!gc1VisionState.lostSignalSent && gc1VisionState.lastSeenPos) {
    gc1VisionSignal(
      {
        playerId: gc1VisionState.activePlayerId,
        pos: gc1VisionClonePos(gc1VisionState.lastSeenPos),
      },
      "last_seen",
    );
    gc1VisionState.lostSignalSent = true;
  }
  if (gc1VisionState.misses >= GC1_VISION_FORGET_MISSES) {
    gc1VisionState.activePlayerId = null;
    gc1VisionState.lastSeenPos = null;
    gc1VisionState.lastSeenAt = 0;
    gc1VisionState.lostAt = 0;
    gc1VisionState.misses = 0;
    gc1VisionState.lostSignalSent = false;
  }
}

// only run when patrol is armed and alert routing exists
function gc1VisionCanRun() {
  return !!(
    gc1VisionState.enabled &&
    globalThis.gc1PatrolState &&
    globalThis.gc1PatrolState.armed &&
    typeof globalThis.gc1SignalGrannyAlert === "function"
  );
}

// full wipe of the current remembered target
function gc1VisionClearTrack() {
  gc1VisionState.activePlayerId = null;
  gc1VisionState.lastSeenPos = null;
  gc1VisionState.lastSeenAt = 0;
  gc1VisionState.lostAt = 0;
  gc1VisionState.misses = 0;
  gc1VisionState.lostSignalSent = false;
}

// slower while idle, faster while actively tracking someone
function gc1VisionNextDelay() {
  if (!gc1VisionCanRun()) return GC1_VISION_IDLE_DELAY;
  return gc1VisionState.activePlayerId == null
    ? GC1_VISION_PATROL_DELAY
    : GC1_VISION_TRACK_DELAY;
}

// queue the next vision loop tick
function gc1VisionSchedule(delayMs) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return null;
  delayMs = typeof delayMs === "number" ? delayMs : gc1VisionNextDelay();
  if (typeof globalThis.gc1QueueLatestTask === "function") {
    gc1VisionState.taskId = globalThis.gc1QueueLatestTask(
      GC1_VISION_GROUP,
      gc1VisionLoop,
      delayMs,
    );
    return gc1VisionState.taskId;
  }
  if (typeof TS.stop === "function") TS.stop(GC1_VISION_GROUP);
  gc1VisionState.taskId = TS.run(gc1VisionLoop, delayMs, GC1_VISION_GROUP);
  return gc1VisionState.taskId;
}

function gc1VisionLoop() {
  gc1VisionState.taskId = null;
  if (!gc1VisionCanRun()) {
    gc1VisionClearTrack();
    gc1VisionSchedule(GC1_VISION_IDLE_DELAY);
    return false;
  }
  if (gc1VisionNearInterrupt()) {
    gc1VisionSchedule(GC1_VISION_IDLE_DELAY);
    return false;
  }
  var mobId = gc1VisionGetMobId();
  if (!mobId || !api.checkValid(mobId)) {
    gc1VisionClearTrack();
    gc1VisionSchedule(GC1_VISION_IDLE_DELAY);
    return false;
  }
  var grannyPos = gc1VisionGetPos(mobId);
  if (!grannyPos) {
    gc1VisionSchedule(GC1_VISION_IDLE_DELAY);
    return false;
  }
  gc1VisionState.interrupted = false;
  var seen = gc1VisionPickCandidate(mobId, grannyPos);
  if (gc1VisionState.interrupted) {
    gc1VisionSchedule(GC1_VISION_IDLE_DELAY);
    return false;
  }
  if (seen) gc1VisionOnSeen(seen);
  else gc1VisionOnMiss();
  gc1VisionSchedule();
  return !!seen;
}

gc1VisionSchedule(GC1_VISION_IDLE_DELAY);

globalThis.gc1VisionScheduleLoop = gc1VisionSchedule;
globalThis.gc1VisionStopSearch = function () {
  return true;
};
globalThis.gc1VisionFacePlayer = gc1VisionFacePlayer;
globalThis.gc1VisionState = gc1VisionState;
