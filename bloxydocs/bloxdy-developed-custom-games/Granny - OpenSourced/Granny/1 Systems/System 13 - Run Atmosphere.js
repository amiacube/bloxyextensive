/*
  Granny Open Source - System 13

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the run atmosphere and audio flow is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 13 - Run Atmosphere */

// this file handles the scary run look and sound
// it turns on the dark sky, rain, thunder, and other little atmosphere bits
globalThis.gc1RunAtmosphereState = Object.assign(
  {
    powerOutage: false,
    appliedByPlayer: {},
    ambientTick: 0,
    musicTick: 0,
    thunderNextTick: 0,
  },
  typeof globalThis.gc1RunAtmosphereState === "object" &&
    globalThis.gc1RunAtmosphereState
    ? globalThis.gc1RunAtmosphereState
    : {},
);

var gc1RunAtmosphereState = globalThis.gc1RunAtmosphereState;
// retry group and audio timing values for the run atmosphere
var GC1_RUN_ATMOS_GROUP = "gc1_run_atmos";
var GC1_RUN_ATMOS_RETRY_MS = 250;
var GC1_RUN_AUDIO_RAIN_TICKS = 240;
var GC1_RUN_AUDIO_MUSIC_REFRESH_TICKS = 40;
var GC1_RUN_AUDIO_THUNDER_MIN_TICKS = 800;
var GC1_RUN_AUDIO_THUNDER_MAX_TICKS = 2800;
var GC1_RUN_AUDIO_RAIN_SOUND = ["intensiveRainLoop", 0.6, 1];
var GC1_RUN_AUDIO_THUNDER_SOUND = ["thunderRain", 0.95, 1];
var GC1_RUN_CORE_OPTS = {
  music: null,
  canSeeNametagsThroughWalls: false,
};
var GC1_RUN_ATMOS_OPTIONS = {
  skyBox: {
    type: "earth",
    luminance: 0,
    turbidity: 0,
    infiniteDistance: true,
    vertexTint: [0, 0, 0],
  },
  fogChunkDistanceOverride: -0.45,
  fogColourOverride: "#000000",
  skyLightColourOverride: "#000000",
  lightingOverride: true,
  cameraTint: null,
};
var GC1_RUN_ATMOS_OUTAGE_OPTIONS = {
  skyBox: GC1_RUN_ATMOS_OPTIONS.skyBox,
  fogChunkDistanceOverride: -0.55,
  fogColourOverride: "#000000",
  skyLightColourOverride: "#000000",
  lightingOverride: true,
  cameraTint: [0, 0, 0, 0.5],
};
var GC1_RUN_ATMOS_CLEAR_OPTIONS = {
  skyBox: null,
  fogChunkDistanceOverride: null,
  fogColourOverride: null,
  skyLightColourOverride: null,
  lightingOverride: null,
  cameraTint: null,
};

// tiny random helper for thunder spacing
function gc1RunAtmosRandInt(min, max) {
  if (max <= min) return min | 0;
  return (min | 0) + Math.floor(Math.random() * ((max | 0) - (min | 0) + 1));
}

// walk each option key and send it to the api one at a time
function gc1RunAtmosForEachOption(options, fn) {
  for (var key in options)
    if (Object.prototype.hasOwnProperty.call(options, key))
      fn(key, options[key]);
}

// apply a bundle of client options safely
function gc1RunAtmosSetOptions(playerId, options) {
  if (!playerId || !api.checkValid(playerId) || !options) return false;
  try {
    if (typeof api.setClientOptions === "function") {
      api.setClientOptions(playerId, options);
      return true;
    }
    if (typeof api.setClientOption !== "function") return false;
    gc1RunAtmosForEachOption(options, function (key, value) {
      if (value == null && typeof api.setClientOptionToDefault === "function")
        api.setClientOptionToDefault(playerId, key);
      else api.setClientOption(playerId, key, value);
    });
    return true;
  } catch (e) {
    if (
      typeof globalThis.gc1IsInterruptLikeError === "function" &&
      globalThis.gc1IsInterruptLikeError(e) &&
      typeof globalThis.gc1MarkRuntimeCooldown === "function"
    )
      globalThis.gc1MarkRuntimeCooldown(GC1_RUN_ATMOS_RETRY_MS);
  }
  return false;
}

// queue a retry if the api is busy right now
function gc1RunAtmosSchedule(fn, playerId, delayMs) {
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      fn,
      typeof delayMs === "number" ? delayMs : GC1_RUN_ATMOS_RETRY_MS,
      GC1_RUN_ATMOS_GROUP + "_" + playerId,
    );
    return true;
  }
  return false;
}

// base options used by both normal and outage modes
function gc1RunApplyCoreOpts(playerId) {
  return gc1RunAtmosSetOptions(playerId, GC1_RUN_CORE_OPTS);
}

// get every player in the lobby
function gc1RunGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

// run state name from the lobby state table
function gc1RunGetRunStateName() {
  var states = globalThis.gc1LobbyStates || {};
  return states.lobby_que && states.lobby_que.name
    ? states.lobby_que.name
    : "lobby que";
}

// only some players should get the run atmosphere
function gc1RunPlayerIsInGame(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  return !!(
    globalThis.gc1PlayerLobbyState &&
    globalThis.gc1PlayerLobbyState[playerId] === gc1RunGetRunStateName()
  );
}

// filter the player list down to the actual run players
function gc1RunGetGamePlayerIds() {
  var ids = gc1RunGetPlayerIds(),
    out = [];
  for (var i = 0; i < ids.length; i++)
    if (gc1RunPlayerIsInGame(ids[i])) out.push(ids[i]);
  return out;
}

// keep the core options refreshed for everyone in the lobby
function gc1RunRefreshCoreOpts(startIndex) {
  var ids = gc1RunGetPlayerIds();
  var index = startIndex | 0;
  for (var i = index; i < ids.length; i++) {
    if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
      gc1RunAtmosSchedule(
        function () {
          gc1RunRefreshCoreOpts(i);
        },
        "core",
        GC1_RUN_ATMOS_RETRY_MS,
      );
      return false;
    }
    gc1RunApplyCoreOpts(ids[i]);
  }
  return true;
}

// play a rain or thunder sound for the chosen players
function gc1RunPlayAmbientForPlayers(ids, sound) {
  if (!Array.isArray(ids) || !ids.length || !Array.isArray(sound)) return false;
  for (var i = 0; i < ids.length; i++) {
    var playerId = ids[i];
    if (!api.checkValid(playerId)) continue;
    try {
      api.playSound(playerId, sound[0], sound[1], sound[2]);
    } catch (e) {}
  }
  return true;
}

// pick the next thunder time so it feels random
function gc1RunAudioScheduleNextThunder() {
  gc1RunAtmosphereState.thunderNextTick =
    gc1RunAtmosphereState.ambientTick +
    gc1RunAtmosRandInt(
      GC1_RUN_AUDIO_THUNDER_MIN_TICKS,
      GC1_RUN_AUDIO_THUNDER_MAX_TICKS,
    );
  return gc1RunAtmosphereState.thunderNextTick;
}

// pause work if the runtime says it is too busy
function gc1RunAtmosNeedsRetry() {
  if (
    typeof globalThis.gc1RuntimeCoolingDown === "function" &&
    globalThis.gc1RuntimeCoolingDown()
  )
    return true;
  if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
    return true;
  return false;
}

// keep a tiny token so we know which atmosphere is already applied
function gc1RunAtmosApplyToken(outage) {
  return outage ? "run:outage" : "run:normal";
}

// apply the spooky run atmosphere
function gc1ApplyRunAtmosphere(playerId, options, retryCount) {
  if (!playerId || !api.checkValid(playerId)) return false;
  var outage = !!(options && options.powerOutage != null
    ? options.powerOutage
    : gc1RunAtmosphereState.powerOutage);
  var token = gc1RunAtmosApplyToken(outage);
  if (
    gc1RunAtmosphereState.appliedByPlayer[playerId] === token &&
    !(options && options.force)
  )
    return true;
  if (gc1RunAtmosNeedsRetry()) {
    if ((retryCount | 0) < 6)
      gc1RunAtmosSchedule(
        function () {
          gc1ApplyRunAtmosphere(playerId, options, (retryCount | 0) + 1);
        },
        playerId,
        GC1_RUN_ATMOS_RETRY_MS,
      );
    return false;
  }
  if (
    gc1RunAtmosSetOptions(
      playerId,
      outage ? GC1_RUN_ATMOS_OUTAGE_OPTIONS : GC1_RUN_ATMOS_OPTIONS,
    )
  ) {
    gc1RunAtmosphereState.appliedByPlayer[playerId] = token;
    return true;
  }
  if ((retryCount | 0) < 6)
    gc1RunAtmosSchedule(
      function () {
        gc1ApplyRunAtmosphere(playerId, options, (retryCount | 0) + 1);
      },
      playerId,
      GC1_RUN_ATMOS_RETRY_MS,
    );
  return false;
}

// clear the run look and go back to normal lighting
function gc1ClearRunAtmosphere(playerId, options, retryCount) {
  if (!playerId || !api.checkValid(playerId)) return false;
  if (
    gc1RunAtmosphereState.appliedByPlayer[playerId] === "clear" &&
    !(options && options.force)
  )
    return true;
  if (gc1RunAtmosNeedsRetry()) {
    if ((retryCount | 0) < 6)
      gc1RunAtmosSchedule(
        function () {
          gc1ClearRunAtmosphere(playerId, options, (retryCount | 0) + 1);
        },
        playerId,
        GC1_RUN_ATMOS_RETRY_MS,
      );
    return false;
  }
  if (gc1RunAtmosSetOptions(playerId, GC1_RUN_ATMOS_CLEAR_OPTIONS)) {
    gc1RunAtmosphereState.appliedByPlayer[playerId] = "clear";
    return true;
  }
  if ((retryCount | 0) < 6)
    gc1RunAtmosSchedule(
      function () {
        gc1ClearRunAtmosphere(playerId, options, (retryCount | 0) + 1);
      },
      playerId,
      GC1_RUN_ATMOS_RETRY_MS,
    );
  return false;
}

// refresh one player based on whether they are in the run or just the hub
function gc1RefreshRunAtmosphere(playerId, options) {
  if (!playerId || !api.checkValid(playerId)) return false;
  gc1RunApplyCoreOpts(playerId);
  var runState = globalThis.gc1RunModeState || {};
  if (runState.setupReady && runState.modeKey && runState.modeKey !== "hub")
    return gc1ApplyRunAtmosphere(playerId, options);
  return gc1ClearRunAtmosphere(playerId, options);
}

// refresh everybody in small slices so the runtime stays smooth
function gc1RefreshRunAtmosphereAll(options, startIndex) {
  var ids = [];
  try {
    ids = api.getPlayerIds() || [];
  } catch (e) {}
  var index = startIndex | 0;
  for (var i = index; i < ids.length; i++) {
    if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
      gc1RunAtmosSchedule(
        function () {
          gc1RefreshRunAtmosphereAll(options, i);
        },
        "all",
        GC1_RUN_ATMOS_RETRY_MS,
      );
      return false;
    }
    gc1RefreshRunAtmosphere(ids[i], options);
  }
  return true;
}

// toggle the outage mode that darkens the run even more (removed the poweroutage in the final version of the game)
function gc1SetRunAtmospherePowerOutage(enabled) {
  gc1RunAtmosphereState.powerOutage = !!enabled;
  return true;
}

// this is the main atmosphere heartbeat
// it refreshes core options and plays rain or thunder on schedule
function gc1RunAtmosOnTick() {
  gc1RunAtmosphereState.ambientTick =
    (gc1RunAtmosphereState.ambientTick | 0) + 1;
  gc1RunAtmosphereState.musicTick = (gc1RunAtmosphereState.musicTick | 0) + 1;
  if (gc1RunAtmosphereState.musicTick >= GC1_RUN_AUDIO_MUSIC_REFRESH_TICKS) {
    gc1RunAtmosphereState.musicTick = 0;
    gc1RunRefreshCoreOpts(0);
  }
  if (gc1RunAtmosphereState.ambientTick % GC1_RUN_AUDIO_RAIN_TICKS === 0) {
    gc1RunPlayAmbientForPlayers(
      gc1RunGetGamePlayerIds(),
      GC1_RUN_AUDIO_RAIN_SOUND,
    );
  }
  if (!(gc1RunAtmosphereState.thunderNextTick > 0))
    gc1RunAudioScheduleNextThunder();
  if (
    gc1RunAtmosphereState.ambientTick >= gc1RunAtmosphereState.thunderNextTick
  ) {
    gc1RunPlayAmbientForPlayers(
      gc1RunGetGamePlayerIds(),
      GC1_RUN_AUDIO_THUNDER_SOUND,
    );
    gc1RunAudioScheduleNextThunder();
  }
}

globalThis.gc1ApplyRunAtmosphere = gc1ApplyRunAtmosphere;
globalThis.gc1ClearRunAtmosphere = gc1ClearRunAtmosphere;
globalThis.gc1RefreshRunAtmosphere = gc1RefreshRunAtmosphere;
globalThis.gc1RefreshRunAtmosphereAll = gc1RefreshRunAtmosphereAll;
globalThis.gc1SetRunAtmospherePowerOutage = gc1SetRunAtmospherePowerOutage;
globalThis.gc1RunRefreshCoreOpts = gc1RunRefreshCoreOpts;

globalThis.gc1OnPlayerJoin = (function (prev) {
  return function (playerId) {
    if (typeof prev === "function") prev(playerId);
    gc1RunApplyCoreOpts(playerId);
  };
})(
  typeof globalThis.gc1OnPlayerJoin === "function"
    ? globalThis.gc1OnPlayerJoin
    : null,
);

if (!globalThis.gc1RunAtmosTickHookInstalled) {
  globalThis.gc1RunAtmosTickHookInstalled = true;
  globalThis.gc1RunAtmosPrevOnTick =
    typeof globalThis.gc1OnTick === "function" ? globalThis.gc1OnTick : null;
  globalThis.gc1OnTick = function () {
    if (typeof globalThis.gc1RunAtmosPrevOnTick === "function")
      globalThis.gc1RunAtmosPrevOnTick();
    gc1RunAtmosOnTick();
  };
}

gc1RunAudioScheduleNextThunder();
if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
  TS.run(
    function () {
      gc1RunRefreshCoreOpts(0);
      gc1RefreshRunAtmosphereAll({ force: true });
    },
    250,
    GC1_RUN_ATMOS_GROUP + "_boot",
  );
