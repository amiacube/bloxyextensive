/*
  Granny Open Source - Module 2

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the rod puzzle flow is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 2 - Rod System */

// this module is the rod puzzle
// it shows the rods, checks player sight, and lets the room react when the puzzle starts
globalThis.gc1RodsState = Object.assign(
  {
    spawned: false,
    buildPending: false,
    rodIds: [],
    effectIds: [],
    solidBlockCoords: [],
    promptVisible: {},
    promptMode: {},
    scanIndex: 0,
  },
  typeof globalThis.gc1RodsState === "object" && globalThis.gc1RodsState
    ? globalThis.gc1RodsState
    : {},
);
var gc1RodsState = globalThis.gc1RodsState;
globalThis.gc1RodsPowerCut = !!globalThis.gc1RodsPowerCut;

var GC1_RODS_GROUP = "gc1_rods";
var GC1_RODS_BUILD_GROUP = "gc1_rods_build";
var GC1_RODS_UI_DELAY = 50;
var GC1_RODS_LOOP_MS = 250;
var GC1_RODS_SCAN_PER_TICK = 2;
var GC1_RODS_CENTER = [22.5, 56.5, 30];
var GC1_RODS_HEIGHT = 2.8;
var GC1_RODS_Y = 55.25;
var GC1_RODS_SPACING = 0.34;
var GC1_RODS_PROMPT_DIST = 1.5;
var GC1_RODS_BUILD_RETRY_MS = 250;

// pause if the runtime is getting close to an interrupt
function gc1RodsNearInterrupt() {
  return (
    (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()) ||
    (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
  );
}

function gc1RodsUiGroup(playerId, suffix) {
  return "gc1_rods_ui_" + playerId + "_" + suffix;
}

// keep ui work grouped per player
function gc1RodsQueueUi(playerId, suffix, fn) {
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
      gc1RodsUiGroup(playerId, suffix),
      run,
      GC1_RODS_UI_DELAY,
    );
  run();
  return null;
}

// clear the rod prompt text
function gc1RodsClearPrompt(playerId) {
  if (!playerId || gc1RodsState.promptVisible[playerId] !== true) return;
  gc1RodsState.promptVisible[playerId] = false;
  gc1RodsState.promptMode[playerId] = null;
  gc1RodsQueueUi(playerId, "upper", function () {
    api.setClientOptionToDefault(playerId, "middleTextUpper");
  });
}

// show the rod prompt when the player is looking at the puzzle
function gc1RodsSetPrompt(playerId) {
  if (!playerId) return;
  if (
    gc1RodsState.promptVisible[playerId] === true &&
    gc1RodsState.promptMode[playerId] === "rod_hint"
  )
    return;
  gc1RodsState.promptVisible[playerId] = true;
  gc1RodsState.promptMode[playerId] = "rod_hint";
  gc1RodsQueueUi(playerId, "upper", function () {
    api.setClientOption(
      playerId,
      "middleTextUpper",
      "I need to cut the power from the basement if I want to get rid of these.",
    );
  });
}

// get the current player list
function gc1RodsGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1RodsGetFacing(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getFacing === "function")
    return GC.getFacing(playerId);
  try {
    return api.getPlayerFacingInfo(playerId);
  } catch (e) {}
  return null;
}

function gc1RodsGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

// short ray check to see if the rods are actually visible
function gc1RodsIsSightBlocked(origin, target, ignoreTailDist) {
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

// decide if a player is looking at the rod puzzle
function gc1RodsCanSee(playerId) {
  var facing = gc1RodsGetFacing(playerId);
  if (!facing || !Array.isArray(facing.dir)) return false;
  var origin = Array.isArray(facing.camPos)
    ? facing.camPos
    : gc1RodsGetPos(playerId);
  if (!origin) return false;
  var tx = GC1_RODS_CENTER[0],
    ty = GC1_RODS_CENTER[1] + GC1_RODS_HEIGHT * 0.5,
    tz = GC1_RODS_CENTER[2];
  var dx = tx - origin[0],
    dy = ty - origin[1],
    dz = tz - origin[2];
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > GC1_RODS_PROMPT_DIST) return false;
  if (gc1RodsIsSightBlocked(origin, [tx, ty, tz], 0.7)) return false;
  var len = dist || 1;
  var dot =
    (dx / len) * facing.dir[0] +
    (dy / len) * facing.dir[1] +
    (dz / len) * facing.dir[2];
  return dot >= (gc1RodsState.promptVisible[playerId] === true ? 0.7 : 0.78);
}

// spawn one vertical rod piece
function gc1RodsSpawnRod(x, y, z) {
  if (gc1RodsNearInterrupt()) return null;
  var rodId = null;
  try {
    rodId = api.attemptCreateMeshEntity(
      "Box",
      {
        width: 0.14,
        height: GC1_RODS_HEIGHT,
        depth: 0.14,
        diffuseColor: [255, 255, 255],
        emissiveColor: [255, 255, 240],
      },
      "",
      {
        doPhysics: false,
        collidesEntities: false,
        widthExpandAmt: 0.02,
        heightExpandAmt: 0.02,
      },
    );
  } catch (e) {}
  if (!rodId) return null;
  try {
    api.setPosition(rodId, x, y, z);
  } catch (e) {}
  return rodId;
}

// little dust spark when the rods need a hit effect
function gc1RodsSpawnEmitter(x, y, z) {
  if (gc1RodsNearInterrupt()) return null;
  var effectId = null;
  try {
    effectId = api.attemptCreateMeshEntity(
      "ParticleEmitter",
      {
        texture: "drift",
        minLifeTime: 0.05,
        maxLifeTime: 0.15,
        minEmitPower: 0.3,
        maxEmitPower: 0.8,
        minSize: 0.14,
        maxSize: 0.28,
        gravity: [0, 0.12, 0],
        velocityGradients: [
          { timeFraction: 0, factor: 1, factor2: 1 },
          { timeFraction: 0.4, factor: 0.68, factor2: 0.68 },
          { timeFraction: 1, factor: 0, factor2: 0 },
        ],
        colorGradients: [
          {
            timeFraction: 0,
            minColor: [255, 255, 255, 1],
            maxColor: [255, 255, 255, 1],
          },
          {
            timeFraction: 0.65,
            minColor: [255, 255, 235, 1],
            maxColor: [255, 250, 220, 1],
          },
          {
            timeFraction: 1,
            minColor: [200, 200, 200, 0],
            maxColor: [220, 220, 220, 0],
          },
        ],
        blendMode: 1,
        height: 1.85,
        width: 0.3,
        depth: 0.3,
        emitRate: 20,
        dir1: [0, -0.05, 0],
        dir2: [0, 0.95, 0],
      },
      "",
      { doPhysics: false, collidesEntities: false },
    );
  } catch (e) {}
  if (!effectId) return null;
  try {
    api.setPosition(effectId, x, y, z);
  } catch (e) {}
  return effectId;
}

// place the blocker wall around the puzzle area
function gc1RodsPlaceSolidWall() {
  var baseX = Math.floor(GC1_RODS_CENTER[0]),
    baseY = Math.floor(GC1_RODS_CENTER[1]),
    baseZ = Math.floor(GC1_RODS_CENTER[2]);
  for (var dy = 0; dy < 2; dy++) {
    if (gc1RodsNearInterrupt()) break;
    var x = baseX,
      y = baseY + dy,
      z = baseZ;
    try {
      api.setBlock(x, y, z, "Invisible Solid");
    } catch (e) {}
    gc1RodsState.solidBlockCoords.push([x, y, z]);
  }
}

// clear every rod prop before rebuilding
function gc1RodsDeleteAll() {
  for (var i = 0; i < gc1RodsState.rodIds.length; i++)
    gc1RodsDeleteEntity(gc1RodsState.rodIds[i]);
  for (var j = 0; j < gc1RodsState.effectIds.length; j++)
    gc1RodsDeleteEntity(gc1RodsState.effectIds[j]);
  for (var k = 0; k < gc1RodsState.solidBlockCoords.length; k++) {
    var coord = gc1RodsState.solidBlockCoords[k];
    if (!coord) continue;
    try {
      api.setBlock(coord[0], coord[1], coord[2], "Air");
    } catch (e) {}
  }
  var ids = Object.keys(gc1RodsState.promptVisible || {});
  for (var p = 0; p < ids.length; p++) gc1RodsClearPrompt(ids[p]);
  gc1RodsState.rodIds = [];
  gc1RodsState.effectIds = [];
  gc1RodsState.solidBlockCoords = [];
  gc1RodsState.promptVisible = {};
  gc1RodsState.promptMode = {};
  gc1RodsState.scanIndex = 0;
  gc1RodsState.spawned = false;
  gc1RodsState.buildPending = false;
}

function gc1RodsDeleteEntity(entityId) {
  if (!entityId) return;
  try {
    api.deleteMeshEntity(entityId);
  } catch (e) {}
}

// spawn the full rod set
function gc1RodsSpawnAll() {
  if (globalThis.gc1RodsPowerCut) return false;
  gc1RodsDeleteAll();
  gc1RodsPlaceSolidWall();
  var offsets = [-GC1_RODS_SPACING, 0, GC1_RODS_SPACING];
  for (var i = 0; i < offsets.length; i++) {
    if (gc1RodsNearInterrupt()) break;
    var x = GC1_RODS_CENTER[0] + offsets[i],
      y = GC1_RODS_Y,
      z = GC1_RODS_CENTER[2];
    var rodId = gc1RodsSpawnRod(x, y, z);
    if (rodId) gc1RodsState.rodIds.push(rodId);
    var effectId = gc1RodsSpawnEmitter(x + 0.08, y + 0.92, z + 0.08);
    if (effectId) gc1RodsState.effectIds.push(effectId);
  }
  gc1RodsState.spawned =
    gc1RodsState.rodIds.length > 0 || gc1RodsState.solidBlockCoords.length > 0;
  return gc1RodsState.spawned;
}

// refresh prompts for every player
function gc1RodsUpdatePrompts() {
  if (!gc1RodsState.spawned) return;
  var ids = gc1RodsGetPlayerIds();
  if (!ids.length) return;
  var total = ids.length,
    start = gc1RodsState.scanIndex || 0;
  if (start >= total) start = 0;
  var end = Math.min(start + GC1_RODS_SCAN_PER_TICK, total);
  for (var i = start; i < end; i++) {
    if (gc1RodsNearInterrupt()) return;
    var playerId = ids[i];
    if (gc1RodsCanSee(playerId)) gc1RodsSetPrompt(playerId);
    else gc1RodsClearPrompt(playerId);
  }
  gc1RodsState.scanIndex = end >= total ? 0 : end;
}

// main rod system heartbeat
function gc1RodsLoop() {
  if (
    typeof TS === "undefined" ||
    !TS ||
    typeof TS.run !== "function" ||
    !gc1RodsState.spawned
  )
    return;
  TS.run(
    function () {
      if (gc1RodsNearInterrupt()) {
        gc1RodsLoop();
        return;
      }
      gc1RodsUpdatePrompts();
      if (gc1RodsState.spawned) gc1RodsLoop();
    },
    GC1_RODS_LOOP_MS,
    GC1_RODS_GROUP,
  );
}

// build the rods in chunks so the room does not freeze while loading
function gc1RodsBuildStep(offsets, index) {
  if (gc1RodsNearInterrupt()) {
    TS.run(
      function () {
        gc1RodsBuildStep(offsets, index);
      },
      GC1_RODS_BUILD_RETRY_MS,
      GC1_RODS_BUILD_GROUP,
    );
    return true;
  }
  if (index === 0) {
    gc1RodsDeleteAll();
    gc1RodsPlaceSolidWall();
  }
  var offset = offsets[index];
  if (offset === undefined) return gc1RodsFinishBuild(offsets);
  var x = GC1_RODS_CENTER[0] + offset,
    y = GC1_RODS_Y,
    z = GC1_RODS_CENTER[2];
  var rodId = gc1RodsSpawnRod(x, y, z);
  if (!rodId) {
    TS.run(
      function () {
        gc1RodsBuildStep(offsets, index);
      },
      GC1_RODS_BUILD_RETRY_MS,
      GC1_RODS_BUILD_GROUP,
    );
    return true;
  }
  gc1RodsState.rodIds.push(rodId);
  var effectId = gc1RodsSpawnEmitter(x + 0.08, y + 0.92, z + 0.08);
  if (effectId) gc1RodsState.effectIds.push(effectId);
  TS.run(
    function () {
      gc1RodsBuildStep(offsets, index + 1);
    },
    140,
    GC1_RODS_BUILD_GROUP,
  );
  return true;
}

// finish building and begin the loop
function gc1RodsFinishBuild(offsets) {
  if (gc1RodsNearInterrupt()) {
    TS.run(
      function () {
        gc1RodsFinishBuild(offsets);
      },
      GC1_RODS_BUILD_RETRY_MS,
      GC1_RODS_BUILD_GROUP,
    );
    return true;
  }
  gc1RodsState.buildPending = false;
  gc1RodsState.spawned =
    gc1RodsState.rodIds.length === offsets.length &&
    gc1RodsState.solidBlockCoords.length > 0;
  if (gc1RodsState.spawned) gc1RodsLoop();
  return gc1RodsState.spawned;
}

// public start entry point
function gc1RodsStart() {
  if (globalThis.gc1RodsPowerCut) return true;
  if (gc1RodsState.spawned) return true;
  if (gc1RodsState.buildPending) return true;
  var offsets = [-GC1_RODS_SPACING, 0, GC1_RODS_SPACING];
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    gc1RodsState.buildPending = true;
    var rodsReady = gc1RodsSpawnAll();
    gc1RodsState.buildPending = false;
    if (rodsReady === true) gc1RodsLoop();
    return rodsReady;
  }
  TS.stop(GC1_RODS_GROUP);
  TS.stop(GC1_RODS_BUILD_GROUP);
  gc1RodsState.buildPending = true;
  TS.run(
    function () {
      gc1RodsBuildStep(offsets, 0);
    },
    80,
    GC1_RODS_BUILD_GROUP,
  );
  return true;
}

// stop the rod system cleanly
function gc1RodsStop() {
  globalThis.gc1RodsPowerCut = true;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_RODS_GROUP);
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_RODS_BUILD_GROUP);
  gc1RodsDeleteAll();
  return true;
}

globalThis.gc1RodsStart = gc1RodsStart;
globalThis.gc1RodsStop = gc1RodsStop;
