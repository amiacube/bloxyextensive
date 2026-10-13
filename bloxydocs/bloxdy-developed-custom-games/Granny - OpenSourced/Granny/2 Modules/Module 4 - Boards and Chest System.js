/*
  Granny Open Source - Module 4

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the boards puzzle and iron chest flow are easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 4 - Boards and Chest System */

// this module handles the breakable boards puzzle and the special iron chest puzle
globalThis.gc1BoardsState = Object.assign(
  {
    spawned: false,
    buildPending: false,
    blockCoords: [],
    rows: [],
    promptVisible: {},
    promptMode: {},
    scanIndex: 0,
    axeRectEnabled: {},
    chestRectEnabled: {},
  },
  typeof globalThis.gc1BoardsState === "object" && globalThis.gc1BoardsState
    ? globalThis.gc1BoardsState
    : {},
);
var gc1BoardsState = globalThis.gc1BoardsState;

globalThis.gc1ChestPuzzleState = Object.assign(
  {
    ironChestPos: [27.5, 52.5, 19.5],
    ironChestCode: null,
    ironChestRewardKey: null,
    wireBoardPos: [26.5, 57, 20.5],
    claimed: false,
  },
  typeof globalThis.gc1ChestPuzzleState === "object" &&
    globalThis.gc1ChestPuzzleState
    ? globalThis.gc1ChestPuzzleState
    : {},
);
var gc1ChestPuzzleState = globalThis.gc1ChestPuzzleState;

var GC1_BOARDS_GROUP = "gc1_boards";
var GC1_BOARDS_BUILD_GROUP = "gc1_boards_build";
var GC1_BOARDS_UI_DELAY = 50;
var GC1_BOARDS_LOOP_MS = 220;
var GC1_BOARDS_SCAN_PER_TICK = 2;
var GC1_BOARDS_BUILD_RETRY_MS = 250;
var GC1_BOARDS_CENTER = [22.5, 56.5, 30];
var GC1_BOARDS_FRONT_BLOCK_NAME = "Board|meta|rot3";
var GC1_BOARDS_MAPLE_BLOCK_NAME = "Maple Wood Planks";
var GC1_BOARDS_PROMPT_DIST = 2.8;

// these helper rectangles are the safe puzzle regions
function gc1BoardsAllowedRect() {
  var baseX = Math.floor(GC1_BOARDS_CENTER[0]);
  var baseY = Math.floor(GC1_BOARDS_CENTER[1]);
  var frontZ = Math.floor(GC1_BOARDS_CENTER[2]) - 2;
  return [
    [baseX, baseY, frontZ],
    [baseX, baseY + 1, frontZ],
  ];
}

function gc1IronChestAllowedRect() {
  return [
    [27, 52, 19],
    [27, 52, 19],
  ];
}

// stop work briefly if the runtime is too busy
function gc1BoardsNearInterrupt() {
  return (
    (typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()) ||
    (typeof api.isNearInterrupt === "function" && api.isNearInterrupt())
  );
}

function gc1BoardsCoordKey(x, y, z) {
  return Math.floor(x) + "," + Math.floor(y) + "," + Math.floor(z);
}

function gc1BoardsUiGroup(playerId, suffix) {
  return "gc1_boards_ui_" + playerId + "_" + suffix;
}

function gc1BoardsQueueUi(playerId, suffix, fn) {
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
      gc1BoardsUiGroup(playerId, suffix),
      run,
      GC1_BOARDS_UI_DELAY,
    );
  run();
  return null;
}

function gc1BoardsGetPlayerIds() {
  if (typeof GC !== "undefined" && GC && typeof GC.getPlayerIds === "function")
    return GC.getPlayerIds();
  try {
    return api.getPlayerIds() || [];
  } catch (e) {}
  return [];
}

function gc1BoardsGetFacing(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getFacing === "function")
    return GC.getFacing(playerId);
  try {
    return api.getPlayerFacingInfo(playerId);
  } catch (e) {}
  return null;
}

function gc1BoardsGetPos(playerId) {
  if (typeof GC !== "undefined" && GC && typeof GC.getPos === "function")
    return GC.getPos(playerId);
  try {
    return api.getPosition(playerId);
  } catch (e) {}
  return null;
}

function gc1BoardsHasAxe(playerId) {
  var heldItem = null;
  try {
    heldItem = api.getHeldItem(playerId);
  } catch (e) {}
  return !!(
    heldItem &&
    heldItem.name &&
    String(heldItem.name).toLowerCase() === "iron axe"
  );
}

// lock the board area so the axe does not interact with the wrong blocks
function gc1BoardsDisableAxeRect(playerId) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    gc1BoardsState.axeRectEnabled[playerId] !== true
  )
    return false;
  var rect = gc1BoardsAllowedRect();
  try {
    api.resetCanChangeBlockRect(playerId, rect[0], rect[1]);
  } catch (e) {}
  delete gc1BoardsState.axeRectEnabled[playerId];
  return true;
}

// restore axe interaction after the puzzle is done
function gc1BoardsEnableAxeRect(playerId) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    gc1BoardsState.axeRectEnabled[playerId] === true
  )
    return false;
  var rect = gc1BoardsAllowedRect();
  try {
    api.setCanChangeBlockRect(playerId, rect[0], rect[1]);
  } catch (e) {}
  gc1BoardsState.axeRectEnabled[playerId] = true;
  return true;
}

// disable the chest area while we are rebuilding it
function gc1BoardsDisableChestRect(playerId) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    gc1BoardsState.chestRectEnabled[playerId] !== true
  )
    return false;
  var rect = gc1IronChestAllowedRect();
  try {
    api.resetCanChangeBlockRect(playerId, rect[0], rect[1]);
  } catch (e) {}
  delete gc1BoardsState.chestRectEnabled[playerId];
  return true;
}

// restore chest interaction after the setup is complete
function gc1BoardsEnableChestRect(playerId) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    gc1BoardsState.chestRectEnabled[playerId] === true
  )
    return false;
  var rect = gc1IronChestAllowedRect();
  try {
    api.setCanChangeBlockRect(playerId, rect[0], rect[1]);
  } catch (e) {}
  gc1BoardsState.chestRectEnabled[playerId] = true;
  return true;
}

// clear both protection zones for one player
function gc1BoardsClearProtection(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  gc1BoardsDisableAxeRect(playerId);
  gc1BoardsDisableChestRect(playerId);
  return true;
}

// refresh the safe zones for one player
function gc1BoardsRefreshProtectionForPlayer(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  if (
    typeof globalThis.gc1PuzzleItemInventoryLockActive === "function" &&
    !globalThis.gc1PuzzleItemInventoryLockActive(playerId)
  ) {
    gc1BoardsClearProtection(playerId);
    return false;
  }
  if (gc1BoardsHasAxe(playerId)) gc1BoardsEnableAxeRect(playerId);
  else gc1BoardsDisableAxeRect(playerId);
  gc1BoardsEnableChestRect(playerId);
  return true;
}

// play the little sound cue that marks a board or chest action
function gc1BoardsSignalSound(pos) {
  if (!pos) return false;
  try {
    api.broadcastSound("wood3", 1, 0.8, {
      playerIdOrPos: pos,
      maxHearDist: 24,
      refDistance: 4,
    });
  } catch (e) {}
  try {
    api.broadcastSound("bullet_shell_bounce_general_07", 0.55, 0.9, {
      playerIdOrPos: pos,
      maxHearDist: 24,
      refDistance: 4,
    });
  } catch (e) {}
  try {
    if (typeof globalThis.gc1SignalGrannyAlert === "function")
      return !!globalThis.gc1SignalGrannyAlert([pos[0], pos[1], pos[2]], {
        alertKind: "sound",
      });
  } catch (e) {}
  return false;
}

// clear the board prompt
function gc1BoardsClearPrompt(playerId) {
  if (!playerId || gc1BoardsState.promptVisible[playerId] !== true) return;
  gc1BoardsState.promptVisible[playerId] = false;
  gc1BoardsState.promptMode[playerId] = null;
  gc1BoardsQueueUi(playerId, "lower", function () {
    api.setClientOptionToDefault(playerId, "middleTextLower");
  });
}

// show either board or chest prompt text
function gc1BoardsSetPrompt(playerId, mode) {
  if (!playerId || !mode) return;
  if (
    gc1BoardsState.promptVisible[playerId] === true &&
    gc1BoardsState.promptMode[playerId] === mode
  )
    return;
  gc1BoardsState.promptVisible[playerId] = true;
  gc1BoardsState.promptMode[playerId] = mode;
  var text =
    mode === "board_tool"
      ? "i can break these boards with an axe."
      : "i need an axe.";
  gc1BoardsQueueUi(playerId, "lower", function () {
    api.setClientOption(playerId, "middleTextLower", text);
  });
}

function gc1BoardsClearAllPrompts() {
  var ids = Object.keys(gc1BoardsState.promptVisible || {});
  for (var i = 0; i < ids.length; i++) gc1BoardsClearPrompt(ids[i]);
  gc1BoardsState.promptVisible = {};
  gc1BoardsState.promptMode = {};
}

// remove all existing board props before rebuilding
function gc1BoardsDeleteAll() {
  for (var i = 0; i < gc1BoardsState.blockCoords.length; i++) {
    var coord = gc1BoardsState.blockCoords[i];
    if (!coord) continue;
    try {
      api.setBlock(coord[0], coord[1], coord[2], "Air");
    } catch (e) {}
  }
  gc1BoardsState.blockCoords = [];
  gc1BoardsState.rows = [];
  gc1BoardsState.promptVisible = {};
  gc1BoardsState.promptMode = {};
  gc1BoardsState.scanIndex = 0;
  gc1BoardsState.spawned = false;
  gc1BoardsState.buildPending = false;
  gc1BoardsClearAllPrompts();
  var playerIds = gc1BoardsGetPlayerIds();
  for (var p = 0; p < playerIds.length; p++)
    gc1BoardsClearProtection(playerIds[p]);
  gc1BoardsState.axeRectEnabled = {};
  gc1BoardsState.chestRectEnabled = {};
}

// remove one board coordinate from the remaining list
function gc1BoardsRemoveCoord(coord) {
  var key = gc1BoardsCoordKey(coord[0], coord[1], coord[2]);
  gc1BoardsState.blockCoords = gc1BoardsState.blockCoords.filter(
    function (entry) {
      return !!(
        entry && gc1BoardsCoordKey(entry[0], entry[1], entry[2]) !== key
      );
    },
  );
}

// check whether any puzzle rows are left
function gc1BoardsHasRemainingRows() {
  for (var i = 0; i < gc1BoardsState.rows.length; i++) {
    var row = gc1BoardsState.rows[i];
    if (row && !row.removed) return true;
  }
  return false;
}

// build the breakable board rows in chunks
function gc1BoardsBuildRows() {
  var baseX = Math.floor(GC1_BOARDS_CENTER[0]);
  var baseY = Math.floor(GC1_BOARDS_CENTER[1]);
  var mapleZ = Math.floor(GC1_BOARDS_CENTER[2]) - 1;
  var frontZ = Math.floor(GC1_BOARDS_CENTER[2]) - 2;
  gc1BoardsState.rows = [];
  for (var dy = 0; dy < 2; dy++) {
    if (gc1BoardsNearInterrupt()) return false;
    var row = {
      front: [baseX, baseY + dy, frontZ],
      maple: [baseX, baseY + dy, mapleZ],
      removed: false,
    };
    try {
      api.setBlock(
        row.maple[0],
        row.maple[1],
        row.maple[2],
        GC1_BOARDS_MAPLE_BLOCK_NAME,
      );
    } catch (e) {}
    try {
      api.setBlock(
        row.front[0],
        row.front[1],
        row.front[2],
        GC1_BOARDS_FRONT_BLOCK_NAME,
      );
    } catch (e) {}
    gc1BoardsState.blockCoords.push(row.maple.slice());
    gc1BoardsState.blockCoords.push(row.front.slice());
    gc1BoardsState.rows.push(row);
  }
  return true;
}

// place the board props right now if the room is ready
function gc1BoardsPlaceNow() {
  gc1BoardsDeleteAll();
  if (!gc1BoardsBuildRows()) return false;
  gc1BoardsState.spawned = gc1BoardsState.rows.length === 2;
  gc1BoardsState.buildPending = false;
  return gc1BoardsState.spawned;
}

// find the board row that matches a world coordinate
function gc1BoardsFindRowByCoord(x, y, z) {
  var key = gc1BoardsCoordKey(x, y, z);
  for (var i = 0; i < gc1BoardsState.rows.length; i++) {
    var row = gc1BoardsState.rows[i];
    if (!row || row.removed) continue;
    if (gc1BoardsCoordKey(row.front[0], row.front[1], row.front[2]) === key)
      return row;
    if (gc1BoardsCoordKey(row.maple[0], row.maple[1], row.maple[2]) === key)
      return row;
  }
  return null;
}

// line of sight check for the board puzzle
function gc1BoardsIsSightBlocked(origin, target, ignoreTailDist) {
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

// find the row the player is looking at
function gc1BoardsGetFocusedRow(playerId) {
  if (!gc1BoardsState.spawned || !gc1BoardsHasRemainingRows()) return null;
  var facing = gc1BoardsGetFacing(playerId);
  if (!facing || !Array.isArray(facing.dir)) return null;
  var origin = Array.isArray(facing.camPos)
    ? facing.camPos
    : gc1BoardsGetPos(playerId);
  if (!origin) return null;
  var tx = Math.floor(GC1_BOARDS_CENTER[0]) + 0.5;
  var ty = Math.floor(GC1_BOARDS_CENTER[1]) + 1;
  var tz = Math.floor(GC1_BOARDS_CENTER[2]) - 1.5;
  var dx = tx - origin[0],
    dy = ty - origin[1],
    dz = tz - origin[2];
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > GC1_BOARDS_PROMPT_DIST) return null;
  if (gc1BoardsIsSightBlocked(origin, [tx, ty, tz], 0.85)) return null;
  var len = dist || 1;
  var dot =
    (dx / len) * facing.dir[0] +
    (dy / len) * facing.dir[1] +
    (dz / len) * facing.dir[2];
  if (dot < 0.74) return null;
  for (var i = 0; i < gc1BoardsState.rows.length; i++) {
    var row = gc1BoardsState.rows[i];
    if (row && !row.removed) return row;
  }
  return null;
}

// break one board row and update the puzzle state
function gc1BoardsBreakRow(row, playerId) {
  if (!row || row.removed || gc1BoardsNearInterrupt()) return false;
  row.removed = true;
  try {
    api.setBlock(row.front[0], row.front[1], row.front[2], "Air");
  } catch (e) {}
  try {
    api.setBlock(row.maple[0], row.maple[1], row.maple[2], "Air");
  } catch (e) {}
  gc1BoardsRemoveCoord(row.front);
  gc1BoardsRemoveCoord(row.maple);
  var soundPos = [row.front[0] + 0.5, row.front[1] + 0.5, row.front[2] + 0.5];
  gc1BoardsSignalSound(soundPos);
  try {
    api.playParticleEffect({
      texture: "square_particle",
      pos1: [soundPos[0] - 0.18, soundPos[1] - 0.18, soundPos[2] - 0.18],
      pos2: [soundPos[0] + 0.18, soundPos[1] + 0.18, soundPos[2] + 0.18],
      dir1: [-0.8, 0.2, -0.8],
      dir2: [0.8, 1.1, 0.8],
      minLifeTime: 0.14,
      maxLifeTime: 0.3,
      minEmitPower: 0.25,
      maxEmitPower: 1,
      minSize: 0.04,
      maxSize: 0.12,
      manualEmitCount: 18,
      gravity: [0, -3.5, 0],
      blendMode: 1,
      colorGradients: [
        {
          timeFraction: 0,
          minColor: [146, 110, 73, 0.95],
          maxColor: [168, 130, 86, 0.95],
        },
        {
          timeFraction: 0.55,
          minColor: [120, 90, 60, 0.48],
          maxColor: [136, 104, 69, 0.48],
        },
        {
          timeFraction: 1,
          minColor: [90, 66, 43, 0],
          maxColor: [98, 74, 48, 0],
        },
      ],
    });
  } catch (e) {}
  if (!gc1BoardsHasRemainingRows()) gc1BoardsClearAllPrompts();
  return true;
}

// refresh board prompts for nearby players
function gc1BoardsUpdatePrompts() {
  if (!gc1BoardsState.spawned || !gc1BoardsHasRemainingRows()) {
    var ids = gc1BoardsGetPlayerIds();
    for (var j = 0; j < ids.length; j++) {
      gc1BoardsRefreshProtectionForPlayer(ids[j]);
      gc1BoardsClearPrompt(ids[j]);
    }
    return;
  }
  var ids = gc1BoardsGetPlayerIds();
  if (!ids.length) return;
  for (var r = 0; r < ids.length; r++) {
    if (gc1BoardsNearInterrupt()) return;
    gc1BoardsRefreshProtectionForPlayer(ids[r]);
  }
  var total = ids.length,
    start = gc1BoardsState.scanIndex || 0;
  if (start >= total) start = 0;
  var end = Math.min(start + GC1_BOARDS_SCAN_PER_TICK, total);
  for (var i = start; i < end; i++) {
    if (gc1BoardsNearInterrupt()) return;
    var playerId = ids[i];
    var row = gc1BoardsGetFocusedRow(playerId);
    if (!row) {
      gc1BoardsClearPrompt(playerId);
      continue;
    }
    gc1BoardsSetPrompt(
      playerId,
      gc1BoardsHasAxe(playerId) ? "board_tool" : "board_hint",
    );
  }
  gc1BoardsState.scanIndex = end >= total ? 0 : end;
}

// main board puzzle heartbeat
function gc1BoardsLoop() {
  if (
    typeof TS === "undefined" ||
    !TS ||
    typeof TS.run !== "function" ||
    !gc1BoardsState.spawned
  )
    return;
  TS.run(
    function () {
      if (gc1BoardsNearInterrupt()) {
        gc1BoardsLoop();
        return;
      }
      gc1BoardsUpdatePrompts();
      if (gc1BoardsState.spawned) gc1BoardsLoop();
    },
    GC1_BOARDS_LOOP_MS,
    GC1_BOARDS_GROUP,
  );
}

// build the room in chunks so the rest of the game stays smooth
function gc1BoardsBuildStep(step) {
  if (gc1BoardsNearInterrupt()) {
    TS.run(
      function () {
        gc1BoardsBuildStep(step);
      },
      GC1_BOARDS_BUILD_RETRY_MS,
      GC1_BOARDS_BUILD_GROUP,
    );
    return true;
  }
  if (step === 0) {
    gc1BoardsDeleteAll();
    gc1BoardsState.buildPending = true;
    TS.run(
      function () {
        gc1BoardsBuildStep(1);
      },
      80,
      GC1_BOARDS_BUILD_GROUP,
    );
    return true;
  }
  var ready = gc1BoardsPlaceNow();
  if (ready) gc1BoardsLoop();
  return ready;
}

// public start entry point
function gc1BoardsStart() {
  if (gc1BoardsState.spawned) return true;
  if (gc1BoardsState.buildPending) return true;
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    return gc1BoardsPlaceNow();
  }
  TS.stop(GC1_BOARDS_GROUP);
  TS.stop(GC1_BOARDS_BUILD_GROUP);
  gc1BoardsState.buildPending = true;
  TS.run(
    function () {
      gc1BoardsBuildStep(0);
    },
    80,
    GC1_BOARDS_BUILD_GROUP,
  );
  return true;
}

// stop the board system cleanly
function gc1BoardsStop() {
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function") {
    TS.stop(GC1_BOARDS_GROUP);
    TS.stop(GC1_BOARDS_BUILD_GROUP);
  }
  gc1BoardsDeleteAll();
  return true;
}

// where the iron chest sits in the room
function gc1IronChestPos() {
  return gc1ChestPuzzleState.ironChestPos.slice();
}

// check if a world position is the iron chest
function gc1IronChestMatches(x, y, z) {
  var pos = gc1ChestPuzzleState.ironChestPos;
  return (
    Math.abs(x - pos[0]) < 1.01 &&
    Math.abs(y - pos[1]) < 1.01 &&
    Math.abs(z - pos[2]) < 1.01
  );
}

// make the little chest code used for the reward flow
function gc1GenerateIronChestCode() {
  gc1ChestPuzzleState.ironChestCode = String(
    1000 + Math.floor(Math.random() * 9000),
  );
  return gc1ChestPuzzleState.ironChestCode;
}

// pick a reward item for the chest
function gc1ChooseIronChestReward() {
  var defs = Array.isArray(globalThis.GC1_PUZZLE_ITEM_DEFS)
    ? globalThis.GC1_PUZZLE_ITEM_DEFS
    : null;
  var choices = defs
    ? defs.filter(function (def) {
        return !!(def && def.key !== "jump_pad" && def.key !== "vase");
      })
    : null;
  if (!choices || !choices.length) {
    gc1ChestPuzzleState.ironChestRewardKey = "axe";
    return {
      key: "axe",
      itemName: "Iron Axe",
      label: "Axe",
      attributes: { customDisplayName: "Axe" },
    };
  }
  var picked = choices[Math.floor(Math.random() * choices.length)];
  gc1ChestPuzzleState.ironChestRewardKey = picked.key;
  return picked;
}

// return the cached reward or make a new one
function gc1GetIronChestReward() {
  var defs = Array.isArray(globalThis.GC1_PUZZLE_ITEM_DEFS)
    ? globalThis.GC1_PUZZLE_ITEM_DEFS
    : null;
  if (defs && gc1ChestPuzzleState.ironChestRewardKey) {
    for (var i = 0; i < defs.length; i++) {
      var def = defs[i];
      if (def && def.key === gc1ChestPuzzleState.ironChestRewardKey) return def;
    }
  }
  return gc1ChooseIronChestReward();
}

// make sure the chest reward is ready before players open it
function gc1EnsureIronChestLoot() {
  var chestPos = gc1IronChestPos();
  var rewardDef = gc1GetIronChestReward();
  var attrs =
    rewardDef && rewardDef.attributes ? rewardDef.attributes : undefined;
  try {
    api.setBlockData(chestPos[0], chestPos[1], chestPos[2], {
      persisted: { passkey: gc1ChestPuzzleState.ironChestCode },
    });
    api.setStandardChestItemSlot(
      chestPos,
      0,
      rewardDef.itemName,
      1,
      undefined,
      attrs,
    );
    var existing = api.getStandardChestItemSlot(chestPos, 0);
    if (!existing || existing.name !== rewardDef.itemName)
      api.setStandardChestItemSlot(
        chestPos,
        0,
        rewardDef.itemName,
        1,
        undefined,
        attrs,
      );
    return true;
  } catch (e) {}
  return false;
}

globalThis.gc1BeforePuzzleItemSpawnAll = function () {
  gc1GenerateIronChestCode();
  gc1ChestPuzzleState.ironChestRewardKey = null;
  gc1ChestPuzzleState.claimed = false;
  gc1EnsureIronChestLoot();
  return true;
};

globalThis.gc1GetPuzzleSpawnDefs = function (defs) {
  if (!Array.isArray(defs)) return [];
  return defs.filter(function (def) {
    return !!(def && def.key !== gc1ChestPuzzleState.ironChestRewardKey);
  });
};

globalThis.gc1GetPuzzleItemAttributes = function (defOrRecord) {
  if (!defOrRecord) return undefined;
  var key = defOrRecord.key || null;
  if (key === "jump_pad") {
    if (!gc1ChestPuzzleState.ironChestCode) gc1GenerateIronChestCode();
    return {
      customDisplayName: gc1ChestPuzzleState.ironChestCode,
      customDescription: "Iron Chest code",
      customAttributes: {
        gc1IronChestCode: gc1ChestPuzzleState.ironChestCode,
        gc1IronChestClue: true,
      },
    };
  }
  return defOrRecord.attributes;
};

globalThis.gc1OnPlayerAttemptOpenChest = function (
  playerId,
  x,
  y,
  z,
  isMoonstoneChest,
  isIronChest,
) {
  if (!isIronChest || !gc1IronChestMatches(x, y, z)) return;
  gc1EnsureIronChestLoot();
  return;
};

globalThis.gc1OnPlayerOpenedChest = function (
  playerId,
  x,
  y,
  z,
  isMoonstoneChest,
  isIronChest,
) {
  if (
    !playerId ||
    !isIronChest ||
    !gc1IronChestMatches(x, y, z) ||
    gc1ChestPuzzleState.claimed
  )
    return;
  var chestPos = gc1IronChestPos();
  var reward = null;
  try {
    reward = api.getStandardChestItemSlot(chestPos, 0);
  } catch (e) {}
  if (!reward || !reward.name || String(reward.name) === "Air") return;
  gc1ChestPuzzleState.claimed = true;
  try {
    if (typeof globalThis.gc1PuzzleItemDropHeld === "function")
      globalThis.gc1PuzzleItemDropHeld(playerId);
  } catch (e) {}
  try {
    if (typeof globalThis.gc1PuzzleItemClearInventory === "function")
      globalThis.gc1PuzzleItemClearInventory(playerId);
  } catch (e) {}
  try {
    api.setItemSlot(
      playerId,
      0,
      reward.name,
      reward.amount || 1,
      reward.attributes,
    );
  } catch (e) {
    try {
      api.giveItem(
        playerId,
        reward.name,
        reward.amount || 1,
        reward.attributes,
      );
    } catch (_e) {}
  }
  try {
    api.setSelectedInventorySlotI(playerId, 0);
  } catch (e) {}
  try {
    api.setStandardChestItemSlot(chestPos, 0, "Air", 0);
  } catch (e) {}
  if (typeof globalThis.gc1PuzzleItemForceSlot0 === "function")
    try {
      globalThis.gc1PuzzleItemForceSlot0(playerId, 0);
    } catch (e) {}
  return true;
};

globalThis.gc1OnPlayerChangeBlock = function (
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
  gc1BoardsRefreshProtectionForPlayer(playerId);
  if (gc1IronChestMatches(x, y, z)) {
    if (toBlock === "Air") return "preventChange";
    return;
  }
  if (!gc1BoardsState.spawned) return;
  var row = gc1BoardsFindRowByCoord(x, y, z);
  if (!row) return;
  if (toBlock !== "Air") return "preventChange";
  if (playerId && gc1BoardsHasAxe(playerId)) {
    gc1BoardsBreakRow(row, playerId);
    return "preventChange";
  }
  return "preventChange";
};

globalThis.gc1BoardsStart = gc1BoardsStart;
globalThis.gc1BoardsStop = gc1BoardsStop;
globalThis.gc1IsIronChestTarget = gc1IronChestMatches;
globalThis.gc1BoardsRefreshProtectionForPlayer =
  gc1BoardsRefreshProtectionForPlayer;
