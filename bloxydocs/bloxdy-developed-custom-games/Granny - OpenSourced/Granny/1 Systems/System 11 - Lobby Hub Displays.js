/*
  Granny Open Source - System 11

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the lobby hub build flow is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 11 - Lobby Hub Displays */
// this file builds the lobby displays, mob props, and queue hub visuals
globalThis.gc1LobbyHubState = Object.assign(
  {
    started: false,
    startQueued: false,
    mobSpawned: false,
    displaySpawned: false,
    defs: null,
    meshIds: {},
    mobIds: {},
    upperKey: {},
    queueState: {},
    matchmaking: {},
    activeRunPlayers: {},
    tileMode: {},
    playerIndex: 0,
    initIndex: 0,
    bootReadyAt: 0,
    startPhase: "idle",
    runtimeTaskId: null,
    runtimeRole: null,
    runtimeLobbyName: null,
  },
  typeof globalThis.gc1LobbyHubState === "object" && globalThis.gc1LobbyHubState
    ? globalThis.gc1LobbyHubState
    : {},
);
var S = globalThis.gc1LobbyHubState;

function lhCurrentLobby() {
  return typeof globalThis.gc1LobbyHubGetCurrentLobbyName === "function"
    ? globalThis.gc1LobbyHubGetCurrentLobbyName()
    : "";
}
function lhRole() {
  return typeof globalThis.gc1LobbyHubGetRuntimeRole === "function"
    ? globalThis.gc1LobbyHubGetRuntimeRole()
    : "hub";
}
function lhIsTicketValid(p, l) {
  return (
    typeof globalThis.gc1LobbyHubIsTicketValidForLobby === "function" &&
    globalThis.gc1LobbyHubIsTicketValidForLobby(p, l)
  );
}
function lhActiveRun(p, l) {
  return (
    typeof globalThis.gc1LobbyHubGetActiveRunPlayer === "function" &&
    globalThis.gc1LobbyHubGetActiveRunPlayer(p, l)
  );
}
function lhConsumeTicket(p, l, n) {
  return (
    typeof globalThis.gc1LobbyHubConsumeQueueTicket === "function" &&
    globalThis.gc1LobbyHubConsumeQueueTicket(p, l, n)
  );
}
function lhMoveState(p) {
  return (
    typeof globalThis.gc1LobbyHubMovePlayerToRuntimeState === "function" &&
    globalThis.gc1LobbyHubMovePlayerToRuntimeState(p)
  );
}
function lhSendHub(p) {
  return (
    typeof globalThis.gc1LobbyHubSendPlayerToHubLobby === "function" &&
    globalThis.gc1LobbyHubSendPlayerToHubLobby(p)
  );
}
function lhSendQueue(p, m) {
  return (
    typeof globalThis.gc1LobbyHubSendPlayerToQueueLobby === "function" &&
    globalThis.gc1LobbyHubSendPlayerToQueueLobby(p, m)
  );
}
function lhPending(p, n) {
  return typeof globalThis.gc1LobbyHubGetPendingMatchmake === "function"
    ? globalThis.gc1LobbyHubGetPendingMatchmake(p, n)
    : null;
}
function lhClearActive(p) {
  return (
    typeof globalThis.gc1LobbyHubClearActiveRunPlayer === "function" &&
    globalThis.gc1LobbyHubClearActiveRunPlayer(p)
  );
}
function lhQueueLobbyPrompt(p) {
  return (
    typeof globalThis.gc1LobbyHubQueueLobbyPrompt === "function" &&
    globalThis.gc1LobbyHubQueueLobbyPrompt(p)
  );
}

var LH_START_GROUP = "gc1_lobby_hub_start";
var LH_RUNTIME_GROUP = "gc1_lobby_hub_runtime";
var LH_JOIN_GROUP = "gc1_lobby_hub_join";
var LH_MOB_GROUP = "gc1_lobby_hub_mob";
// stop every lobby hub task group before rebuilding the scene
function lhStopGroups() {
  if (typeof TS === "undefined" || !TS || typeof TS.stop !== "function")
    return false;
  TS.stop(LH_START_GROUP);
  TS.stop(LH_RUNTIME_GROUP);
  TS.stop(LH_JOIN_GROUP);
  TS.stop(LH_MOB_GROUP);
  TS.stop(LH_JOIN_GROUP + "_init");
  TS.stop(LH_JOIN_GROUP + "_items");
  TS.stop(LH_START_GROUP + "_mobs");
  TS.stop("gc1_lobby_hub");
  TS.stop("gc1_lobby_hub_prompt");
  return true;
}
var LH_UI_DELAY = 50;
var LH_START_DELAY = 250;
var LH_BOOT_SETTLE_MS = 2600;
var LH_BUILD_STEP_MS = 120;
var LH_MOB_STEP_MS = 220;
var LH_MOB_FINISH_MS = 600;
var LH_ACTIVE_MS = 260;
var LH_IDLE_MS = 900;
var LH_PLAYERS_PASS = 1;
var LH_QUEUE_MS = 5000;
var LH_MATCH_TTL_MS = 15000;
var LH_STAND_TTL_MS = 820;
var LH_Q_MIN_X = 24;
var LH_Q_MAX_X = 40;
var LH_Q_MIN_Y = 112;
var LH_Q_MAX_Y = 119;
var LH_Q_MIN_Z = 39;
var LH_Q_MAX_Z = 44;
var LH_ITEM_POINTS = [
  [15.5, 117, 31.5],
  [15.5, 117, 32.5],
  [15.5, 117, 33.5],
  [15.5, 117, 34.5],
];
var LH_MOB_POINTS = [
  [26.5, 114, 41.5],
  [32.5, 114, 41.5],
  [38.5, 114, 41.5],
];
var LH_MODE_DEFS = [
  {
    title: "Practice mode",
    subtitle: "Granny doesn't spawn",
    color: "#A7FF93",
    subtitleColor: "#86D57C",
    bg: "#22283B",
  },
  {
    title: "Easy mode",
    subtitle: "Granny is slower then you",
    color: "#7BE4FF",
    subtitleColor: "#63C8F2",
    bg: "#22283B",
  },
  {
    title: "Multiplayer mode",
    subtitle: "coming soon",
    color: "#FF8080",
    subtitleColor: "#A9AFBC",
    bg: "#22283B",
  },
];
var LH_QUEUE_BLOCKS = [
  {
    name: "Lime Concrete",
    modeKey: "practice",
    label: "Practice mode",
    queue: true,
    color: "#A7FF93",
  },
  {
    name: "Blue Concrete",
    modeKey: "easy",
    label: "Easy mode",
    queue: true,
    color: "#7BE4FF",
  },
  {
    name: "Gray Concrete",
    modeKey: "multiplayer",
    label: "Multiplayer mode",
    queue: false,
    color: "#FF8080",
  },
  {
    name: "Light Gray Concrete",
    modeKey: "multiplayer",
    label: "Multiplayer mode",
    queue: false,
    color: "#FF8080",
  },
];
globalThis.gc1LobbyHubQueueBlocks = LH_QUEUE_BLOCKS;
var LH_ITEM_DEFS = [
  {
    key: "axe",
    itemName: "Iron Axe",
    label: "Axe",
    offset: [0, 0.03, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.08, Math.PI * 0.5],
    hitbox: 0.2,
  },
  {
    key: "shears",
    itemName: "Shears",
    label: "Wire Cutters",
    offset: [0, 0.03, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.2, Math.PI * 0.5],
    hitbox: 0.2,
  },
  {
    key: "mace",
    itemName: "Iron Mace",
    label: "Screwdriver",
    offset: [0, 0.03, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.12, Math.PI * 0.5],
    hitbox: 0.22,
  },
  {
    key: "jump_pad",
    itemName: "Jump Pad",
    label: "Code",
    offset: [0, 0.05, 0],
    rot: [Math.PI * 0.5, 0, Math.PI * 0.5],
    hitbox: 0.34,
  },
];

// clear the local lobby hub state
function lhReset(fullReset) {
  S.started = false;
  S.startQueued = false;
  S.displaySpawned = false;
  S.runtimeTaskId = null;
  S.runtimeRole = null;
  S.runtimeLobbyName = null;
  S.matchmaking = {};
  S.activeRunPlayers = {};
  if (!fullReset) return true;
  S.defs = null;
  S.meshIds = {};
  S.queueState = {};
  S.tileMode = {};
  S.upperKey = {};
  S.playerIndex = 0;
  S.initIndex = 0;
  S.bootReadyAt = 0;
  S.startPhase = "idle";
  return true;
}

S.version = "matchmake_queue_v1";
lhReset(false);
lhStopGroups();

// quick interrupt check used all over the lobby bootstrap
function lhNearInt() {
  return (
    (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()) ||
    (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
  );
}

function lhLoaded() {
  return (
    typeof globalThis.gc1IsBootLoaded === "function" &&
    globalThis.gc1IsBootLoaded()
  );
}

function lhNow() {
  return Date.now();
}

function lhIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function lhSetUpper(playerId, key, textValue) {
  if (!playerId || !textValue) return false;
  if (S.upperKey[playerId] === key) return false;
  S.upperKey[playerId] = key;
  if (!api.checkValid(playerId)) return false;
  try {
    api.setClientOption(playerId, "middleTextUpper", textValue);
  } catch (e) {
    if (
      typeof globalThis.gc1IsInterruptLikeError === "function" &&
      globalThis.gc1IsInterruptLikeError(e) &&
      typeof globalThis.gc1MarkRuntimeCooldown === "function"
    )
      globalThis.gc1MarkRuntimeCooldown(900);
  }
  return true;
}

function lhClearUpper(playerId) {
  if (!playerId || !S.upperKey[playerId]) return false;
  delete S.upperKey[playerId];
  if (!api.checkValid(playerId)) return false;
  try {
    api.setClientOptionToDefault(playerId, "middleTextUpper");
  } catch (e) {
    if (
      typeof globalThis.gc1IsInterruptLikeError === "function" &&
      globalThis.gc1IsInterruptLikeError(e) &&
      typeof globalThis.gc1MarkRuntimeCooldown === "function"
    )
      globalThis.gc1MarkRuntimeCooldown(900);
  }
  return true;
}

// build the item definitions the lobby uses for the display props
function lhDefs() {
  if (Array.isArray(S.defs) && S.defs.length) return S.defs;
  var defs = LH_ITEM_DEFS.map(function (def) {
    return {
      key: def.key,
      itemName: def.itemName,
      label: def.label,
      offset: def.offset.slice(),
      rot: def.rot.slice(),
      hitbox: def.hitbox,
    };
  });
  var sourceDefs = Array.isArray(globalThis.GC1_PUZZLE_ITEM_DEFS)
    ? globalThis.GC1_PUZZLE_ITEM_DEFS
    : null;
  if (sourceDefs && sourceDefs.length >= 4) {
    for (var i = 0; i < defs.length; i++) {
      var src = sourceDefs[i];
      if (!src) continue;
      defs[i].key = src.key || defs[i].key;
      defs[i].itemName = src.itemName || defs[i].itemName;
      defs[i].label = src.label || defs[i].label;
    }
  }
  S.defs = defs;
  return defs;
}

// the queue hub is just a small box in the lobby
function lhBlockIsInQueueHub(x, y, z) {
  return (
    x >= LH_Q_MIN_X &&
    x <= LH_Q_MAX_X &&
    y >= LH_Q_MIN_Y &&
    y <= LH_Q_MAX_Y &&
    z >= LH_Q_MIN_Z &&
    z <= LH_Q_MAX_Z
  );
}

// delete any old item drops from a previous lobby build
function lhDelDrops() {
  var ids = S.itemIds || {};
  for (var key in ids) {
    if (!ids[key]) continue;
    try {
      api.deleteItemDrop(ids[key]);
    } catch (e) {}
    delete ids[key];
  }
  S.itemIds = ids;
  return true;
}

// delete the old display meshes before spawning new ones
function lhDelMeshes() {
  var ids = S.meshIds || {};
  for (var key in ids) {
    if (!ids[key]) continue;
    try {
      api.deleteMeshEntity(ids[key]);
    } catch (e) {}
    delete ids[key];
  }
  var records = S.byPlayer || {};
  for (var playerId in records) {
    var list = records[playerId];
    if (!Array.isArray(list)) continue;
    for (var i = 0; i < list.length; i++) {
      try {
        api.deleteMeshEntity(list[i]);
      } catch (e) {}
    }
  }
  S.byPlayer = {};
  S.meshLabel = {};
  S.displaySpawned = false;
  S.meshIds = ids;
  return true;
}

// delete the little mob props that stand in the lobby display area
function lhDelMobs() {
  var ids = S.mobIds || {};
  for (var id in ids) {
    if (!ids[id]) continue;
    try {
      api.despawnMob(id);
    } catch (e) {}
    delete ids[id];
  }
  S.mobSpawned = false;
  globalThis.gc1LobbyHubMobIds = ids;
}

// add one player to the queue list for this lobby pass
function lhQueuePlayer(playerId) {
  if (!playerId) return false;
  if (!S.started) {
    lhQueueStart();
    return true;
  }
  return true;
}

// choose a size for the floating item display mesh
function lhMeshSize(def) {
  if (!def) return 0.32;
  if (def.key === "shears") return 0.31;
  if (def.key === "mace" || def.key === "jump_pad") return 0.34;
  return 0.32;
}

// spawn the actual floating item mesh
function lhSpawnMesh(def, point) {
  if (!def || !point) return null;
  var off = Array.isArray(def.offset) ? def.offset : [0, 0, 0];
  var physics = {
    doPhysics: false,
    collidesEntities: false,
    widthExpandAmt: 0.02,
    heightExpandAmt: 0.02,
  };
  var meshId = null;
  try {
    meshId = api.attemptCreateMeshEntity(
      "BloxdBlock",
      { blockName: def.itemName, size: lhMeshSize(def) },
      "",
      physics,
    );
  } catch (e) {}
  if (!meshId && def.key !== "jump_pad") {
    var box =
      def.key === "axe"
        ? [0.12, 0.62, 0.08, "Maple Log"]
        : def.key === "shears"
          ? [0.36, 0.12, 0.05, "Iron Block"]
          : [0.1, 0.56, 0.1, "Iron Block"];
    try {
      meshId = api.attemptCreateMeshEntity(
        "Box",
        {
          width: box[0],
          height: box[1],
          depth: box[2],
          texture: box[3],
          diffuseColor: [225, 225, 225],
        },
        "",
        physics,
      );
    } catch (e) {}
  }
  if (!meshId) return null;
  try {
    api.setPosition(
      meshId,
      point[0] + off[0],
      point[1] + off[1],
      point[2] + off[2],
    );
  } catch (e) {}
  try {
    var rot = Array.isArray(def.rot)
      ? def.rot
      : [Math.PI * 0.5, 0, Math.PI * 0.5];
    api.setEntityRotation(meshId, rot[0], rot[1], rot[2]);
  } catch (e) {}
  return meshId;
}

// spawn one of the lobby display stands
function lhSpawnDisplay(index) {
  if (index >= LH_ITEM_POINTS.length) {
    S.displaySpawned = true;
    S.initIndex = 0;
    lhInitPlayers();
    return true;
  }
  if (lhNearInt()) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          lhSpawnDisplay(index);
        },
        LH_BUILD_STEP_MS,
        LH_JOIN_GROUP + "_items",
      );
    return true;
  }
  var defs = lhDefs();
  var def = defs[index];
  var point = LH_ITEM_POINTS[index];
  if (def && point && !S.meshIds[def.key]) {
    var meshId = lhSpawnMesh(def, point);
    if (meshId) S.meshIds[def.key] = meshId;
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(
      function () {
        lhSpawnDisplay(index + 1);
      },
      LH_BUILD_STEP_MS,
      LH_JOIN_GROUP + "_items",
    );
  else lhSpawnDisplay(index + 1);
  return true;
}

// mob tag text for the little model helper
function lhMobTag(def) {
  return {
    backgroundColor: def.bg || "#22283B",
    content: [
      {
        str: def.title,
        style: {
          fontSize: "64px",
          color: def.color || "#FFFFFF",
          fontWeight: "bold",
        },
      },
    ],
    subtitle: [
      {
        str: def.subtitle,
        style: { fontSize: "42px", color: def.subtitleColor || "#B4BCCB" },
      },
    ],
    subtitleBackgroundColor: def.bg || "#22283B",
  };
}

// spawn one of the lobby helper mobs
function lhSpawnMob(index) {
  if (index >= LH_MOB_POINTS.length) {
    S.mobSpawned = true;
    S.startPhase = "running";
    return true;
  }
  if (lhNearInt()) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          lhSpawnMob(index);
        },
        LH_MOB_STEP_MS,
        LH_MOB_GROUP,
      );
    return true;
  }
  var point = LH_MOB_POINTS[index];
  var def = LH_MODE_DEFS[index];
  try {
    api.getBlock(
      Math.floor(point[0]),
      Math.floor(point[1]),
      Math.floor(point[2]),
    );
  } catch (e) {}
  globalThis.gc1LobbyHubSpawnRequestOpen = true;
  globalThis.gc1LobbyHubSpawnRequestDbId = "gc1_lobby_hub";
  var mobId = null;
  try {
    mobId = api.attemptSpawnMob("Wildcat", point[0], point[1], point[2], {
      name: "s",
      mobDbId: "gc1_lobby_hub",
    });
  } catch (e) {}
  globalThis.gc1LobbyHubSpawnRequestOpen = false;
  if (mobId) {
    S.mobIds[mobId] = true;
    globalThis.gc1LobbyHubMobIds = S.mobIds;
    try {
      api.setPosition(mobId, point[0], point[1], point[2]);
      api.setVelocity(mobId, 0, 0, 0);
      api.setEntityHeading(mobId, 90);
      api.setMobSetting(mobId, "walkingSpeedMultiplier", 0);
      api.setMobSetting(mobId, "idleSound", null);
      api.scalePlayerMeshNodes(mobId, { TorsoNode: [0, 4, 0] });
      api.setTargetedPlayerSettingForEveryone(
        mobId,
        "nameTagInfo",
        lhMobTag(def),
        true,
      );
    } catch (e) {}
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(
      function () {
        lhSpawnMob(index + 1);
      },
      LH_MOB_STEP_MS,
      LH_MOB_GROUP,
    );
  else lhSpawnMob(index + 1);
  return true;
}

// start the helper mobs after the display is ready
function lhStartMobs() {
  if (S.startPhase === "mobs") return true;
  if (S.mobSpawned && S.startPhase === "running") return true;
  lhDelMobs();
  S.startPhase = "mobs";
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.stop(LH_MOB_GROUP);
    TS.run(
      function () {
        lhSpawnMob(0);
      },
      LH_MOB_STEP_MS,
      LH_MOB_GROUP,
    );
    return true;
  }
  return lhSpawnMob(0);
}

// convert a queue block into the mode it represents
function lhModeFromBlock(blockName) {
  var block = String(blockName || "");
  if (!block) return null;
  for (var j = 0; j < LH_QUEUE_BLOCKS.length; j++) {
    var entry = LH_QUEUE_BLOCKS[j];
    if (block.indexOf(entry.name) >= 0) return entry;
  }
  return null;
}

// figure out whether a player should be shown as waiting, queued, or in a mode stand
function lhStandMode(playerId, now) {
  var rec = S.tileMode[playerId];
  if (!rec) return null;
  if (now - rec.at > LH_STAND_TTL_MS) {
    delete S.tileMode[playerId];
    return null;
  }
  return rec.mode || null;
}

// show the queue prompt text for the current mode
function lhQueuePrompt(playerId, mode, secondsLeft) {
  var text = [
    { str: "Queuing for ", style: { color: "#FFFFFF" } },
    {
      str: mode.label,
      style: { color: mode.color || "#FFFFFF", fontWeight: "bold" },
    },
    { str: " in " + secondsLeft + "s", style: { color: "#FFFFFF" } },
  ];
  lhSetUpper(playerId, "queue:" + mode.label + ":" + secondsLeft, text);
}

// show the shorter warning prompt when the queue is about to start
function lhSoonPrompt(playerId, mode) {
  var text = [
    {
      str: mode.label,
      style: { color: mode.color || "#FFFFFF", fontWeight: "bold" },
    },
    { str: " is coming soon", style: { color: "#FFFFFF" } },
  ];
  lhSetUpper(playerId, "soon:" + mode.label, text);
}

// move the player into the next lobby state after the queue completes
function lhQueueComplete(playerId, mode) {
  if (!mode) return false;
  if (lhRole() === "queue") {
    if (
      lhActiveRun(playerId, lhCurrentLobby()) ||
      lhConsumeTicket(playerId, lhCurrentLobby())
    )
      return lhMoveState(playerId);
    return lhSendHub(playerId);
  }
  return lhSendQueue(playerId, mode);
}

// process a player while they are just standing in the lobby hub
function lhHandleHubMode(playerId, mode, now) {
  var pending = lhPending(playerId, now);
  if (pending) {
    lhSetUpper(playerId, "sending:" + pending.modeKey, [
      { str: "Sending to ", style: { color: "#FFFFFF" } },
      {
        str: String(pending.targetLobbyName || "run lobby"),
        style: { color: pending.color || "#FFFFFF", fontWeight: "bold" },
      },
    ]);
    return true;
  }
  if (!mode) {
    if (S.queueState[playerId]) delete S.queueState[playerId];
    lhClearUpper(playerId);
    return false;
  }
  var queueState = S.queueState[playerId];
  if (mode.queue === false) {
    if (queueState) delete S.queueState[playerId];
    lhSoonPrompt(playerId, mode);
    return true;
  }
  if (!queueState || queueState.modeKey !== mode.modeKey) {
    queueState = {
      modeKey: mode.modeKey,
      label: mode.label,
      color: mode.color,
      startedAt: now,
    };
    S.queueState[playerId] = queueState;
  }
  var remaining = LH_QUEUE_MS - (now - queueState.startedAt);
  if (remaining > 0) {
    lhQueuePrompt(playerId, queueState, Math.ceil(remaining / 1000));
    return true;
  }
  return lhQueueComplete(playerId, mode);
}

// one pass over a single player in the lobby
function lhProcessPlayer(playerId, now) {
  if (!playerId || !api.checkValid(playerId)) return false;
  if (lhRole() === "queue") {
    if (
      lhActiveRun(playerId, lhCurrentLobby()) ||
      lhConsumeTicket(playerId, lhCurrentLobby(), now)
    ) {
      delete S.matchmaking[playerId];
      lhMoveState(playerId);
      try {
        api.setMaxPlayers(1, 1);
      } catch (e) {}
      lhQueueLobbyPrompt(playerId);
      return true;
    }
    lhClearActive(playerId);
    return lhSendHub(playerId);
  }
  return lhHandleHubMode(playerId, lhStandMode(playerId, now), now);
}

// the main lobby hub loop
function lhRuntimeTick() {
  S.runtimeTaskId = null;
  if (!S.started) return false;
  if (lhNearInt()) {
    lhSchedule(LH_IDLE_MS);
    return true;
  }
  var ids = lhIds();
  if (!ids.length) {
    lhSchedule(LH_IDLE_MS);
    return true;
  }
  var start = S.playerIndex || 0;
  if (start >= ids.length) start = 0;
  var active = false;
  var processed = 0;
  var now = lhNow();
  for (var i = 0; i < ids.length && processed < LH_PLAYERS_PASS; i++) {
    var idx = (start + i) % ids.length;
    try {
      if (lhProcessPlayer(ids[idx], now)) active = true;
    } catch (e) {
      if (
        typeof globalThis.gc1IsInterruptLikeError === "function" &&
        globalThis.gc1IsInterruptLikeError(e)
      ) {
        if (typeof globalThis.gc1MarkRuntimeCooldown === "function")
          globalThis.gc1MarkRuntimeCooldown(900);
        lhSchedule(LH_IDLE_MS);
        return true;
      }
    }
    processed++;
    if (lhNearInt()) break;
  }
  S.playerIndex = (start + processed) % ids.length;
  lhSchedule(active ? LH_ACTIVE_MS : LH_IDLE_MS);
  return true;
}

// queue the next lobby hub tick
function lhSchedule(delayMs) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return false;
  if (
    S.runtimeTaskId &&
    typeof TS.isTaskActive === "function" &&
    TS.isTaskActive(S.runtimeTaskId)
  )
    return true;
  S.runtimeTaskId = TS.run(lhRuntimeTick, delayMs, LH_RUNTIME_GROUP);
  return true;
}

// make sure players are tagged and placed into the correct lobby flow
function lhInitPlayers() {
  if (!S.started) return false;
  var ids = lhIds();
  S.initIndex = 0;
  if (lhRole() === "queue") {
    for (var i = 0; i < ids.length; i++) {
      if (
        lhActiveRun(ids[i], lhCurrentLobby()) ||
        lhConsumeTicket(ids[i], lhCurrentLobby())
      ) {
        delete S.matchmaking[ids[i]];
        lhMoveState(ids[i]);
        lhQueueLobbyPrompt(ids[i]);
      } else {
        lhClearActive(ids[i]);
        lhSendHub(ids[i]);
      }
    }
    return true;
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(lhStartMobs, LH_MOB_STEP_MS, LH_START_GROUP + "_mobs");
  else lhStartMobs();
  return true;
}

// stop the lobby hub runtime cleanly
function lhStop() {
  var ids = lhIds();
  for (var i = 0; i < ids.length; i++) {
    lhClearUpper(ids[i]);
  }
  lhDelDrops();
  lhDelMeshes();
  lhDelMobs();
  lhReset(true);
  lhStopGroups();
  return true;
}

// one boot step at a time so the lobby can settle without freezing
function lhStartStep() {
  S.startQueued = false;
  if (S.started) return true;
  var role = lhRole();
  if (!lhLoaded() || lhNearInt()) {
    S.bootReadyAt = 0;
    lhQueueStart();
    return true;
  }
  if (!S.bootReadyAt) S.bootReadyAt = lhNow();
  if (lhNow() - S.bootReadyAt < LH_BOOT_SETTLE_MS) {
    lhQueueStart();
    return true;
  }
  S.started = true;
  S.initIndex = 0;
  S.startPhase = role === "queue" ? "queue" : "building";
  if (role === "queue") {
    try {
      api.setMaxPlayers(1, 1);
    } catch (e) {}
    lhInitPlayers();
    lhSchedule(LH_IDLE_MS);
    return true;
  }
  lhDelDrops();
  lhDelMeshes();
  lhSpawnDisplay(0);
  return true;
}

// queue the actual lobby start after the boot delay
function lhQueueStart() {
  if (S.started || S.startQueued) return true;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return false;
  S.startQueued = true;
  TS.run(lhStartStep, LH_START_DELAY, LH_START_GROUP);
  return true;
}

// public start entry point for the lobby hub system
function lhStart() {
  return lhQueueStart();
}

globalThis.gc1LobbyHubStart = lhStart;
globalThis.gc1LobbyHubStop = lhStop;
globalThis.gc1LobbyHubNow = lhNow;
globalThis.gc1LobbyHubGetPlayerIds = lhIds;
globalThis.gc1LobbyHubSetUpper = lhSetUpper;
globalThis.gc1LobbyHubClearUpper = lhClearUpper;
globalThis.gc1GetJoinLobbyState = function (playerId) {
  var lobbyName = lhCurrentLobby();
  if (lhIsTicketValid(playerId, lobbyName))
    return (
      (globalThis.gc1LobbyMatchmakeConfig &&
        globalThis.gc1LobbyMatchmakeConfig.queueStateName) ||
      "lobby_que"
    );
  return (
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.hubStateName) ||
    "lobby"
  );
};
globalThis.gc1OnPlayerJoin = (function (prev) {
  return function (playerId) {
    if (typeof prev === "function") prev(playerId);
    if (!lhIsTicketValid(playerId, lhCurrentLobby())) lhClearActive(playerId);
    lhMoveState(playerId);
    if (typeof globalThis.gc1RefreshRunAtmosphere === "function")
      globalThis.gc1RefreshRunAtmosphere(playerId, { force: true });
    if (lhRole() === "queue") {
      try {
        api.setMaxPlayers(1, 1);
      } catch (e) {}
      lhQueueLobbyPrompt(playerId);
    }
    lhQueuePlayer(playerId);
  };
})(
  typeof globalThis.gc1OnPlayerJoin === "function"
    ? globalThis.gc1OnPlayerJoin
    : null,
);

globalThis.gc1OnBlockStand = (function (prev) {
  return function (playerId, x, y, z, blockName) {
    if (typeof prev === "function") prev(playerId, x, y, z, blockName);
    if (!playerId || lhRole() === "queue") return false;
    var inQueueHub = lhBlockIsInQueueHub(x, y, z);
    if (!inQueueHub && !S.tileMode[playerId]) return false;
    var mode = inQueueHub ? lhModeFromBlock(blockName) : null;
    var now = lhNow();
    S.tileMode[playerId] = { mode: mode, at: now };
    return lhHandleHubMode(playerId, mode, now);
  };
})(
  typeof globalThis.gc1OnBlockStand === "function"
    ? globalThis.gc1OnBlockStand
    : null,
);

lhStart();
