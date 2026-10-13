/*
  Granny Open Source - Module 5

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the catch and day transitions are easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 5 - Catch and Days */

// this module handles the custom death jumspcares and the days system
globalThis.gc1CatchDayState = Object.assign(
  {
    tick: 0,
    players: {},
  },
  typeof globalThis.gc1CatchDayState === "object" && globalThis.gc1CatchDayState
    ? globalThis.gc1CatchDayState
    : {},
);
var gc1CatchDayState = globalThis.gc1CatchDayState;

var GC1_CATCH_GROUP = "gc1_catch";
var GC1_CATCH_TICK_INTERVAL = 2;
var GC1_CATCH_RADIUS = 1.42;
var GC1_CATCH_RADIUS_SQ = GC1_CATCH_RADIUS * GC1_CATCH_RADIUS;
var GC1_CATCH_MAX_Y_DIFF = 2.2;
var GC1_CATCH_COOLDOWN_MS = 1800;
var GC1_CATCH_FADE_STEP_MS = 120;
var GC1_CATCH_BLACK_HOLD_MS = 1250;
var GC1_CATCH_DAY_TEXT_MS = 3000;
var GC1_CATCH_FINAL_DAY = 5;
var GC1_CATCH_RETURN_COUNTDOWN = 5;
var GC1_CATCH_JITTER_STEP_MS = 70;
var GC1_CATCH_JITTER_STEPS = 16;
var GC1_CATCH_JITTER_SIZE = 0.055;
var GC1_CATCH_RED_ALPHA = 0.22;
var GC1_CATCH_SCREAM_RATE = 0.47;
var GC1_CATCH_SCARE_HOLD_MS = 900;

function gc1CatchNow() {
  return Date.now();
}

function gc1CatchGetRunStateName() {
  var states = globalThis.gc1LobbyStates || {};
  return states.lobby_que && states.lobby_que.name
    ? states.lobby_que.name
    : "lobby que";
}

function gc1CatchCurrentLobbyName() {
  try {
    return String(api.getLobbyName() || "");
  } catch (e) {}
  return "";
}

// read the per-player catch state
function gc1CatchGetPlayerState(playerId) {
  var map = gc1CatchDayState.players || (gc1CatchDayState.players = {});
  var state = map[playerId];
  if (state) return state;
  state = {
    lobbyName: "",
    day: 1,
    modeKey: "easy",
    catching: false,
    sequence: 0,
    lastCatchAt: 0,
    countdown: 0,
  };
  map[playerId] = state;
  return state;
}

// clear the per-player catch state
function gc1CatchClearPlayerState(playerId) {
  if (!playerId || !gc1CatchDayState.players[playerId]) return false;
  delete gc1CatchDayState.players[playerId];
  return true;
}

// only players in the run state should get catch behavior
function gc1CatchPlayerIsInRun(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  return !!(
    globalThis.gc1PlayerLobbyState &&
    globalThis.gc1PlayerLobbyState[playerId] === gc1CatchGetRunStateName()
  );
}

function gc1CatchGetPlayerPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

function gc1CatchGetMobPos(mobId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(mobId);
  try {
    return api.getPosition(mobId);
  } catch (e) {}
  return null;
}

function gc1CatchDistSq(a, b) {
  if (!a || !b) return Infinity;
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function gc1CatchClamp01(value) {
  value = Number(value);
  if (!isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

// compute a flat direction from the player toward granny
function gc1CatchDirToGranny(playerPos, grannyPos) {
  if (!playerPos || !grannyPos) return [0, 0, 1];
  var dx = grannyPos[0] - playerPos[0];
  var dy = grannyPos[1] + 1.15 - (playerPos[1] + 1.45);
  var dz = grannyPos[2] - playerPos[2];
  var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return [dx / len, dy / len, dz / len];
}

function gc1CatchRunDir() {
  var states = globalThis.gc1LobbyStates || {};
  var state = states.lobby_que || null;
  var dir = state && Array.isArray(state.dir) ? state.dir : null;
  return dir && dir.length >= 3 ? [dir[0], dir[1], dir[2]] : [-1, 0, 0];
}

// pull the player a little closer before the scare sequence starts
function gc1CatchTeleportCloserToGranny(playerId, playerPos, grannyPos) {
  if (!playerPos || !grannyPos || !api.checkValid(playerId)) return false;
  var dir = gc1CatchDirToGranny(playerPos, grannyPos);
  var target = [
    grannyPos[0] - dir[0] * 0.95,
    Math.max(playerPos[1], grannyPos[1] - 0.1),
    grannyPos[2] - dir[2] * 0.95,
  ];
  try {
    api.setPosition(playerId, target[0], target[1], target[2]);
    return true;
  } catch (e) {}
  return false;
}

function gc1CatchJitterDir(baseDir, amount) {
  var dir =
    Array.isArray(baseDir) && baseDir.length >= 3
      ? [
          Number(baseDir[0]) || 0,
          Number(baseDir[1]) || 0,
          Number(baseDir[2]) || 1,
        ]
      : [0, 0, 1];
  var jitter = typeof amount === "number" ? amount : GC1_CATCH_JITTER_SIZE;
  dir[0] += (Math.random() * 2 - 1) * jitter;
  dir[1] += (Math.random() * 2 - 1) * jitter * 0.55;
  dir[2] += (Math.random() * 2 - 1) * jitter;
  var len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
  return [dir[0] / len, dir[1] / len, dir[2] / len];
}

function gc1CatchSetClient(playerId, options) {
  if (typeof globalThis.gc1SetClientOptionsSafe === "function")
    return globalThis.gc1SetClientOptionsSafe(playerId, options);
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

// freeze the screen in the first scare stage
function gc1CatchApplyFreezeView(playerId, dir, alpha) {
  if (!api.checkValid(playerId)) return false;
  return gc1CatchSetClient(playerId, {
    cameraTint: [0, 0, 0, gc1CatchClamp01(alpha)],
    forcedCameraDirection: dir || null,
    forcedCameraDirectionTransitionMs: 0,
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
}

// make the scary screen tint stronger
function gc1CatchApplyScareView(playerId, dir, alpha) {
  if (!api.checkValid(playerId)) return false;
  var tint = gc1CatchClamp01(alpha);
  return gc1CatchSetClient(playerId, {
    cameraTint: [0.28, 0, 0, Math.min(1, GC1_CATCH_RED_ALPHA + tint * 0.78)],
    fogColourOverride: "#000000",
    fogChunkDistanceOverride: 0,
    forcedCameraDirection: dir || null,
    forcedCameraDirectionTransitionMs: 0,
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
}

// return the screen to the normal run view
function gc1CatchApplyRunView(playerId, alpha) {
  if (!api.checkValid(playerId)) return false;
  if (typeof globalThis.gc1ApplyRunAtmosphere === "function") {
    try {
      globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
    } catch (e) {}
  }
  return gc1CatchSetClient(playerId, {
    cameraTint: [0, 0, 0, gc1CatchClamp01(alpha)],
    forcedCameraDirection: null,
    forcedCameraDirectionTransitionMs: 900,
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
}

// stop the current route logic before the death flow takes over
function gc1CatchStopRouting() {
  try {
    if (typeof globalThis.gc1StopBasementDropRoute === "function")
      globalThis.gc1StopBasementDropRoute();
  } catch (e) {}
  try {
    if (typeof globalThis.gc1StopFloor1Route === "function")
      globalThis.gc1StopFloor1Route();
  } catch (e) {}
  try {
    var pending =
      globalThis.gc1MainFloorMeshState &&
      globalThis.gc1MainFloorMeshState.pendingTarget;
    if (pending && typeof globalThis.gc1ClearMainFloorMeshTarget === "function")
      globalThis.gc1ClearMainFloorMeshTarget(pending.serial || 0);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1StopGrannyPatrolSearch === "function")
      globalThis.gc1StopGrannyPatrolSearch();
  } catch (e) {}
  try {
    if (globalThis.gc1VisionState) {
      globalThis.gc1VisionState.activePlayerId = null;
      globalThis.gc1VisionState.lastSeenPos = null;
      globalThis.gc1VisionState.lastSeenAt = 0;
      globalThis.gc1VisionState.lostAt = 0;
      globalThis.gc1VisionState.lastSignalPos = null;
      globalThis.gc1VisionState.lastSignalAt = 0;
      globalThis.gc1VisionState.misses = 0;
      globalThis.gc1VisionState.lostSignalSent = false;
    }
  } catch (e) {}
  return true;
}

// reset granny after the player is caught
function gc1CatchResetGrannyForCurrentMode() {
  var runState = globalThis.gc1RunModeState || {};
  gc1CatchStopRouting();
  if (runState.modeKey !== "easy") {
    if (typeof globalThis.gc1DisarmGrannyPatrol === "function")
      try {
        globalThis.gc1DisarmGrannyPatrol();
      } catch (e) {}
    if (typeof globalThis.gc1DespawnGrannyNow === "function")
      try {
        globalThis.gc1DespawnGrannyNow();
      } catch (e) {}
    return false;
  }
  if (typeof globalThis.gc1DisarmGrannyPatrol === "function")
    try {
      globalThis.gc1DisarmGrannyPatrol();
    } catch (e) {}
  if (typeof globalThis.gc1DespawnGrannyNow === "function")
    try {
      globalThis.gc1DespawnGrannyNow();
    } catch (e) {}
  var mobId = null;
  if (typeof globalThis.gc1SpawnGranny === "function")
    try {
      mobId = globalThis.gc1SpawnGranny();
    } catch (e) {}
  if (typeof globalThis.gc1ArmGrannyPatrol === "function") {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          try {
            globalThis.gc1ArmGrannyPatrol(250);
          } catch (e) {}
        },
        250,
        GC1_CATCH_GROUP + "_patrol",
      );
    else
      try {
        globalThis.gc1ArmGrannyPatrol(250);
      } catch (e) {}
  }
  return !!mobId;
}

function gc1CatchRunSpawnPos() {
  var states = globalThis.gc1LobbyStates || {};
  var state = states.lobby_que || null;
  return state && state.pos ? state.pos.slice() : [34.5, 62, 8.5];
}

// finish the reveal animation and move to the next step
function gc1CatchRevealFinish(playerId, seq) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  if (typeof globalThis.gc1ReleaseIntroLock === "function")
    globalThis.gc1ReleaseIntroLock(playerId, { preserveAtmosphere: true });
  if (typeof globalThis.gc1ApplyRunAtmosphere === "function")
    try {
      globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
    } catch (e) {}
  if (typeof globalThis.gc1ApplyGoMovement === "function")
    try {
      globalThis.gc1ApplyGoMovement(playerId);
    } catch (e) {}
  state.catching = false;
  return true;
}

// show the reveal one step at a time
function gc1CatchRevealStep(playerId, seq, step) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  var fades = [1, 0.92, 0.84, 0.7, 0.56, 0.42, 0.28, 0.14, 0];
  if (step >= fades.length) return gc1CatchRevealFinish(playerId, seq);
  gc1CatchApplyRunView(playerId, fades[step]);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1CatchRevealStep(playerId, seq, step + 1);
      },
      GC1_CATCH_FADE_STEP_MS,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else gc1CatchRevealStep(playerId, seq, step + 1);
  return true;
}

// show the next day text after the scare
function gc1CatchShowNextDay(playerId, seq) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  var dir = gc1CatchRunDir();
  var text =
    state.day >= GC1_CATCH_FINAL_DAY
      ? "Day 5 (final day)"
      : "Day " + state.day + "...";
  gc1CatchApplyFreezeView(playerId, dir, 1);
  try {
    api.sendFlyingMiddleMessage(
      playerId,
      [
        {
          str: "You died...",
          style: { color: "#ffffff", fontSize: "2.05rem" },
        },
      ],
      0,
      1900,
    );
  } catch (e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        var live = gc1CatchGetPlayerState(playerId);
        if (live.sequence !== seq || !api.checkValid(playerId)) return;
        gc1CatchApplyFreezeView(playerId, dir, 1);
        gc1CatchSetClient(playerId, {
          middleTextUpper: "",
          middleTextLower: text,
        });
        try {
          api.playSound(playerId, "hauntedHorrorImpact", 1, 0.8);
        } catch (e) {}
        TS.run(
          function () {
            var next = gc1CatchGetPlayerState(playerId);
            if (next.sequence !== seq || !api.checkValid(playerId)) return;
            gc1CatchSetClient(playerId, { middleTextLower: "" });
            gc1CatchRevealStep(playerId, seq, 0);
          },
          GC1_CATCH_DAY_TEXT_MS,
          GC1_CATCH_GROUP + "_" + playerId,
        );
      },
      1850,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else {
    gc1CatchSetClient(playerId, { middleTextUpper: "", middleTextLower: text });
    gc1CatchRevealStep(playerId, seq, 0);
  }
  return true;
}

// respawn the player back into the run after the countdown
function gc1CatchRespawnToRun(playerId, seq) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  var spawnPos = gc1CatchRunSpawnPos();
  var dir = gc1CatchRunDir();
  gc1CatchResetGrannyForCurrentMode();
  try {
    api.setPosition(playerId, spawnPos[0], spawnPos[1], spawnPos[2]);
  } catch (e) {}
  if (globalThis.gc1PlayerLobbyState)
    globalThis.gc1PlayerLobbyState[playerId] = gc1CatchGetRunStateName();
  gc1CatchApplyFreezeView(playerId, dir, 1);
  gc1CatchSetClient(playerId, { middleTextUpper: "", middleTextLower: "" });
  gc1CatchShowNextDay(playerId, seq);
  return true;
}

// send the player back to the hub if they ran out of days
function gc1CatchReturnToHub(playerId, seq) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  var currentLobby = gc1CatchCurrentLobbyName();
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
      globalThis.gc1LobbyHubReleaseRunLobbyName(currentLobby, playerId);
  } catch (e) {}
  gc1CatchClearPlayerState(playerId);
  if (typeof globalThis.gc1ApplyRunAtmosphere === "function")
    try {
      globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
    } catch (e) {}
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

// countdown text for the fail path
function gc1CatchLossCountdown(playerId, seq, secondsLeft) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  state.countdown = secondsLeft | 0;
  gc1CatchApplyFreezeView(playerId, [0, 0, 1], 1);
  gc1CatchSetClient(playerId, {
    middleTextUpper: "You loose.....",
    middleTextLower: "going back to lobby in (" + secondsLeft + ")",
  });
  if (secondsLeft <= 1) return gc1CatchReturnToHub(playerId, seq);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1CatchLossCountdown(playerId, seq, secondsLeft - 1);
      },
      1000,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else gc1CatchLossCountdown(playerId, seq, secondsLeft - 1);
  return true;
}

// either advance to the next day or end the run
function gc1CatchAdvanceOrLose(playerId, seq) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  if (state.day >= GC1_CATCH_FINAL_DAY)
    return gc1CatchLossCountdown(playerId, seq, GC1_CATCH_RETURN_COUNTDOWN);
  state.day++;
  return gc1CatchRespawnToRun(playerId, seq);
}

// fade the screen to black before the actual scare
function gc1CatchFadeToBlack(playerId, seq, step, dir) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  var fades = [0.12, 0.28, 0.44, 0.62, 0.78, 0.9, 1];
  if (step >= fades.length) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
      TS.run(
        function () {
          gc1CatchAdvanceOrLose(playerId, seq);
        },
        GC1_CATCH_BLACK_HOLD_MS,
        GC1_CATCH_GROUP + "_" + playerId,
      );
    } else gc1CatchAdvanceOrLose(playerId, seq);
    return true;
  }
  gc1CatchApplyFreezeView(playerId, dir, fades[step]);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1CatchFadeToBlack(playerId, seq, step + 1, dir);
      },
      GC1_CATCH_FADE_STEP_MS,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else gc1CatchFadeToBlack(playerId, seq, step + 1, dir);
  return true;
}

// tiny camera jitter to make the scare feel unstable
function gc1CatchJitterStep(playerId, seq, step, baseDir) {
  var state = gc1CatchGetPlayerState(playerId);
  if (state.sequence !== seq || !api.checkValid(playerId)) return false;
  if (step >= GC1_CATCH_JITTER_STEPS) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
      TS.run(
        function () {
          gc1CatchFadeToBlack(playerId, seq, 0, baseDir);
        },
        GC1_CATCH_SCARE_HOLD_MS,
        GC1_CATCH_GROUP + "_" + playerId,
      );
    } else gc1CatchFadeToBlack(playerId, seq, 0, baseDir);
    return true;
  }
  gc1CatchApplyScareView(
    playerId,
    gc1CatchJitterDir(baseDir, GC1_CATCH_JITTER_SIZE),
    0.18 + (step % 4) * 0.03,
  );
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1CatchJitterStep(playerId, seq, step + 1, baseDir);
      },
      GC1_CATCH_JITTER_STEP_MS,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else gc1CatchJitterStep(playerId, seq, step + 1, baseDir);
  return true;
}

// start the catch sequence for one player
function gc1CatchStartForPlayer(playerId, grannyPos) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    !gc1CatchPlayerIsInRun(playerId)
  )
    return false;
  var state = gc1CatchGetPlayerState(playerId);
  var now = gc1CatchNow();
  if (state.catching) return false;
  if (now - state.lastCatchAt < GC1_CATCH_COOLDOWN_MS) return false;
  state.lastCatchAt = now;
  state.catching = true;
  state.sequence = (state.sequence | 0) + 1;
  state.modeKey =
    (globalThis.gc1RunModeState && globalThis.gc1RunModeState.modeKey) ||
    state.modeKey ||
    "easy";
  var seq = state.sequence;
  var playerPos = gc1CatchGetPlayerPos(playerId);
  var mobId =
    typeof globalThis.gc1GrannyId === "function"
      ? globalThis.gc1GrannyId()
      : globalThis.gc1GrannyMobId;
  if (
    mobId &&
    api.checkValid(mobId) &&
    typeof globalThis.gc1VisionFacePlayer === "function"
  ) {
    try {
      globalThis.gc1VisionFacePlayer(mobId, playerId);
    } catch (e) {}
  }
  gc1CatchStopRouting();
  if (typeof globalThis.gc1DisarmGrannyPatrol === "function")
    try {
      globalThis.gc1DisarmGrannyPatrol();
    } catch (e) {}
  if (typeof globalThis.gc1PuzzleItemForceDropHeld === "function")
    try {
      globalThis.gc1PuzzleItemForceDropHeld(playerId);
    } catch (e) {}
  gc1CatchTeleportCloserToGranny(playerId, playerPos, grannyPos);
  playerPos = gc1CatchGetPlayerPos(playerId) || playerPos;
  var dir = gc1CatchDirToGranny(playerPos, grannyPos);
  gc1CatchApplyScareView(playerId, dir, 0.15);
  gc1CatchSetClient(playerId, { middleTextUpper: "", middleTextLower: "" });
  try {
    api.playSound(playerId, "horrorAccent1", 1, GC1_CATCH_SCREAM_RATE);
  } catch (e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function") {
    TS.stop("gc1_granny_run_intro_" + playerId);
    TS.stop("gc1_granny_queue_intro_" + playerId);
    TS.stop("gc1_granny_lobby_intro_" + playerId);
    TS.stop(GC1_CATCH_GROUP + "_" + playerId);
  }
  if (typeof globalThis.gc1GrannyRunIntroStop === "function")
    try {
      globalThis.gc1GrannyRunIntroStop(playerId);
    } catch (e) {}
  if (typeof globalThis.gc1GrannyQueueIntroStop === "function")
    try {
      globalThis.gc1GrannyQueueIntroStop(playerId);
    } catch (e) {}
  if (typeof globalThis.gc1GrannyLobbyIntroStop === "function")
    try {
      globalThis.gc1GrannyLobbyIntroStop(playerId);
    } catch (e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1CatchJitterStep(playerId, seq, 0, dir);
      },
      220,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  } else gc1CatchJitterStep(playerId, seq, 0, dir);
  return true;
}

// run the custom death / catch flow
function gc1CatchTriggerCustomDeath(playerId, sourcePos) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    !gc1CatchPlayerIsInRun(playerId)
  )
    return false;
  var state =
    gc1CatchEnsureSession(playerId) || gc1CatchGetPlayerState(playerId);
  var now = gc1CatchNow();
  if (state.catching || now - state.lastCatchAt < GC1_CATCH_COOLDOWN_MS)
    return false;
  state.lastCatchAt = now;
  state.catching = true;
  state.sequence = (state.sequence | 0) + 1;
  state.modeKey =
    (globalThis.gc1RunModeState && globalThis.gc1RunModeState.modeKey) ||
    state.modeKey ||
    "easy";
  var seq = state.sequence;
  gc1CatchStopRouting();
  if (typeof globalThis.gc1DisarmGrannyPatrol === "function")
    try {
      globalThis.gc1DisarmGrannyPatrol();
    } catch (e) {}
  if (typeof globalThis.gc1PuzzleItemForceDropHeld === "function")
    try {
      globalThis.gc1PuzzleItemForceDropHeld(playerId);
    } catch (e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function") {
    TS.stop("gc1_granny_run_intro_" + playerId);
    TS.stop("gc1_granny_queue_intro_" + playerId);
    TS.stop("gc1_granny_lobby_intro_" + playerId);
    TS.stop(GC1_CATCH_GROUP + "_" + playerId);
  }
  if (typeof globalThis.gc1GrannyRunIntroStop === "function")
    try {
      globalThis.gc1GrannyRunIntroStop(playerId);
    } catch (e) {}
  if (typeof globalThis.gc1GrannyQueueIntroStop === "function")
    try {
      globalThis.gc1GrannyQueueIntroStop(playerId);
    } catch (e) {}
  if (typeof globalThis.gc1GrannyLobbyIntroStop === "function")
    try {
      globalThis.gc1GrannyLobbyIntroStop(playerId);
    } catch (e) {}
  gc1CatchApplyFreezeView(playerId, gc1CatchRunDir(), 1);
  gc1CatchSetClient(playerId, { middleTextUpper: "", middleTextLower: "" });
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
    TS.run(
      function () {
        gc1CatchAdvanceOrLose(playerId, seq);
      },
      250,
      GC1_CATCH_GROUP + "_" + playerId,
    );
  else gc1CatchAdvanceOrLose(playerId, seq);
  return true;
}

// find the player we are currently watching for a catch
function gc1CatchGetTrackedPlayerId() {
  var visionState = globalThis.gc1VisionState || null;
  if (visionState && visionState.activePlayerId != null)
    return visionState.activePlayerId;
  var pending =
    globalThis.gc1MainFloorMeshState &&
    globalThis.gc1MainFloorMeshState.pendingTarget;
  if (
    pending &&
    pending.meta &&
    pending.meta.kind === "alert" &&
    pending.meta.playerId != null
  )
    return pending.meta.playerId;
  return null;
}

// decide whether the player should trigger the catch flow
function gc1CatchShouldDetect(playerId, state) {
  if (!playerId || !state || state.catching || state.countdown > 0)
    return false;
  if (!gc1CatchPlayerIsInRun(playerId)) return false;
  if (
    globalThis.gc1GrannyQueueIntroState &&
    globalThis.gc1GrannyQueueIntroState[playerId] &&
    globalThis.gc1GrannyQueueIntroState[playerId].active
  )
    return false;
  if (
    globalThis.gc1GrannyRunIntroState &&
    globalThis.gc1GrannyRunIntroState[playerId] &&
    globalThis.gc1GrannyRunIntroState[playerId].active
  )
    return false;
  if (
    !(
      globalThis.gc1RunModeState &&
      globalThis.gc1RunModeState.modeKey === "easy" &&
      globalThis.gc1RunModeState.grannyEnabled
    )
  )
    return false;
  return true;
}

// make sure the catch state exists before we try to use it
function gc1CatchEnsureSession(playerId) {
  if (!gc1CatchPlayerIsInRun(playerId)) return null;
  var state = gc1CatchGetPlayerState(playerId);
  var lobbyName = gc1CatchCurrentLobbyName();
  if (state.lobbyName !== lobbyName) {
    state.lobbyName = lobbyName;
    state.day = 1;
    state.modeKey =
      (globalThis.gc1RunModeState && globalThis.gc1RunModeState.modeKey) ||
      "easy";
    state.catching = false;
    state.sequence = 0;
    state.lastCatchAt = 0;
    state.countdown = 0;
  }
  return state;
}

// main catch and days heartbeat
function gc1CatchLoop() {
  gc1CatchDayState.tick = (gc1CatchDayState.tick | 0) + 1;
  if (gc1CatchDayState.tick % GC1_CATCH_TICK_INTERVAL !== 0) return false;
  var playerId = gc1CatchGetTrackedPlayerId();
  if (playerId == null) return false;
  var state = gc1CatchEnsureSession(playerId);
  if (!gc1CatchShouldDetect(playerId, state)) return false;
  var mobId =
    typeof globalThis.gc1GrannyId === "function"
      ? globalThis.gc1GrannyId()
      : globalThis.gc1GrannyMobId;
  if (!mobId || !api.checkValid(mobId)) return false;
  var grannyPos = gc1CatchGetMobPos(mobId);
  var playerPos = gc1CatchGetPlayerPos(playerId);
  if (!grannyPos || !playerPos) return false;
  if (
    Math.abs((grannyPos[1] || 0) - (playerPos[1] || 0)) > GC1_CATCH_MAX_Y_DIFF
  )
    return false;
  if (gc1CatchDistSq(grannyPos, playerPos) > GC1_CATCH_RADIUS_SQ) return false;
  return gc1CatchStartForPlayer(playerId, grannyPos);
}

globalThis.gc1CatchAndDaysPrevOnTick =
  typeof globalThis.gc1OnTick === "function" ? globalThis.gc1OnTick : null;
globalThis.gc1OnTick = function () {
  if (typeof globalThis.gc1CatchAndDaysPrevOnTick === "function")
    globalThis.gc1CatchAndDaysPrevOnTick();
  gc1CatchLoop();
};

globalThis.gc1CatchEnsureSession = gc1CatchEnsureSession;
globalThis.gc1CatchClearPlayerState = gc1CatchClearPlayerState;
globalThis.gc1CatchStartForPlayer = gc1CatchStartForPlayer;
globalThis.gc1CatchTriggerCustomDeath = gc1CatchTriggerCustomDeath;
