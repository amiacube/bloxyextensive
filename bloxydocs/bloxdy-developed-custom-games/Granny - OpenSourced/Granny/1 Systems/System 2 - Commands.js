// make sure to join bloxdhub.com hehe
//
// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// we added a lot more comments here so it is easier to follow now
// if you try to paste the full file into one code block, it may go over the 32,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

/* System 2 - Commands */
// make sure to join- (ok i should stop)

var GC1_GO_GROUP = "gc1_cmd_go";
var GC1_GO_ACTIVE = false;
var GC1_GO_LAST_AT = 0;
var GC1_GO_PLAYER_SPEED = 2.8;
var GC1_GO_PUZZLE_TIMEOUT_MS = 7000;

// this system runs the !go setup flow (it was used during the testing stages of development)
// it checks the core modules, locks the player, and moves the run into its starting state
function gc1StartGoModules(allowRetry) {
  var wiresOk =
    typeof globalThis.gc1WiresStart === "function"
      ? !!globalThis.gc1WiresStart()
      : false;
  var coverOk =
    typeof globalThis.gc1WireCoverStart === "function"
      ? !!globalThis.gc1WireCoverStart()
      : false;
  var rodsOk =
    typeof globalThis.gc1RodsStart === "function"
      ? !!globalThis.gc1RodsStart()
      : false;
  var boardsOk =
    typeof globalThis.gc1BoardsStart === "function"
      ? !!globalThis.gc1BoardsStart()
      : false;
  var tripwireOk =
    typeof globalThis.gc1TripwireStart === "function"
      ? !!globalThis.gc1TripwireStart()
      : false;
  var winOk =
    typeof globalThis.gc1WinStart === "function"
      ? !!globalThis.gc1WinStart()
      : false;
  var ok = wiresOk && coverOk && rodsOk && boardsOk && tripwireOk && winOk;
  if (
    !ok &&
    allowRetry !== false &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.run === "function"
  ) {
    TS.run(
      function () {
        gc1StartGoModules(false);
      },
      250,
      GC1_GO_GROUP,
    );
  }
  return {
    wiresOk: wiresOk,
    coverOk: coverOk,
    rodsOk: rodsOk,
    boardsOk: boardsOk,
    tripwireOk: tripwireOk,
    winOk: winOk,
    ok: ok,
  };
}

// go messages get queued through TS so the setup flow does not spam the same tick
function gc1GoMsg(playerId, text, color) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    try {
      api.sendMessage(playerId, text, { color: color });
    } catch (e) {}
    return;
  }
  TS.run(
    function () {
      try {
        api.sendMessage(playerId, text, { color: color });
      } catch (e) {}
    },
    100,
    GC1_GO_GROUP,
  );
}

// the go movement helper keeps the player speed consistent during setup
function gc1ApplyGoMovement(playerId) {
  if (!playerId) return false;
  try {
    if (typeof api.setClientOptions === "function") {
      api.setClientOptions(playerId, {
        walkingSpeed: GC1_GO_PLAYER_SPEED,
        runningSpeed: GC1_GO_PLAYER_SPEED,
        jumpAmount: 0,
      });
      return true;
    }
    if (typeof api.setClientOption === "function") {
      api.setClientOption(playerId, "walkingSpeed", GC1_GO_PLAYER_SPEED);
      api.setClientOption(playerId, "runningSpeed", GC1_GO_PLAYER_SPEED);
      api.setClientOption(playerId, "jumpAmount", 0);
      return true;
    }
  } catch (e) {}
  return false;
}

globalThis.gc1ApplyGoMovement = gc1ApplyGoMovement;

function gc1ResolveGoMode(modeKey) {
  return modeKey === "practice" ? "practice" : "easy";
}

// the run mode state is the little shared memory that tells the rest of the world what kind of run this is
function gc1FinalizeGoRunMode(modeKey, setupOk) {
  var state = globalThis.gc1RunModeState || (globalThis.gc1RunModeState = {});
  state.modeKey = gc1ResolveGoMode(modeKey);
  state.grannyEnabled = state.modeKey === "easy";
  state.setupReady = !!setupOk;
  state.lastSetupAt = Date.now();
  return state;
}

// this packs the final !go result into one tidy object for the caller
function gc1CompactSetupResult(
  modeKey,
  grannyOk,
  grannySpawned,
  puzzleResult,
  moduleState,
  extra,
) {
  var puzzleOk = !!(puzzleResult && puzzleResult.ok);
  var puzzleFailures =
    puzzleResult && Array.isArray(puzzleResult.failures)
      ? puzzleResult.failures.slice(0, 4)
      : [];
  var puzzleSpawnedCount =
    puzzleResult && typeof puzzleResult.spawnedCount === "number"
      ? puzzleResult.spawnedCount
      : 0;
  var modulesOk = !!(moduleState && moduleState.ok);
  var result = Object.assign(
    {
      ok: !!(grannyOk && puzzleOk && modulesOk),
      modeKey: modeKey,
      grannyOk: !!grannyOk,
      grannySpawned: !!grannySpawned,
      puzzleOk: puzzleOk,
      puzzleSpawnedCount: puzzleSpawnedCount,
      modulesOk: modulesOk,
      moduleFlags: moduleState
        ? {
            wiresOk: !!moduleState.wiresOk,
            coverOk: !!moduleState.coverOk,
            rodsOk: !!moduleState.rodsOk,
            boardsOk: !!moduleState.boardsOk,
            tripwireOk: !!moduleState.tripwireOk,
            winOk: !!moduleState.winOk,
          }
        : null,
      puzzleFailures: puzzleFailures,
    },
    extra || {},
  );
  return result;
}

// the main setup flow does a bunch of checks before it lets the run start
function gc1RunGameSetup(playerId, options, onDone) {
  options = options || {};
  var silent = !!options.silent;
  var modeKey = gc1ResolveGoMode(options.modeKey);
  var source = String(options.source || "");
  var finishOnce = false;
  var finish = function (result) {
    if (finishOnce) return result;
    finishOnce = true;
    GC1_GO_ACTIVE = false;
    gc1FinalizeGoRunMode(modeKey, !!(result && result.ok));
    if (typeof onDone === "function") {
      try {
        onDone(result);
      } catch (e) {}
    }
    return result;
  };
  if (
    GC1_GO_ACTIVE ||
    (typeof TS !== "undefined" &&
      TS &&
      typeof TS.isGroupActive === "function" &&
      TS.isGroupActive(GC1_GO_GROUP))
  ) {
    if (!silent)
      gc1GoMsg(
        playerId,
        "Setup already running. Please wait a moment.",
        "#ffd166",
      );
    return finish({ ok: false, busy: true, modeKey: modeKey });
  }
  var now = Date.now();
  if (now - GC1_GO_LAST_AT < 1500) {
    if (!silent)
      gc1GoMsg(
        playerId,
        "Please wait 1.5s before running !go again.",
        "#ffd166",
      );
    return finish({ ok: false, cooldown: true, modeKey: modeKey });
  }
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    if (!silent)
      gc1GoMsg(
        playerId,
        "Task Scheduler not ready yet. Try again in a second.",
        "#ff9d87",
      );
    return finish({ ok: false, schedulerMissing: true, modeKey: modeKey });
  }
  if (
    typeof globalThis.gc1IsBootLoaded === "function" &&
    !globalThis.gc1IsBootLoaded()
  ) {
    if (!silent)
      gc1GoMsg(
        playerId,
        "Systems are still booting. Wait a second, then run !go again.",
        "#ffd166",
      );
    return finish({ ok: false, bootPending: true, modeKey: modeKey });
  }
  if (
    typeof globalThis.gc1RuntimeCoolingDown === "function" &&
    globalThis.gc1RuntimeCoolingDown()
  ) {
    if (!silent)
      gc1GoMsg(
        playerId,
        "Runtime is cooling down after a heavy tick. Wait a second, then run !go again.",
        "#ffd166",
      );
    return finish({ ok: false, runtimeCooling: true, modeKey: modeKey });
  }
  if (modeKey === "easy" && typeof globalThis.gc1SpawnGranny !== "function") {
    if (!silent)
      gc1GoMsg(playerId, "Granny Spawner system is not loaded yet.", "#ff9d87");
    return finish({ ok: false, grannySpawnerMissing: true, modeKey: modeKey });
  }
  GC1_GO_ACTIVE = true;
  GC1_GO_LAST_AT = now;
  if (typeof globalThis.gc1SetGrannyRunMode === "function")
    globalThis.gc1SetGrannyRunMode(modeKey);
  if (
    modeKey !== "easy" &&
    typeof globalThis.gc1DisarmGrannyPatrol === "function"
  )
    globalThis.gc1DisarmGrannyPatrol();
  var grannyOk = modeKey !== "easy";
  var grannySpawned = false;
  var modulesOk = false;
  var goFinished = false;
  var finishGo = function (puzzleResult) {
    if (goFinished) return;
    goFinished = true;
    var puzzleOk = !!(puzzleResult && puzzleResult.ok);
    var moduleState = gc1StartGoModules();
    modulesOk = moduleState.ok;
    var setupResult = gc1CompactSetupResult(
      modeKey,
      grannyOk,
      grannySpawned,
      puzzleResult,
      moduleState,
    );
    if (
      setupResult.ok &&
      source !== "queue_intro" &&
      typeof globalThis.gc1ApplyRunAtmosphere === "function"
    ) {
      try {
        globalThis.gc1ApplyRunAtmosphere(playerId, { force: true });
      } catch (e) {}
    }
    if (!silent) {
      if (grannyOk && puzzleOk && modulesOk)
        gc1GoMsg(
          playerId,
          "Granny, puzzle items, wires, cover, rods, and boards loaded.",
          "#00ff00",
        );
      else if (grannyOk && puzzleOk)
        gc1GoMsg(
          playerId,
          "Granny and puzzle items loaded, but wires, cover, rods, or boards failed.",
          "#ffd166",
        );
      else if (grannyOk && modulesOk)
        gc1GoMsg(
          playerId,
          "Granny, wires, cover, rods, and boards loaded, but puzzle items failed.",
          "#ffd166",
        );
      else if (puzzleOk && modulesOk)
        gc1GoMsg(
          playerId,
          "Puzzle items, wires, cover, rods, and boards loaded, but Granny failed.",
          "#ffd166",
        );
      else if (grannyOk)
        gc1GoMsg(
          playerId,
          "Granny spawned, but puzzle and fence systems failed.",
          "#ffd166",
        );
      else if (puzzleOk || modulesOk)
        gc1GoMsg(
          playerId,
          "Partial setup loaded, but Granny failed.",
          "#ffd166",
        );
      else
        gc1GoMsg(
          playerId,
          "Granny, puzzle items, and fence systems failed.",
          "#ff9d87",
        );
    }
    if (
      modeKey === "easy" &&
      grannyOk &&
      typeof globalThis.gc1ArmGrannyPatrol === "function"
    )
      globalThis.gc1ArmGrannyPatrol(350);
    if (
      modeKey !== "easy" &&
      typeof globalThis.gc1DisarmGrannyPatrol === "function"
    )
      globalThis.gc1DisarmGrannyPatrol();
    finish(setupResult);
  };
  TS.stop(GC1_GO_GROUP);
  TS.run(
    function goStage1() {
      if (typeof globalThis.gc1PuzzleItemApplyInventoryLock === "function") {
        try {
          globalThis.gc1PuzzleItemApplyInventoryLock(playerId, true);
        } catch (e) {}
      }
      if (
        typeof globalThis.gc1BoardsRefreshProtectionForPlayer === "function"
      ) {
        try {
          globalThis.gc1BoardsRefreshProtectionForPlayer(playerId);
        } catch (e) {}
      }
      gc1ApplyGoMovement(playerId);
      TS.run(
        function goStage2() {
          if (
            typeof globalThis.gc1RuntimeCoolingDown === "function" &&
            globalThis.gc1RuntimeCoolingDown()
          ) {
            TS.run(goStage2, 350, GC1_GO_GROUP);
            return;
          }
          if (
            typeof api.isNearInterrupt === "function" &&
            api.isNearInterrupt()
          ) {
            TS.run(goStage2, 300, GC1_GO_GROUP);
            return;
          }
          if (modeKey === "easy") {
            grannySpawned = !!globalThis.gc1SpawnGranny();
            grannyOk = !!grannySpawned;
          }
          gc1StartGoModules();
          TS.run(
            function goStage3() {
              if (grannyOk && globalThis.gc1GrannySetupBusy) {
                TS.run(goStage3, 250, GC1_GO_GROUP);
                return;
              }
              if (
                typeof globalThis.gc1RuntimeCoolingDown === "function" &&
                globalThis.gc1RuntimeCoolingDown()
              ) {
                TS.run(goStage3, 350, GC1_GO_GROUP);
                return;
              }
              if (
                typeof api.isNearInterrupt === "function" &&
                api.isNearInterrupt()
              ) {
                TS.run(goStage3, 300, GC1_GO_GROUP);
                return;
              }
              var queuedPuzzleStart =
                typeof globalThis.gc1StartPuzzleItemSpawnsQueued === "function"
                  ? globalThis.gc1StartPuzzleItemSpawnsQueued
                  : typeof gc1PuzzleItemSpawnAllQueued === "function"
                    ? gc1PuzzleItemSpawnAllQueued
                    : null;
              if (typeof queuedPuzzleStart === "function") {
                queuedPuzzleStart(playerId, { silentSpawn: true }, finishGo);
                TS.run(
                  function goPuzzleWatchdog() {
                    if (goFinished) return;
                    if (
                      typeof globalThis.gc1RuntimeCoolingDown === "function" &&
                      globalThis.gc1RuntimeCoolingDown()
                    ) {
                      TS.run(goPuzzleWatchdog, 500, GC1_GO_GROUP);
                      return;
                    }
                    var directPuzzleStart =
                      typeof globalThis.gc1StartPuzzleItemSpawns === "function"
                        ? globalThis.gc1StartPuzzleItemSpawns
                        : typeof gc1PuzzleItemSpawnAll === "function"
                          ? gc1PuzzleItemSpawnAll
                          : null;
                    if (typeof directPuzzleStart === "function") {
                      try {
                        finishGo(
                          directPuzzleStart(playerId, { silentSpawn: true }),
                        );
                        return;
                      } catch (e) {
                        finishGo({
                          ok: false,
                          spawnedCount: 0,
                          attemptedCount: 0,
                          records: [],
                          failures: ["puzzle watchdog: " + e],
                        });
                        return;
                      }
                    }
                    finishGo({
                      ok: false,
                      spawnedCount: 0,
                      attemptedCount: 0,
                      records: [],
                      failures: ["puzzle watchdog timeout"],
                    });
                  },
                  GC1_GO_PUZZLE_TIMEOUT_MS,
                  GC1_GO_GROUP,
                );
                return;
              }
              var directPuzzleStart =
                typeof globalThis.gc1StartPuzzleItemSpawns === "function"
                  ? globalThis.gc1StartPuzzleItemSpawns
                  : typeof gc1PuzzleItemSpawnAll === "function"
                    ? gc1PuzzleItemSpawnAll
                    : null;
              if (typeof directPuzzleStart === "function") {
                finishGo(directPuzzleStart(playerId, { silentSpawn: true }));
                return;
              }
              var moduleState = gc1StartGoModules(false);
              modulesOk = moduleState.ok;
              if (!silent)
                gc1GoMsg(
                  playerId,
                  grannyOk
                    ? modulesOk
                      ? "Granny, wires, cover, rods, and boards loaded, but puzzle items system is not loaded yet."
                      : "Granny spawned, but wires, cover, rods, or boards are still loading."
                    : modulesOk
                      ? "Wires, cover, rods, and boards loaded, but Granny and puzzle items failed."
                      : "Granny failed and puzzle or fence systems are not loaded yet.",
                  grannyOk || modulesOk ? "#ffd166" : "#ff9d87",
                );
              finish(
                gc1CompactSetupResult(
                  modeKey,
                  grannyOk,
                  grannySpawned,
                  null,
                  moduleState,
                  { ok: false, missingPuzzleSystem: true },
                ),
              );
            },
            300,
            GC1_GO_GROUP,
          );
        },
        250,
        GC1_GO_GROUP,
      );
    },
    800,
    GC1_GO_GROUP,
  );
  return true;
}

globalThis.gc1RunGameSetup = gc1RunGameSetup;

// chat hooks use this to trigger the run setup without forcing other systems to care about the command details
globalThis.gc1OnPlayerChat = function (playerId, chatMessage, channelName) {
  if (chatMessage !== "!go") return true;
  gc1RunGameSetup(playerId, { silent: false, modeKey: "easy" });
  return false;
};
