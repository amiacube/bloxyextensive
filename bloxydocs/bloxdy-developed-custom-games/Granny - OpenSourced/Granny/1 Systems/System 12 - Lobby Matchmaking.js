/*
  Granny Open Source - System 12

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the matchmaking flow is easier to understand
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 12 - Lobby Matchmaking */

// this file is the queue sekret brain
// it handles tickets, lobby reservations, and the run intro handoff
globalThis.gc1LobbyHubState = Object.assign(
  {
    matchmaking: {},
    activeRunPlayers: {},
    runLobbyReservations: {},
    runLobbySerial: 0,
    runtimeRole: null,
    runtimeLobbyName: null,
  },
  typeof globalThis.gc1LobbyHubState === "object" && globalThis.gc1LobbyHubState
    ? globalThis.gc1LobbyHubState
    : {},
);

var gc1LobbyHubState = globalThis.gc1LobbyHubState;
var GC1_GRANNY_RUN_INTRO_FADE_STEP_MS = 120;
var GC1_GRANNY_RUN_INTRO_POLL_DELAY_MS = 250;

// simple config for queue db keys and run lobby ranges
globalThis.gc1LobbyMatchmakeConfig = Object.assign(
  {
    hubStateName: "lobby",
    queueStateName: "lobby_que",
    queuePlayerDbKey: "gc1_queue_mode",
    queueLobbyDbKey: "gc1_queue_lobby",
    queueIssuedAtDbKey: "gc1_queue_issued_at",
    queueTicketTtlMs: 300000,
    runLobbyMin: 1000000,
    runLobbyMax: 2147483000,
  },
  typeof globalThis.gc1LobbyMatchmakeConfig === "object" &&
    globalThis.gc1LobbyMatchmakeConfig
    ? globalThis.gc1LobbyMatchmakeConfig
    : {},
);

// read the current lobby name from the api
function gc1LobbyHubGetCurrentLobbyName() {
  try {
    return api.getLobbyName();
  } catch (e) {}
  return "";
}

// write one matchmaking value into player db or fallback db
function gc1LobbyHubSetPlayerDbValue(playerId, key, value) {
  if (!playerId || !key) return false;
  try {
    if (typeof api.setPlayerDbValue === "function") {
      api.setPlayerDbValue(playerId, key, value);
      return true;
    }
    if (typeof api.setDBValue === "function") {
      api.setDBValue(key, value);
      return true;
    }
  } catch (e) {}
  return false;
}

// read one matchmaking value back out
function gc1LobbyHubGetPlayerDbValue(playerId, key) {
  if (!playerId || !key) return null;
  try {
    if (typeof api.getPlayerDbValue === "function")
      return api.getPlayerDbValue(playerId, key);
    if (typeof api.getDBValue === "function") return api.getDBValue(key);
  } catch (e) {}
  return null;
}

// player db ids can be weird, so this helper keeps them as a safe string
function gc1LobbyHubGetPlayerDbIdSafe(playerId) {
  if (!playerId) return "";
  try {
    if (typeof api.getPlayerDbId === "function")
      return String(api.getPlayerDbId(playerId) || "");
  } catch (e) {}
  try {
    return String(playerId || "");
  } catch (e) {}
  return "";
}

// clear one db value if the api supports it
function gc1LobbyHubDeletePlayerDbValue(playerId, key) {
  if (!playerId || !key) return false;
  try {
    if (typeof api.deletePlayerDbValue === "function") {
      api.deletePlayerDbValue(playerId, key);
      return true;
    }
  } catch (e) {}
  return false;
}

function gc1LobbyHubMatchNow() {
  if (typeof globalThis.gc1LobbyHubNow === "function")
    return globalThis.gc1LobbyHubNow();
  return Date.now();
}

function gc1LobbyHubMatchPlayerIds() {
  if (typeof globalThis.gc1LobbyHubGetPlayerIds === "function")
    return globalThis.gc1LobbyHubGetPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1LobbyHubHashTextToDigits(text, width) {
  var value = String(text || "");
  var hashA = 2166136261;
  var hashB = 1315423911;
  for (var i = 0; i < value.length; i++) {
    var code = value.charCodeAt(i);
    hashA ^= code;
    hashA = Math.imul(hashA, 16777619);
    hashB ^= code + i + 1;
    hashB = Math.imul(hashB ^ (hashB >>> 7), 2654435761);
  }
  var merged = ((hashA >>> 0).toString() + (hashB >>> 0).toString()).replace(
    /\D/g,
    "",
  );
  if (!merged) merged = "0";
  width = typeof width === "number" && width > 0 ? width | 0 : 12;
  while (merged.length < width) merged += merged;
  return merged.slice(0, width);
}

// expire old run lobby reservations so names do not stay blocked forever
function gc1LobbyHubCleanupRunLobbyReservations(now) {
  var state = globalThis.gc1LobbyHubState || {};
  var map = state.runLobbyReservations || {};
  var currentNow = now || gc1LobbyHubMatchNow();
  for (var key in map) {
    var rec = map[key];
    if (!rec) {
      delete map[key];
      continue;
    }
    if (rec.expiresAt && currentNow > rec.expiresAt) delete map[key];
  }
  state.runLobbyReservations = map;
  return map;
}

function gc1LobbyHubIsRunLobbyReserved(lobbyName) {
  var map = gc1LobbyHubCleanupRunLobbyReservations();
  return !!map[String(lobbyName || "")];
}

// mark a run lobby name as taken
function gc1LobbyHubReserveRunLobbyName(lobbyName, playerId) {
  var key = String(lobbyName || "");
  if (!key) return false;
  var state = globalThis.gc1LobbyHubState || {};
  var map = gc1LobbyHubCleanupRunLobbyReservations();
  var existing = map[key];
  if (existing && existing.playerId && existing.playerId !== playerId)
    return false;
  map[key] = {
    playerId: playerId || null,
    at: gc1LobbyHubMatchNow(),
    expiresAt: gc1LobbyHubMatchNow() + 600000,
  };
  state.runLobbyReservations = map;
  return true;
}

// free a run lobby name after a run is done
function gc1LobbyHubReleaseRunLobbyName(lobbyName, playerId) {
  var map = gc1LobbyHubCleanupRunLobbyReservations();
  var key = String(lobbyName || "");
  var rec = map[key];
  if (!rec) return false;
  if (
    playerId != null &&
    rec.playerId != null &&
    String(rec.playerId) !== String(playerId)
  )
    return false;
  delete map[key];
  return true;
}

// turn a queue key back into the mode definition
function gc1LobbyHubGetModeByKey(modeKey) {
  var key = String(modeKey || "");
  if (!key) return null;
  var blocks = globalThis.gc1LobbyHubQueueBlocks || [];
  for (var i = 0; i < blocks.length; i++) {
    var mode = blocks[i];
    if (mode && String(mode.modeKey || "") === key) return mode;
  }
  return null;
}

// store the mode a player picked in db
function gc1LobbyHubSetPlayerQueueMode(playerId, mode) {
  if (!playerId || !mode) return false;
  return gc1LobbyHubSetPlayerDbValue(
    playerId,
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.queuePlayerDbKey) ||
      "gc1_queue_mode",
    mode.modeKey || mode.label || "",
  );
}

// read the current queue mode for a player
function gc1LobbyHubGetPlayerQueueMode(playerId) {
  if (!playerId) return null;
  return gc1LobbyHubGetModeByKey(
    gc1LobbyHubGetPlayerDbValue(
      playerId,
      (globalThis.gc1LobbyMatchmakeConfig &&
        globalThis.gc1LobbyMatchmakeConfig.queuePlayerDbKey) ||
        "gc1_queue_mode",
    ),
  );
}

// get the lobby name the player is trying to join
function gc1LobbyHubGetPlayerTargetLobby(playerId) {
  var value = gc1LobbyHubGetPlayerDbValue(
    playerId,
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.queueLobbyDbKey) ||
      "gc1_queue_lobby",
  );
  return value == null ? null : String(value);
}

// set the lobby name the player should be moved into
function gc1LobbyHubSetPlayerTargetLobby(playerId, lobbyName) {
  return gc1LobbyHubSetPlayerDbValue(
    playerId,
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.queueLobbyDbKey) ||
      "gc1_queue_lobby",
    String(lobbyName),
  );
}

// read when the queue ticket was issued
function gc1LobbyHubGetPlayerQueueIssuedAt(playerId) {
  var value = gc1LobbyHubGetPlayerDbValue(
    playerId,
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.queueIssuedAtDbKey) ||
      "gc1_queue_issued_at",
  );
  var num = Number(value);
  return isFinite(num) ? num : 0;
}

// write the issue time for the queue ticket
function gc1LobbyHubSetPlayerQueueIssuedAt(playerId, issuedAt) {
  return gc1LobbyHubSetPlayerDbValue(
    playerId,
    (globalThis.gc1LobbyMatchmakeConfig &&
      globalThis.gc1LobbyMatchmakeConfig.queueIssuedAtDbKey) ||
      "gc1_queue_issued_at",
    String(Math.floor(Number(issuedAt) || 0)),
  );
}

// clear the queue ticket values once they are used
function gc1LobbyHubClearPlayerQueueTicket(playerId) {
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  gc1LobbyHubDeletePlayerDbValue(
    playerId,
    config.queuePlayerDbKey || "gc1_queue_mode",
  );
  gc1LobbyHubDeletePlayerDbValue(
    playerId,
    config.queueLobbyDbKey || "gc1_queue_lobby",
  );
  gc1LobbyHubDeletePlayerDbValue(
    playerId,
    config.queueIssuedAtDbKey || "gc1_queue_issued_at",
  );
  return true;
}

// build the pending matchmaking state for one player
function gc1LobbyHubGetPendingMatchmake(playerId, now) {
  if (!playerId) return null;
  var pending = gc1LobbyHubState.matchmaking[playerId];
  if (!pending) return null;
  var currentNow = now || gc1LobbyHubMatchNow();
  var ttl =
    typeof globalThis.GC1_LOBBY_HUB_MATCHMAKE_TTL_MS === "number"
      ? globalThis.GC1_LOBBY_HUB_MATCHMAKE_TTL_MS
      : 15000;
  if (currentNow - (pending.at || 0) > ttl) {
    delete gc1LobbyHubState.matchmaking[playerId];
    return null;
  }
  return pending;
}

// remember that a player is now inside a live run lobby
function gc1LobbyHubMarkActiveRunPlayer(playerId, lobbyName, mode) {
  if (!playerId) return false;
  gc1LobbyHubState.activeRunPlayers[playerId] = {
    lobbyName: String(lobbyName || gc1LobbyHubGetCurrentLobbyName()),
    modeKey: mode && mode.modeKey ? mode.modeKey : null,
    at: gc1LobbyHubMatchNow(),
  };
  return true;
}

// forget a player from the active run map
function gc1LobbyHubClearActiveRunPlayer(playerId) {
  if (!playerId) return false;
  delete gc1LobbyHubState.activeRunPlayers[playerId];
  return true;
}

// read back an active run record if it still matches the lobby
function gc1LobbyHubGetActiveRunPlayer(playerId, lobbyName) {
  if (!playerId) return null;
  var rec = gc1LobbyHubState.activeRunPlayers[playerId];
  if (!rec) return null;
  if (lobbyName != null && String(rec.lobbyName) !== String(lobbyName))
    return null;
  if (!api.checkValid(playerId)) {
    delete gc1LobbyHubState.activeRunPlayers[playerId];
    return null;
  }
  return rec;
}

// combine the queue values into one easy ticket object
function gc1LobbyHubGetPlayerQueueTicket(playerId) {
  if (!playerId) return null;
  var targetLobby = gc1LobbyHubGetPlayerTargetLobby(playerId);
  var mode = gc1LobbyHubGetPlayerQueueMode(playerId);
  var issuedAt = gc1LobbyHubGetPlayerQueueIssuedAt(playerId);
  if (!targetLobby || !mode || !issuedAt) return null;
  return { targetLobby: String(targetLobby), mode: mode, issuedAt: issuedAt };
}

// decide if a ticket still counts for this lobby
function gc1LobbyHubIsTicketValidForLobby(playerId, lobbyName, now) {
  var ticket = gc1LobbyHubGetPlayerQueueTicket(playerId);
  if (!ticket) return false;
  var ttl =
    typeof globalThis.gc1LobbyMatchmakeConfig.queueTicketTtlMs === "number"
      ? globalThis.gc1LobbyMatchmakeConfig.queueTicketTtlMs
      : 300000;
  var currentNow = now || gc1LobbyHubMatchNow();
  if (currentNow - ticket.issuedAt > ttl) {
    gc1LobbyHubClearPlayerQueueTicket(playerId);
    return false;
  }
  return (
    String(ticket.targetLobby) ===
    String(lobbyName || gc1LobbyHubGetCurrentLobbyName())
  );
}

// spend the queue ticket and move the player into active run state
function gc1LobbyHubConsumeQueueTicket(playerId, lobbyName, now) {
  var ticket = gc1LobbyHubGetPlayerQueueTicket(playerId);
  if (!ticket) return null;
  var targetLobby = String(lobbyName || gc1LobbyHubGetCurrentLobbyName());
  if (!gc1LobbyHubIsTicketValidForLobby(playerId, targetLobby, now))
    return null;
  gc1LobbyHubMarkActiveRunPlayer(playerId, targetLobby, ticket.mode);
  gc1LobbyHubClearPlayerQueueTicket(playerId);
  return ticket;
}

// check if anyone is already in the run lobby
function gc1LobbyHubLobbyHasRunPlayer(now) {
  var ids = gc1LobbyHubMatchPlayerIds();
  if (!ids.length) return false;
  var lobbyName = gc1LobbyHubGetCurrentLobbyName();
  for (var i = 0; i < ids.length; i++) {
    if (gc1LobbyHubGetActiveRunPlayer(ids[i], lobbyName)) return true;
    if (gc1LobbyHubIsTicketValidForLobby(ids[i], lobbyName, now)) return true;
  }
  return false;
}

// tell the runtime whether this lobby is acting like queue or run
function gc1LobbyHubGetRuntimeRole(now) {
  var currentLobbyName = gc1LobbyHubGetCurrentLobbyName();
  gc1LobbyHubState.runtimeLobbyName = currentLobbyName;
  gc1LobbyHubState.runtimeRole = gc1LobbyHubLobbyHasRunPlayer(now)
    ? "queue"
    : "hub";
  return gc1LobbyHubState.runtimeRole;
}

// pick a new run lobby name that has not been reserved yet
function gc1LobbyHubPickRunLobbyName() {
  var playerId = arguments.length > 0 ? arguments[0] : null;
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var min =
    typeof config.runLobbyMin === "number" ? config.runLobbyMin : 1000000;
  var max =
    typeof config.runLobbyMax === "number" ? config.runLobbyMax : 2147483000;
  if (max <= min) max = min + 1000;
  var current = String(gc1LobbyHubGetCurrentLobbyName() || "");
  var dbId = gc1LobbyHubGetPlayerDbIdSafe(playerId);
  var seed = gc1LobbyHubHashTextToDigits(
    dbId +
      "|" +
      current +
      "|" +
      gc1LobbyHubMatchNow() +
      "|" +
      (globalThis.gc1LobbyHubState.runLobbySerial =
        (globalThis.gc1LobbyHubState.runLobbySerial | 0) + 1),
    12,
  );
  var candidate = String((String(Date.now()) + seed).slice(0, 16));
  if (candidate === current)
    candidate = String((String(Date.now() + 1) + seed).slice(0, 16));
  if (gc1LobbyHubIsRunLobbyReserved(candidate))
    candidate = String((String(Date.now() + 2) + seed).slice(0, 16));
  if (candidate.length < 12)
    candidate = String(
      (String(Date.now()) + seed + "000000000000").slice(0, 16),
    );
  if (Number(candidate) < min) candidate = String(min) + seed.slice(0, 4);
  if (Number(candidate) > max) candidate = candidate.slice(0, 16);
  return candidate;
}

// stop the run intro cleanly if we need to restart it
function gc1GrannyRunIntroStop(playerId) {
  var group = "gc1_granny_run_intro_" + playerId;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(group);
  if (globalThis.gc1GrannyRunIntroState)
    delete globalThis.gc1GrannyRunIntroState[playerId];
  return true;
}

// apply the scary run atmosphere before the intro starts
function gc1GrannyRunIntroPrimeAtmosphere(playerId, state) {
  if (!api.checkValid(playerId)) return false;
  if (!state)
    state =
      globalThis.gc1GrannyRunIntroState &&
      globalThis.gc1GrannyRunIntroState[playerId];
  if (!state || state.atmospherePrimed)
    return !!(state && state.atmospherePrimed);
  if (!(globalThis.gc1RunModeState && globalThis.gc1RunModeState.setupReady))
    return false;
  if (typeof globalThis.gc1ApplyRunAtmosphere !== "function") return false;
  try {
    globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
    state.atmospherePrimed = true;
    return true;
  } catch (e) {}
  return false;
}

// finish the intro and hand the player off to the active run lobby
function gc1GrannyRunIntroFinish(playerId) {
  if (!api.checkValid(playerId)) return false;
  if (typeof globalThis.gc1LobbyHubClearUpper === "function")
    globalThis.gc1LobbyHubClearUpper(playerId);
  if (typeof globalThis.gc1ReleaseIntroLock === "function")
    globalThis.gc1ReleaseIntroLock(playerId, { preserveAtmosphere: true });
  if (
    globalThis.gc1RunModeState &&
    globalThis.gc1RunModeState.setupReady &&
    typeof globalThis.gc1ApplyRunAtmosphere === "function"
  ) {
    try {
      globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
    } catch (e) {}
  }
  if (
    globalThis.gc1RunModeState &&
    globalThis.gc1RunModeState.setupReady &&
    typeof globalThis.gc1ApplyGoMovement === "function"
  ) {
    try {
      globalThis.gc1ApplyGoMovement(playerId);
    } catch (e) {}
  }
  if (typeof globalThis.gc1SetClientOptionsSafe === "function") {
    try {
      globalThis.gc1SetClientOptionsSafe(playerId, {
        forcedCameraDirection: null,
        forcedCameraDirectionTransitionMs: 0,
      });
    } catch (e) {}
  }
  gc1GrannyRunIntroStop(playerId);
  return true;
}

// show one step of the intro text or screen reveal
function gc1GrannyRunIntroRevealStep(playerId, step) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId];
  if (!state || !state.active) return false;
  var fades = [1, 0.9, 0.78, 0.64, 0.5, 0.38, 0.26, 0.14, 0];
  if (step >= fades.length) return gc1GrannyRunIntroFinish(playerId);
  gc1GrannyRunIntroPrimeAtmosphere(playerId, state);
  if (typeof globalThis.gc1SetClientOptionsSafe === "function") {
    var revealOptions = {
      cameraTint: [0, 0, 0, fades[step]],
      forcedCameraDirection: state.dir || null,
      forcedCameraDirectionTransitionMs: 0,
      speedMultiplier: 0,
      walkingSpeed: 0,
      runningSpeed: 0,
      jumpAmount: 0,
    };
    if (!state.atmospherePrimed) {
      revealOptions.fogColourOverride = fades[step] > 0 ? "#000000" : null;
      revealOptions.fogChunkDistanceOverride = fades[step] > 0 ? 0 : null;
    }
    globalThis.gc1SetClientOptionsSafe(playerId, revealOptions);
  }
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyRunIntroRevealStep(playerId, step + 1);
      },
      GC1_GRANNY_RUN_INTRO_FADE_STEP_MS,
      "gc1_granny_run_intro_" + playerId,
    );
  } else {
    gc1GrannyRunIntroRevealStep(playerId, step + 1);
  }
  return true;
}

// wait for the lobby to finish booting before revealing the run
function gc1GrannyRunIntroWaitForBoot(playerId) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId];
  if (!state || !state.active) return false;
  if (typeof globalThis.gc1ApplyIntroLock === "function")
    globalThis.gc1ApplyIntroLock(playerId, state.dir);
  gc1GrannyRunIntroPrimeAtmosphere(playerId, state);
  if (
    typeof globalThis.gc1IsBootLoaded === "function" &&
    globalThis.gc1IsBootLoaded()
  )
    return gc1GrannyRunIntroRevealStep(playerId, 0);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyRunIntroWaitForBoot(playerId);
      },
      GC1_GRANNY_RUN_INTRO_POLL_DELAY_MS,
      "gc1_granny_run_intro_" + playerId,
    );
  }
  return true;
}

// step through the intro one bit at a time
function gc1GrannyRunIntroStep(playerId, step) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId];
  if (!state || !state.active) return false;
  if (typeof globalThis.gc1ApplyIntroLock === "function")
    globalThis.gc1ApplyIntroLock(playerId, state.dir);
  if (typeof globalThis.gc1LobbyHubClearUpper === "function")
    globalThis.gc1LobbyHubClearUpper(playerId);
  var lines = [
    {
      type: "flying",
      text: "You have 5 days...",
      size: "2.15rem",
      life: 3000,
      sound: ["pulseFromTheDark", 0.82, 0.42],
    },
    {
      type: "flying",
      text: "Good luck.",
      size: "2.15rem",
      life: 3000,
      sound: ["pistol_magazine_load_02", 0.48, 0.5],
    },
    {
      type: "lower",
      text: "Day 1...",
      life: 3000,
      sound: ["hauntedHorrorImpact", 1, 0.8],
    },
  ];
  if (step < lines.length) {
    var item = lines[step];
    if (item.type === "lower") {
      if (typeof globalThis.gc1SetClientOptionsSafe === "function")
        globalThis.gc1SetClientOptionsSafe(playerId, {
          middleTextLower: item.text,
        });
    } else {
      try {
        api.sendFlyingMiddleMessage(
          playerId,
          [
            {
              str: item.text,
              style: { color: "#ffffff", fontSize: item.size },
            },
          ],
          0,
          item.life,
        );
      } catch (e) {}
    }
    try {
      if (item.sound)
        api.playSound(playerId, item.sound[0], item.sound[1], item.sound[2]);
    } catch (e) {}
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          gc1GrannyRunIntroStep(playerId, step + 1);
        },
        item.life - 200,
        "gc1_granny_run_intro_" + playerId,
      );
    else gc1GrannyRunIntroStep(playerId, step + 1);
    return true;
  }
  if (step === 3) {
    if (typeof globalThis.gc1SetClientOptionsSafe === "function")
      globalThis.gc1SetClientOptionsSafe(playerId, { middleTextLower: "" });
    return gc1GrannyRunIntroWaitForBoot(playerId);
    return true;
  }
  return gc1GrannyRunIntroFinish(playerId);
}

// start the run intro for one player
function gc1GrannyRunIntroStart(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var queueStateName = config.queueStateName || "lobby_que";
  var states = globalThis.gc1LobbyStates || {};
  var stateDef = states[queueStateName] || states.lobby_que || null;
  var lobbyName = String(gc1LobbyHubGetCurrentLobbyName() || "");
  globalThis.gc1GrannyRunIntroPlayed = globalThis.gc1GrannyRunIntroPlayed || {};
  var activeState =
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId];
  if (activeState && activeState.active && activeState.lobbyName === lobbyName)
    return true;
  if (globalThis.gc1GrannyRunIntroPlayed[playerId] === lobbyName) return true;
  if (!globalThis.gc1GrannyRunIntroState)
    globalThis.gc1GrannyRunIntroState = {};
  gc1GrannyRunIntroStop(playerId);
  globalThis.gc1GrannyRunIntroPlayed[playerId] = lobbyName;
  globalThis.gc1GrannyRunIntroState[playerId] = {
    active: true,
    startedAt: Date.now(),
    dir: stateDef && stateDef.dir ? stateDef.dir : null,
    lobbyName: lobbyName,
    atmospherePrimed: false,
  };
  if (typeof globalThis.gc1GrannyLobbyIntroStop === "function")
    globalThis.gc1GrannyLobbyIntroStop(playerId);
  if (typeof globalThis.gc1GrannyQueueIntroStop === "function")
    globalThis.gc1GrannyQueueIntroStop(playerId);
  gc1GrannyRunIntroPrimeAtmosphere(
    playerId,
    globalThis.gc1GrannyRunIntroState[playerId],
  );
  gc1GrannyRunIntroStep(playerId, 0);
  return true;
}

// move the player into the runtime lobby state
function gc1LobbyHubMovePlayerToRuntimeState(playerId) {
  if (!playerId || typeof globalThis.gc1SendPlayerToLobbyState !== "function")
    return false;
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var targetState =
    gc1LobbyHubGetRuntimeRole() === "queue"
      ? config.queueStateName
      : config.hubStateName;
  if (!targetState) return false;
  var states = globalThis.gc1LobbyStates || {};
  var expectedStateName =
    states[targetState] && states[targetState].name
      ? states[targetState].name
      : targetState;
  if (
    globalThis.gc1PlayerLobbyState &&
    globalThis.gc1PlayerLobbyState[playerId] === expectedStateName
  ) {
    return true;
  }
  globalThis.gc1SendPlayerToLobbyState(playerId, targetState);
  return true;
}

// show the lobby prompt and keep the player in queue flow
function gc1LobbyHubQueueLobbyPrompt(playerId) {
  var setUpper = globalThis.gc1LobbyHubSetUpper;
  if (!playerId || typeof setUpper !== "function") return false;
  if (
    globalThis.gc1GrannyQueueIntroState &&
    globalThis.gc1GrannyQueueIntroState[playerId] &&
    globalThis.gc1GrannyQueueIntroState[playerId].active
  )
    return true;
  if (
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId] &&
    globalThis.gc1GrannyRunIntroState[playerId].active
  )
    return true;
  var lobbyName = gc1LobbyHubGetCurrentLobbyName();
  var active = gc1LobbyHubGetActiveRunPlayer(playerId, lobbyName);
  if (active) {
    if (typeof globalThis.gc1LobbyHubClearUpper === "function")
      globalThis.gc1LobbyHubClearUpper(playerId);
    return true;
  }
  var mode = gc1LobbyHubGetPlayerQueueMode(playerId);
  if (!mode) {
    setUpper(playerId, "queue-lobby", [
      { str: "Loading run...", style: { color: "#FFFFFF" } },
    ]);
    return true;
  }
  setUpper(playerId, "queue-lobby:" + mode.modeKey, [
    { str: "Loading run...", style: { color: "#FFFFFF" } },
  ]);
  return true;
}

// send the player back to the queue lobby after a prompt or rejection
function gc1LobbyHubSendPlayerToQueueLobby(playerId, mode) {
  if (!playerId || !mode) return false;
  var targetLobbyName = gc1LobbyHubPickRunLobbyName(playerId);
  if (!gc1LobbyHubReserveRunLobbyName(targetLobbyName, playerId)) {
    targetLobbyName = gc1LobbyHubPickRunLobbyName(playerId);
    gc1LobbyHubReserveRunLobbyName(targetLobbyName, playerId);
  }
  gc1LobbyHubSetPlayerQueueMode(playerId, mode);
  gc1LobbyHubSetPlayerTargetLobby(playerId, targetLobbyName);
  gc1LobbyHubSetPlayerQueueIssuedAt(playerId, gc1LobbyHubMatchNow());
  delete gc1LobbyHubState.queueState[playerId];
  gc1LobbyHubState.matchmaking[playerId] = {
    modeKey: mode.modeKey,
    label: mode.label,
    color: mode.color,
    at: gc1LobbyHubMatchNow(),
    targetLobbyName: targetLobbyName,
  };
  if (typeof globalThis.gc1LobbyHubSetUpper === "function")
    globalThis.gc1LobbyHubSetUpper(playerId, "sending:" + mode.modeKey, [
      { str: "Sending to ", style: { color: "#FFFFFF" } },
      {
        str: targetLobbyName,
        style: { color: mode.color || "#FFFFFF", fontWeight: "bold" },
      },
    ]);
  try {
    api.matchmakePlayer(playerId, undefined, targetLobbyName);
    return true;
  } catch (e) {}
  delete gc1LobbyHubState.matchmaking[playerId];
  if (typeof globalThis.gc1LobbyHubSetUpper === "function")
    globalThis.gc1LobbyHubSetUpper(playerId, "send-failed", [
      { str: "Could not join ", style: { color: "#FFFFFF" } },
      { str: targetLobbyName, style: { color: "#FF8080", fontWeight: "bold" } },
    ]);
  return false;
}

// send the player back to the normal hub lobby
function gc1LobbyHubSendPlayerToHubLobby(playerId) {
  if (!playerId) return false;
  var priorLobby = gc1LobbyHubGetPlayerTargetLobby(playerId);
  var targetLobbyName =
    typeof globalThis.gc1PickNumericLobbyName === "function"
      ? globalThis.gc1PickNumericLobbyName()
      : String(1 + Math.floor(Math.random() * 999));
  gc1LobbyHubClearPlayerQueueTicket(playerId);
  gc1LobbyHubClearActiveRunPlayer(playerId);
  if (priorLobby) gc1LobbyHubReleaseRunLobbyName(priorLobby, playerId);
  gc1LobbyHubState.matchmaking[playerId] = {
    modeKey: "hub",
    label: "Hub",
    color: "#FFFFFF",
    at: gc1LobbyHubMatchNow(),
    targetLobbyName: targetLobbyName,
  };
  if (typeof globalThis.gc1LobbyHubSetUpper === "function")
    globalThis.gc1LobbyHubSetUpper(playerId, "sending:hub", [
      { str: "Returning to ", style: { color: "#FFFFFF" } },
      { str: targetLobbyName, style: { color: "#FFFFFF", fontWeight: "bold" } },
    ]);
  try {
    api.matchmakePlayer(playerId, undefined, targetLobbyName);
    return true;
  } catch (e) {}
  delete gc1LobbyHubState.matchmaking[playerId];
  return false;
}

globalThis.gc1LobbyHubGetCurrentLobbyName = gc1LobbyHubGetCurrentLobbyName;
globalThis.gc1LobbyHubGetModeByKey = gc1LobbyHubGetModeByKey;
globalThis.gc1LobbyHubGetPlayerQueueMode = gc1LobbyHubGetPlayerQueueMode;
globalThis.gc1LobbyHubClearPlayerQueueTicket =
  gc1LobbyHubClearPlayerQueueTicket;
globalThis.gc1LobbyHubReleaseRunLobbyName = gc1LobbyHubReleaseRunLobbyName;
globalThis.gc1LobbyHubGetPendingMatchmake = gc1LobbyHubGetPendingMatchmake;
globalThis.gc1LobbyHubClearActiveRunPlayer = gc1LobbyHubClearActiveRunPlayer;
globalThis.gc1LobbyHubGetActiveRunPlayer = gc1LobbyHubGetActiveRunPlayer;
globalThis.gc1LobbyHubIsTicketValidForLobby = gc1LobbyHubIsTicketValidForLobby;
globalThis.gc1LobbyHubConsumeQueueTicket = gc1LobbyHubConsumeQueueTicket;
globalThis.gc1LobbyHubGetRuntimeRole = gc1LobbyHubGetRuntimeRole;
globalThis.gc1LobbyHubMovePlayerToRuntimeState =
  gc1LobbyHubMovePlayerToRuntimeState;
globalThis.gc1LobbyHubQueueLobbyPrompt = gc1LobbyHubQueueLobbyPrompt;
globalThis.gc1LobbyHubSendPlayerToQueueLobby =
  gc1LobbyHubSendPlayerToQueueLobby;
globalThis.gc1LobbyHubSendPlayerToHubLobby = gc1LobbyHubSendPlayerToHubLobby;
globalThis.gc1GrannyRunIntroStart = gc1GrannyRunIntroStart;
globalThis.gc1GrannyRunIntroStop = gc1GrannyRunIntroStop;
