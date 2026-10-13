// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// we added a lot more comments here so it is easier to follow now
// if you try to paste the full file into one code block, it may go over the 32,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// make sure to join bloxdhub.com hehe

// world code is the main system of the entire game
// it keeps the task scheduler alive, loads the block scripts, and hands control to the systems
// credit to delfineon for making the TS system this world uses
{let A={currentTick:0,noTask:Object.freeze(()=>{})},C="default",D=Object.create(null),E=Object.create(null),F=Object.create(null),G=1,H=0,I=0,J=1,K=2,L=!1;A.run=(a,b,c)=>{if(c==null)c=C;b=((b|0)*.02)|0;b=b&~(b>>31);let d=H+b+(!b&J),e=D[d],f=E[c],g=2;if(!e&&b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}D[d]=[a,c,++G];E[c]=f+2}else if(e&&b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}g=e.length-1;e[++g]=a;e[++g]=c;e[++g]=++G;E[c]=f+2}else if(!e&&!b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}e=D[d]=[a,c,++G];E[c]=f+2;try{a();e[2]=1}catch(_){e[2]=1}}else{if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}g=e.length-1;e[++g]=a;e[++g]=c;e[++g]=++G;E[c]=f+2;try{a();e[g]=1}catch(_){e[g]=1}}return[d,g]};A.stop=a=>{if(a==null)a=C;if(E[a]&1){E[a]--;F[a]=++G;return!0}return!1};A.isGroupActive=a=>{if(a==null)a=C;return!!(E[a]&1)};A.cancel=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length)return!1;b[c]=1;return!0};A.isTaskActive=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length)return!1;return b[c]>F[b[c-1]]};A.getGroupId=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length)return null;return b[c-1]};A.tick=()=>{A.currentTick=H+=J;let a=D[H];J=0;if(a){let b,c;do{try{while((c=a[I+2])){b=a[I+1];if(K&2){L=c>F[b];E[b]-=2;K=1}if(L&K)a[I]();K=4;if(E[b]<2){delete E[b];delete F[b]}K=2;I+=3}delete D[H];I=0;break}catch(_){K=4;if(E[b]<2){delete E[b];delete F[b]}K=2;I+=3}}while(!0)}J=1};Object.seal(A);globalThis.TS=A}
// shared runtime state for the world
// this keeps the cached player data, task queue, and interrupt helpers in one spot
globalThis.GC1 = globalThis.GC1 || {
	cache: {
		tick: -1,
		pos: {},
		facing: {},
		targetInfo: {},
		playerIds: null,
		playerTick: -1
	},
	queue: [],
	init: !1
}

var GC = globalThis.GC1
GC.init = !0

// when the runtime gets stressed, we cool it down for a bit and let the next tick breathe
GC.runtimeCooldownUntil = typeof GC.runtimeCooldownUntil === "number" ? GC.runtimeCooldownUntil : 0

// this checks if an error looks like an interrupt or a wait style runtime stop
// the engine uses those words a lot when it is telling us to back off for a tick
GC.isInterruptLike = function (error) {
	var message = String((error && (error.message || error)) || "").toLowerCase()
	return message.indexOf("interrupted") >= 0 || message.indexOf("wait") >= 0
}

// if the world gets too hot, we push the next safe tick forward a little
GC.markRuntimeCooldown = function (delayMs) {
	var waitMs = delayMs | 0
	if (waitMs < 200) waitMs = 200
	var until = Date.now() + waitMs
	if (until > GC.runtimeCooldownUntil) GC.runtimeCooldownUntil = until
	return GC.runtimeCooldownUntil
}

// this tells the rest of the world if we are still in the cool down window
GC.runtimeCoolingDown = function () {
	return GC.runtimeCooldownUntil > Date.now()
}

// these helpers stay global because other modules expect the old names
globalThis.gc1IsInterruptLikeError = GC.isInterruptLike
globalThis.gc1MarkRuntimeCooldown = GC.markRuntimeCooldown
globalThis.gc1RuntimeCoolingDown = GC.runtimeCoolingDown

// the messages stay here bcuz the word "Screw" keeps getting censored. so we put it in world code to avoid that.
globalThis.gc1WireCoverFastenerToolText = globalThis.gc1WireCoverFastenerToolText || "this screw looks loose. maybe i can unscrew them out."
globalThis.gc1WireCoverFastenerHintText = globalThis.gc1WireCoverFastenerHintText || "maybe a screwdriver could loosen these screws"
globalThis.gc1WireCoverFastenerActionText = globalThis.gc1WireCoverFastenerActionText || "Unscrew"
globalThis.gc1WireCoverCoverToolText = globalThis.gc1WireCoverCoverToolText || "the cover is still screwed shut. i need to remove the screws first."
globalThis.gc1WireCoverCoverHintText = globalThis.gc1WireCoverCoverHintText || "the cover is shut. i need something to loosen the screws."

// api work gets queued so one busy tick does not slam the server
GC.queueApi = function (fn) {
	if (typeof fn === "function") GC.queue.push(fn)
}

// process only a few queued calls per tick so the runtime stays light
GC.processQueue = function () {
	var q = GC.queue
	var i = 0
	var maxPerTick = 4
	while (q.length && i < maxPerTick) {
		if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) break
		try {
			q.shift()()
		} catch (e) {}
		i++
	}
}

// these getters cache live api reads so the rest of the world can ask once and reuse the result
GC.getPos = function (id) {
	if (id == null) return null
	var c = GC.cache
	if (c.pos[id] !== undefined) return c.pos[id]
	try {
		var p = api.getPosition(id)
		c.pos[id] = p
		return p
	} catch (e) {}
	return null
}

// facing gets cached the same way because some systems want to check where the player is looking
GC.getFacing = function (id) {
	var c = GC.cache
	if (c.facing[id] !== undefined) return c.facing[id]
	try {
		var f = api.getPlayerFacingInfo(id)
		c.facing[id] = f
		return f
	} catch (e) {}
	return null
}

// target info is mostly for interaction systems, so we keep a cached copy there too
GC.getTarget = function (id) {
	var c = GC.cache
	if (c.targetInfo[id] !== undefined) return c.targetInfo[id]
	try {
		var t = api.getPlayerTargetInfo(id)
		c.targetInfo[id] = t
		return t
	} catch (e) {}
	return null
}

// player ids get cached for the current tick so repeated systems do not keep asking the api
GC.getPlayerIds = function () {
	var c = GC.cache
	if (c.playerTick === TS.currentTick && c.playerIds) return c.playerIds
	try {
		var ids = api.getPlayerIds() || []
		c.playerIds = ids
		c.playerTick = TS.currentTick
		return ids
	} catch (e) {}
	return c.playerIds || []
}

// clear the snapshot cache once per tick so the next pass gets fresh data
GC.updateCache = function () {
	var c = GC.cache
	if (c.tick === TS.currentTick) return
	c.tick = TS.currentTick
	c.pos = {}
	c.facing = {}
	c.targetInfo = {}
}

// this gives later systems one compact player snapshot instead of separate api hits
GC.getPlayerSnapshot = function (id) {
	return {
		pId: id,
		pos: GC.getPos(id),
		facing: GC.getFacing(id),
		targetInfo: GC.getTarget(id)
	}
}

// these code blocks are the boot chain for the world
// the loader warms the chunks first, then evals the script text in a staggered order
const CODE_BLOCKS = [
  [39.5, 70, 22.5],
  [38.5, 70, 21.5],
  [37.5, 70, 22.5],
  [36.5, 70, 21.5],
  [35.5, 70, 22.5],
  [34.5, 70, 21.5],
  [33.5, 70, 22.5],
  [32.5, 70, 21.5],
  [31.5, 70, 22.5],
  [29.5, 70, 22.5],
  [27.5, 70, 22.5],
  [25.5, 70, 22.5],
  [23.5, 70, 22.5],
  [21.5, 70, 22.5],
  [19.5, 70, 22.5],
  [17.5, 70, 22.5],
  [15.5, 70, 22.5],
  [30.5, 70, 21.5],
  [28.5, 70, 21.5],
  [26.5, 70, 21.5],
  [24.5, 70, 21.5],
];
// simple eval helper for the code block scripts
const exe = (x, y, z) => {
  const text = api.getBlockData(x, y, z)?.persisted?.shared?.text;
  if (typeof text !== "string" || !text.trim()) return null;
  eval(text);
  return true;
};
let bootLoaded = false;
let bootQueued = false;
let bootIndex = 0;
let loadedBlocks = {};
// boot timing stays slow on purpose so the world does not slam the runtime
const BOOT_STEP_DELAY_MS = 200;
const BOOT_RETRY_DELAY_MS = 250;
const GC1_BOOT_PRIORITY_INDEXES = [11];
const BOOT_ITEMS = [
  ...GC1_BOOT_PRIORITY_INDEXES.map(function (index) {
    return CODE_BLOCKS[index];
  }),
  ...CODE_BLOCKS.filter(function (_item, index) {
    return GC1_BOOT_PRIORITY_INDEXES.indexOf(index) < 0;
  }),
];
globalThis.gc1BootState = globalThis.gc1BootState || {
  loaded: false,
  index: 0,
  total: BOOT_ITEMS.length,
};
const syncBootState = () => {
  globalThis.gc1BootState.loaded = bootLoaded;
  globalThis.gc1BootState.index = bootIndex;
  globalThis.gc1BootState.total = BOOT_ITEMS.length;
};
globalThis.gc1IsBootLoaded = () => !!bootLoaded;
syncBootState();
for (const item of BOOT_ITEMS) {
  try {
    api.getBlock(item[0], item[1], item[2]);
  } catch (_e) {}
}
// boot work gets re-queued through TS when the world needs another tick to breathe
const queueBoot = (delayMs) => {
  if (bootLoaded || bootQueued) return;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") return;
  bootQueued = true;
  TS.run(
    bootStep,
    typeof delayMs === "number" ? delayMs : BOOT_STEP_DELAY_MS,
    "boot_retry",
  );
};
// each boot step loads one script, then hands the rest back to the scheduler
const bootStep = () => {
  bootQueued = false;
  if (bootLoaded) return false;
  if (GC.runtimeCoolingDown()) {
    queueBoot(BOOT_RETRY_DELAY_MS);
    return true;
  }
  if (typeof api.isNearInterrupt === "function" && api.isNearInterrupt()) {
    GC.markRuntimeCooldown(BOOT_STEP_DELAY_MS);
    queueBoot(BOOT_RETRY_DELAY_MS);
    return true;
  }
  if (bootIndex >= BOOT_ITEMS.length) {
    bootLoaded = true;
    syncBootState();
    return false;
  }
  const item = BOOT_ITEMS[bootIndex];
  const key = item.join(",");
  if (loadedBlocks[key]) {
    bootIndex++;
    syncBootState();
    queueBoot();
    return true;
  }
  try {
    const ok = exe(item[0], item[1], item[2]);
    if (ok) {
      loadedBlocks[key] = true;
      bootIndex++;
      syncBootState();
      queueBoot();
      return true;
    }
    if (ok === null) {
      loadedBlocks[key] = true;
      bootIndex++;
      syncBootState();
      queueBoot();
      return true;
    }
  } catch (e) {
    if (GC.isInterruptLike(e)) {
      GC.markRuntimeCooldown(1100);
      queueBoot(BOOT_RETRY_DELAY_MS);
      return true;
    }
    api.broadcastMessage("Boot Error at " + key + ": " + e, {
      color: "#ff9d87",
    });
  }
  queueBoot(BOOT_RETRY_DELAY_MS);
  return true;
};
queueBoot();

function gc1CallHook(name, args) {
  var fn = globalThis[name];
  if (typeof fn === "function") return fn(...args);
}

function gc1CallFirst(names, args) {
  for (var i = 0; i < names.length; i++) {
    var fn = globalThis[names[i]];
    if (typeof fn !== "function") continue;
    var result;
    try {
      result = fn(...args);
    } catch (e) {
      try {
        api.broadcastMessage("Click Handler Error [" + names[i] + "]: " + e, {
          color: "#ff9d87",
        });
      } catch (_e) {}
      throw e;
    }
    if (result) return result;
  }
  return false;
}

// beta lockout stayed in the source as a soft guard
function gc1BetaAllowed(playerId) {
  var name = "";
  try {
    name = String(api.getEntityName(playerId) || "");
  } catch (e) {}
  name = name.toLowerCase();
  return true;
}

// if the beta lock ever comes back, this is the hook that would kick the player out
function gc1KickIfNotBeta(playerId) {
  if (gc1BetaAllowed(playerId)) return false;
  /* Beta lockout disabled now that the game has launched.
try{gc1ApplyIntroLock(playerId)}catch(e){}
try{gc1SetClientOptionsSafe(playerId,{canChange:false})}catch(e){}
try{api.kickPlayer(playerId,"beta testing")}catch(e){}
*/
  return true;
}

// lobby states are kept tiny on purpose
// we only need the position and facing for each spawn spot
globalThis.gc1LobbyStates = globalThis.gc1LobbyStates || {
  lobby: { name: "lobby", pos: [32.5, 116, 23.5], dir: [0, 0, 1] },
  lobby_que: { name: "lobby que", pos: [34.5, 62, 8.5], dir: [-1, 0, 0] },
};
var GC1_RI = "Objective.... solve the puzzles and escape the house.";
globalThis.gc1PlayerLobbyState = globalThis.gc1PlayerLobbyState || {};
globalThis.gc1WorldJoinConfig = Object.assign(
  {
    skipSplashLobbyNamePattern: "confidential-1",
  },
  typeof globalThis.gc1WorldJoinConfig === "object" &&
    globalThis.gc1WorldJoinConfig
    ? globalThis.gc1WorldJoinConfig
    : {},
);

// this picks a random numeric lobby name so fresh matches are easy to spin up
function gc1PickNumericLobbyName() {
  return String(1 + Math.floor(Math.random() * 999));
}

// matchmaking uses the generated lobby name and lets the api do the heavy lift
function gc1MatchmakePlayerToNumericLobby(playerId) {
  var lobbyName = gc1PickNumericLobbyName();
  try {
    api.matchmakePlayer(playerId, undefined, lobbyName);
    return lobbyName;
  } catch (e) {}
  return "";
}

// client option batches are nicer here because a bunch of systems fight over the same player state
function gc1SetClientOptionsSafe(playerId, options) {
  try {
    options = Object.assign({}, options || {}, {
      canUseZoomKey: false,
      maxPlayerZoom: 0.1, // disables player zooming out to peak corners
      playerZoom: 0,
      zoomOutDistance: 0,
      lightingOverride: true, // forces lighting on
      cantChangeError: [],
      cantBuildError: [],
      cantBreakError: [],
    });
    if (typeof api.setClientOptions === "function") {
      api.setClientOptions(playerId, options);
      return true;
    }
    for (var key in options) api.setClientOption(playerId, key, options[key]);
    return true;
  } catch (e) {}
  return false;
}

// some api paths still want the old single option default reset, so this keeps a safe fallback
function gc1SetClientOptionDefaultSafe(playerId, key) {
  if (!playerId || !key) return false;
  try {
    if (typeof api.setClientOptionToDefault === "function") {
      api.setClientOptionToDefault(playerId, key);
      return true;
    }
  } catch (e) {}
  return false;
}

// inventory hard clear is used when the lobby or queue needs a clean slate
function gc1ClearPlayerInventoryHard(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  try {
    if (typeof globalThis.gc1PuzzleItemClearInventory === "function")
      globalThis.gc1PuzzleItemClearInventory(playerId);
  } catch (e) {}
  try {
    if (typeof api.clearInventory === "function") api.clearInventory(playerId);
  } catch (e) {}
  for (var i = 0; i < 10; i++) {
    try {
      api.setItemSlot(playerId, i, "Air", 0);
    } catch (e) {}
  }
  try {
    api.setSelectedInventorySlotI(playerId, 0);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1PuzzleItemClearCarryHint === "function")
      globalThis.gc1PuzzleItemClearCarryHint(playerId);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1PuzzleItemClearPrompt === "function")
      globalThis.gc1PuzzleItemClearPrompt(playerId);
  } catch (e) {}
  return true;
}
globalThis.gc1ClearPlayerInventoryHard = gc1ClearPlayerInventoryHard;

function gc1ScheduleInventoryClear(playerId) {
  gc1ClearPlayerInventoryHard(playerId);
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function")
    return true;
  var group = "gc1_join_inventory_clear_" + playerId;
  TS.run(
    function () {
      gc1ClearPlayerInventoryHard(playerId);
    },
    160,
    group + "_160",
  );
  TS.run(
    function () {
      gc1ClearPlayerInventoryHard(playerId);
    },
    700,
    group + "_700",
  );
  TS.run(
    function () {
      gc1ClearPlayerInventoryHard(playerId);
    },
    1800,
    group + "_1800",
  );
  return true;
}
globalThis.gc1ScheduleInventoryClear = gc1ScheduleInventoryClear;

function gc1ApplyIntroLock(playerId, dir, options) {
  if (!api.checkValid(playerId)) return false;
  var opts = options && typeof options === "object" ? options : {};
  gc1SetClientOptionsSafe(playerId, {
    cameraTint: [0, 0, 0, 1],
    middleTextLower: Object.prototype.hasOwnProperty.call(
      opts,
      "middleTextLower",
    )
      ? opts.middleTextLower
      : "",
    middleTextUpper: Object.prototype.hasOwnProperty.call(
      opts,
      "middleTextUpper",
    )
      ? opts.middleTextUpper
      : "",
    fogColourOverride: "#000000",
    fogChunkDistanceOverride: 0,
    forcedCameraDirection: dir || null,
    forcedCameraDirectionTransitionMs: 0,
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
  return true;
}

function gc1ReleaseIntroLock(playerId, options) {
  if (!api.checkValid(playerId)) return false;
  var preserveAtmosphere = !!(options && options.preserveAtmosphere);
  gc1SetClientOptionsSafe(playerId, {
    middleTextLower: "",
    middleTextUpper: "",
    canChange: false,
    cantBuildError: [],
    cantChangeError: [],
    cantBreakError: [],
    forcedCameraDirection: null,
    forcedCameraDirectionTransitionMs: 1200,
  });
  if (!preserveAtmosphere)
    gc1SetClientOptionsSafe(playerId, {
      cameraTint: null,
      fogColourOverride: null,
      fogChunkDistanceOverride: null,
      skyBox: null,
      skyLightColourOverride: null,
      lightingOverride: true,
    });
  gc1SetClientOptionDefaultSafe(playerId, "speedMultiplier");
  gc1SetClientOptionDefaultSafe(playerId, "walkingSpeed");
  gc1SetClientOptionDefaultSafe(playerId, "runningSpeed");
  gc1SetClientOptionDefaultSafe(playerId, "jumpAmount");
  return true;
}

globalThis.gc1SetClientOptionDefaultSafe = gc1SetClientOptionDefaultSafe;
globalThis.gc1PickNumericLobbyName = gc1PickNumericLobbyName;
globalThis.gc1MatchmakePlayerToNumericLobby = gc1MatchmakePlayerToNumericLobby;
globalThis.gc1ApplyIntroLock = gc1ApplyIntroLock;
globalThis.gc1ReleaseIntroLock = gc1ReleaseIntroLock;
// the intro flow uses a few timed steps so the lobby can fade in clean
// the helper below keeps that timing in one place instead of duplicating it everywhere
var GC1_GRANNY_INTRO_START_DELAY_MS = 100;
var GC1_GRANNY_INTRO_FADE_STEP_MS = 120;
var GC1_GRANNY_INTRO_POLL_DELAY_MS = 250;

// if the intro needs to stop early, this clears the scheduler state and unlocks the player
function gc1GrannyLobbyIntroStop(playerId) {
  var group = "gc1_granny_lobby_intro_" + playerId;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(group);
  if (globalThis.gc1GrannyLobbyIntroState)
    delete globalThis.gc1GrannyLobbyIntroState[playerId];
  if (playerId && api.checkValid(playerId))
    try {
      gc1SetClientOptionsSafe(playerId, {
        forcedCameraDirection: null,
        forcedCameraDirectionTransitionMs: 0,
      });
    } catch (e) {}
  return true;
}

// when the title card ends, we drop the intro lock and clean the state
function gc1GrannyLobbyIntroFinish(playerId) {
  gc1ReleaseIntroLock(playerId);
  gc1GrannyLobbyIntroStop(playerId);
  return true;
}

// the fade is split into steps so the camera tint can ease out instead of snapping
function gc1GrannyLobbyIntroFadeStep(playerId, step) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyLobbyIntroState &&
    globalThis.gc1GrannyLobbyIntroState[playerId];
  if (!state || !state.active) return false;
  var fades = [1, 0.9, 0.78, 0.64, 0.5, 0.38, 0.26, 0.14, 0];
  if (step >= fades.length) return gc1GrannyLobbyIntroFinish(playerId);
  gc1SetClientOptionsSafe(playerId, {
    cameraTint: [0, 0, 0, fades[step]],
    fogColourOverride: fades[step] > 0 ? "#000000" : null,
    fogChunkDistanceOverride: fades[step] > 0 ? 0 : null,
    forcedCameraDirection: state.dir || null,
    forcedCameraDirectionTransitionMs: 0,
    speedMultiplier: 0,
    walkingSpeed: 0,
    runningSpeed: 0,
    jumpAmount: 0,
  });
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyLobbyIntroFadeStep(playerId, step + 1);
      },
      GC1_GRANNY_INTRO_FADE_STEP_MS,
      "gc1_granny_lobby_intro_" + playerId,
    );
  } else {
    setTickTimeout(function () {
      gc1GrannyLobbyIntroFadeStep(playerId, step + 1);
    }, 1);
  }
  return true;
}

// this is the main lobby title flow
// each step pushes one more line so the intro feels paced, not spammed
function gc1GrannyLobbyIntroStep(playerId, step) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyLobbyIntroState &&
    globalThis.gc1GrannyLobbyIntroState[playerId];
  if (!state || !state.active) return false;
  var lines = [
    {
      text: "After 2 months of development...",
      size: "2.05rem",
      life: 3000,
      sound: ["pulseFromTheDark", 0.82, 0.42],
    },
    {
      text: "Crownix presents...",
      size: "2.25rem",
      life: 3000,
      sound: ["pistol_magazine_load_02", 0.48, 0.5],
    },
    {
      text: "Granny",
      size: "3.5rem",
      life: 3000,
      sound: ["hauntedHorrorImpact", 1, 0.8],
    },
    {
      text: "Make sure to join Bloxdhub.com", // ye guys make sure to join bloxdhub.com
      size: "1.6rem",
      life: 3000,
      sound: ["pistol_magazine_load_02", 0.58, 0.68],
    },
  ];
  if (step >= lines.length) {
    return gc1GrannyLobbyIntroFadeStep(playerId, 0);
  }
  var item = lines[step];
  gc1ApplyIntroLock(playerId, state.dir);
  if (step === 3) {
    api.sendFlyingMiddleMessage(
      playerId,
      [
        {
          str: "Make sure to join ",
          style: { color: "#ffffff", fontSize: item.size },
        },
        {
          str: "Bloxdhub.com",
          style: { color: "#6ee7ff", fontSize: item.size },
        },
      ],
      0,
      item.life,
    );
  } else {
    api.sendFlyingMiddleMessage(
      playerId,
      [{ str: item.text, style: { color: "#ffffff", fontSize: item.size } }],
      0,
      item.life,
    );
  }
  if (item.sound)
    try {
      api.playSound(playerId, item.sound[0], item.sound[1], item.sound[2]);
    } catch (_e) {}
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyLobbyIntroStep(playerId, step + 1);
      },
      item.life - 200,
      "gc1_granny_lobby_intro_" + playerId,
    );
  } else {
    setTickTimeout(
      function () {
        gc1GrannyLobbyIntroStep(playerId, step + 1);
      },
      Math.max(1, Math.floor(item.life / 20)),
    );
  }
  return true;
}

function gc1GrannyLobbyIntroStart(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  if (!globalThis.gc1GrannyLobbyIntroState)
    globalThis.gc1GrannyLobbyIntroState = {};
  gc1GrannyLobbyIntroStop(playerId);
  var dir =
    (globalThis.gc1LobbyStates &&
      globalThis.gc1LobbyStates.lobby &&
      globalThis.gc1LobbyStates.lobby.dir) ||
    null;
  globalThis.gc1GrannyLobbyIntroState[playerId] = {
    active: true,
    startedAt: Date.now(),
    dir: dir,
  };
  gc1ApplyIntroLock(playerId, dir);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyLobbyIntroStep(playerId, 0);
      },
      GC1_GRANNY_INTRO_START_DELAY_MS,
      "gc1_granny_lobby_intro_" + playerId,
    );
  } else {
    setTickTimeout(function () {
      gc1GrannyLobbyIntroStep(playerId, 0);
    }, 1);
  }
  return true;
}

globalThis.gc1GrannyLobbyIntroStart = gc1GrannyLobbyIntroStart;
globalThis.gc1GrannyLobbyIntroStop = gc1GrannyLobbyIntroStop;

function gc1GrannyQueueIntroStop(playerId) {
  var group = "gc1_granny_queue_intro_" + playerId;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(group);
  if (globalThis.gc1GrannyQueueIntroState)
    delete globalThis.gc1GrannyQueueIntroState[playerId];
  if (playerId && api.checkValid(playerId))
    try {
      gc1SetClientOptionsSafe(playerId, {
        forcedCameraDirection: null,
        forcedCameraDirectionTransitionMs: 0,
      });
    } catch (e) {}
  return true;
}

// queue intro is the waiting room version of the title flow
// it keeps the player locked while the game finishes booting and setup
function gc1GrannyQueueIntroFinish(playerId) {
  gc1ReleaseIntroLock(playerId);
  gc1SetClientOptionsSafe(playerId, {
    middleTextLower: "",
    middleTextUpper: "",
  });
  gc1GrannyQueueIntroStop(playerId);
  return true;
}

// this checks which mode the queued player is supposed to land in
// if the db ticket says easy, we keep the granny setup path alive
function gc1ResolveQueueRunMode(playerId) {
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var modeKey = gc1GetPlayerDbValueSafe(
    playerId,
    config.queuePlayerDbKey || "gc1_queue_mode",
  );
  if (modeKey) return String(modeKey);
  try {
    if (
      typeof globalThis.gc1LobbyHubGetCurrentLobbyName === "function" &&
      typeof globalThis.gc1LobbyHubGetActiveRunPlayer === "function"
    ) {
      var active = globalThis.gc1LobbyHubGetActiveRunPlayer(
        playerId,
        globalThis.gc1LobbyHubGetCurrentLobbyName(),
      );
      if (active && active.modeKey) return String(active.modeKey);
    }
  } catch (e) {}
  return "easy";
}

// while the queue intro waits, it keeps polling for boot and setup readiness
// the text is there so players know why they are sitting still for a bit
function gc1GrannyQueueIntroWaitForReady(playerId) {
  if (!api.checkValid(playerId)) return false;
  var state =
    globalThis.gc1GrannyQueueIntroState &&
    globalThis.gc1GrannyQueueIntroState[playerId];
  if (!state || !state.active) return false;
  gc1ApplyIntroLock(playerId, state.dir, {
    middleTextUpper: "Dropping an item causes sound which attracts Granny",
  });
  var now = Date.now();
  if (!state.loadingShownAt || now >= state.loadingShownAt) {
    state.loadingShownAt = now + 2600;
    try {
      api.sendFlyingMiddleMessage(
        playerId,
        [
          {
            str: "Loading assets....",
            style: { color: "#ffffff", fontSize: "2.05rem" },
          },
        ],
        0,
        2800,
      );
    } catch (e) {}
  }
  if (
    typeof globalThis.gc1IsBootLoaded === "function" &&
    !globalThis.gc1IsBootLoaded()
  ) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          gc1GrannyQueueIntroWaitForReady(playerId);
        },
        GC1_GRANNY_INTRO_POLL_DELAY_MS,
        "gc1_granny_queue_intro_" + playerId,
      );
    return true;
  }
  if (!state.setupStarted) {
    if (typeof globalThis.gc1RunGameSetup !== "function") {
      if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
        TS.run(
          function () {
            gc1GrannyQueueIntroWaitForReady(playerId);
          },
          GC1_GRANNY_INTRO_POLL_DELAY_MS,
          "gc1_granny_queue_intro_" + playerId,
        );
      return true;
    }
    state.setupStarted = true;
    state.modeKey = gc1ResolveQueueRunMode(playerId);
    try {
      var started = globalThis.gc1RunGameSetup(
        playerId,
        { silent: true, modeKey: state.modeKey, source: "queue_intro" },
        function (result) {
          var liveState =
            globalThis.gc1GrannyQueueIntroState &&
            globalThis.gc1GrannyQueueIntroState[playerId];
          if (!liveState || !liveState.active) return;
          liveState.setupDone = true;
          liveState.setupResult = result || { ok: false };
          if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
            TS.run(
              function () {
                gc1GrannyQueueIntroWaitForReady(playerId);
              },
              GC1_GRANNY_INTRO_POLL_DELAY_MS,
              "gc1_granny_queue_intro_" + playerId,
            );
        },
      );
      if (started === false) state.setupStarted = false;
    } catch (e) {
      state.setupDone = true;
      state.setupResult = { ok: false, error: String(e || "setup failed") };
    }
  }
  if (!state.setupDone) {
    if (typeof TS !== "undefined" && TS && typeof TS.run === "function")
      TS.run(
        function () {
          gc1GrannyQueueIntroWaitForReady(playerId);
        },
        GC1_GRANNY_INTRO_POLL_DELAY_MS,
        "gc1_granny_queue_intro_" + playerId,
      );
    return true;
  }
  gc1GrannyQueueIntroStop(playerId);
  if (typeof globalThis.gc1GrannyRunIntroStart === "function")
    return globalThis.gc1GrannyRunIntroStart(playerId);
  return gc1GrannyQueueIntroFinish(playerId);
}

// the queue intro just reuses the ready check so it stays simple
function gc1GrannyQueueIntroStep(playerId, step) {
  return gc1GrannyQueueIntroWaitForReady(playerId);
}

// this is the queue side intro start
// it only runs once per lobby name so the player does not get spammed by the same sequence
function gc1GrannyQueueIntroStart(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  if (!globalThis.gc1GrannyQueueIntroState)
    globalThis.gc1GrannyQueueIntroState = {};
  globalThis.gc1GrannyQueueIntroPlayed =
    globalThis.gc1GrannyQueueIntroPlayed || {};
  var lobbyName = "";
  try {
    lobbyName = String(api.getLobbyName() || "");
  } catch (e) {}
  var activeState = globalThis.gc1GrannyQueueIntroState[playerId];
  if (activeState && activeState.active && activeState.lobbyName === lobbyName)
    return true;
  if (globalThis.gc1GrannyQueueIntroPlayed[playerId] === lobbyName) return true;
  gc1GrannyLobbyIntroStop(playerId);
  if (typeof globalThis.gc1GrannyRunIntroStop === "function")
    globalThis.gc1GrannyRunIntroStop(playerId);
  gc1GrannyQueueIntroStop(playerId);
  var dir =
    (globalThis.gc1LobbyStates &&
      globalThis.gc1LobbyStates.lobby_que &&
      globalThis.gc1LobbyStates.lobby_que.dir) ||
    null;
  globalThis.gc1GrannyQueueIntroPlayed[playerId] = lobbyName;
  globalThis.gc1GrannyQueueIntroState[playerId] = {
    active: true,
    startedAt: Date.now(),
    dir: dir,
    lobbyName: lobbyName,
    setupStarted: false,
    setupDone: false,
    setupResult: null,
    modeKey: null,
    loadingShownAt: 0,
  };
  gc1ApplyIntroLock(playerId, dir, {
    middleTextUpper: "Dropping an item causes sound which attracts Granny",
  });
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        gc1GrannyQueueIntroWaitForReady(playerId);
      },
      GC1_GRANNY_INTRO_START_DELAY_MS,
      "gc1_granny_queue_intro_" + playerId,
    );
  }
  return true;
}

globalThis.gc1GrannyQueueIntroStart = gc1GrannyQueueIntroStart;
globalThis.gc1GrannyQueueIntroStop = gc1GrannyQueueIntroStop;

function gc1ScheduleLobbyFade(playerId) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") return;
  var group = "gc1_lobby_join_fade_" + playerId;
  if (typeof TS.stop === "function") TS.stop(group);
  TS.run(
    function () {
      if (!api.checkValid(playerId)) return;
      gc1SetClientOptionsSafe(playerId, {
        forcedCameraDirection: null,
        forcedCameraDirectionTransitionMs: 1200,
        fogColourOverride: null,
        fogChunkDistanceOverride: null,
      });
    },
    3000,
    group,
  );
  var alphas = [0.8, 0.6, 0.4, 0.2, 0];
  for (var i = 0; i < alphas.length; i++) {
    (function (alpha, delay) {
      TS.run(
        function () {
          if (!api.checkValid(playerId)) return;
          gc1SetClientOptionsSafe(playerId, { cameraTint: [0, 0, 0, alpha] });
        },
        delay,
        group,
      );
    })(alphas[i], 3000 + i * 260);
  }
}

// lobby state is the little wrapper that moves a player into the right spawn area
// this handles the lobby and queue lobby plus all the reset bits around them
function gc1SendPlayerToLobbyState(playerId, stateName, options) {
  var stateKey = globalThis.gc1LobbyStates[stateName] ? stateName : "lobby";
  var state =
    globalThis.gc1LobbyStates[stateKey] || globalThis.gc1LobbyStates.lobby;
  var force = !!(options && options.force);
  if (stateKey === "lobby")
    try {
      api.setMaxPlayers(20, 20);
    } catch (e) {}
  else if (stateKey === "lobby_que")
    try {
      api.setMaxPlayers(1, 1);
    } catch (e) {}
  if (!force && globalThis.gc1PlayerLobbyState[playerId] === state.name)
    return true;
  if (
    stateKey === "lobby_que" &&
    typeof globalThis.gc1GrannyLobbyIntroStop === "function"
  )
    globalThis.gc1GrannyLobbyIntroStop(playerId);
  if (stateKey === "lobby") {
    if (typeof globalThis.gc1GrannyRunIntroStop === "function")
      globalThis.gc1GrannyRunIntroStop(playerId);
    if (typeof globalThis.gc1GrannyQueueIntroStop === "function")
      globalThis.gc1GrannyQueueIntroStop(playerId);
  }
  globalThis.gc1PlayerLobbyState[playerId] = state.name;
  try {
    api.setPosition(playerId, state.pos[0], state.pos[1], state.pos[2]);
  } catch (e) {}
  if (stateKey === "lobby" || stateKey === "lobby_que") {
    try {
      gc1ScheduleInventoryClear(playerId);
    } catch (e) {}
  }
  if (typeof globalThis.gc1PuzzleItemReleaseInventoryLock === "function") {
    try {
      globalThis.gc1PuzzleItemReleaseInventoryLock(playerId);
    } catch (e) {}
  }
  if (typeof globalThis.gc1BoardsRefreshProtectionForPlayer === "function") {
    try {
      globalThis.gc1BoardsRefreshProtectionForPlayer(playerId);
    } catch (e) {}
  }
  gc1SetClientOptionsSafe(playerId, {
    cameraTint: [0, 0, 0, 1],
    fogColourOverride: "#000000",
    fogChunkDistanceOverride: 0,
    RightInfoText: stateKey === "lobby_que" ? GC1_RI : "",
    canChange: false,
    cantBuildError: [],
    cantChangeError: [],
    cantBreakError: [],
    forcedCameraDirection: state.dir,
    forcedCameraDirectionTransitionMs: 0,
  });
  var skipSplashPattern = String(
    (globalThis.gc1WorldJoinConfig &&
      globalThis.gc1WorldJoinConfig.skipSplashLobbyNamePattern) ||
      "",
  );
  var currentLobbyName = "";
  try {
    currentLobbyName = String(api.getLobbyName() || "");
  } catch (e) {}
  if (
    skipSplashPattern &&
    currentLobbyName.toLowerCase().indexOf(skipSplashPattern.toLowerCase()) >= 0
  ) {
    gc1ReleaseIntroLock(playerId);
    globalThis.gc1PlayerLobbyState[playerId] = state.name;
    try {
      gc1SetClientOptionsSafe(playerId, {
        cameraTint: null,
        fogColourOverride: null,
        fogChunkDistanceOverride: null,
        RightInfoText: stateKey === "lobby_que" ? GC1_RI : "",
        canChange: false,
        cantBuildError: [],
        cantChangeError: [],
        cantBreakError: [],
        forcedCameraDirection: null,
        forcedCameraDirectionTransitionMs: 0,
      });
    } catch (e) {}
    if (typeof globalThis.gc1ApplyGoMovement === "function") {
      try {
        globalThis.gc1ApplyGoMovement(playerId);
      } catch (e) {}
    }
    return true;
  }
  if (stateKey === "lobby") {
    var seen = globalThis.gc1GrannyLobbyIntroSeen || {};
    globalThis.gc1GrannyLobbyIntroSeen = seen;
    if (!seen[playerId]) {
      seen[playerId] = true;
      gc1GrannyLobbyIntroStart(playerId);
    } else {
      gc1ReleaseIntroLock(playerId);
    }
  } else if (stateKey === "lobby_que") {
    gc1GrannyQueueIntroStart(playerId);
  } else gc1ScheduleLobbyFade(playerId);
}

// db helpers stay wrapped so the rest of the world code can keep a clean fallback path
function gc1GetPlayerDbValueSafe(playerId, key) {
  if (!playerId || !key) return null;
  try {
    if (typeof api.getPlayerDbValue === "function")
      return api.getPlayerDbValue(playerId, key);
    if (typeof api.getDBValue === "function") return api.getDBValue(key);
  } catch (e) {}
  return null;
}

// the queue ticket gets cleaned up when a player leaves the flow or the ticket goes stale
function gc1DeletePlayerDbValueSafe(playerId, key) {
  if (!playerId || !key) return false;
  try {
    if (typeof api.deletePlayerDbValue === "function") {
      api.deletePlayerDbValue(playerId, key);
      return true;
    }
  } catch (e) {}
  return false;
}

// this removes all queue ticket keys in one go so old joins do not hang around
function gc1ClearQueueTicketSafe(playerId) {
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  gc1DeletePlayerDbValueSafe(
    playerId,
    config.queuePlayerDbKey || "gc1_queue_mode",
  );
  gc1DeletePlayerDbValueSafe(
    playerId,
    config.queueLobbyDbKey || "gc1_queue_lobby",
  );
  gc1DeletePlayerDbValueSafe(
    playerId,
    config.queueIssuedAtDbKey || "gc1_queue_issued_at",
  );
  return true;
}

// valid queue tickets are time limited, so old ones get tossed out fast
function gc1HasValidQueueJoinTicket(playerId, lobbyName) {
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var targetLobby = gc1GetPlayerDbValueSafe(
    playerId,
    config.queueLobbyDbKey || "gc1_queue_lobby",
  );
  var modeKey = gc1GetPlayerDbValueSafe(
    playerId,
    config.queuePlayerDbKey || "gc1_queue_mode",
  );
  var issuedAt = Number(
    gc1GetPlayerDbValueSafe(
      playerId,
      config.queueIssuedAtDbKey || "gc1_queue_issued_at",
    ),
  );
  var ttl =
    typeof config.queueTicketTtlMs === "number"
      ? config.queueTicketTtlMs
      : 300000;
  if (!targetLobby || !modeKey || !isFinite(issuedAt) || issuedAt <= 0)
    return false;
  if (Date.now() - issuedAt > ttl) {
    gc1ClearQueueTicketSafe(playerId);
    return false;
  }
  return String(targetLobby) === String(lobbyName || "");
}

// decide whether a join should land the player in the lobby or the queue lobby
function gc1ResolveJoinLobbyState(playerId) {
  var config = globalThis.gc1LobbyMatchmakeConfig || {};
  var hubStateName = config.hubStateName || "lobby";
  var queueStateName = config.queueStateName || "lobby_que";
  var lobbyName = "";
  try {
    lobbyName = api.getLobbyName() || "";
  } catch (e) {}
  if (gc1HasValidQueueJoinTicket(playerId, lobbyName)) return queueStateName;
  if (
    globalThis.gc1LobbyHubState &&
    globalThis.gc1LobbyHubState.activeRunPlayers
  )
    delete globalThis.gc1LobbyHubState.activeRunPlayers[playerId];
  return hubStateName;
}

// this wrapper always keeps the latest task for a group and drops stale ones
globalThis.gc1QueueLatestTask = function (groupId, task, delayMs) {
  if (typeof task !== "function") return null;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    try {
      task();
    } catch (e) {}
    return null;
  }
  if (typeof TS.stop === "function") TS.stop(groupId);
  return TS.run(task, delayMs == null ? 0 : delayMs, groupId);
};

// main world tick
// cache first, scheduler next, then the rest of the hooks so nothing piles up too hard
tick = () => {
  if (GC.runtimeCoolingDown()) return;
  try {
    GC.updateCache();
    TS.tick();
    if (GC.runtimeCoolingDown()) return;
    GC.processQueue();
    if (GC.runtimeCoolingDown()) return;
    gc1CallHook("gc1OnTick", []);
  } catch (e) {
    if (GC.isInterruptLike(e)) {
      GC.markRuntimeCooldown(1100);
      return;
    }
    throw e;
  }
};

// these event hooks are thin pass throughs so the actual game logic can live in modules
onPlayerChat = function (playerId, chatMessage, channelName) {
  return gc1CallHook("gc1OnPlayerChat", [playerId, chatMessage, channelName]);
};

onPlayerDamagingMob = function (
  playerId,
  mobId,
  damageDealt,
  withItem,
  damagerDbId,
) {
  return gc1CallHook("gc1OnPlayerDamagingMob", [
    playerId,
    mobId,
    damageDealt,
    withItem,
    damagerDbId,
  ]);
};

onPlayerAttemptSpawnMob = function (playerId, mobType, x, y, z) {
  return gc1CallHook("gc1OnPlayerAttemptSpawnMob", [
    playerId,
    mobType,
    x,
    y,
    z,
  ]);
};

onPlayerSpawnMob = function (
  playerId,
  mobId,
  mobType,
  x,
  y,
  z,
  mobHerdId,
  playSoundOnSpawn,
) {
  gc1CallHook("gc1OnPlayerSpawnMob", [
    playerId,
    mobId,
    mobType,
    x,
    y,
    z,
    mobHerdId,
    playSoundOnSpawn,
  ]);
};

onWorldSpawnMob = function (
  mobId,
  mobType,
  x,
  y,
  z,
  mobHerdId,
  playSoundOnSpawn,
) {
  gc1CallHook("gc1OnWorldSpawnMob", [
    mobId,
    mobType,
    x,
    y,
    z,
    mobHerdId,
    playSoundOnSpawn,
  ]);
};

onBlockStand = function (playerId, x, y, z, blockName) {
  return gc1CallHook("gc1OnBlockStand", [playerId, x, y, z, blockName]);
};

onWorldAttemptDespawnMob = function (mobId) {
  return gc1CallHook("gc1OnWorldAttemptDespawnMob", [mobId]);
};

onPlayerJoin = function (playerId) {
  if (gc1KickIfNotBeta(playerId)) return;
  var joinStateName = gc1ResolveJoinLobbyState(playerId);
  if (globalThis.gc1PlayerLobbyState)
    delete globalThis.gc1PlayerLobbyState[playerId];
  gc1SendPlayerToLobbyState(playerId, joinStateName, { force: true });
  queueBoot();
  gc1CallHook("gc1OnPlayerJoin", [playerId]);
};

onPlayerClick = function (playerId, wasAltClick, x, y, z, block, targetEId) {
  return gc1CallFirst(
    ["gc1WireCoverOnPlayerClick", "gc1WiresOnPlayerClick", "gc1OnPlayerClick"],
    [playerId, wasAltClick, x, y, z, block, targetEId],
  );
};

onPlayerAttemptAltAction = function (playerId, x, y, z, block, targetEId) {
  return gc1CallHook("gc1OnPlayerAttemptAltAction", [
    playerId,
    x,
    y,
    z,
    block,
    targetEId,
  ]);
};

onPlayerAltAction = function (playerId, x, y, z, block, targetEId) {
  return gc1CallHook("gc1OnPlayerAltAction", [
    playerId,
    x,
    y,
    z,
    block,
    targetEId,
  ]);
};

onTouchscreenActionButton = function (playerId, touchDown) {
  return gc1CallFirst(
    ["gc1WireCoverOnTouchscreenActionButton", "gc1OnTouchscreenActionButton"],
    [playerId, touchDown],
  );
};

onPlayerDamagingMeshEntity = function (
  playerId,
  damagedId,
  damageDealt,
  withItem,
) {
  return gc1CallHook("gc1WiresOnPlayerDamagingMeshEntity", [
    playerId,
    damagedId,
    damageDealt,
    withItem,
  ]);
};

onPlayerBreakMeshEntity = function (playerId, entityId) {
  return gc1CallHook("gc1WiresOnPlayerBreakMeshEntity", [playerId, entityId]);
};

onPlayerAttemptOpenChest = function (
  playerId,
  x,
  y,
  z,
  isMoonstoneChest,
  isIronChest,
) {
  return gc1CallHook("gc1OnPlayerAttemptOpenChest", [
    playerId,
    x,
    y,
    z,
    isMoonstoneChest,
    isIronChest,
  ]);
};

onPlayerOpenedChest = function (
  playerId,
  x,
  y,
  z,
  isMoonstoneChest,
  isIronChest,
) {
  return gc1CallHook("gc1OnPlayerOpenedChest", [
    playerId,
    x,
    y,
    z,
    isMoonstoneChest,
    isIronChest,
  ]);
};

onPlayerChangeBlock = function (
  playerId,
  x,
  y,
  z,
  fromBlock,
  toBlock,
  droppedItem,
  fromBlockInfo,
  toBlockInfo,
) {
  return gc1CallHook("gc1OnPlayerChangeBlock", [
    playerId,
    x,
    y,
    z,
    fromBlock,
    toBlock,
    droppedItem,
    fromBlockInfo,
    toBlockInfo,
  ]);
};

onItemDropCreated = function (itemEId, itemName, itemAmount, x, y, z) {
  return gc1CallHook("gc1OnItemDropCreated", [
    itemEId,
    itemName,
    itemAmount,
    x,
    y,
    z,
  ]);
};

onPlayerDropItem = function (playerId, x, y, z, itemName, itemAmount, fromIdx) {
  return gc1CallHook("gc1OnPlayerDropItem", [
    playerId,
    x,
    y,
    z,
    itemName,
    itemAmount,
    fromIdx,
  ]);
};

onPlayerMoveItemOutOfInventory = function (
  playerId,
  itemName,
  itemAmount,
  fromIdx,
  movementType,
) {
  return gc1CallHook("gc1OnPlayerMoveItemOutOfInventory", [
    playerId,
    itemName,
    itemAmount,
    fromIdx,
    movementType,
  ]);
};

onPlayerMoveInvenItem = function (playerId, i, j) {
  return gc1CallHook("gc1OnPlayerMoveInvenItem", [playerId, i, j]);
};

onPlayerMoveInvenItemWithAmt = function (playerId, i, j, amt) {
  return gc1CallHook("gc1OnPlayerMoveInvenItemWithAmt", [playerId, i, j, amt]);
};

onPlayerMoveItemIntoIdxs = function (
  playerId,
  start,
  end,
  moveIdx,
  itemAmount,
) {
  return gc1CallHook("gc1OnPlayerMoveItemIntoIdxs", [
    playerId,
    start,
    end,
    moveIdx,
    itemAmount,
  ]);
};

onPlayerSwapInvenSlots = function (playerId, i, j) {
  return gc1CallHook("gc1OnPlayerSwapInvenSlots", [playerId, i, j]);
};

onPlayerSelectInventorySlot = function (playerId, slotIndex) {
  return gc1CallHook("gc1OnPlayerSelectInventorySlot", [playerId, slotIndex]);
};
