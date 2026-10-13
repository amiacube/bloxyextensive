/*
  Granny Open Source - Module 1

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the wire cutting flow is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 1 - Wire System */

// this module handles the broken wires on the basement side
// it draws the wire props, checks player aim, and lets shears cut the right strand
globalThis.gc1WiresState = Object.assign(
  {
    spawned: false,
    buildPending: false,
    wires: [],
    chosenWire: null,
    correctCut: false,
    wrongWireTriggered: false,
    promptVisible: {},
    promptMode: {},
    wrongWireMessageActive: {},
    guideBoardPos: null,
    scanIndex: 0,
  },
  typeof globalThis.gc1WiresState === "object" && globalThis.gc1WiresState
    ? globalThis.gc1WiresState
    : {},
);
var gc1WiresState = globalThis.gc1WiresState;
globalThis.gc1RodsPowerCut = !!globalThis.gc1RodsPowerCut;

var GC1_WIRES_GROUP = "gc1_wires";
var GC1_WIRES_BUILD_GROUP = "gc1_wires_build";
var GC1_WIRES_UI_DELAY = 50;
var GC1_WIRES_LOOP_MS = 200;
var GC1_WIRES_SCAN_PER_TICK = 2;
var GC1_WIRES_CENTER = [22.5, 52.5, 13.5];
var GC1_WIRES_GUIDE_POS = [26.5, 57, 20.5];
var GC1_WIRES_Y = 51.5;
var GC1_WIRES_HEIGHT = 2;
var GC1_WIRES_WIDTH = 0.06;
var GC1_WIRES_DEPTH = 0.06;
var GC1_WIRES_SPACING = 0.16;
var GC1_WIRES_GAP = 0.2;
var GC1_WIRES_HALF_HEIGHT = (GC1_WIRES_HEIGHT - GC1_WIRES_GAP) * 0.5;
var GC1_WIRES_SHARD_HEIGHT = 0.095;
var GC1_WIRES_SHARD_WIDTH = 0.06;
var GC1_WIRES_SHARD_DEPTH = 0.06;
var GC1_WIRES_PROMPT_DIST = 1.5;
var GC1_WIRES_CLICK_DIST = 2.2;
var GC1_WIRES_BUILD_RETRY_MS = 250;

// stop work for a sec if the runtime is getting close to an interrupt
function gc1WiresNearInterrupt() {
  return (
    (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()) ||
    (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
  );
}

function gc1WiresUiGroup(playerId, suffix) {
  return "gc1_wires_ui_" + playerId + "_" + suffix;
}

// keep prompt work grouped so one player does not stack a bunch of ui updates
function gc1WiresQueueUi(playerId, suffix, fn) {
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
      gc1WiresUiGroup(playerId, suffix),
      run,
      GC1_WIRES_UI_DELAY,
    );
  run();
  return null;
}

// remove the wire prompt text
function gc1WiresClearPrompt(playerId) {
  if (!playerId || gc1WiresState.promptVisible[playerId] !== true) return;
  gc1WiresState.promptVisible[playerId] = false;
  gc1WiresState.promptMode[playerId] = null;
  gc1WiresQueueUi(playerId, "upper", function () {
    api.setClientOptionToDefault(playerId, "middleTextUpper");
  });
}

// show the right wire prompt depending on whether the player has the tool or not
function gc1WiresSetPrompt(playerId, mode) {
  if (!playerId) return;
  var nextMode = mode || "wire_hint";
  if (
    gc1WiresState.promptVisible[playerId] === true &&
    gc1WiresState.promptMode[playerId] === nextMode
  )
    return;
  gc1WiresState.promptVisible[playerId] = true;
  gc1WiresState.promptMode[playerId] = nextMode;
  var text =
    nextMode === "wire_tool"
      ? "hmm... i should be careful. the wrong wire could do something bad."
      : "maybe wire cutters could snip these wires";
  gc1WiresQueueUi(playerId, "upper", function () {
    api.setClientOption(playerId, "middleTextUpper", text);
  });
}

// simple check for the tool the player needs to cut wires
function gc1WiresHasShears(playerId) {
  var held = null;
  try {
    held = api.getHeldItem(playerId);
  } catch (e) {}
  return !!(held && held.name && String(held.name).toLowerCase() === "shears");
}

function gc1WiresGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1WiresGetFacing(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getFacing === "function")
    return GC.getFacing(playerId);
  try {
    return api.getPlayerFacingInfo(playerId);
  } catch (e) {}
  return null;
}

function gc1WiresGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

// use the camera position if we have it, otherwise fall back to the body
function gc1WiresGetOrigin(playerId) {
  var facing = gc1WiresGetFacing(playerId);
  if (facing && Array.isArray(facing.camPos))
    return { origin: facing.camPos, dir: facing.dir };
  var pos = gc1WiresGetPos(playerId);
  return pos && facing && Array.isArray(facing.dir)
    ? { origin: pos, dir: facing.dir }
    : null;
}

// short line of sight check so the prompt only appears when the player can really see the wire
function gc1WiresIsSightBlocked(origin, target, ignoreTailDist) {
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

// pick one wire the player is actually looking at
function gc1WiresChooseWire() {
  gc1WiresState.chosenWire = Math.random() < 0.5 ? "red" : "blue";
  gc1WiresState.correctCut = false;
  gc1WiresState.wrongWireTriggered = false;
  globalThis.gc1RodsPowerCut = false;
  return gc1WiresState.chosenWire;
}

// find the little guide board spot used for the wire hint display
function gc1WiresFindGuideBoardPos() {
  if (gc1WiresState.guideBoardPos) return gc1WiresState.guideBoardPos.slice();
  var baseX = Math.floor(GC1_WIRES_GUIDE_POS[0]);
  var baseY = Math.floor(GC1_WIRES_GUIDE_POS[1]);
  var baseZ = Math.floor(GC1_WIRES_GUIDE_POS[2]);
  for (var dy = 1; dy >= -1; dy--) {
    for (var dx = -1; dx <= 1; dx++) {
      for (var dz = -1; dz <= 1; dz++) {
        var x = baseX + dx,
          y = baseY + dy,
          z = baseZ + dz,
          block = "";
        try {
          block = String(api.getBlock(x, y, z) || "");
        } catch (e) {}
        if (block.indexOf("Board") >= 0) {
          gc1WiresState.guideBoardPos = [x, y, z];
          return gc1WiresState.guideBoardPos.slice();
        }
      }
    }
  }
  gc1WiresState.guideBoardPos = [baseX, baseY, baseZ];
  return gc1WiresState.guideBoardPos.slice();
}

// write the on map guide text for this puzzle
function gc1WiresWriteGuideBoard() {
  var pos = gc1WiresFindGuideBoardPos();
  var text =
    gc1WiresState.chosenWire === "blue"
      ? "CUT THE\nBLUE WIRE"
      : "CUT THE\nRED WIRE";
  try {
    api.setBlockData(pos[0], pos[1], pos[2], {
      persisted: { shared: { text: text, textSize: 1 } },
    });
    return true;
  } catch (e) {}
  return false;
}

function gc1WiresDeleteEntity(entityId) {
  if (!entityId) return;
  try {
    api.deleteMeshEntity(entityId);
  } catch (e) {}
}

// remove one broken wire from the active list
function gc1WiresDeleteWireRecord(wire) {
  if (!wire) return;
  gc1WiresDeleteEntity(wire.meshId);
  for (var i = 0; i < wire.effectIds.length; i++)
    gc1WiresDeleteEntity(wire.effectIds[i]);
  for (var j = 0; j < wire.halfIds.length; j++)
    gc1WiresDeleteEntity(wire.halfIds[j]);
  wire.meshId = null;
  wire.effectIds = [];
  wire.halfIds = [];
  wire.broken = false;
}

// clear the whole wire puzzle if we need to rebuild it
function gc1WiresDeleteAll() {
  for (var i = 0; i < gc1WiresState.wires.length; i++)
    gc1WiresDeleteWireRecord(gc1WiresState.wires[i]);
  gc1WiresState.wires = [];
  gc1WiresState.correctCut = false;
  gc1WiresState.wrongWireTriggered = false;
  gc1WiresState.scanIndex = 0;
  gc1WiresState.spawned = false;
  gc1WiresState.buildPending = false;
  var promptIds = Object.keys(gc1WiresState.promptVisible || {});
  for (var p = 0; p < promptIds.length; p++) gc1WiresClearPrompt(promptIds[p]);
  gc1WiresState.promptVisible = {};
  gc1WiresState.promptMode = {};
  gc1WiresState.wrongWireMessageActive = {};
  if (typeof globalThis.gc1SetRunAtmospherePowerOutage === "function")
    globalThis.gc1SetRunAtmospherePowerOutage(false);
}

// spawn one wire segment mesh
function gc1WiresSpawnMesh(x, y, z, height, color, emissiveColor) {
  if (gc1WiresNearInterrupt()) return null;
  var meshId = null;
  try {
    meshId = api.attemptCreateMeshEntity(
      "Box",
      {
        width: GC1_WIRES_WIDTH,
        height: height,
        depth: GC1_WIRES_DEPTH,
        diffuseColor: color,
        emissiveColor: emissiveColor,
      },
      "",
      {
        doPhysics: false,
        collidesEntities: false,
        widthExpandAmt: 0.16,
        heightExpandAmt: 0.16,
      },
    );
  } catch (e) {}
  if (!meshId) return null;
  try {
    api.setPosition(meshId, x, y, z);
  } catch (e) {}
  return meshId;
}

// tiny spark helper for the cut effect
function gc1WiresSpawnEmitter(x, y, z) {
  if (gc1WiresNearInterrupt()) return null;
  var effectId = null;
  try {
    effectId = api.attemptCreateMeshEntity(
      "ParticleEmitter",
      {
        texture: "drift",
        minLifeTime: 0.04,
        maxLifeTime: 0.08,
        minEmitPower: 0.22,
        maxEmitPower: 0.5,
        minSize: 0.1,
        maxSize: 0.24,
        gravity: [0, 0.2, 0],
        velocityGradients: [
          { timeFraction: 0, factor: 1, factor2: 1 },
          { timeFraction: 0.4, factor: 0.22, factor2: 0.22 },
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
            minColor: [255, 255, 255, 1],
            maxColor: [255, 255, 255, 1],
          },
          {
            timeFraction: 1,
            minColor: [255, 255, 255, 0],
            maxColor: [255, 255, 255, 0],
          },
        ],
        blendMode: 1,
        height: 0.14,
        width: 0.12,
        depth: 0.34,
        emitRate: 16,
        dir1: [0, -0.18, 0],
        dir2: [0, 0.82, 0],
      },
      "",
      { doPhysics: false, collidesEntities: false },
    );
  } catch (e) {}
  if (!effectId) return null;
  try {
    api.setPosition(effectId, x, y, z);
  } catch (e) {}
  try {
    api.setEntityRotation(effectId, Math.PI * 0.5, 0, 0);
  } catch (e) {}
  return effectId;
}

function gc1WiresSpawnEmitterCluster(wire) {
  var ids = [],
    yOffsets = [0.1, 0.5, 0.9];
  for (var i = 0; i < yOffsets.length; i++) {
    if (gc1WiresNearInterrupt()) break;
    var effectId = gc1WiresSpawnEmitter(
      wire.x + wire.sideX * 0.075,
      wire.y + yOffsets[i],
      wire.z + wire.sideZ * 0.075,
    );
    if (effectId) ids.push(effectId);
  }
  return ids;
}

function gc1WiresSpawnShard(x, y, z, height, color, emissiveColor, rotZ) {
  if (gc1WiresNearInterrupt()) return null;
  var shardId = null;
  try {
    shardId = api.attemptCreateMeshEntity(
      "Box",
      {
        width: GC1_WIRES_SHARD_WIDTH,
        height: height,
        depth: GC1_WIRES_SHARD_DEPTH,
        diffuseColor: color,
        emissiveColor: emissiveColor,
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
  if (!shardId) return null;
  try {
    api.setPosition(shardId, x, y, z);
  } catch (e) {}
  try {
    api.setEntityRotation(shardId, 0, 0, rotZ || 0);
  } catch (e) {}
  return shardId;
}

function gc1WiresSpawnCutBurst(wire) {
  if (!wire) return;
  var cutX = wire.x,
    cutY =
      wire.y + (GC1_WIRES_HEIGHT - GC1_WIRES_GAP) * 0.5 + GC1_WIRES_GAP * 0.5,
    cutZ = wire.z;
  try {
    api.broadcastSound(
      "shotgun_shot_01",
      1,
      1.5,
      { playerIdOrPos: [cutX, cutY, cutZ], maxHearDist: 24, refDistance: 5 },
      null,
    );
  } catch (e) {}
  try {
    if (typeof globalThis.gc1SignalGrannyAlert === "function")
      globalThis.gc1SignalGrannyAlert([cutX, cutY, cutZ], {
        alertKind: "sound",
      });
  } catch (e) {}
  try {
    api.playParticleEffect({
      texture: "square_particle",
      pos1: [cutX - 0.05, cutY - 0.03, cutZ - 0.05],
      pos2: [cutX + 0.05, cutY + 0.03, cutZ + 0.05],
      dir1: [-0.9, -0.5, -0.9],
      dir2: [0.9, 1.2, 0.9],
      minLifeTime: 0.08,
      maxLifeTime: 0.14,
      minEmitPower: 1,
      maxEmitPower: 2.2,
      minSize: 0.04,
      maxSize: 0.1,
      manualEmitCount: 14,
      gravity: [0, -4.8, 0],
      velocityGradients: [
        { timeFraction: 0, factor: 1, factor2: 1 },
        { timeFraction: 0.22, factor: 0.7, factor2: 0.7 },
        { timeFraction: 0.6, factor: 0.28, factor2: 0.28 },
        { timeFraction: 1, factor: 0, factor2: 0 },
      ],
      colorGradients: [
        {
          timeFraction: 0,
          minColor: [255, 190, 70, 1],
          maxColor: [255, 215, 115, 1],
        },
        {
          timeFraction: 0.24,
          minColor: [235, 130, 35, 0.95],
          maxColor: [250, 165, 55, 0.95],
        },
        {
          timeFraction: 0.62,
          minColor: [120, 85, 45, 0.55],
          maxColor: [150, 105, 55, 0.55],
        },
        {
          timeFraction: 1,
          minColor: [55, 40, 25, 0],
          maxColor: [70, 50, 30, 0],
        },
      ],
      blendMode: 1,
    });
  } catch (e) {}
  try {
    api.playParticleEffect({
      texture: "square_particle",
      pos1: [cutX - 0.035, cutY - 0.02, cutZ - 0.035],
      pos2: [cutX + 0.035, cutY + 0.02, cutZ + 0.035],
      dir1: [wire.sideX * -1.1, 0.35, wire.sideZ * -1.1],
      dir2: [wire.sideX * 1.1, 1.5, wire.sideZ * 1.1],
      minLifeTime: 0.06,
      maxLifeTime: 0.14,
      minEmitPower: 0.7,
      maxEmitPower: 1.7,
      minSize: 0.03,
      maxSize: 0.08,
      manualEmitCount: 10,
      gravity: [0, -5.6, 0],
      colorGradients: [
        {
          timeFraction: 0,
          minColor: [255, 205, 95, 1],
          maxColor: [255, 225, 140, 1],
        },
        {
          timeFraction: 0.26,
          minColor: [245, 145, 45, 0.9],
          maxColor: [255, 170, 60, 0.9],
        },
        {
          timeFraction: 0.64,
          minColor: [120, 80, 35, 0.42],
          maxColor: [145, 95, 45, 0.42],
        },
        {
          timeFraction: 1,
          minColor: [50, 35, 20, 0],
          maxColor: [55, 40, 20, 0],
        },
      ],
      velocityGradients: [
        { timeFraction: 0, factor: 1, factor2: 1 },
        { timeFraction: 0.24, factor: 0.56, factor2: 0.56 },
        { timeFraction: 0.62, factor: 0.2, factor2: 0.2 },
        { timeFraction: 1, factor: 0, factor2: 0 },
      ],
      blendMode: 1,
    });
  } catch (e) {}
}

function gc1WiresRayBoxHit(origin, dir, minX, minY, minZ, maxX, maxY, maxZ) {
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

function gc1WiresFindHit(playerId) {
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  )
    return null;
  if (gc1WiresNearInterrupt()) return null;
  var facing = gc1WiresGetFacing(playerId);
  if (!facing || !Array.isArray(facing.dir)) return null;
  var origin = Array.isArray(facing.camPos) ? facing.camPos : null;
  if (!origin) origin = gc1WiresGetPos(playerId);
  if (!origin) return null;
  var bestWire = null,
    bestDist = Infinity;
  for (var i = 0; i < gc1WiresState.wires.length; i++) {
    if (gc1WiresNearInterrupt()) return bestWire;
    var wire = gc1WiresState.wires[i];
    if (!wire || wire.broken || !wire.meshId) continue;
    var hit = gc1WiresRayBoxHit(
      origin,
      facing.dir,
      wire.x - 0.03,
      wire.y,
      wire.z - 0.03,
      wire.x + 0.03,
      wire.y + GC1_WIRES_HEIGHT,
      wire.z + 0.03,
    );
    if (hit == null || hit < 0 || hit >= bestDist) continue;
    bestDist = hit;
    bestWire = wire;
  }
  return bestWire;
}

// build one wire from a definition entry
function gc1WiresSpawnWire(def) {
  var wire = {
    name: def.name,
    x: def.x,
    y: GC1_WIRES_Y,
    z: GC1_WIRES_CENTER[2],
    color: def.color,
    emissiveColor: def.emissiveColor,
    sideX: def.sideX,
    sideZ: def.sideZ,
    meshId: null,
    effectIds: [],
    broken: false,
    halfIds: [],
  };
  wire.meshId = gc1WiresSpawnMesh(
    wire.x,
    wire.y,
    wire.z,
    GC1_WIRES_HEIGHT,
    wire.color,
    wire.emissiveColor,
  );
  wire.effectIds = gc1WiresSpawnEmitterCluster(wire);
  if (!wire.meshId) return null;
  gc1WiresState.wires.push(wire);
  return wire;
}

// spawn every wire for the current puzzle room
function gc1WiresSpawnAll() {
  if (gc1WiresNearInterrupt()) return false;
  gc1WiresDeleteAll();
  gc1WiresChooseWire();
  gc1WiresWriteGuideBoard();
  gc1WiresSpawnWire({
    name: "red",
    x: GC1_WIRES_CENTER[0] - GC1_WIRES_SPACING,
    color: [120, 12, 12],
    emissiveColor: [190, 57, 57],
    sideX: -1,
    sideZ: 0,
  });
  gc1WiresSpawnWire({
    name: "blue",
    x: GC1_WIRES_CENTER[0] + GC1_WIRES_SPACING,
    color: [16, 36, 120],
    emissiveColor: [86, 106, 190],
    sideX: 1,
    sideZ: 0,
  });
  gc1WiresState.spawned = gc1WiresState.wires.length > 0;
  return gc1WiresState.spawned;
}

// check whether the puzzle is already broken or finished
function gc1WiresHasBrokenWire() {
  for (var i = 0; i < gc1WiresState.wires.length; i++) {
    var wire = gc1WiresState.wires[i];
    if (wire && wire.broken) return true;
  }
  return false;
}

// get the closest wire the player is actually looking at
function gc1WiresGetFocusedWire(playerId, maxDist) {
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  )
    return null;
  var view = gc1WiresGetOrigin(playerId);
  if (!view || !Array.isArray(view.dir)) return null;
  var bestWire = null,
    bestScore = -999999;
  for (var i = 0; i < gc1WiresState.wires.length; i++) {
    var wire = gc1WiresState.wires[i];
    if (!wire || wire.broken || !wire.meshId) continue;
    var tx = wire.x,
      ty = wire.y + GC1_WIRES_HEIGHT * 0.5,
      tz = wire.z;
    var dx = tx - view.origin[0],
      dy = ty - view.origin[1],
      dz = tz - view.origin[2];
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) continue;
    if (gc1WiresIsSightBlocked(view.origin, [tx, ty, tz], 0.18)) continue;
    var len = dist || 1;
    var dot =
      (dx / len) * view.dir[0] +
      (dy / len) * view.dir[1] +
      (dz / len) * view.dir[2];
    if (dot < 0.6) continue;
    var score = dot * 10 - dist;
    if (score <= bestScore) continue;
    bestScore = score;
    bestWire = wire;
  }
  return bestWire;
}

// tiny reminder when the player cuts the wrong strand
function gc1WiresShowWrongWireMessage(playerId) {
  if (!playerId) return;
  gc1WiresState.wrongWireMessageActive[playerId] = true;
  gc1WiresQueueUi(playerId, "upper", function () {
    api.setClientOption(
      playerId,
      "middleTextUpper",
      "i should be careful... that was the wrong wire.",
    );
  });
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(
      function () {
        delete gc1WiresState.wrongWireMessageActive[playerId];
        gc1WiresQueueUi(playerId, "upper", function () {
          api.setClientOptionToDefault(playerId, "middleTextUpper");
        });
      },
      1200,
      "gc1_wrong_wire_msg_" + playerId,
    );
}

// correct cut means the puzzle advances normally
function gc1WiresHandleCorrectCut(playerId, wire) {
  if (gc1WiresState.correctCut) return true;
  gc1WiresState.correctCut = true;
  globalThis.gc1RodsPowerCut = true;
  if (typeof globalThis.gc1RodsStop === "function") globalThis.gc1RodsStop();
  return true;
}

// wrong cut means the wires break and the room reacts
function gc1WiresHandleWrongCut(playerId, wire) {
  if (gc1WiresState.wrongWireTriggered) return true;
  gc1WiresState.wrongWireTriggered = true;
  gc1WiresShowWrongWireMessage(playerId);
  var pos = wire ? [wire.x, wire.y + 1, wire.z] : null;
  var trigger = function () {
    if (typeof globalThis.gc1CatchTriggerCustomDeath === "function")
      return globalThis.gc1CatchTriggerCustomDeath(playerId, pos);
    return false;
  };
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(trigger, 650, "gc1_wrong_wire_death_" + playerId);
  else trigger();
  var reset = function () {
    if (gc1WiresState.wrongWireTriggered && !gc1WiresState.correctCut) {
      gc1WiresStop();
      gc1WiresStart();
    }
  };
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(reset, 4300, "gc1_wrong_wire_reset");
  return true;
}

// cut the chosen wire and route into the correct failure or success path
function gc1WiresCutWire(playerId, wire) {
  if (!wire || wire.broken || !wire.meshId || gc1WiresNearInterrupt())
    return false;
  if (!gc1WiresHasShears(playerId)) {
    gc1WiresSetPrompt(playerId, "wire_hint");
    return true;
  }
  var oldX = wire.x,
    oldY = wire.y,
    oldZ = wire.z;
  gc1WiresDeleteEntity(wire.meshId);
  for (var i = 0; i < wire.effectIds.length; i++)
    gc1WiresDeleteEntity(wire.effectIds[i]);
  wire.meshId = null;
  wire.effectIds = [];
  wire.halfIds = [];
  var topBaseY = oldY + GC1_WIRES_HALF_HEIGHT + GC1_WIRES_GAP;
  var bottomMesh = gc1WiresSpawnMesh(
    oldX,
    oldY,
    oldZ,
    GC1_WIRES_HALF_HEIGHT,
    wire.color,
    wire.emissiveColor,
  );
  var topMesh = gc1WiresSpawnMesh(
    oldX,
    topBaseY,
    oldZ,
    GC1_WIRES_HALF_HEIGHT,
    wire.color,
    wire.emissiveColor,
  );
  if (bottomMesh) wire.halfIds.push(bottomMesh);
  if (topMesh) wire.halfIds.push(topMesh);
  var shardOutward = 0.004;
  var lowerShard = gc1WiresSpawnShard(
    oldX - wire.sideX * shardOutward,
    oldY + GC1_WIRES_HALF_HEIGHT - 0.001,
    oldZ - wire.sideZ * shardOutward,
    GC1_WIRES_SHARD_HEIGHT,
    wire.color,
    wire.emissiveColor,
    0.12,
  );
  var upperShard = gc1WiresSpawnShard(
    oldX + wire.sideX * shardOutward,
    oldY +
      GC1_WIRES_HALF_HEIGHT +
      GC1_WIRES_GAP -
      GC1_WIRES_SHARD_HEIGHT +
      0.001,
    oldZ + wire.sideZ * shardOutward,
    GC1_WIRES_SHARD_HEIGHT,
    wire.color,
    wire.emissiveColor,
    -0.12,
  );
  if (lowerShard) wire.halfIds.push(lowerShard);
  if (upperShard) wire.halfIds.push(upperShard);
  wire.broken = true;
  gc1WiresSpawnCutBurst(wire);
  var ids = gc1WiresGetPlayerIds();
  for (var p = 0; p < ids.length; p++) gc1WiresClearPrompt(ids[p]);
  if (wire.name === gc1WiresState.chosenWire)
    return gc1WiresHandleCorrectCut(playerId, wire);
  return gc1WiresHandleWrongCut(playerId, wire);
}

// refresh all player prompts once per loop
function gc1WiresUpdatePrompts() {
  if (!gc1WiresState.spawned) return;
  var ids = gc1WiresGetPlayerIds();
  if (!ids.length) return;
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  ) {
    for (var b = 0; b < ids.length; b++) gc1WiresClearPrompt(ids[b]);
    gc1WiresState.scanIndex = 0;
    return;
  }
  if (gc1WiresState.correctCut || gc1WiresHasBrokenWire()) {
    for (var c = 0; c < ids.length; c++) gc1WiresClearPrompt(ids[c]);
    gc1WiresState.scanIndex = 0;
    return;
  }
  var total = ids.length;
  var start = gc1WiresState.scanIndex || 0;
  if (start >= total) start = 0;
  var end = Math.min(start + GC1_WIRES_SCAN_PER_TICK, total);
  for (var i = start; i < end; i++) {
    if (gc1WiresNearInterrupt()) return;
    var playerId = ids[i];
    if (gc1WiresState.wrongWireMessageActive[playerId] === true) continue;
    var wire = gc1WiresGetFocusedWire(playerId, GC1_WIRES_PROMPT_DIST);
    if (wire)
      gc1WiresSetPrompt(
        playerId,
        gc1WiresHasShears(playerId) ? "wire_tool" : "wire_hint",
      );
    else gc1WiresClearPrompt(playerId);
  }
  gc1WiresState.scanIndex = end >= total ? 0 : end;
}

// main wire system heartbeat
function gc1WiresLoop() {
  if (
    typeof TS === "undefined" ||
    !TS ||
    typeof TS.run !== "function" ||
    !gc1WiresState.spawned
  )
    return;
  TS.run(
    function () {
      if (gc1WiresNearInterrupt()) {
        gc1WiresLoop();
        return;
      }
      gc1WiresUpdatePrompts();
      if (gc1WiresState.spawned) gc1WiresLoop();
    },
    GC1_WIRES_LOOP_MS,
    GC1_WIRES_GROUP,
  );
}

// build the wire props one chunk at a time so the runtime stays smooth
function gc1WiresBuildStep(defs, index) {
  if (gc1WiresNearInterrupt()) {
    TS.run(
      function () {
        gc1WiresBuildStep(defs, index);
      },
      GC1_WIRES_BUILD_RETRY_MS,
      GC1_WIRES_BUILD_GROUP,
    );
    return true;
  }
  if (index === 0) {
    gc1WiresDeleteAll();
    gc1WiresChooseWire();
    gc1WiresWriteGuideBoard();
  }
  var def = defs[index];
  if (!def) return gc1WiresFinishBuild(defs);
  var wire = gc1WiresSpawnWire(def);
  if (!wire) {
    TS.run(
      function () {
        gc1WiresBuildStep(defs, index);
      },
      GC1_WIRES_BUILD_RETRY_MS,
      GC1_WIRES_BUILD_GROUP,
    );
    return true;
  }
  TS.run(
    function () {
      gc1WiresBuildStep(defs, index + 1);
    },
    160,
    GC1_WIRES_BUILD_GROUP,
  );
  return true;
}

// finish the build and start the active loop
function gc1WiresFinishBuild(defs) {
  if (gc1WiresNearInterrupt()) {
    TS.run(
      function () {
        gc1WiresFinishBuild(defs);
      },
      GC1_WIRES_BUILD_RETRY_MS,
      GC1_WIRES_BUILD_GROUP,
    );
    return true;
  }
  gc1WiresState.buildPending = false;
  gc1WiresState.spawned = gc1WiresState.wires.length === defs.length;
  if (gc1WiresState.spawned) gc1WiresLoop();
  return gc1WiresState.spawned;
}

// public start entry point
function gc1WiresStart() {
  if (gc1WiresState.spawned) return true;
  if (gc1WiresState.buildPending) return true;
  var defs = [
    {
      name: "red",
      x: GC1_WIRES_CENTER[0] - GC1_WIRES_SPACING,
      color: [120, 12, 12],
      emissiveColor: [190, 57, 57],
      sideX: -1,
      sideZ: 0,
    },
    {
      name: "blue",
      x: GC1_WIRES_CENTER[0] + GC1_WIRES_SPACING,
      color: [16, 36, 120],
      emissiveColor: [86, 106, 190],
      sideX: 1,
      sideZ: 0,
    },
  ];
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    gc1WiresState.buildPending = true;
    var wiresReady = gc1WiresSpawnAll();
    gc1WiresState.buildPending = false;
    if (wiresReady === true) gc1WiresLoop();
    return wiresReady;
  }
  TS.stop(GC1_WIRES_GROUP);
  TS.stop(GC1_WIRES_BUILD_GROUP);
  gc1WiresState.buildPending = true;
  TS.run(
    function () {
      gc1WiresBuildStep(defs, 0);
    },
    80,
    GC1_WIRES_BUILD_GROUP,
  );
  return true;
}

// stop the whole wire system cleanly
function gc1WiresStop() {
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_WIRES_GROUP);
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_WIRES_BUILD_GROUP);
  gc1WiresDeleteAll();
  return true;
}

globalThis.gc1WiresStart = gc1WiresStart;
globalThis.gc1WiresStop = gc1WiresStop;
globalThis.gc1WiresRefreshGuideBoard = gc1WiresWriteGuideBoard;
globalThis.gc1WiresOnPlayerClick = function (
  playerId,
  wasAltClick,
  x,
  y,
  z,
  block,
  targetEId,
) {
  if (!gc1WiresState.spawned || wasAltClick) return false;
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  )
    return false;
  var wire = null;
  if (targetEId) {
    for (var i = 0; i < gc1WiresState.wires.length; i++) {
      var current = gc1WiresState.wires[i];
      if (current && !current.broken && current.meshId === targetEId) {
        wire = current;
        break;
      }
    }
  }
  if (!wire) wire = gc1WiresFindHit(playerId);
  if (!wire) wire = gc1WiresGetFocusedWire(playerId, GC1_WIRES_CLICK_DIST);
  if (!wire) return false;
  return gc1WiresCutWire(playerId, wire);
};
globalThis.gc1WiresOnPlayerDamagingMeshEntity = function (
  playerId,
  damagedId,
  damageDealt,
  withItem,
) {
  if (!gc1WiresState.spawned || !damagedId) return false;
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  )
    return false;
  for (var i = 0; i < gc1WiresState.wires.length; i++) {
    var wire = gc1WiresState.wires[i];
    if (wire && !wire.broken && wire.meshId === damagedId)
      return gc1WiresCutWire(playerId, wire);
  }
  return false;
};
globalThis.gc1WiresOnPlayerBreakMeshEntity = function (playerId, entityId) {
  if (!gc1WiresState.spawned || !entityId) return false;
  if (
    typeof globalThis.gc1WireCoverBlocksWires === "function" &&
    globalThis.gc1WireCoverBlocksWires()
  )
    return false;
  for (var i = 0; i < gc1WiresState.wires.length; i++) {
    var wire = gc1WiresState.wires[i];
    if (wire && !wire.broken && wire.meshId === entityId)
      return gc1WiresCutWire(playerId, wire);
  }
  return false;
};
