/*
  Granny Open Source - Module 3

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the wire cover animation is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 3 - Wire Cover System */

// this module handles the cover panel on top of the wire puzzle
// it checks the tool, lets the player loosen bolts, and plays the fall animation
globalThis.gc1WireCoverState = Object.assign(
  {
    spawned: false,
    buildPending: false,
    coverId: null,
    coverPose: null,
    coverBlockPos: null,
    coverBlockPrevName: "Air",
    coverOpen: false,
    coverFalling: false,
    boltRecords: [],
    promptVisible: {},
    promptMode: {},
    promptMissCount: {},
    dropPushMap: null,
    scanIndex: 0,
  },
  typeof globalThis.gc1WireCoverState === "object" &&
    globalThis.gc1WireCoverState
    ? globalThis.gc1WireCoverState
    : {},
);
var gc1WireCoverState = globalThis.gc1WireCoverState;

var GC1_WIRE_COVER_GROUP = "gc1_wire_cover";
var GC1_WIRE_COVER_BUILD_GROUP = "gc1_wire_cover_build";
var GC1_WIRE_COVER_ANIM_GROUP = "gc1_wire_cover_anim";
var GC1_WIRE_COVER_UI_DELAY = 50;
var GC1_WIRE_COVER_LOOP_MS = 100;
var GC1_WIRE_COVER_ANIM_MS = 25;
var GC1_WIRE_COVER_BUILD_RETRY_MS = 250;
var GC1_WIRE_COVER_CENTER = Array.isArray(globalThis.GC1_WIRES_CENTER)
  ? globalThis.GC1_WIRES_CENTER
  : [22.5, 52.5, 13.5];
var GC1_WIRE_COVER_PANEL_BLOCK = "White Concrete";
var GC1_WIRE_COVER_SOLID_BLOCK = "Invisible Solid";
var GC1_WIRE_COVER_TOOL_NAME = "Iron Mace";
var GC1_WIRE_COVER_PROMPT_DIST = 2.8;
var GC1_WIRE_COVER_CLICK_DIST = 5.5;
var GC1_WIRE_COVER_PANEL_Z_OFFSET = 0.56;

// back off if the runtime is about to interrupt
function gc1WireCoverNearInterrupt() {
  return (
    (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()) ||
    (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
  );
}

function gc1WireCoverGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1WireCoverGetFacing(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getFacing === "function")
    return GC.getFacing(playerId);
  try {
    return api.getPlayerFacingInfo(playerId);
  } catch (e) {}
  return null;
}

function gc1WireCoverGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

function gc1WireCoverUiGroup(playerId, suffix) {
  return "gc1_wire_cover_ui_" + playerId + "_" + suffix;
}

function gc1WireCoverQueueUi(playerId, suffix, fn) {
  if (!playerId || typeof fn !== "function") return null;
  var run = function () {
    if (typeof GC !== "undefined" && GC && typeof GC.queueApi === "function") {
      GC.queueApi(function () {
        if (!api.checkValid(playerId)) return;
        try {
          fn();
        } catch (e) {}
      });
      return;
    }
    if (!api.checkValid(playerId)) return;
    try {
      fn();
    } catch (e) {}
  };
  if (typeof globalThis.gc1QueueLatestTask === "function")
    return globalThis.gc1QueueLatestTask(
      gc1WireCoverUiGroup(playerId, suffix),
      run,
      GC1_WIRE_COVER_UI_DELAY,
    );
  run();
  return null;
}

function gc1WireCoverGetPromptFocusType(mode) {
  return !mode ? "" : String(mode).split("_")[0];
}

function gc1WireCoverText(key, fallback) {
  var value = globalThis[key];
  return typeof value === "string" && value ? value : fallback;
}

// clear the cover prompt
function gc1WireCoverClearPrompt(playerId) {
  if (!playerId || gc1WireCoverState.promptVisible[playerId] !== true) return;
  var prevMode = gc1WireCoverState.promptMode[playerId] || "";
  gc1WireCoverState.promptVisible[playerId] = false;
  gc1WireCoverState.promptMode[playerId] = null;
  gc1WireCoverState.promptMissCount[playerId] = 0;
  gc1WireCoverQueueUi(playerId, "upper", function () {
    api.setClientOptionToDefault(playerId, "middleTextUpper");
  });
  if (prevMode === "fastener_tool") {
    gc1WireCoverQueueUi(playerId, "crosshair", function () {
      api.setClientOptionToDefault(playerId, "crosshairText");
      api.setClientOptionToDefault(playerId, "touchscreenActionButton");
    });
  }
}

// show the right prompt depending on whether the player needs the tool or is ready to interact
function gc1WireCoverSetPrompt(playerId, focusType) {
  if (!playerId || gc1WireCoverState.coverOpen) return;
  var hasTool = gc1WireCoverHasTool(playerId);
  var nextMode =
    focusType === "fastener" && hasTool
      ? "fastener_tool"
      : focusType === "fastener"
        ? "fastener_hint"
        : "cover_hint";
  if (
    gc1WireCoverState.promptVisible[playerId] === true &&
    gc1WireCoverState.promptMode[playerId] === nextMode
  )
    return;
  var prevMode = gc1WireCoverState.promptMode[playerId] || "";
  gc1WireCoverState.promptVisible[playerId] = true;
  gc1WireCoverState.promptMode[playerId] = nextMode;
  gc1WireCoverState.promptMissCount[playerId] = 0;
  var upperText =
    focusType === "fastener"
      ? hasTool
        ? gc1WireCoverText(
            "gc1WireCoverFastenerToolText",
            "these fasteners look loose.",
          )
        : gc1WireCoverText(
            "gc1WireCoverFastenerHintText",
            "maybe this tool could loosen these fasteners",
          )
      : hasTool
        ? gc1WireCoverText("gc1WireCoverCoverToolText", "the cover is shut.")
        : gc1WireCoverText("gc1WireCoverCoverHintText", "the cover is shut.");
  gc1WireCoverQueueUi(playerId, "upper", function () {
    api.setClientOption(playerId, "middleTextUpper", upperText);
  });
  if (nextMode === "fastener_tool") {
    gc1WireCoverQueueUi(playerId, "crosshair", function () {
      var actionText = gc1WireCoverText(
        "gc1WireCoverFastenerActionText",
        "Open",
      );
      api.setClientOption(playerId, "crosshairText", actionText);
      api.setClientOption(playerId, "touchscreenActionButton", actionText);
    });
  } else if (prevMode === "fastener_tool") {
    gc1WireCoverQueueUi(playerId, "crosshair", function () {
      api.setClientOptionToDefault(playerId, "crosshairText");
      api.setClientOptionToDefault(playerId, "touchscreenActionButton");
    });
  }
}

function gc1WireCoverClearAllPrompts() {
  var ids = Object.keys(gc1WireCoverState.promptVisible || {});
  for (var i = 0; i < ids.length; i++) gc1WireCoverClearPrompt(ids[i]);
  gc1WireCoverState.promptVisible = {};
  gc1WireCoverState.promptMode = {};
  gc1WireCoverState.promptMissCount = {};
}

// the player needs the screwdriver style tool for this puzzle
function gc1WireCoverHasTool(playerId) {
  var held = null;
  try {
    held = api.getHeldItem(playerId);
  } catch (e) {}
  return !!(
    held &&
    held.name &&
    String(held.name).toLowerCase() === GC1_WIRE_COVER_TOOL_NAME.toLowerCase()
  );
}

function gc1WireCoverDeleteEntity(entityId) {
  if (!entityId) return;
  try {
    api.deleteMeshEntity(entityId);
  } catch (e) {}
}

// delete all cover pieces and bolt props before rebuilding
function gc1WireCoverDeleteAll() {
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function") {
    TS.stop(GC1_WIRE_COVER_GROUP);
    TS.stop(GC1_WIRE_COVER_BUILD_GROUP);
    TS.stop(GC1_WIRE_COVER_ANIM_GROUP);
  }
  if (gc1WireCoverState.coverId)
    gc1WireCoverDeleteEntity(gc1WireCoverState.coverId);
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    var bolt = gc1WireCoverState.boltRecords[i];
    if (!bolt) continue;
    gc1WireCoverDeleteEntity(bolt.id);
    gc1WireCoverDeleteEntity(bolt.shaftId);
  }
  if (gc1WireCoverState.coverBlockPos) {
    try {
      api.setBlock(
        gc1WireCoverState.coverBlockPos[0],
        gc1WireCoverState.coverBlockPos[1],
        gc1WireCoverState.coverBlockPos[2],
        gc1WireCoverState.coverBlockPrevName || "Air",
      );
    } catch (e) {}
  }
  gc1WireCoverClearAllPrompts();
  gc1WireCoverState.coverId = null;
  gc1WireCoverState.coverPose = null;
  gc1WireCoverState.coverBlockPos = null;
  gc1WireCoverState.coverBlockPrevName = "Air";
  gc1WireCoverState.coverOpen = false;
  gc1WireCoverState.coverFalling = false;
  gc1WireCoverState.boltRecords = [];
  gc1WireCoverState.dropPushMap = null;
  gc1WireCoverState.scanIndex = 0;
  gc1WireCoverState.spawned = false;
  gc1WireCoverState.buildPending = false;
}

// build a map of where each bolt and cover piece belongs
function gc1WireCoverBuildDropPushMap() {
  var offsets = [
    [-0.29, 0.7],
    [0.29, 0.7],
    [-0.29, 0.14],
    [0.29, 0.14],
  ];
  var pushIndices = {};
  while (Object.keys(pushIndices).length < 2)
    pushIndices[Math.floor(Math.random() * offsets.length)] = true;
  var map = [];
  for (var i = 0; i < offsets.length; i++) {
    var sidePush = pushIndices[i]
      ? (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.07)
      : 0;
    var frontPush = pushIndices[i] ? 0.02 + Math.random() * 0.06 : 0;
    map.push({ sidePush: sidePush, frontPush: frontPush });
  }
  gc1WireCoverState.dropPushMap = map;
  return map;
}

// let the surrounding logic know the cover puzzle is active
function gc1WireCoverSignalAlert(pos) {
  if (!pos || typeof globalThis.gc1SignalGrannyAlert !== "function")
    return false;
  try {
    return !!globalThis.gc1SignalGrannyAlert([pos[0], pos[1], pos[2]], {
      alertKind: "sound",
    });
  } catch (e) {}
  return false;
}

function gc1WireCoverPlaySound(name, volume, pitch, pos) {
  try {
    api.broadcastSound(name, volume, pitch, {
      playerIdOrPos: pos,
      maxHearDist: 24,
      refDistance: 4,
    });
  } catch (e) {}
  gc1WireCoverSignalAlert(pos);
}

// small dust puff helper for loosened bolts and falling panels
function gc1WireCoverPlayDust(config) {
  try {
    api.playParticleEffect({
      texture: "square_particle",
      dir1: config.dir1,
      dir2: config.dir2,
      pos1: config.pos1,
      pos2: config.pos2,
      minLifeTime: config.minLifeTime,
      maxLifeTime: config.maxLifeTime,
      minEmitPower: config.minEmitPower,
      maxEmitPower: config.maxEmitPower,
      minSize: config.minSize,
      maxSize: config.maxSize,
      manualEmitCount: config.manualEmitCount,
      gravity: config.gravity,
      blendMode: 1,
      colorGradients: [
        {
          timeFraction: 0,
          minColor: [95, 95, 95, 0.9],
          maxColor: [115, 115, 115, 0.9],
        },
        {
          timeFraction: 0.45,
          minColor: [80, 80, 80, 0.45],
          maxColor: [95, 95, 95, 0.45],
        },
        {
          timeFraction: 1,
          minColor: [60, 60, 60, 0],
          maxColor: [70, 70, 70, 0],
        },
      ],
      velocityGradients: [
        { timeFraction: 0, factor: 1, factor2: 1 },
        { timeFraction: 1, factor: 0.25, factor2: 0.25 },
      ],
    });
  } catch (e) {}
}

// get the player's view so we can check if they are aiming at the right bolt
function gc1WireCoverGetView(playerId) {
  var facing = gc1WireCoverGetFacing(playerId);
  if (!facing || !Array.isArray(facing.dir)) return null;
  var origin = Array.isArray(facing.camPos)
    ? facing.camPos
    : gc1WireCoverGetPos(playerId);
  return origin ? { origin: origin, dir: facing.dir } : null;
}

// simple line of sight test for the cover pieces
function gc1WireCoverIsSightBlocked(origin, target, ignoreTailDist) {
  if (!origin || !target) return true;
  var dx = target[0] - origin[0],
    dy = target[1] - origin[1],
    dz = target[2] - origin[2];
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist <= 0.001) return false;
  try {
    var hit = api.raycastForBlock(origin, [dx, dy, dz]);
    if (!hit || !Array.isArray(hit.blockPos)) return false;
    var bx = Math.floor(hit.blockPos[0]),
      by = Math.floor(hit.blockPos[1]),
      bz = Math.floor(hit.blockPos[2]);
    var blockName = api.getBlock(bx, by, bz);
    if (!blockName || blockName === "Air") return false;
    var hx = bx + 0.5 - origin[0],
      hy = by + 0.5 - origin[1],
      hz = bz + 0.5 - origin[2];
    var hitDist = Math.sqrt(hx * hx + hy * hy + hz * hz);
    return (
      hitDist <
      Math.max(
        0,
        dist - (typeof ignoreTailDist === "number" ? ignoreTailDist : 0),
      )
    );
  } catch (e) {}
  return false;
}

function gc1WireCoverRayBoxHit(
  origin,
  dir,
  minX,
  minY,
  minZ,
  maxX,
  maxY,
  maxZ,
) {
  var tMin = -Infinity,
    tMax = Infinity;
  var axes = [
    [origin[0], dir[0], minX, maxX],
    [origin[1], dir[1], minY, maxY],
    [origin[2], dir[2], minZ, maxZ],
  ];
  for (var i = 0; i < axes.length; i++) {
    var o = axes[i][0],
      d = axes[i][1],
      min = axes[i][2],
      max = axes[i][3];
    if (Math.abs(d) < 0.00001) {
      if (o < min || o > max) return null;
      continue;
    }
    var t1 = (min - o) / d,
      t2 = (max - o) / d;
    if (t1 > t2) {
      var swap = t1;
      t1 = t2;
      t2 = swap;
    }
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMax < tMin) return null;
  }
  if (tMax < 0) return null;
  return tMin >= 0 ? tMin : tMax;
}

function gc1WireCoverRayOrientedBoxHit(
  origin,
  dir,
  center,
  yaw,
  halfX,
  minY,
  maxY,
  halfZ,
) {
  var sinYaw = Math.sin(yaw || 0),
    cosYaw = Math.cos(yaw || 0);
  var relX = origin[0] - center[0],
    relY = origin[1] - center[1],
    relZ = origin[2] - center[2];
  return gc1WireCoverRayBoxHit(
    [cosYaw * relX - sinYaw * relZ, relY, sinYaw * relX + cosYaw * relZ],
    [
      cosYaw * dir[0] - sinYaw * dir[2],
      dir[1],
      sinYaw * dir[0] + cosYaw * dir[2],
    ],
    -halfX,
    minY,
    -halfZ,
    halfX,
    maxY,
    halfZ,
  );
}

// count how many bolts are still attached to the cover
function gc1WireCoverCountAttachedBolts() {
  var left = 0;
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    var bolt = gc1WireCoverState.boltRecords[i];
    if (bolt && bolt.id && !bolt.removed) left++;
  }
  return left;
}

// move a bolt into the right pose while it is still attached
function gc1WireCoverApplyBoltPose(record) {
  if (!record || !record.id) return;
  var yaw = record.yaw || 0;
  var worldX =
    record.baseX +
    Math.sin(yaw) * (record.offsetOut || 0) +
    (record.driftX || 0);
  var worldY = record.baseY - (record.offsetDown || 0);
  var worldZ =
    record.baseZ +
    Math.cos(yaw) * (record.offsetOut || 0) +
    (record.driftZ || 0);
  try {
    api.setPosition(record.id, worldX, worldY, worldZ);
  } catch (e) {}
  try {
    api.setEntityRotation(record.id, 0, yaw, record.rotZ || 0);
  } catch (e) {}
  if (record.shaftId) {
    var shaftX =
      record.baseShaftX +
      Math.sin(yaw) * (record.offsetOut || 0) +
      (record.driftX || 0);
    var shaftY = record.baseShaftY - (record.offsetDown || 0);
    var shaftZ =
      record.baseShaftZ +
      Math.cos(yaw) * (record.offsetOut || 0) +
      (record.driftZ || 0);
    try {
      api.setPosition(record.shaftId, shaftX, shaftY, shaftZ);
    } catch (e) {}
    try {
      api.setEntityRotation(record.shaftId, 0, yaw, record.rotZ || 0);
    } catch (e) {}
  }
  record.x = worldX;
  record.y = worldY;
  record.z = worldZ;
}

function gc1WireCoverPlayCoverDust(cover) {
  if (!cover || cover.dustPlayed) return;
  var yaw = cover.baseYaw || cover.yaw || 0;
  var baseX = cover.x || cover.baseX || 0,
    baseY = cover.y || cover.baseY || 0,
    baseZ = cover.z || cover.baseZ || 0;
  gc1WireCoverPlayDust({
    dir1: [-0.42, 0.16, -0.42],
    dir2: [0.42, 0.78, 0.42],
    pos1: [
      baseX + Math.sin(yaw) * 0.015 - 0.34,
      baseY + 0.04,
      baseZ + Math.cos(yaw) * 0.015 - 0.34,
    ],
    pos2: [
      baseX + Math.sin(yaw) * 0.015 + 0.34,
      baseY + 0.12,
      baseZ + Math.cos(yaw) * 0.015 + 0.34,
    ],
    minLifeTime: 0.18,
    maxLifeTime: 0.42,
    minEmitPower: 0.4,
    maxEmitPower: 1.15,
    minSize: 0.035,
    maxSize: 0.09,
    manualEmitCount: 44,
    gravity: [0, -2.6, 0],
  });
  cover.dustPlayed = true;
}

function gc1WireCoverPlayCoverFlatDust(cover) {
  if (!cover || cover.flatDustPlayed) return;
  var yaw = cover.baseYaw || cover.yaw || 0,
    sinYaw = Math.sin(yaw),
    cosYaw = Math.cos(yaw);
  var centerX =
    (cover.x || cover.flatAnchorX || cover.baseX || 0) + sinYaw * 0.12;
  var centerY = (cover.flatAnchorY || cover.baseY || 0) + 0.54;
  var centerZ =
    (cover.z || cover.flatAnchorZ || cover.baseZ || 0) + cosYaw * 0.12;
  var strips = [
    [centerX - cosYaw * 0.58, centerZ + sinYaw * 0.58],
    [centerX + cosYaw * 0.58, centerZ - sinYaw * 0.58],
  ];
  for (var i = 0; i < strips.length; i++) {
    gc1WireCoverPlayDust({
      dir1: [-0.42, 0.06, -0.42],
      dir2: [0.42, 0.36, 0.42],
      pos1: [
        strips[i][0] - cosYaw * 0.15 + sinYaw * 0.28,
        centerY,
        strips[i][1] + sinYaw * 0.15 - cosYaw * 0.28,
      ],
      pos2: [
        strips[i][0] + cosYaw * 0.15 + sinYaw * 0.7,
        centerY + 0.11,
        strips[i][1] - sinYaw * 0.15 + cosYaw * 0.7,
      ],
      minLifeTime: 0.16,
      maxLifeTime: 0.38,
      minEmitPower: 0.32,
      maxEmitPower: 1,
      minSize: 0.028,
      maxSize: 0.075,
      manualEmitCount: 34,
      gravity: [0, -2.4, 0],
    });
  }
  cover.flatDustPlayed = true;
}

function gc1WireCoverHasActiveAnimation() {
  if (gc1WireCoverState.coverFalling) return true;
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    var bolt = gc1WireCoverState.boltRecords[i];
    if (bolt && bolt.animating && !bolt.removed) return true;
  }
  return false;
}

// once the bolts are gone, start the panel fall animation
function gc1WireCoverStartCoverFall() {
  var cover = gc1WireCoverState.coverPose;
  if (!cover || gc1WireCoverState.coverFalling) return false;
  gc1WireCoverState.coverFalling = true;
  gc1WireCoverState.coverOpen = true;
  gc1WireCoverClearAllPrompts();
  cover.fallStarted = true;
  cover.fallTick = 0;
  cover.baseX = cover.x;
  cover.baseY = cover.y;
  cover.baseZ = cover.z;
  cover.baseYaw = cover.yaw || 0;
  cover.basePitch = cover.pitch || 0;
  if (gc1WireCoverState.coverBlockPos) {
    try {
      api.setBlock(
        gc1WireCoverState.coverBlockPos[0],
        gc1WireCoverState.coverBlockPos[1],
        gc1WireCoverState.coverBlockPos[2],
        "Air",
      );
    } catch (e) {}
    gc1WireCoverState.coverBlockPos = null;
  }
  return true;
}

// animate one bolt being pulled free
function gc1WireCoverStartBoltPull(record) {
  if (!record || record.removed || record.animating) return false;
  record.animating = true;
  record.phase = "turn";
  record.phaseTick = 0;
  record.rotZ = 0;
  record.offsetOut = 0;
  record.offsetDown = 0;
  record.driftX = 0;
  record.driftZ = 0;
  return true;
}

function gc1WireCoverTryStartCoverFallFromBoltState() {
  if (gc1WireCoverState.coverOpen || gc1WireCoverState.coverFalling)
    return false;
  if (gc1WireCoverCountAttachedBolts() > 0) return false;
  return gc1WireCoverStartCoverFall();
}

// tick one bolt animation forward
function gc1WireCoverTickBolt(record) {
  if (!record || !record.id || record.removed || !record.animating) return;
  if (record.phase === "turn") {
    record.phaseTick++;
    record.rotZ += 0.42;
    record.offsetOut += 0.008;
    gc1WireCoverApplyBoltPose(record);
    if (record.phaseTick >= 16) {
      if (gc1WireCoverCountAttachedBolts() === 1) gc1WireCoverStartCoverFall();
      record.phase = "drop";
      record.phaseTick = 0;
      record.dropStartX = record.x;
      record.dropStartY = record.y;
      record.dropStartZ = record.z;
      record.dropStartShaftX =
        record.baseShaftX + Math.sin(record.yaw || 0) * record.offsetOut;
      record.dropStartShaftY = record.baseShaftY - record.offsetDown;
      record.dropStartShaftZ =
        record.baseShaftZ + Math.cos(record.yaw || 0) * record.offsetOut;
    }
    return;
  }
  if (record.phase === "drop") {
    record.phaseTick++;
    var targetOffsetDown = Math.max(
      0,
      (record.baseY || 0) - (record.targetY || 0),
    );
    var progress = Math.min(1, record.phaseTick / 14);
    var landingX = record.baseX + (record.targetDriftX || 0);
    var landingY = record.targetY || (record.baseY || 0) - 1;
    var landingZ = record.baseZ + (record.targetDriftZ || 0);
    var landingShaftX = record.baseShaftX + (record.targetDriftX || 0);
    var landingShaftY = (record.baseShaftY || 0) - targetOffsetDown;
    var landingShaftZ = record.baseShaftZ + (record.targetDriftZ || 0);
    var startX =
      typeof record.dropStartX === "number" ? record.dropStartX : record.baseX;
    var startY =
      typeof record.dropStartY === "number" ? record.dropStartY : record.baseY;
    var startZ =
      typeof record.dropStartZ === "number" ? record.dropStartZ : record.baseZ;
    var startShaftX =
      typeof record.dropStartShaftX === "number"
        ? record.dropStartShaftX
        : record.baseShaftX;
    var startShaftY =
      typeof record.dropStartShaftY === "number"
        ? record.dropStartShaftY
        : record.baseShaftY;
    var startShaftZ =
      typeof record.dropStartShaftZ === "number"
        ? record.dropStartShaftZ
        : record.baseShaftZ;
    var worldX = startX + (landingX - startX) * progress;
    var worldY = startY + (landingY - startY) * progress;
    var worldZ = startZ + (landingZ - startZ) * progress;
    var shaftX = startShaftX + (landingShaftX - startShaftX) * progress;
    var shaftY = startShaftY + (landingShaftY - startShaftY) * progress;
    var shaftZ = startShaftZ + (landingShaftZ - startShaftZ) * progress;
    record.offsetDown = record.baseY - worldY;
    record.driftX =
      worldX - (record.baseX + Math.sin(record.yaw || 0) * record.offsetOut);
    record.driftZ =
      worldZ - (record.baseZ + Math.cos(record.yaw || 0) * record.offsetOut);
    try {
      api.setPosition(record.id, worldX, worldY, worldZ);
    } catch (e) {}
    try {
      api.setEntityRotation(record.id, 0, record.yaw || 0, record.rotZ || 0);
    } catch (e) {}
    if (record.shaftId) {
      try {
        api.setPosition(record.shaftId, shaftX, shaftY, shaftZ);
      } catch (e) {}
      try {
        api.setEntityRotation(
          record.shaftId,
          0,
          record.yaw || 0,
          record.rotZ || 0,
        );
      } catch (e) {}
    }
    record.x = worldX;
    record.y = worldY;
    record.z = worldZ;
    if (record.phaseTick >= 14) {
      gc1WireCoverPlaySound("bullet_shell_bounce_general_07", 1, 0.7, [
        worldX,
        worldY,
        worldZ,
      ]);
      record.animating = false;
      record.removed = true;
      gc1WireCoverTryStartCoverFallFromBoltState();
    }
  }
}

// tick the main cover fall animation
function gc1WireCoverTickCoverFall() {
  var cover = gc1WireCoverState.coverPose;
  if (!cover || !gc1WireCoverState.coverFalling || !gc1WireCoverState.coverId)
    return;
  cover.fallTick = (cover.fallTick || 0) + 1;
  var t = cover.fallTick;
  var yaw = cover.baseYaw || 0;
  var x = cover.baseX || 0,
    y = cover.baseY || 0,
    z = cover.baseZ || 0,
    pitch = cover.basePitch || 0;
  if (t <= 16) {
    var side = Math.sin(t * 5.3) * 0.006;
    var face = Math.cos(t * 5.7) * 0.004;
    x += Math.sin(yaw) * face + Math.cos(yaw) * side;
    z += Math.cos(yaw) * face - Math.sin(yaw) * side;
    pitch = Math.sin(t * 5.0) * 0.02 + (cover.basePitch || 0);
  } else {
    var fallProgress = Math.min(1, (t - 16) / 12);
    var eased = fallProgress * fallProgress;
    y = (cover.baseY || 0) - eased;
    x = (cover.baseX || 0) + Math.sin(yaw) * 0.05 * fallProgress;
    z = (cover.baseZ || 0) + Math.cos(yaw) * 0.05 * fallProgress;
    pitch = cover.basePitch || 0;
  }
  try {
    api.setPosition(gc1WireCoverState.coverId, x, y, z);
  } catch (e) {}
  try {
    api.setEntityRotation(gc1WireCoverState.coverId, pitch, yaw, 0);
  } catch (e) {}
  cover.x = x;
  cover.y = y;
  cover.z = z;
  cover.pitch = pitch;
  if (t >= 28) {
    if (!cover.landSoundPlayed) {
      gc1WireCoverPlayCoverDust(cover);
      gc1WireCoverPlaySound("step_stone3", 0.9, 0.7, [x, y, z]);
      gc1WireCoverPlaySound("stone2", 1, 0.5, [x, y, z]);
      cover.landSoundPlayed = true;
      cover.flatStarted = true;
      cover.flatTick = 0;
      cover.flatPauseTick = 0;
      cover.flatAnchorX = cover.x;
      cover.flatAnchorY = cover.y - 0.5;
      cover.flatAnchorZ = cover.z;
    }
  }
  if (cover.flatStarted) {
    cover.flatTick++;
    if (cover.flatPauseTick == null) cover.flatPauseTick = 0;
    if (cover.flatPauseTick < 6) {
      cover.flatPauseTick++;
      try {
        api.setPosition(gc1WireCoverState.coverId, x, y, z);
      } catch (e) {}
      try {
        api.setEntityRotation(gc1WireCoverState.coverId, 0, yaw, 0);
      } catch (e) {}
    } else {
      var flatProgress = Math.min(1, (cover.flatTick - 6) / 24);
      if (flatProgress > 0.3) flatProgress = 0.3 + (flatProgress - 0.3) * 3.2;
      flatProgress = Math.min(1, flatProgress);
      var flatEase = flatProgress * flatProgress;
      var flatPitch = -(Math.PI / 2) * flatEase;
      var flatForward = 0.5 * Math.sin(-flatPitch);
      var flatX =
        (cover.flatAnchorX || cover.baseX || 0) + Math.sin(yaw) * flatForward;
      var flatY =
        (cover.flatAnchorY || (cover.baseY || 0) - 0.5) +
        0.5 * Math.cos(flatPitch);
      var flatZ =
        (cover.flatAnchorZ || cover.baseZ || 0) + Math.cos(yaw) * flatForward;
      try {
        api.setPosition(gc1WireCoverState.coverId, flatX, flatY, flatZ);
      } catch (e) {}
      try {
        api.setEntityRotation(gc1WireCoverState.coverId, flatPitch, yaw, 0);
      } catch (e) {}
      cover.x = flatX;
      cover.y = flatY;
      cover.z = flatZ;
      cover.pitch = flatPitch;
      if (cover.flatTick >= 18 && !cover.flatSoundPlayed) {
        gc1WireCoverPlaySound("wood3", 1, 0.7, [flatX, flatY, flatZ]);
        cover.flatSoundPlayed = true;
      }
      if (flatProgress >= 0.96 && !cover.flatDustPlayed)
        gc1WireCoverPlayCoverFlatDust(cover);
      if (cover.flatTick >= 30) gc1WireCoverState.coverFalling = false;
    }
  }
}

function gc1WireCoverFindBoltById(targetEId) {
  if (!targetEId) return null;
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    var bolt = gc1WireCoverState.boltRecords[i];
    if (!bolt || bolt.removed) continue;
    if (bolt.id === targetEId || bolt.shaftId === targetEId) return bolt;
  }
  return null;
}

// find the bolt the player is actually looking at
function gc1WireCoverFindFocusedBolt(playerId) {
  if (gc1WireCoverState.coverOpen || gc1WireCoverNearInterrupt()) return null;
  var view = gc1WireCoverGetView(playerId);
  if (!view) return null;
  var best = null,
    bestDist = Infinity;
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    var bolt = gc1WireCoverState.boltRecords[i];
    if (!bolt || bolt.removed) continue;
    var hit = gc1WireCoverRayOrientedBoxHit(
      view.origin,
      view.dir,
      [bolt.x || bolt.baseX, bolt.y || bolt.baseY, bolt.z || bolt.baseZ],
      bolt.yaw,
      0.11,
      -0.11,
      0.11,
      0.03,
    );
    if (
      hit == null ||
      hit < 0.12 ||
      hit > GC1_WIRE_COVER_CLICK_DIST ||
      hit >= bestDist
    )
      continue;
    bestDist = hit;
    best = bolt;
  }
  return best;
}

// find the cover panel if the player is looking at the big piece instead of a bolt
function gc1WireCoverFindFocusedCover(playerId) {
  if (gc1WireCoverState.coverOpen || gc1WireCoverNearInterrupt()) return null;
  var view = gc1WireCoverGetView(playerId);
  var cover = gc1WireCoverState.coverPose;
  if (!view || !cover || !gc1WireCoverState.coverId) return null;
  var hit = gc1WireCoverRayOrientedBoxHit(
    view.origin,
    view.dir,
    [cover.x, cover.y, cover.z],
    cover.yaw || 0,
    0.5,
    0,
    1.0,
    0.05,
  );
  if (hit == null || hit < 0.12 || hit > 5.8) return null;
  return cover;
}

// decide whether the player can see the puzzle board
function gc1WireCoverCanSeeBoard(playerId) {
  var view = gc1WireCoverGetView(playerId);
  var cover = gc1WireCoverState.coverPose;
  if (!view || !cover || !gc1WireCoverState.coverId) return false;
  var dx = cover.x - view.origin[0],
    dy = cover.y + 0.5 - view.origin[1],
    dz = cover.z - view.origin[2];
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > GC1_WIRE_COVER_PROMPT_DIST) return false;
  if (
    gc1WireCoverIsSightBlocked(
      view.origin,
      [cover.x, cover.y + 0.5, cover.z],
      0.55,
    )
  )
    return false;
  var len = dist || 1;
  var dot =
    (dx / len) * view.dir[0] +
    (dy / len) * view.dir[1] +
    (dz / len) * view.dir[2];
  return (
    dot >= (gc1WireCoverState.promptVisible[playerId] === true ? 0.55 : 0.64)
  );
}

// refresh all prompts once per loop
function gc1WireCoverUpdatePrompts() {
  if (!gc1WireCoverState.spawned || gc1WireCoverState.coverOpen) return;
  var ids = gc1WireCoverGetPlayerIds();
  if (!ids.length) return;
  var seen = {};
  var attachedBolts = gc1WireCoverCountAttachedBolts();
  for (var i = 0; i < ids.length; i++) {
    if (gc1WireCoverNearInterrupt()) return;
    var playerId = ids[i];
    seen[playerId] = true;
    if (attachedBolts <= 0) {
      gc1WireCoverClearPrompt(playerId);
      continue;
    }
    if (!gc1WireCoverCanSeeBoard(playerId)) {
      var missCount = gc1WireCoverState.promptMissCount[playerId] || 0;
      if (gc1WireCoverState.promptVisible[playerId] === true && missCount < 1) {
        gc1WireCoverState.promptMissCount[playerId] = missCount + 1;
        continue;
      }
      gc1WireCoverClearPrompt(playerId);
      continue;
    }
    var boltFocus = gc1WireCoverFindFocusedBolt(playerId);
    var coverFocus = null;
    var nextFocusType = "";
    if (boltFocus) nextFocusType = "fastener";
    else {
      coverFocus = gc1WireCoverFindFocusedCover(playerId);
      if (coverFocus) nextFocusType = "cover";
    }
    var currentMode = gc1WireCoverState.promptMode[playerId] || "";
    var currentFocusType = gc1WireCoverGetPromptFocusType(currentMode);
    if (!nextFocusType) {
      var emptyMissCount = gc1WireCoverState.promptMissCount[playerId] || 0;
      if (
        gc1WireCoverState.promptVisible[playerId] === true &&
        emptyMissCount < 1
      ) {
        gc1WireCoverState.promptMissCount[playerId] = emptyMissCount + 1;
        continue;
      }
      gc1WireCoverClearPrompt(playerId);
      continue;
    }
    if (currentFocusType === "fastener" && nextFocusType === "cover") {
      var fastenerMissCount = gc1WireCoverState.promptMissCount[playerId] || 0;
      if (fastenerMissCount < 1) {
        gc1WireCoverState.promptMissCount[playerId] = fastenerMissCount + 1;
        continue;
      }
    }
    gc1WireCoverSetPrompt(playerId, nextFocusType);
  }
  var promptIds = Object.keys(gc1WireCoverState.promptVisible || {});
  for (var j = 0; j < promptIds.length; j++) {
    var knownPlayerId = promptIds[j];
    if (!seen[knownPlayerId]) gc1WireCoverClearPrompt(knownPlayerId);
  }
}

// main cover puzzle heartbeat
function gc1WireCoverLoop() {
  if (
    typeof TS === "undefined" ||
    !TS ||
    typeof TS.run !== "function" ||
    !gc1WireCoverState.spawned
  )
    return;
  TS.run(
    function () {
      if (gc1WireCoverNearInterrupt()) {
        gc1WireCoverLoop();
        return;
      }
      if (!gc1WireCoverHasActiveAnimation()) gc1WireCoverUpdatePrompts();
      if (gc1WireCoverState.spawned) gc1WireCoverLoop();
    },
    GC1_WIRE_COVER_LOOP_MS,
    GC1_WIRE_COVER_GROUP,
  );
}

// keep any running bolt or cover animation moving
function gc1WireCoverTickActiveAnimations() {
  if (!gc1WireCoverState.spawned || !gc1WireCoverHasActiveAnimation()) return;
  if (gc1WireCoverNearInterrupt()) return;
  for (var i = 0; i < gc1WireCoverState.boltRecords.length; i++) {
    if (gc1WireCoverNearInterrupt()) return;
    gc1WireCoverTickBolt(gc1WireCoverState.boltRecords[i]);
  }
  gc1WireCoverTryStartCoverFallFromBoltState();
  gc1WireCoverTickCoverFall();
}

// start the animation loop if it is not already running
function gc1WireCoverEnsureAnimLoop() {
  return gc1WireCoverHasActiveAnimation();
}

// spawn the main cover panel
function gc1WireCoverSpawnPanel() {
  if (gc1WireCoverNearInterrupt()) return false;
  var blockX = Math.floor(GC1_WIRE_COVER_CENTER[0]),
    blockY = Math.floor(GC1_WIRE_COVER_CENTER[1]),
    blockZ = Math.floor(GC1_WIRE_COVER_CENTER[2]);
  var prevName = "Air";
  try {
    prevName = api.getBlock(blockX, blockY, blockZ) || "Air";
  } catch (e) {}
  try {
    api.setBlock(blockX, blockY, blockZ, GC1_WIRE_COVER_SOLID_BLOCK);
  } catch (e) {}
  var panelId = null;
  try {
    panelId = api.attemptCreateMeshEntity(
      "BloxdBlock",
      { blockName: GC1_WIRE_COVER_PANEL_BLOCK, size: [1, 1, 0.1] },
      "",
      {
        doPhysics: false,
        collidesEntities: false,
        widthExpandAmt: 0.04,
        heightExpandAmt: 0.04,
      },
    );
  } catch (e) {}
  if (!panelId) return false;
  var panelX = Math.floor(GC1_WIRE_COVER_CENTER[0]) + 0.5;
  var panelY = Math.floor(GC1_WIRE_COVER_CENTER[1]);
  var panelZ =
    Math.floor(GC1_WIRE_COVER_CENTER[2]) + 0.5 + GC1_WIRE_COVER_PANEL_Z_OFFSET;
  try {
    api.setPosition(panelId, panelX, panelY, panelZ);
  } catch (e) {}
  try {
    api.setEntityRotation(panelId, 0, 0, 0);
  } catch (e) {}
  gc1WireCoverState.coverId = panelId;
  gc1WireCoverState.coverPose = {
    x: panelX,
    y: panelY,
    z: panelZ,
    yaw: 0,
    pitch: 0,
    fallStarted: false,
    fallTick: 0,
    dustPlayed: false,
    landSoundPlayed: false,
    flatStarted: false,
    flatTick: 0,
    flatDustPlayed: false,
    flatSoundPlayed: false,
  };
  gc1WireCoverState.coverBlockPos = [blockX, blockY, blockZ];
  gc1WireCoverState.coverBlockPrevName = prevName || "Air";
  return true;
}

// spawn one bolt
function gc1WireCoverSpawnBolt(index) {
  if (gc1WireCoverNearInterrupt()) return false;
  var cover = gc1WireCoverState.coverPose;
  if (!cover || !gc1WireCoverState.coverId) return false;
  var boltOffsets = [
    [-0.29, 0.7],
    [0.29, 0.7],
    [-0.29, 0.14],
    [0.29, 0.14],
  ];
  var slot = boltOffsets[index];
  if (!slot) return false;
  var yaw = 0,
    localX = slot[0],
    localY = slot[1],
    frontOffset = 0.075;
  var boltId = null,
    shaftId = null;
  try {
    boltId = api.attemptCreateMeshEntity(
      "BloxdBlock",
      { blockName: "Black Concrete", size: [0.16, 0.16, 0.03] },
      "",
      {
        doPhysics: false,
        collidesEntities: false,
        widthExpandAmt: 0.02,
        heightExpandAmt: 0.02,
      },
    );
  } catch (e) {}
  if (!boltId) return false;
  var worldX = cover.x + localX;
  var worldY = cover.y + localY;
  var worldZ = cover.z + frontOffset;
  try {
    shaftId = api.attemptCreateMeshEntity(
      "BloxdBlock",
      { blockName: "Gray Concrete", size: [0.045, 0.045, 0.09] },
      "",
      {
        doPhysics: false,
        collidesEntities: false,
        widthExpandAmt: 0.01,
        heightExpandAmt: 0.01,
      },
    );
  } catch (e) {}
  try {
    api.setPosition(boltId, worldX, worldY, worldZ);
  } catch (e) {}
  try {
    api.setEntityRotation(boltId, 0, yaw, 0);
  } catch (e) {}
  var shaftX = cover.x + localX;
  var shaftY = worldY + 0.0575;
  var shaftZ = cover.z + 0.01;
  if (shaftId) {
    try {
      api.setPosition(shaftId, shaftX, shaftY, shaftZ);
    } catch (e) {}
    try {
      api.setEntityRotation(shaftId, 0, yaw, 0);
    } catch (e) {}
  }
  var pushMap = gc1WireCoverState.dropPushMap || gc1WireCoverBuildDropPushMap();
  var pushInfo = pushMap[index] || { sidePush: 0, frontPush: 0 };
  var sidePush = pushInfo.sidePush || 0;
  var frontPush = pushInfo.frontPush || 0;
  gc1WireCoverState.boltRecords.push({
    id: boltId,
    shaftId: shaftId,
    baseX: worldX,
    baseY: worldY,
    baseZ: worldZ,
    baseShaftX: shaftX,
    baseShaftY: shaftY,
    baseShaftZ: shaftZ,
    x: worldX,
    y: worldY,
    z: worldZ,
    yaw: yaw,
    rotZ: 0,
    offsetOut: 0,
    offsetDown: 0,
    driftX: 0,
    driftZ: 0,
    targetY: cover.y - 1,
    targetDriftX: Math.cos(yaw) * sidePush + Math.sin(yaw) * frontPush,
    targetDriftZ: -Math.sin(yaw) * sidePush + Math.cos(yaw) * frontPush,
    phase: "",
    phaseTick: 0,
    animating: false,
    removed: false,
  });
  return true;
}

// build the cover puzzle in small chunks
function gc1WireCoverBuildStep(step) {
  if (gc1WireCoverNearInterrupt()) {
    TS.run(
      function () {
        gc1WireCoverBuildStep(step);
      },
      GC1_WIRE_COVER_BUILD_RETRY_MS,
      GC1_WIRE_COVER_BUILD_GROUP,
    );
    return true;
  }
  if (step === 0) {
    gc1WireCoverDeleteAll();
    gc1WireCoverState.buildPending = true;
    gc1WireCoverBuildDropPushMap();
    if (!gc1WireCoverSpawnPanel()) {
      TS.run(
        function () {
          gc1WireCoverBuildStep(step);
        },
        GC1_WIRE_COVER_BUILD_RETRY_MS,
        GC1_WIRE_COVER_BUILD_GROUP,
      );
      return true;
    }
    TS.run(
      function () {
        gc1WireCoverBuildStep(1);
      },
      120,
      GC1_WIRE_COVER_BUILD_GROUP,
    );
    return true;
  }
  if (step >= 1 && step <= 4) {
    if (!gc1WireCoverSpawnBolt(step - 1)) {
      TS.run(
        function () {
          gc1WireCoverBuildStep(step);
        },
        GC1_WIRE_COVER_BUILD_RETRY_MS,
        GC1_WIRE_COVER_BUILD_GROUP,
      );
      return true;
    }
    TS.run(
      function () {
        gc1WireCoverBuildStep(step + 1);
      },
      100,
      GC1_WIRE_COVER_BUILD_GROUP,
    );
    return true;
  }
  gc1WireCoverState.buildPending = false;
  gc1WireCoverState.spawned = !!(
    gc1WireCoverState.coverId && gc1WireCoverState.boltRecords.length === 4
  );
  if (gc1WireCoverState.spawned) gc1WireCoverLoop();
  return gc1WireCoverState.spawned;
}

// public start entry point
function gc1WireCoverStart() {
  if (gc1WireCoverState.spawned) return true;
  if (gc1WireCoverState.buildPending) return true;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    gc1WireCoverState.buildPending = true;
    gc1WireCoverBuildDropPushMap();
    var spawned = gc1WireCoverSpawnPanel();
    if (spawned) {
      for (var i = 0; i < 4; i++) {
        if (!gc1WireCoverSpawnBolt(i)) {
          spawned = false;
          break;
        }
      }
    }
    gc1WireCoverState.buildPending = false;
    gc1WireCoverState.spawned =
      spawned && gc1WireCoverState.boltRecords.length === 4;
    if (gc1WireCoverState.spawned) gc1WireCoverLoop();
    return gc1WireCoverState.spawned;
  }
  TS.stop(GC1_WIRE_COVER_GROUP);
  TS.stop(GC1_WIRE_COVER_BUILD_GROUP);
  TS.stop(GC1_WIRE_COVER_ANIM_GROUP);
  gc1WireCoverState.buildPending = true;
  TS.run(
    function () {
      gc1WireCoverBuildStep(0);
    },
    80,
    GC1_WIRE_COVER_BUILD_GROUP,
  );
  return true;
}

// stop the cover system cleanly
function gc1WireCoverStop() {
  gc1WireCoverDeleteAll();
  return true;
}

globalThis.gc1WireCoverBlocksWires = function () {
  return !!(gc1WireCoverState.spawned && !gc1WireCoverState.coverOpen);
};

globalThis.gc1WireCoverStart = gc1WireCoverStart;
globalThis.gc1WireCoverStop = gc1WireCoverStop;
globalThis.gc1WireCoverOnTick = function () {
  gc1WireCoverTickActiveAnimations();
};
globalThis.gc1WireCoverOnPlayerClick = function (
  playerId,
  wasAltClick,
  x,
  y,
  z,
  block,
  targetEId,
) {
  if (wasAltClick || !gc1WireCoverState.spawned || gc1WireCoverState.coverOpen)
    return false;
  if (!gc1WireCoverHasTool(playerId)) return false;
  var bolt = gc1WireCoverFindBoltById(targetEId);
  if (!bolt) bolt = gc1WireCoverFindFocusedBolt(playerId);
  if (!bolt) return false;
  if (bolt.animating || bolt.removed) return true;
  var started = gc1WireCoverStartBoltPull(bolt);
  if (started) {
    gc1WireCoverClearPrompt(playerId);
    gc1WireCoverEnsureAnimLoop();
    return true;
  }
  return false;
};

globalThis.gc1WireCoverOnTouchscreenActionButton = function (
  playerId,
  touchDown,
) {
  if (touchDown) return false;
  return globalThis.gc1WireCoverOnPlayerClick(
    playerId,
    false,
    null,
    null,
    null,
    "Air",
    null,
  );
};

if (!globalThis.gc1WireCoverTickHookInstalled) {
  globalThis.gc1WireCoverTickHookInstalled = true;
  globalThis.gc1WireCoverPrevOnTick =
    typeof globalThis.gc1OnTick === "function" ? globalThis.gc1OnTick : null;
  globalThis.gc1OnTick = function () {
    if (typeof globalThis.gc1WireCoverPrevOnTick === "function")
      globalThis.gc1WireCoverPrevOnTick();
    if (typeof globalThis.gc1WireCoverOnTick === "function")
      globalThis.gc1WireCoverOnTick();
  };
}
