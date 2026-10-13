/*
  Granny Open Source - Module 7

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the win check and countdown is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 7 - Win System */

// this module handles the final win check and the return-to-hub countdown
globalThis.gc1WinState = Object.assign(
  {
    started: false,
    players: {},
    scanIndex: 0,
    sequence: 0,
  },
  typeof globalThis.gc1WinState === "object" && globalThis.gc1WinState
    ? globalThis.gc1WinState
    : {},
);
var gc1WinState = globalThis.gc1WinState;

var GC1_WIN_GROUP = "gc1_win";
var GC1_WIN_PAD_BLOCK = "marked red sandstone";
var GC1_WIN_LOOP_MS = 220;
var GC1_WIN_RETURN_COUNTDOWN = 5;
var GC1_WIN_COUNTDOWN_DELAY_MS = 2000;

function gc1WinNow() {
  return Date.now();
}

function gc1WinGetRunStateName() {
  var states = globalThis.gc1LobbyStates || {};
  return states.lobby_que && states.lobby_que.name
    ? states.lobby_que.name
    : "lobby que";
}

function gc1WinGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1WinGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

function gc1WinSetClient(playerId, options) {
  try {
    if (typeof api.setClientOptions === "function") {
      api.setClientOptions(playerId, options);
      return true;
    }
    for (var key in options) api.setClientOption(playerId, key, options[key]);
    return true;
  } catch (e) {}
  return false;
}

function gc1WinPlayerIsInRun(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  return !!(
    globalThis.gc1PlayerLobbyState &&
    globalThis.gc1PlayerLobbyState[playerId] === gc1WinGetRunStateName()
  );
}

// only let the win sequence start if the boards puzzle has been cleared
function gc1WinBoardsDone() {
  var state = globalThis.gc1BoardsState;
  if (!state || !Array.isArray(state.rows) || state.rows.length < 1)
    return false;
  for (var i = 0; i < state.rows.length; i++) {
    var row = state.rows[i];
    if (row && !row.removed) return false;
  }
  return true;
}

// check whether the full run is finished
function gc1WinPuzzlesComplete() {
  return !!(
    globalThis.gc1WiresState &&
    globalThis.gc1WiresState.correctCut &&
    globalThis.gc1WireCoverState &&
    globalThis.gc1WireCoverState.coverOpen &&
    gc1WinBoardsDone()
  );
}

// the win pad is the block the player needs to stand on
function gc1WinIsPadBlock(blockName) {
  return (
    String(blockName || "")
      .toLowerCase()
      .indexOf(GC1_WIN_PAD_BLOCK) >= 0
  );
}

// check if the player is standing on the finish pad
function gc1WinPlayerOnPad(playerId, pos) {
  if (!playerId || !pos) return false;
  var px = Math.floor(pos[0]),
    pz = Math.floor(pos[2]);
  var y0 = Math.floor(pos[1]);
  for (var dy = 0; dy < 4; dy++) {
    try {
      if (gc1WinIsPadBlock(api.getBlock(px, y0 - dy, pz))) return true;
    } catch (e) {}
  }
  return false;
}

// clear any run-specific screen state before ending the round
function gc1WinClearPlayer(playerId) {
  if (!gc1WinState.players) gc1WinState.players = {};
  delete gc1WinState.players[playerId];
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_WIN_GROUP + "_" + playerId);
  return true;
}

// send the player back to the hub after the win countdown
function gc1WinReturnToHub(playerId, seq) {
  var rec = gc1WinState.players && gc1WinState.players[playerId];
  if (!rec || rec.sequence !== seq || !api.checkValid(playerId)) return false;
  var lobbyName = "";
  try {
    lobbyName = String(api.getLobbyName() || "");
  } catch (e) {}
  try {
    if (typeof globalThis.gc1LobbyHubClearPlayerQueueTicket === "function")
      globalThis.gc1LobbyHubClearPlayerQueueTicket(playerId);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1LobbyHubClearActiveRunPlayer === "function")
      globalThis.gc1LobbyHubClearActiveRunPlayer(playerId);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1LobbyHubReleaseRunLobbyName === "function")
      globalThis.gc1LobbyHubReleaseRunLobbyName(lobbyName, playerId);
  } catch (e) {}
  gc1WinClearPlayer(playerId);
  try {
    if (
      typeof globalThis.gc1MatchmakePlayerToNumericLobby === "function" &&
      globalThis.gc1MatchmakePlayerToNumericLobby(playerId)
    )
      return true;
    api.matchmakePlayer(
      playerId,
      undefined,
      String(1 + Math.floor(Math.random() * 999)),
    );
    return true;
  } catch (e) {}
  if (typeof globalThis.gc1SendPlayerToLobbyState === "function")
    return globalThis.gc1SendPlayerToLobbyState(playerId, "lobby");
  return false;
}

// countdown text before sending the player out of the run
function gc1WinCountdown(playerId, seq, secondsLeft) {
  var rec = gc1WinState.players && gc1WinState.players[playerId];
  if (!rec || rec.sequence !== seq || !api.checkValid(playerId)) return false;
  rec.countdown = secondsLeft | 0;
  gc1WinSetClient(playerId, {
    middleTextUpper: "You escaped....",
    middleTextLower: "redirecting to lobby in (" + secondsLeft + ")",
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
  if (secondsLeft <= 1) return gc1WinReturnToHub(playerId, seq);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1WinCountdown(playerId, seq, secondsLeft - 1);
      },
      1000,
      GC1_WIN_GROUP + "_" + playerId,
    );
  }
  return true;
}

// start the win flow for one player
function gc1WinTrigger(playerId) {
  if (!playerId || !api.checkValid(playerId) || !gc1WinPlayerIsInRun(playerId))
    return false;
  if (!gc1WinState.players) gc1WinState.players = {};
  if (gc1WinState.players[playerId] && gc1WinState.players[playerId].won)
    return false;
  var seq = ++gc1WinState.sequence;
  gc1WinState.players[playerId] = {
    won: true,
    sequence: seq,
    startedAt: gc1WinNow(),
    countdown: 0,
  };
  gc1WinSetClient(playerId, {
    middleTextUpper: "You escaped....",
    middleTextLower: "",
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1WinCountdown(playerId, seq, GC1_WIN_RETURN_COUNTDOWN);
      },
      GC1_WIN_COUNTDOWN_DELAY_MS,
      GC1_WIN_GROUP + "_" + playerId,
    );
  }
  return true;
}

// main win heartbeat
function gc1WinTick() {
  if (!gc1WinState.started) return false;
  if (!gc1WinPuzzlesComplete()) return false;
  var ids = gc1WinGetPlayerIds();
  for (var i = 0; i < ids.length; i++) {
    var playerId = ids[i];
    if (!gc1WinPlayerIsInRun(playerId)) continue;
    if (
      gc1WinState.players &&
      gc1WinState.players[playerId] &&
      gc1WinState.players[playerId].won
    )
      continue;
    var pos = gc1WinGetPos(playerId);
    if (gc1WinPlayerOnPad(playerId, pos)) gc1WinTrigger(playerId);
  }
  return true;
}

// queue the next win check
function gc1WinLoop() {
  if (!gc1WinState.started) return false;
  gc1WinTick();
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(gc1WinLoop, GC1_WIN_LOOP_MS, GC1_WIN_GROUP);
  return true;
}

// public start entry point
function gc1WinStart() {
  gc1WinState.started = true;
  gc1WinState.players = {};
  gc1WinState.scanIndex = 0;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_WIN_GROUP);
  return gc1WinLoop();
}

// stop the win system cleanly
function gc1WinStop() {
  gc1WinState.started = false;
  gc1WinState.players = {};
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_WIN_GROUP);
  return true;
}

globalThis.gc1WinStart = gc1WinStart;
globalThis.gc1WinStop = gc1WinStop;
globalThis.gc1WinPuzzlesComplete = gc1WinPuzzlesComplete;
