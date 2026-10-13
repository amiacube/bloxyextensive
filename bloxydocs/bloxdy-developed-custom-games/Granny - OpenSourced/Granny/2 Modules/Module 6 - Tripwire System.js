/*
  Granny Open Source - Module 6

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the tripwire math is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 6 - Tripwire System */

// this module handles the hidden tripwire that alerts granny when a player crosses it
globalThis.gc1TripwireState = Object.assign(
  {
    spawned: false,
    meshId: null,
    endId: null,
    visualId: null,
    players: {},
    lastTriggeredAt: 0,
  },
  typeof globalThis.gc1TripwireState === "object" && globalThis.gc1TripwireState
    ? globalThis.gc1TripwireState
    : {},
);
var gc1TripwireState = globalThis.gc1TripwireState;

var GC1_TRIPWIRE_GROUP = "gc1_tripwire";
var GC1_TRIPWIRE_CENTER = [20, 56.35, 26.75];
var GC1_TRIPWIRE_YAW_DEG = 120;
var GC1_TRIPWIRE_YAW = GC1_TRIPWIRE_YAW_DEG * (Math.PI / 180);
var GC1_TRIPWIRE_WIDTH = 5.15;
var GC1_TRIPWIRE_DEPTH = 0.05;
var GC1_TRIPWIRE_HEIGHT = 0.12;
var GC1_TRIPWIRE_DOT_SIZE = 0.08;
var GC1_TRIPWIRE_PLAYER_RADIUS = 0.32;
var GC1_TRIPWIRE_Y_BELOW = 0.9;
var GC1_TRIPWIRE_Y_ABOVE = 1.8;
var GC1_TRIPWIRE_PLAYER_COOLDOWN_MS = 1400;
var GC1_TRIPWIRE_GLOBAL_COOLDOWN_MS = 550;

function gc1TripwireNow() {
  return Date.now();
}

function gc1TripwireGetRunStateName() {
  var states = globalThis.gc1LobbyStates || {};
  return states.lobby_que && states.lobby_que.name
    ? states.lobby_que.name
    : "lobby que";
}

// only run the tripwire logic for players in the actual run
function gc1TripwirePlayerIsInRun(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  return !!(
    globalThis.gc1PlayerLobbyState &&
    globalThis.gc1PlayerLobbyState[playerId] === gc1TripwireGetRunStateName()
  );
}

// some players can trigger the wire and some should not
function gc1TripwireShouldAlertGranny(playerId) {
  if (!gc1TripwirePlayerIsInRun(playerId)) return false;
  return !!(
    globalThis.gc1RunModeState &&
    globalThis.gc1RunModeState.modeKey === "easy" &&
    globalThis.gc1RunModeState.grannyEnabled
  );
}

function gc1TripwireGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1TripwireGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

// keep a per-player record so crossing direction and cooldowns are tracked cleanly
function gc1TripwireEnsurePlayerState(playerId) {
  var map = gc1TripwireState.players || (gc1TripwireState.players = {});
  var state = map[playerId];
  if (state) return state;
  state = { inside: false, lastTriggeredAt: 0, lastPos: null };
  map[playerId] = state;
  return state;
}

function gc1TripwireClonePos(pos) {
  return pos && pos.length >= 3 ? [pos[0], pos[1], pos[2]] : null;
}

function gc1TripwireEndpoints() {
  var half = GC1_TRIPWIRE_WIDTH * 0.5;
  var dx = Math.cos(GC1_TRIPWIRE_YAW) * half;
  var dz = -Math.sin(GC1_TRIPWIRE_YAW) * half;
  return {
    x1: GC1_TRIPWIRE_CENTER[0] - dx,
    z1: GC1_TRIPWIRE_CENTER[2] - dz,
    x2: GC1_TRIPWIRE_CENTER[0] + dx,
    z2: GC1_TRIPWIRE_CENTER[2] + dz,
  };
}

function gc1TripwireYHits(a, b) {
  var lo = GC1_TRIPWIRE_CENTER[1] - GC1_TRIPWIRE_Y_BELOW;
  var hi = GC1_TRIPWIRE_CENTER[1] + GC1_TRIPWIRE_Y_ABOVE;
  if (!a) {
    if (!b) return false;
    return b[1] >= lo && b[1] <= hi;
  }
  if (!b) return a[1] >= lo && a[1] <= hi;
  return Math.max(a[1], b[1]) >= lo && Math.min(a[1], b[1]) <= hi;
}

// squared distance from a point to a line segment in the floor plane
function gc1TripwirePointSegDistSq(px, pz, x1, z1, x2, z2) {
  var dx = x2 - x1,
    dz = z2 - z1;
  var len = dx * dx + dz * dz;
  if (len <= 0) {
    dx = px - x1;
    dz = pz - z1;
    return dx * dx + dz * dz;
  }
  var t = ((px - x1) * dx + (pz - z1) * dz) / len;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  var cx = x1 + dx * t,
    cz = z1 + dz * t;
  dx = px - cx;
  dz = pz - cz;
  return dx * dx + dz * dz;
}

function gc1TripwireOrient(x1, z1, x2, z2, x3, z3) {
  return (x2 - x1) * (z3 - z1) - (z2 - z1) * (x3 - x1);
}

function gc1TripwireOnSeg(x1, z1, x2, z2, x3, z3) {
  return (
    x3 >= Math.min(x1, x2) - 0.0001 &&
    x3 <= Math.max(x1, x2) + 0.0001 &&
    z3 >= Math.min(z1, z2) - 0.0001 &&
    z3 <= Math.max(z1, z2) + 0.0001
  );
}

// basic segment crossing test for the wire line and the player path line
function gc1TripwireSegsCross(x1, z1, x2, z2, x3, z3, x4, z4) {
  var o1 = gc1TripwireOrient(x1, z1, x2, z2, x3, z3);
  var o2 = gc1TripwireOrient(x1, z1, x2, z2, x4, z4);
  var o3 = gc1TripwireOrient(x3, z3, x4, z4, x1, z1);
  var o4 = gc1TripwireOrient(x3, z3, x4, z4, x2, z2);
  if (Math.abs(o1) <= 0.0001 && gc1TripwireOnSeg(x1, z1, x2, z2, x3, z3))
    return true;
  if (Math.abs(o2) <= 0.0001 && gc1TripwireOnSeg(x1, z1, x2, z2, x4, z4))
    return true;
  if (Math.abs(o3) <= 0.0001 && gc1TripwireOnSeg(x3, z3, x4, z4, x1, z1))
    return true;
  if (Math.abs(o4) <= 0.0001 && gc1TripwireOnSeg(x3, z3, x4, z4, x2, z2))
    return true;
  return o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0;
}

function gc1TripwireSegDistSq(x1, z1, x2, z2, x3, z3, x4, z4) {
  if (gc1TripwireSegsCross(x1, z1, x2, z2, x3, z3, x4, z4)) return 0;
  return Math.min(
    gc1TripwirePointSegDistSq(x1, z1, x3, z3, x4, z4),
    gc1TripwirePointSegDistSq(x2, z2, x3, z3, x4, z4),
    gc1TripwirePointSegDistSq(x3, z3, x1, z1, x2, z2),
    gc1TripwirePointSegDistSq(x4, z4, x1, z1, x2, z2),
  );
}

function gc1TripwireHitRadiusSq() {
  var radius = GC1_TRIPWIRE_PLAYER_RADIUS + GC1_TRIPWIRE_DEPTH * 0.5;
  return radius * radius;
}

// check whether the player is inside the tripwire area
function gc1TripwireContainsPlayer(pos) {
  if (!pos || !gc1TripwireYHits(pos, null)) return false;
  var e = gc1TripwireEndpoints();
  return (
    gc1TripwirePointSegDistSq(pos[0], pos[2], e.x1, e.z1, e.x2, e.z2) <=
    gc1TripwireHitRadiusSq()
  );
}

// detect if the player path crossed the wire this tick
function gc1TripwireCrossed(prevPos, currentPos) {
  if (!currentPos) return false;
  if (gc1TripwireContainsPlayer(currentPos)) return true;
  if (!prevPos || !gc1TripwireYHits(prevPos, currentPos)) return false;
  if (gc1TripwireContainsPlayer(prevPos)) return true;
  var e = gc1TripwireEndpoints();
  return (
    gc1TripwireSegDistSq(
      prevPos[0],
      prevPos[2],
      currentPos[0],
      currentPos[2],
      e.x1,
      e.z1,
      e.x2,
      e.z2,
    ) <= gc1TripwireHitRadiusSq()
  );
}

// play the little alert sound
function gc1TripwirePlaySound() {
  var played = false;
  var ids = gc1TripwireGetPlayerIds();
  for (var i = 0; i < ids.length; i++) {
    try {
      api.playSound(ids[i], "exp_collect", 1, 2, {
        playerIdOrPos: GC1_TRIPWIRE_CENTER,
        maxHearDist: 30,
        refDistance: 4,
      });
      played = true;
    } catch (e) {}
  }
  if (!played)
    try {
      api.broadcastSound("exp_collect", 1, 2, {
        playerIdOrPos: GC1_TRIPWIRE_CENTER,
        maxHearDist: 30,
        refDistance: 4,
      });
      played = true;
    } catch (e) {}
  return played;
}

// oooooh grannnyyy, this player crossed the tripwire (alerts granny lel)
function gc1TripwireAlertGranny(playerId) {
  if (!gc1TripwireShouldAlertGranny(playerId)) return false;
  if (typeof globalThis.gc1SignalGrannyAlert !== "function") return false;
  try {
    return !!globalThis.gc1SignalGrannyAlert(GC1_TRIPWIRE_CENTER, {
      alertKind: "sound",
      playerId: playerId,
      meshId: gc1TripwireState.meshId || null,
      seenAt: gc1TripwireNow(),
    });
  } catch (e) {}
  return false;
}

// one clean trigger path for the wire
function gc1TripwireTrigger(playerId) {
  var now = gc1TripwireNow();
  var state = gc1TripwireEnsurePlayerState(playerId);
  if (now - (state.lastTriggeredAt || 0) < GC1_TRIPWIRE_PLAYER_COOLDOWN_MS)
    return false;
  if (
    now - (gc1TripwireState.lastTriggeredAt || 0) <
    GC1_TRIPWIRE_GLOBAL_COOLDOWN_MS
  )
    return false;
  state.lastTriggeredAt = now;
  gc1TripwireState.lastTriggeredAt = now;
  gc1TripwirePlaySound();
  gc1TripwireAlertGranny(playerId);
  return true;
}

// delete the visual wire mesh
function gc1TripwireDeleteMesh() {
  var did = false;
  if (gc1TripwireState.meshId) {
    try {
      api.deleteMeshEntity(gc1TripwireState.meshId);
      did = true;
    } catch (e) {}
  }
  if (gc1TripwireState.endId) {
    try {
      api.deleteMeshEntity(gc1TripwireState.endId);
      did = true;
    } catch (e) {}
  }
  if (gc1TripwireState.visualId) {
    try {
      api.deleteMeshEntity(gc1TripwireState.visualId);
      did = true;
    } catch (e) {}
  }
  gc1TripwireState.meshId = null;
  gc1TripwireState.endId = null;
  gc1TripwireState.visualId = null;
  return did;
}

// spawn the wire mesh in the room
function gc1TripwireSpawnMesh() {
  gc1TripwireDeleteMesh();
  var meshId = null,
    endId = null,
    visualId = null;
  var pts = gc1TripwireEndpoints();
  var opts = {
    width: GC1_TRIPWIRE_DOT_SIZE,
    height: GC1_TRIPWIRE_DOT_SIZE,
    depth: GC1_TRIPWIRE_DOT_SIZE,
    diffuseColor: [255, 245, 245],
    emissiveColor: [255, 245, 245],
  };
  try {
    endId = api.attemptCreateMeshEntity("Box", opts, "", {
      doPhysics: false,
      collidesEntities: false,
    });
  } catch (e) {}
  if (!endId) return false;
  try {
    api.setPosition(endId, pts.x2, GC1_TRIPWIRE_CENTER[1], pts.z2);
  } catch (err) {}
  try {
    meshId = api.attemptCreateMeshEntity(
      "Box",
      {
        width: GC1_TRIPWIRE_DOT_SIZE,
        height: GC1_TRIPWIRE_DOT_SIZE,
        depth: GC1_TRIPWIRE_DOT_SIZE,
        diffuseColor: [255, 245, 245],
        emissiveColor: [255, 245, 245],
        lineToEId: endId,
      },
      "",
      { doPhysics: false, collidesEntities: false },
    );
  } catch (err) {}
  if (!meshId) {
    try {
      api.deleteMeshEntity(endId);
    } catch (err) {}
    return false;
  }
  gc1TripwireState.meshId = meshId;
  gc1TripwireState.endId = endId;
  try {
    api.setPosition(meshId, pts.x1, GC1_TRIPWIRE_CENTER[1], pts.z1);
  } catch (err) {}
  try {
    visualId = api.attemptCreateMeshEntity(
      "Box",
      {
        width: GC1_TRIPWIRE_WIDTH,
        height: GC1_TRIPWIRE_HEIGHT,
        depth: GC1_TRIPWIRE_DEPTH,
        diffuseColor: [255, 245, 245],
        emissiveColor: [255, 245, 245],
      },
      "",
      { doPhysics: false, collidesEntities: false },
    );
  } catch (err) {}
  if (visualId) {
    gc1TripwireState.visualId = visualId;
    try {
      api.setPosition(
        visualId,
        GC1_TRIPWIRE_CENTER[0],
        GC1_TRIPWIRE_CENTER[1],
        GC1_TRIPWIRE_CENTER[2],
      );
    } catch (err) {}
    try {
      api.setEntityRotation(visualId, 0, GC1_TRIPWIRE_YAW, 0);
    } catch (err) {}
  }
  gc1TripwireState.spawned = true;
  return true;
}

// forget old player positions after a reset
function gc1TripwireClearPlayers() {
  gc1TripwireState.players = {};
  return true;
}

// main tripwire heartbeat
function gc1TripwireTick() {
  if (!gc1TripwireState.spawned) return false;
  var ids = gc1TripwireGetPlayerIds();
  var live = {};
  for (var i = 0; i < ids.length; i++) {
    var playerId = ids[i];
    live[playerId] = true;
    var state = gc1TripwireEnsurePlayerState(playerId);
    if (!playerId || !api.checkValid(playerId)) {
      state.inside = false;
      state.lastPos = null;
      continue;
    }
    var pos = gc1TripwireGetPos(playerId);
    var inside = gc1TripwireContainsPlayer(pos);
    var crossed = gc1TripwireCrossed(state.lastPos, pos);
    if (crossed && !state.inside) gc1TripwireTrigger(playerId);
    state.inside = inside;
    state.lastPos = gc1TripwireClonePos(pos);
  }
  var map = gc1TripwireState.players || {};
  for (var key in map) {
    if (!live[key]) delete map[key];
  }
  return true;
}

// public start entry point
function gc1TripwireStart() {
  gc1TripwireClearPlayers();
  gc1TripwireState.lastTriggeredAt = 0;
  return gc1TripwireSpawnMesh();
}

// stop the tripwire system cleanly
function gc1TripwireStop() {
  gc1TripwireDeleteMesh();
  gc1TripwireClearPlayers();
  gc1TripwireState.spawned = false;
  return true;
}

globalThis.gc1TripwirePrevOnTick =
  typeof globalThis.gc1OnTick === "function" ? globalThis.gc1OnTick : null;
globalThis.gc1OnTick = function () {
  if (typeof globalThis.gc1TripwirePrevOnTick === "function")
    globalThis.gc1TripwirePrevOnTick();
  gc1TripwireTick();
};

globalThis.gc1TripwireStart = gc1TripwireStart;
globalThis.gc1TripwireStop = gc1TripwireStop;
