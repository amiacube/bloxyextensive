// make sure to join bloxdhub.com hehe
//
//
//
// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// we added a lot more comments here so it is easier to follow now
// if you try to paste the full file into one code block, it may go over the 32,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

/* System 1 - Granny Spawner */

// this system owns the granny spawn state and the setup/recovery flow around it
// most of the world just asks this file if granny is alive, ready, or needs a reset

globalThis.gc1GrannyMobId = null;
globalThis.gc1GrannySpawnRequestOpen = false;
globalThis.gc1GrannySpawnRequestDbId = "granny_ch1_main";
globalThis.gc1GrannySpawnAllowedIds =
  typeof globalThis.gc1GrannySpawnAllowedIds === "object" &&
  globalThis.gc1GrannySpawnAllowedIds
    ? globalThis.gc1GrannySpawnAllowedIds
    : {};
globalThis.gc1LobbyHubSpawnAllowedIds =
  typeof globalThis.gc1LobbyHubSpawnAllowedIds === "object" &&
  globalThis.gc1LobbyHubSpawnAllowedIds
    ? globalThis.gc1LobbyHubSpawnAllowedIds
    : {};
globalThis.gc1GrannyLastSpawnAttemptAt =
  typeof globalThis.gc1GrannyLastSpawnAttemptAt === "number"
    ? globalThis.gc1GrannyLastSpawnAttemptAt
    : 0;
globalThis.gc1GrannySetupBusy = !!globalThis.gc1GrannySetupBusy;
globalThis.gc1GrannySetupToken =
  typeof globalThis.gc1GrannySetupToken === "number"
    ? globalThis.gc1GrannySetupToken
    : 0;
globalThis.gc1RunModeState = Object.assign(
  {
    modeKey: "hub",
    grannyEnabled: false,
    setupReady: false,
    lastSetupAt: 0,
  },
  typeof globalThis.gc1RunModeState === "object" && globalThis.gc1RunModeState
    ? globalThis.gc1RunModeState
    : {},
);
var GC1_GRANNY_SETUP_GROUP = "gc1_granny_setup";
var GC1_GRANNY_WATCH_GROUP = "gc1_granny_watch";
var GC1_GRANNY_WATCH_TICK = 0;
var GC1_GRANNY_RESPAWN_PENDING = false;
var GC1_GRANNY_MESH_GROUP = "granny_mesh_attach";
// the mesh and setup groups stay separate so the heavy work can breathe between ticks
var GC1_GRANNY_SPAWN_RETRY_COOLDOWN_MS = 3000;
var GC1_GRANNY_ALLOWED_ID_TTL_MS = 5000;
var GC1_GRANNY_SPAWN_POS = [7.5, 56, 15.5];
var GC1_GRANNY_MOB_DB_ID = "granny_ch1_main";
var GC1_GRANNY_MOB_SETTINGS = {
  name: "",
  baseWalkingSpeed: 0,
  baseRunningSpeed: 0,
  attackRadius: 0,
  attackDamage: 0,
  attackInterval: 0,
  runAwayRadius: 0,
  territoryRadius: 0,
  chaseRadius: 0,
  hostilityRadius: 0,
  idleSound: null,
  attackSound: null,
  secondaryAttackSound: null,
  hurtSound: null,
  stoppingRadius: 0,
};
var GC1_GRANNY_SETTING_KEYS = Object.keys(GC1_GRANNY_MOB_SETTINGS);
var GC1_GRANNY_NAMETAG_INFO = {
  backgroundColor: "rgba(0,0,0,0)",
  content: [],
};
// the attachment list is the body kit we stitch onto the mob after spawn
var GC1_GRANNY_MESH_ATTACHMENTS = [
  [
    "HeadMesh",
    "BloxdBlock",
    { blockName: "Carved Pumpkin", size: 0.5, meshOffset: [0, 0, 0] },
    [0, 0.24, 0],
    [0, 0, 0],
  ],
  [
    "TorsoNode",
    "Box",
    { texture: "snowy_messy_stone", width: 0.5, height: 0.73, depth: 0.3 },
    [0, 0.36, 0],
    [0, 0, 0],
  ],
  [
    "LegLeftMesh",
    "Box",
    { texture: "snowy_messy_stone", width: 0.3, height: 0.8, depth: 0.3 },
    [0, -0.37, 0],
    [0, 0, 0],
  ],
  [
    "LegRightMesh",
    "Box",
    { texture: "snowy_messy_stone", width: 0.3, height: 0.8, depth: 0.3 },
    [0, -0.37, 0],
    [0, 0, 0],
  ],
  [
    "ArmLeftMesh",
    "Box",
    { texture: "brown_mushroom_block", width: 0.25, height: 0.73, depth: 0.25 },
    [0, -0.36, 0],
    [0, 0, 0],
  ],
  [
    "ArmRightMesh",
    "Box",
    { texture: "brown_mushroom_block", width: 0.25, height: 0.73, depth: 0.25 },
    [0, -0.36, 0],
    [0, 0, 0],
  ],
];

function gc1GrannyWaypointToWorldPos(cell, baseY) {
  if (!cell || !cell.length) return null;
  if (cell.length >= 3 && typeof cell[1] === "number")
    return [cell[0], cell[1], cell[2]];
  if (cell.length >= 2) return [cell[0] + 0.5, baseY, cell[1] + 0.5];
  return null;
}

// the spawn picker walks the waypoint sets and turns the local cells into world positions
function gc1GrannyCollectSpawnWaypoints() {
  var out = [];
  var seen = {};
  var pushCells = function (cells, baseY) {
    if (!Array.isArray(cells)) return;
    for (var i = 0; i < cells.length; i++) {
      var pos = gc1GrannyWaypointToWorldPos(cells[i], baseY);
      if (!pos) continue;
      var key =
        pos[0].toFixed(2) + "," + pos[1].toFixed(2) + "," + pos[2].toFixed(2);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(pos);
    }
  };
  var mainY =
    typeof globalThis.GRANNY_MAIN_FLOOR_DEBUG_BASE_Y === "number"
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
  try {
    pushCells(
      typeof globalThis.gc1GetMainFloorWaypointCells === "function"
        ? globalThis.gc1GetMainFloorWaypointCells()
        : null,
      mainY,
    );
  } catch (e) {}
  try {
    pushCells(
      typeof globalThis.gc1GetFloor1WaypointCells === "function"
        ? globalThis.gc1GetFloor1WaypointCells()
        : null,
      floor1Y,
    );
  } catch (e) {}
  try {
    pushCells(
      typeof globalThis.gc1GetBasementWaypointCells === "function"
        ? globalThis.gc1GetBasementWaypointCells()
        : null,
      basementY,
    );
  } catch (e) {}
  return out;
}

// if there are good spawn waypoints, we use them before falling back to the default spot
function gc1GrannyPickSpawnPos() {
  var waypoints = gc1GrannyCollectSpawnWaypoints();
  if (waypoints && waypoints.length)
    return waypoints[Math.floor(Math.random() * waypoints.length)];
  return GC1_GRANNY_SPAWN_POS.slice();
}

// this returns the live granny mob id only if the entity is still valid
function gc1GrannyId() {
  return globalThis.gc1GrannyMobId && api.checkValid(globalThis.gc1GrannyMobId)
    ? globalThis.gc1GrannyMobId
    : null;
}

function gc1GrannyExists() {
  return !!gc1GrannyId();
}

// granny only spawns in the easy mode path
function gc1GrannyModeAllowsSpawn() {
  return !!(
    globalThis.gc1RunModeState && globalThis.gc1RunModeState.grannyEnabled
  );
}

// despawn is the clean reset path when the mob has to go away
function gc1DespawnGrannyNow() {
  var mobId = gc1GrannyId();
  if (!mobId) {
    globalThis.gc1GrannyMobId = null;
    globalThis.gc1GrannySetupBusy = false;
    return false;
  }
  try {
    api.despawnMob(mobId);
  } catch (e) {}
  globalThis.gc1GrannyMobId = null;
  globalThis.gc1GrannySetupBusy = false;
  return true;
}

// switching run modes also flips whether granny is allowed to exist at all
function gc1SetGrannyRunMode(modeKey) {
  var resolved =
    modeKey === "practice" ? "practice" : modeKey === "easy" ? "easy" : "hub";
  var state = globalThis.gc1RunModeState || (globalThis.gc1RunModeState = {});
  state.modeKey = resolved;
  state.grannyEnabled = resolved === "easy";
  state.setupReady = false;
  state.lastSetupAt = 0;
  if (!state.grannyEnabled) {
    if (typeof globalThis.gc1DisarmGrannyPatrol === "function")
      globalThis.gc1DisarmGrannyPatrol();
    gc1DespawnGrannyNow();
  }
  return resolved;
}

// these checks are used when some other system is already doing a heavy path or drop action
function gc1GrannyManualPathBusy() {
  try {
    if (
      globalThis.gc1MainFloorMeshState &&
      globalThis.gc1MainFloorMeshState.active
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
  } catch (e) {}
  return false;
}

// the world sometimes needs to hunt the live mob list and recover the granny id
function gc1FindGrannyMobId() {
  if (typeof api.getMobIds !== "function") return null;
  var mobIds = [];
  try {
    mobIds = api.getMobIds();
  } catch (e) {}
  if (!Array.isArray(mobIds)) return null;
  for (var i = 0; i < mobIds.length; i++) {
    var mobId = mobIds[i];
    try {
      if (api.getEntityType(mobId) === "Draugr Huntress") return mobId;
    } catch (e) {}
  }
  return null;
}

// the allow lists are temporary trust windows for mob ids
// that lets the recovery path accept the right entity without grabbing an old stale one
function gc1RememberAllowedGrannyMobId(mobId, ttlMs) {
  if (!mobId) return false;
  var ms = ttlMs | 0;
  if (ms < 1000) ms = GC1_GRANNY_ALLOWED_ID_TTL_MS;
  globalThis.gc1GrannySpawnAllowedIds[mobId] = Date.now() + ms;
  return true;
}

// stale allow list entries get removed so a dead id does not hang around
function gc1ForgetAllowedGrannyMobId(mobId) {
  if (!mobId) return false;
  delete globalThis.gc1GrannySpawnAllowedIds[mobId];
  return true;
}

// lobby hub gets the same allow-list treatment because the recovery style is shared
function gc1RememberAllowedLobbyMobId(mobId, ttlMs) {
  if (!mobId) return false;
  var ms = ttlMs | 0;
  if (ms < 1000) ms = GC1_GRANNY_ALLOWED_ID_TTL_MS;
  globalThis.gc1LobbyHubSpawnAllowedIds[mobId] = Date.now() + ms;
  return true;
}

// this clears the lobby allow list entry when the id is no longer needed
function gc1ForgetAllowedLobbyMobId(mobId) {
  if (!mobId) return false;
  delete globalThis.gc1LobbyHubSpawnAllowedIds[mobId];
  return true;
}

// cleanup keeps the allow lists small and stops stale ids from piling up forever
function gc1CleanupAllowedGrannyMobIds() {
  var now = Date.now();
  var ids = globalThis.gc1GrannySpawnAllowedIds;
  for (var id in ids) {
    if (!ids[id] || ids[id] <= now) delete ids[id];
  }
}

// same cleanup pass for the lobby side cache
function gc1CleanupAllowedLobbyMobIds() {
  var now = Date.now();
  var ids = globalThis.gc1LobbyHubSpawnAllowedIds;
  for (var id in ids) {
    if (!ids[id] || ids[id] <= now) delete ids[id];
  }
}

// this is the live trust check the rest of the file uses before touching a mob id
function gc1IsAllowedGrannyMobId(mobId) {
  if (!mobId) return false;
  gc1CleanupAllowedGrannyMobIds();
  gc1CleanupAllowedLobbyMobIds();
  if (globalThis.gc1GrannyMobId === mobId) return true;
  if (globalThis.gc1LobbyHubMobIds && globalThis.gc1LobbyHubMobIds[mobId])
    return true;
  if (globalThis.gc1LobbyHubMobId && globalThis.gc1LobbyHubMobId === mobId)
    return true;
  return !!globalThis.gc1GrannySpawnAllowedIds[mobId];
}

// setup only counts as finished if the token still matches the current spawn attempt
function gc1FinishGrannySetup(setupToken) {
  if (setupToken !== globalThis.gc1GrannySetupToken) return false;
  globalThis.gc1GrannySetupBusy = false;
  return true;
}

// the mob setup is split into chunks so spawning granny does not spike one tick too hard
function gc1BeginGrannyMobSetup(mobId, setupToken) {
  if (!mobId || !api.checkValid(mobId)) {
    gc1FinishGrannySetup(setupToken);
    return false;
  }
  try {
    api.setEntityRotation(mobId, 0, 0, 0);
  } catch (e) {}
  try {
    api.setMobAiState(mobId, "disabled", null);
  } catch (e) {}

  var applyMeshChunk = function (startI) {
    if (
      setupToken !== globalThis.gc1GrannySetupToken ||
      !api.checkValid(mobId)
    ) {
      gc1FinishGrannySetup(setupToken);
      return;
    }
    // meshes get attached one by one so the setup stays interruption safe
    var applied = 0;
    for (var i = startI || 0; i < GC1_GRANNY_MESH_ATTACHMENTS.length; i++) {
      if (
        (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
          globalThis.gc1RuntimeCoolingDown()) ||
        (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
      ) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          TS.run(
            function () {
              applyMeshChunk(i);
            },
            200,
            GC1_GRANNY_MESH_GROUP,
          );
        return;
      }
      try {
        var mesh = GC1_GRANNY_MESH_ATTACHMENTS[i];
        api.updateEntityNodeMeshAttachment(
          mobId,
          mesh[0],
          mesh[1],
          mesh[2],
          mesh[3],
          mesh[4],
        );
      } catch (e) {}
      applied++;
      if (applied >= 1 && i + 1 < GC1_GRANNY_MESH_ATTACHMENTS.length) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          TS.run(
            function () {
              applyMeshChunk(i + 1);
            },
            200,
            GC1_GRANNY_MESH_GROUP,
          );
        return;
      }
    }
    gc1FinishGrannySetup(setupToken);
  };

  var applyMobSettingsChunk = function (startI) {
    if (
      setupToken !== globalThis.gc1GrannySetupToken ||
      !api.checkValid(mobId)
    ) {
      gc1FinishGrannySetup(setupToken);
      return;
    }
    // mob settings are also dripped out in small batches for the same reason as joining bloxdhub
    var applied = 0;
    for (var i = startI; i < GC1_GRANNY_SETTING_KEYS.length; i++) {
      if (
        (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
          globalThis.gc1RuntimeCoolingDown()) ||
        (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
      ) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          TS.run(
            function () {
              applyMobSettingsChunk(i);
            },
            100,
            GC1_GRANNY_SETUP_GROUP,
          );
        return;
      }
      var key = GC1_GRANNY_SETTING_KEYS[i];
      try {
        api.setMobSetting(mobId, key, GC1_GRANNY_MOB_SETTINGS[key]);
      } catch (e) {}
      applied++;
      if (applied >= 2 && i + 1 < GC1_GRANNY_SETTING_KEYS.length) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          TS.run(
            function () {
              applyMobSettingsChunk(i + 1);
            },
            100,
            GC1_GRANNY_SETUP_GROUP,
          );
        return;
      }
    }
    try {
      api.setTargetedPlayerSettingForEveryone(
        mobId,
        "nameTagInfo",
        GC1_GRANNY_NAMETAG_INFO,
        true,
      );
    } catch (e) {}
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
      TS.run(
        function () {
          applyMeshChunk(0);
        },
        200,
        GC1_GRANNY_MESH_GROUP,
      );
      return;
    }
    applyMeshChunk(0);
  };

  applyMobSettingsChunk(0);
  return true;
}

// this is the spawn entry point the rest of the world calls
globalThis.gc1SpawnGranny = () => {
  if (!gc1GrannyModeAllowsSpawn()) return null;
  // stop any old setup timers before we start a fresh spawn attempt
  if (typeof TS !== "undefined" && typeof TS.stop === "function") {
    TS.stop(GC1_GRANNY_MESH_GROUP);
    TS.stop(GC1_GRANNY_SETUP_GROUP);
    TS.stop(GC1_GRANNY_WATCH_GROUP);
  }
  GC1_GRANNY_RESPAWN_PENDING = false;
  // try to spawn at a valid waypoint first, then recover the mob if the world already made one
  var spawnPos = gc1GrannyPickSpawnPos();
  var recoveredMobId = gc1FindGrannyMobId();
  if (recoveredMobId && api.checkValid(recoveredMobId)) {
    globalThis.gc1GrannyMobId = recoveredMobId;
    gc1RememberAllowedGrannyMobId(recoveredMobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
    globalThis.gc1GrannySetupBusy = true;
    try {
      api.setPosition(recoveredMobId, spawnPos[0], spawnPos[1], spawnPos[2]);
    } catch (e) {}
    try {
      api.setVelocity(recoveredMobId, 0, 0, 0);
    } catch (e) {}
    var recoveredSetupToken = ++globalThis.gc1GrannySetupToken;
    gc1BeginGrannyMobSetup(recoveredMobId, recoveredSetupToken);
    return recoveredMobId;
  }
  // if the old mob is still hanging around, get it out of the way before the new one comes in
  if (globalThis.gc1GrannyMobId && api.checkValid(globalThis.gc1GrannyMobId)) {
    try {
      api.despawnMob(globalThis.gc1GrannyMobId);
    } catch (e) {}
  }
  globalThis.gc1GrannyLastSpawnAttemptAt = Date.now();
  globalThis.gc1GrannySpawnRequestOpen = true;
  globalThis.gc1GrannySetupBusy = true;
  var setupToken = ++globalThis.gc1GrannySetupToken;

  const mobId = api.attemptSpawnMob(
    "Draugr Huntress",
    spawnPos[0],
    spawnPos[1],
    spawnPos[2],
    {
      playSoundOnSpawn: false,
      mobDbId: GC1_GRANNY_MOB_DB_ID,
      physicsOpts: {
        width: 0.4,
        height: 1.8,
        collidesEntities: false,
      },
    },
  );

  // once the spawn request is done, the allow list closes again right away
  globalThis.gc1GrannySpawnRequestOpen = false;

  if (!mobId) {
    if (setupToken === globalThis.gc1GrannySetupToken)
      globalThis.gc1GrannySetupBusy = false;
    recoveredMobId = gc1FindGrannyMobId();
    if (recoveredMobId && api.checkValid(recoveredMobId)) {
      globalThis.gc1GrannyMobId = recoveredMobId;
      gc1RememberAllowedGrannyMobId(
        recoveredMobId,
        GC1_GRANNY_ALLOWED_ID_TTL_MS,
      );
      globalThis.gc1GrannySetupBusy = true;
      var fallbackSetupToken = ++globalThis.gc1GrannySetupToken;
      gc1BeginGrannyMobSetup(recoveredMobId, fallbackSetupToken);
      return recoveredMobId;
    }
    return null;
  }
  globalThis.gc1GrannyMobId = mobId;
  gc1RememberAllowedGrannyMobId(mobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
  gc1BeginGrannyMobSetup(mobId, setupToken);

  return mobId;
};

// the tick watchdog keeps granny alive, respawns her if needed, and slows down panic loops
globalThis.gc1OnTick = () => {
  GC1_GRANNY_WATCH_TICK++;
  gc1CleanupAllowedGrannyMobIds();
  if (!gc1GrannyModeAllowsSpawn()) {
    GC1_GRANNY_RESPAWN_PENDING = false;
    gc1DespawnGrannyNow();
    return;
  }
  if (globalThis.gc1GrannyMobId && api.checkValid(globalThis.gc1GrannyMobId)) {
    if (!gc1GrannyManualPathBusy() && GC1_GRANNY_WATCH_TICK % 4 === 0) {
      try {
        api.setVelocity(globalThis.gc1GrannyMobId, 0, 0, 0);
      } catch (e) {}
    }
    return;
  }
  if (
    Date.now() - globalThis.gc1GrannyLastSpawnAttemptAt <
    GC1_GRANNY_SPAWN_RETRY_COOLDOWN_MS
  )
    return;
  if (!GC1_GRANNY_RESPAWN_PENDING && GC1_GRANNY_WATCH_TICK % 20 === 0) {
    GC1_GRANNY_RESPAWN_PENDING = true;
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
      TS.run(
        () => {
          GC1_GRANNY_RESPAWN_PENDING = false;
          if (typeof globalThis.gc1SpawnGranny === "function")
            globalThis.gc1SpawnGranny();
        },
        100,
        GC1_GRANNY_WATCH_GROUP,
      );
    } else {
      GC1_GRANNY_RESPAWN_PENDING = false;
      if (typeof globalThis.gc1SpawnGranny === "function")
        globalThis.gc1SpawnGranny();
    }
  }
};

// player damage on granny is blocked (u silly goof tried to attack her, ik it smh 😔)
globalThis.gc1OnPlayerDamagingMob = (
  playerId,
  mobId,
  damageDealt,
  withItem,
  damagerDbId,
) => {
  if (
    mobId === globalThis.gc1GrannyMobId ||
    (globalThis.gc1LobbyHubMobIds && globalThis.gc1LobbyHubMobIds[mobId])
  ) {
    return "preventDamage";
  }
};

// spawn attempts are only allowed when this system has explicitly opened the request window
globalThis.gc1OnPlayerAttemptSpawnMob = (playerId, mobType, x, y, z) => {
  if (
    mobType === "Draugr Huntress" &&
    globalThis.gc1GrannySpawnRequestOpen &&
    globalThis.gc1GrannySpawnRequestDbId === "granny_ch1_main"
  ) {
    return;
  }
  if (
    mobType === "Wildcat" &&
    globalThis.gc1LobbyHubSpawnRequestOpen &&
    globalThis.gc1LobbyHubSpawnRequestDbId === "gc1_lobby_hub"
  ) {
    return;
  }
  return "preventSpawn";
};

// when granny spawns through the normal player path, we capture the live mob id and reject extras
globalThis.gc1OnPlayerSpawnMob = (
  playerId,
  mobId,
  mobType,
  x,
  y,
  z,
  mobHerdId,
  playSoundOnSpawn,
) => {
  if (mobType === "Draugr Huntress") {
    if (!gc1GrannyModeAllowsSpawn()) {
      try {
        api.despawnMob(mobId);
      } catch (e) {}
      return;
    }
    if (
      globalThis.gc1GrannySpawnRequestOpen ||
      gc1IsAllowedGrannyMobId(mobId)
    ) {
      globalThis.gc1GrannyMobId = mobId;
      gc1RememberAllowedGrannyMobId(mobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
      return;
    }
    try {
      api.despawnMob(mobId);
    } catch (e) {}
  }
  if (mobType === "Wildcat") {
    if (
      globalThis.gc1LobbyHubSpawnRequestOpen ||
      (globalThis.gc1LobbyHubMobIds && globalThis.gc1LobbyHubMobIds[mobId])
    ) {
      globalThis.gc1LobbyHubMobId = mobId;
      gc1RememberAllowedLobbyMobId(mobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
      return;
    }
    try {
      api.despawnMob(mobId);
    } catch (e) {}
  }
};

// world spawn hooks get the same treatment so the mob cant sneak in through another path which is unlkily
globalThis.gc1OnWorldSpawnMob = (
  mobId,
  mobType,
  x,
  y,
  z,
  mobHerdId,
  playSoundOnSpawn,
) => {
  if (mobType === "Draugr Huntress") {
    if (!gc1GrannyModeAllowsSpawn()) {
      try {
        api.despawnMob(mobId);
      } catch (e) {}
      return;
    }
    if (
      globalThis.gc1GrannySpawnRequestOpen ||
      gc1IsAllowedGrannyMobId(mobId)
    ) {
      globalThis.gc1GrannyMobId = mobId;
      gc1RememberAllowedGrannyMobId(mobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
      return;
    }
    try {
      api.despawnMob(mobId);
    } catch (e) {}
  }
  if (mobType === "Wildcat") {
    if (
      globalThis.gc1LobbyHubSpawnRequestOpen ||
      (globalThis.gc1LobbyHubMobIds && globalThis.gc1LobbyHubMobIds[mobId])
    ) {
      globalThis.gc1LobbyHubMobId = mobId;
      gc1RememberAllowedLobbyMobId(mobId, GC1_GRANNY_ALLOWED_ID_TTL_MS);
      return;
    }
    try {
      api.despawnMob(mobId);
    } catch (e) {}
  }
};

// despawn requests only get ignored for allowed ids so recovery can finish cleanly
globalThis.gc1OnWorldAttemptDespawnMob = (mobId) => {
  if (gc1IsAllowedGrannyMobId(mobId)) return;
  return;
};

// if the world has extra mobs hanging around, this cleanup loop trims them down over time
const clearOtherMobs = (startI, cachedIds) => {
  var ids = cachedIds || null;
  if (!ids && typeof api.getMobIds === "function") {
    try {
      ids = api.getMobIds();
    } catch (e) {}
  }
  if (Array.isArray(ids)) {
    for (var i = startI || 0; i < ids.length; i++) {
      if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
        if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
          TS.run(() => clearOtherMobs(i, ids), 50, "mob_cleanup");
        return;
      }
      var id = ids[i];
      if (
        id !== globalThis.gc1GrannyMobId &&
        !(globalThis.gc1LobbyHubMobIds && globalThis.gc1LobbyHubMobIds[id])
      ) {
        gc1ForgetAllowedGrannyMobId(id);
        gc1ForgetAllowedLobbyMobId(id);
        try {
          api.despawnMob(id);
        } catch (e) {}
      }
    }
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(() => clearOtherMobs(0, null), 5000, "mob_cleanup");
  }
};
// the cleanup loop is launched on a timer so it can keep the entity list from getting weird
if (typeof TS !== "undefined") {
  TS.run(() => clearOtherMobs(0, null), 5000, "mob_cleanup");
}

globalThis.gc1GrannyId = gc1GrannyId;
globalThis.gc1GrannyExists = gc1GrannyExists;
globalThis.gc1DespawnGrannyNow = gc1DespawnGrannyNow;
globalThis.gc1SetGrannyRunMode = gc1SetGrannyRunMode;
