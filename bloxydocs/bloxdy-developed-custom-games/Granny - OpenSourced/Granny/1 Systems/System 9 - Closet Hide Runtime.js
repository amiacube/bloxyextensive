/*
  Granny Open Source - System 9

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we also added extra comments here so the closet logic makes sense without digging through every helper
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 9 - Closet Hide Runtime */

// this system handles the "player is hiding in a closet" behavior
// the graph value 8 is the important one here because that marks a hide spot
var GC1_CLOSET_HIDE_WAIT_GROUP = "gc1_closet_hide_wait";
var GC1_CLOSET_HIDE_WAIT_MS = 1500;
var GC1_CLOSET_HIDE_CHASE_MEMORY_MS = 2600;
var GC1_CLOSET_HIDE_SCAN_RADIUS = 4;

var gc1OldClosetHideState =
  typeof globalThis.gc1ClosetHideState === "object" &&
  globalThis.gc1ClosetHideState
    ? globalThis.gc1ClosetHideState
    : null;
if (gc1OldClosetHideState && gc1OldClosetHideState.prevHooks) {
  if (typeof gc1OldClosetHideState.prevHooks.signalAlert === "function")
    globalThis.gc1SignalGrannyAlert =
      gc1OldClosetHideState.prevHooks.signalAlert;
  if (typeof gc1OldClosetHideState.prevHooks.targetReached === "function")
    globalThis.gc1OnGrannyTargetReached =
      gc1OldClosetHideState.prevHooks.targetReached;
}
if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
  TS.stop(GC1_CLOSET_HIDE_WAIT_GROUP);

globalThis.gc1ClosetHideState = {
  enabled: !(gc1OldClosetHideState && gc1OldClosetHideState.enabled === false),
  waitTaskId: null,
  layoutCache: { ground: null, floor1: null },
  prevHooks: {
    signalAlert:
      typeof globalThis.gc1SignalGrannyAlert === "function"
        ? globalThis.gc1SignalGrannyAlert
        : null,
    targetReached:
      typeof globalThis.gc1OnGrannyTargetReached === "function"
        ? globalThis.gc1OnGrannyTargetReached
        : null,
  },
};
var gc1ClosetHideState = globalThis.gc1ClosetHideState;

// tiny wrappers just to keep the lower code easier to scan
function gc1ClosetNow() {
  return Date.now();
}

// safe clone for position arrays
function gc1ClosetClonePos(pos) {
  return pos && pos.length >= 3 ? [pos[0], pos[1], pos[2]] : null;
}

// squared distance helper
function gc1ClosetDistSq(a, b) {
  if (!a || !b) return Infinity;
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

// get any entity position, using the shared GC cache if we have it
function gc1ClosetGetEntityPos(entityId) {
  if (entityId == null) return null;
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(entityId);
  try {
    return api.getPosition(entityId);
  } catch (e) {}
  return null;
}

// resolve granny id from the current globals
function gc1ClosetGetGrannyId() {
  return typeof globalThis.gc1GrannyId === "function"
    ? globalThis.gc1GrannyId()
    : globalThis.gc1GrannyMobId;
}

// stop granny in place while she checks a closet area
function gc1ClosetHoldMobIdle(mobId) {
  if (!mobId || !api.checkValid(mobId)) return false;
  try {
    api.setVelocity(mobId, 0, 0, 0);
  } catch (e) {}
  try {
    api.setMobAiState(mobId, "idle", null);
  } catch (e) {}
  return true;
}

// rotate granny so she looks toward a chosen spot
function gc1ClosetFacePos(mobId, targetPos) {
  if (!mobId || !api.checkValid(mobId) || !targetPos || targetPos.length < 3)
    return false;
  var mobPos = gc1ClosetGetEntityPos(mobId);
  if (!mobPos) return false;
  var dx = targetPos[0] - mobPos[0],
    dz = targetPos[2] - mobPos[2];
  if (dx * dx + dz * dz < 0.0001) return false;
  try {
    api.setEntityRotation(mobId, 0, Math.atan2(dx, dz), 0);
    return true;
  } catch (e) {}
  return false;
}

// closet checks only care about floor 1 and main floor layouts right now
// walkable tells us which neighbor tiles are legal approach spots
function gc1ClosetFloorConfigs() {
  return [
    {
      floorId: "floor1",
      rows: globalThis.GRANNY_FLOOR_1_DEBUG_ROWS,
      baseX: globalThis.GRANNY_FLOOR_1_DEBUG_BASE_X,
      baseY: globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Y,
      baseZ: globalThis.GRANNY_FLOOR_1_DEBUG_BASE_Z,
      walkable: { 0: true, 3: true, 4: true, 5: true },
    },
    {
      floorId: "ground",
      rows: globalThis.GRANNY_MAIN_FLOOR_DEBUG_ROWS,
      baseX: globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_X,
      baseY: globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y,
      baseZ: globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Z,
      walkable: { 0: true, 2: true, 3: true, 4: true, 5: true },
    },
  ];
}

// quick floor guess based on Y level
function gc1ClosetFloorMatchesY(pos, cfg) {
  if (!pos || pos.length < 3 || !cfg || typeof cfg.baseY !== "number")
    return false;
  return pos[1] >= cfg.baseY - 1.75 && pos[1] <= cfg.baseY + 2.5;
}

// center point for a graph tile
function gc1ClosetCellCenter(cfg, row, col) {
  return [cfg.baseX + col, cfg.baseY, cfg.baseZ - row];
}

// raw world cell coords for graph comparisons
function gc1ClosetCellWorld(cfg, row, col) {
  return [cfg.baseX - 0.5 + col, cfg.baseZ - 0.5 - row];
}

// scan a whole floor graph and cache every closet tile
// then build a few nearby approach spots granny can path to
function gc1ClosetBuildLayout(cfg) {
  if (!cfg || !cfg.rows || !cfg.rows.length) return null;
  var cache = gc1ClosetHideState.layoutCache[cfg.floorId];
  if (
    cache &&
    cache.rows === cfg.rows &&
    cache.baseX === cfg.baseX &&
    cache.baseY === cfg.baseY &&
    cache.baseZ === cfg.baseZ
  )
    return cache;
  var closets = [];
  var byKey = {};
  for (var row = 0; row < cfg.rows.length; row++) {
    var cells = cfg.rows[row];
    for (var col = 0; col < cells.length; col++) {
      if (cells.charAt(col) !== "8") continue;
      var key = cfg.floorId + ":" + row + "," + col;
      var candidates = [];
      for (var radius = 1; radius <= GC1_CLOSET_HIDE_SCAN_RADIUS; radius++) {
        for (
          var rr = Math.max(0, row - radius);
          rr <= Math.min(cfg.rows.length - 1, row + radius);
          rr++
        ) {
          var line = cfg.rows[rr];
          for (
            var cc = Math.max(0, col - radius);
            cc <= Math.min(line.length - 1, col + radius);
            cc++
          ) {
            if (Math.max(Math.abs(rr - row), Math.abs(cc - col)) !== radius)
              continue;
            if (!cfg.walkable[line.charAt(cc)]) continue;
            var cell = gc1ClosetCellWorld(cfg, rr, cc);
            var center = gc1ClosetCellCenter(cfg, rr, cc);
            var openness = 0;
            for (var dRow = -1; dRow <= 1; dRow++) {
              for (var dCol = -1; dCol <= 1; dCol++) {
                if (!dRow && !dCol) continue;
                var nRow = rr + dRow,
                  nCol = cc + dCol;
                if (nRow < 0 || nRow >= cfg.rows.length) continue;
                if (nCol < 0 || nCol >= cfg.rows[nRow].length) continue;
                if (cfg.walkable[cfg.rows[nRow].charAt(nCol)]) openness++;
              }
            }
            candidates.push({
              row: rr,
              col: cc,
              cell: [cell[0], cell[1]],
              pos: [center[0], center[1], center[2]],
              openness: openness,
              ring: radius,
            });
          }
        }
        if (candidates.length) break;
      }
      var info = {
        floorId: cfg.floorId,
        areaType: "closet",
        closetKey: key,
        row: row,
        col: col,
        cell: gc1ClosetCellWorld(cfg, row, col),
        hiddenPos: gc1ClosetCellCenter(cfg, row, col),
        approachCandidates: candidates,
      };
      closets.push(info);
      byKey[key] = info;
    }
  }
  cache = {
    floorId: cfg.floorId,
    rows: cfg.rows,
    baseX: cfg.baseX,
    baseY: cfg.baseY,
    baseZ: cfg.baseZ,
    closets: closets,
    byKey: byKey,
  };
  gc1ClosetHideState.layoutCache[cfg.floorId] = cache;
  return cache;
}

// read the graph at a world position and return closet info if the player is inside one
function gc1ClosetGetInfoAtPos(pos) {
  if (!pos || pos.length < 3) return null;
  var configs = gc1ClosetFloorConfigs();
  for (var i = 0; i < configs.length; i++) {
    var cfg = configs[i];
    if (!gc1ClosetFloorMatchesY(pos, cfg) || !cfg.rows || !cfg.rows.length)
      continue;
    var col = Math.floor(pos[0] - (cfg.baseX - 0.5));
    var row = Math.floor(cfg.baseZ + 0.5 - pos[2]);
    if (row < 0 || row >= cfg.rows.length) continue;
    if (col < 0 || col >= cfg.rows[row].length) continue;
    if (cfg.rows[row].charAt(col) !== "8") continue;
    var layout = gc1ClosetBuildLayout(cfg);
    if (!layout) return null;
    var key = cfg.floorId + ":" + row + "," + col;
    var found = layout.byKey[key];
    if (!found) return null;
    return {
      floorId: found.floorId,
      areaType: found.areaType,
      closetKey: found.closetKey,
      row: found.row,
      col: found.col,
      cell: found.cell ? [found.cell[0], found.cell[1]] : null,
      hiddenPos: gc1ClosetClonePos(pos) || gc1ClosetClonePos(found.hiddenPos),
      approachCandidates: found.approachCandidates
        ? found.approachCandidates.slice()
        : [],
    };
  }
  return null;
}

// get closet info straight from a player id
function gc1ClosetGetInfoForPlayer(playerId, fallbackPos) {
  var pos = gc1ClosetGetEntityPos(playerId) || fallbackPos;
  return gc1ClosetGetInfoAtPos(pos);
}

// pick the best nearby tile for granny to walk to
// closer is better, but slightly open tiles also get a small bonus
function gc1ClosetChooseApproach(info, referencePos) {
  if (!info || !info.approachCandidates || !info.approachCandidates.length)
    return null;
  var best = null;
  var bestScore = Infinity;
  for (var i = 0; i < info.approachCandidates.length; i++) {
    var candidate = info.approachCandidates[i];
    var score = gc1ClosetDistSq(candidate.pos, referencePos || info.hiddenPos);
    score -= (candidate.openness || 0) * 0.02;
    score += (candidate.ring || 0) * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best
    ? {
        row: best.row,
        col: best.col,
        cell: best.cell ? [best.cell[0], best.cell[1]] : null,
        pos: best.pos ? [best.pos[0], best.pos[1], best.pos[2]] : null,
      }
    : null;
}

// current pending mesh target if one exists
function gc1ClosetPendingTarget() {
  return globalThis.gc1MainFloorMeshState
    ? globalThis.gc1MainFloorMeshState.pendingTarget
    : null;
}

// only return the pending target if it belongs to this same player chase
function gc1ClosetPendingAlertForPlayer(playerId) {
  var pending = gc1ClosetPendingTarget();
  if (!pending || !pending.meta || pending.meta.kind !== "alert") return null;
  if (playerId == null || pending.meta.playerId !== playerId) return null;
  return pending;
}

// if granny is actively chasing this player, or just very recently was, return true
function gc1ClosetIsActiveChase(playerId) {
  var pending = gc1ClosetPendingAlertForPlayer(playerId);
  if (pending) return true;
  var visionState = globalThis.gc1VisionState;
  if (!visionState || visionState.activePlayerId !== playerId) return false;
  if (!(visionState.lastSignalAt > 0)) return false;
  return (
    gc1ClosetNow() - visionState.lastSignalAt <= GC1_CLOSET_HIDE_CHASE_MEMORY_MS
  );
}

// if a closet event fully hides the player, clear the current vision lock
function gc1ClosetClearVisionTrack(playerId) {
  var visionState = globalThis.gc1VisionState;
  if (
    !visionState ||
    playerId == null ||
    visionState.activePlayerId !== playerId
  )
    return false;
  visionState.activePlayerId = null;
  visionState.lastSeenPos = null;
  visionState.lastSeenAt = 0;
  visionState.lostAt = 0;
  visionState.lastSignalPos = null;
  visionState.lastSignalAt = 0;
  visionState.misses = 0;
  visionState.lostSignalSent = false;
  return true;
}

// pick a good reference point for choosing which side of the closet granny should approach from
function gc1ClosetAlertReferencePos(playerId) {
  var pending = gc1ClosetPendingAlertForPlayer(playerId);
  if (pending && pending.pos) return gc1ClosetClonePos(pending.pos);
  var visionState = globalThis.gc1VisionState;
  if (
    visionState &&
    visionState.activePlayerId === playerId &&
    visionState.lastSignalPos
  )
    return gc1ClosetClonePos(visionState.lastSignalPos);
  var grannyPos = gc1ClosetGetEntityPos(gc1ClosetGetGrannyId());
  if (grannyPos) return gc1ClosetClonePos(grannyPos);
  return null;
}

// send granny to an approach tile near the closet instead of the exact hidden spot
// that feels more fair and it keeps the route graph cleaner
function gc1ClosetSignalApproach(hiddenInfo, meta, referencePos) {
  if (
    !hiddenInfo ||
    typeof globalThis.gc1SignalMainFloorMeshTarget !== "function"
  )
    return false;
  var patrolState = globalThis.gc1PatrolState;
  if (!patrolState || !patrolState.enabled || !patrolState.armed) return false;
  var approach = gc1ClosetChooseApproach(
    hiddenInfo,
    referencePos || gc1ClosetAlertReferencePos(meta && meta.playerId),
  );
  if (!approach || !approach.pos) return false;
  var alertSerial = 0;
  patrolState.alertSerial = (patrolState.alertSerial || 0) + 1;
  alertSerial = patrolState.alertSerial;
  var currentPending = gc1ClosetPendingTarget();
  if (currentPending && currentPending.meshId == null)
    currentPending.createdAt = 0;
  return !!globalThis.gc1SignalMainFloorMeshTarget(approach.pos, null, {
    kind: "alert",
    alertSerial: alertSerial,
    alertKind: "closet",
    playerId: meta && meta.playerId,
    floorId: hiddenInfo.floorId,
    areaType: "closet",
    seenAt: (meta && meta.seenAt) || gc1ClosetNow(),
    closetKey: hiddenInfo.closetKey,
    closetCell: hiddenInfo.cell
      ? [hiddenInfo.cell[0], hiddenInfo.cell[1]]
      : null,
    hiddenPos: gc1ClosetClonePos(hiddenInfo.hiddenPos),
    approachCell: approach.cell ? [approach.cell[0], approach.cell[1]] : null,
    approachPos: gc1ClosetClonePos(approach.pos),
  });
}

// after the short closet wait ends, clear the temporary alert
function gc1ClosetFinishWait(serial) {
  gc1ClosetHideState.waitTaskId = null;
  if (typeof globalThis.gc1ClearMainFloorMeshTarget === "function")
    globalThis.gc1ClearMainFloorMeshTarget(serial || 0);
  return true;
}

// schedule that short post closet wait without stacking duplicates
function gc1ClosetScheduleClear(serial, delayMs) {
  delayMs = typeof delayMs === "number" ? delayMs : GC1_CLOSET_HIDE_WAIT_MS;
  if (typeof globalThis.gc1QueueLatestTask === "function") {
    gc1ClosetHideState.waitTaskId = globalThis.gc1QueueLatestTask(
      GC1_CLOSET_HIDE_WAIT_GROUP,
      function () {
        gc1ClosetFinishWait(serial);
      },
      delayMs,
    );
    return gc1ClosetHideState.waitTaskId;
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    if (typeof TS.stop === "function") TS.stop(GC1_CLOSET_HIDE_WAIT_GROUP);
    gc1ClosetHideState.waitTaskId = TS.run(
      function () {
        gc1ClosetFinishWait(serial);
      },
      delayMs,
      GC1_CLOSET_HIDE_WAIT_GROUP,
    );
    return gc1ClosetHideState.waitTaskId;
  }
  gc1ClosetFinishWait(serial);
  return null;
}

function gc1ClosetSignalGrannyAlert(pos, meta) {
  var prev = gc1ClosetHideState.prevHooks.signalAlert;
  if (!gc1ClosetHideState.enabled || !meta || meta.playerId == null)
    return typeof prev === "function" ? prev(pos, meta) : false;
  var hiddenInfo = gc1ClosetGetInfoForPlayer(meta.playerId, pos);
  if (!hiddenInfo) return typeof prev === "function" ? prev(pos, meta) : false;
  var wasChasing = gc1ClosetIsActiveChase(meta.playerId);
  var referencePos = gc1ClosetAlertReferencePos(meta.playerId);
  gc1ClosetClearVisionTrack(meta.playerId);
  var pending = gc1ClosetPendingAlertForPlayer(meta.playerId);
  if (
    pending &&
    pending.meta &&
    pending.meta.alertKind === "closet" &&
    pending.meta.closetKey === hiddenInfo.closetKey
  )
    return true;
  if (!wasChasing) return false;
  return gc1ClosetSignalApproach(hiddenInfo, meta, referencePos);
}

function gc1ClosetOnGrannyTargetReached(mobId, pending) {
  var meta = pending && pending.meta ? pending.meta : null;
  if (
    !gc1ClosetHideState.enabled ||
    !meta ||
    meta.kind !== "alert" ||
    meta.alertKind !== "closet"
  ) {
    var prev = gc1ClosetHideState.prevHooks.targetReached;
    return typeof prev === "function" ? prev(mobId, pending) : false;
  }
  gc1ClosetHoldMobIdle(mobId);
  if (meta.hiddenPos) gc1ClosetFacePos(mobId, meta.hiddenPos);
  gc1ClosetScheduleClear(pending.serial || 0, GC1_CLOSET_HIDE_WAIT_MS);
  return true;
}

gc1ClosetSignalGrannyAlert.gc1PatrolRuntime = !!(
  gc1ClosetHideState.prevHooks.signalAlert &&
  gc1ClosetHideState.prevHooks.signalAlert.gc1PatrolRuntime
);
gc1ClosetOnGrannyTargetReached.gc1PatrolRuntime = !!(
  gc1ClosetHideState.prevHooks.targetReached &&
  gc1ClosetHideState.prevHooks.targetReached.gc1PatrolRuntime
);
gc1ClosetSignalGrannyAlert.gc1ClosetHideRuntime = true;
gc1ClosetOnGrannyTargetReached.gc1ClosetHideRuntime = true;

globalThis.gc1SignalGrannyAlert = gc1ClosetSignalGrannyAlert;
globalThis.gc1OnGrannyTargetReached = gc1ClosetOnGrannyTargetReached;
globalThis.gc1GetClosetHideInfoAtPos = gc1ClosetGetInfoAtPos;
globalThis.gc1GetClosetHideInfoForPlayer = gc1ClosetGetInfoForPlayer;
globalThis.gc1ClosetHideState = gc1ClosetHideState;
