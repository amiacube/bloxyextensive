/*
  Granny Open Source - System 10

  this system was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the item prompt and inventory lock logic is easier to follow
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* System 10 - Puzzle Item Runtime */

// this file keeps the puzzle item prompts, pickup rules, and inventory lock logic in one place
var gc1PuzzleItemState = globalThis.gc1PuzzleItemState;
var GC1_PUZZLE_ITEM_PROMPT_GROUP = globalThis.GC1_PUZZLE_ITEM_PROMPT_GROUP;
var GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY =
  globalThis.GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY;
var GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY =
  globalThis.GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY;
var GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ =
  globalThis.GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ;
var GC1_PUZZLE_ITEM_SLOT_LOCK_GROUP = "gc1_puzzle_slot_lock";
globalThis.gc1PuzzleInventoryLockState =
  globalThis.gc1PuzzleInventoryLockState || { activeByPlayer: {} };
var gc1PuzzleInventoryLockState = globalThis.gc1PuzzleInventoryLockState;
globalThis.gc1PuzzleNativeDropBlockState =
  globalThis.gc1PuzzleNativeDropBlockState || {};
var gc1PuzzleNativeDropBlockState = globalThis.gc1PuzzleNativeDropBlockState;

// check if a player is currently locked into the puzzle item inventory rules
function gc1PuzzleItemInventoryLockActive(playerId) {
  return !!(
    playerId &&
    gc1PuzzleInventoryLockState.activeByPlayer &&
    gc1PuzzleInventoryLockState.activeByPlayer[playerId]
  );
}

// if a player is locked, keep slot 0 valid and clear the other slots
function gc1PuzzleItemNormalizeLockedInventory(playerId) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    !gc1PuzzleItemInventoryLockActive(playerId)
  )
    return false;
  var slot0 = null;
  try {
    slot0 = api.getItemSlot(playerId, 0);
  } catch (e) {}
  if (slot0 && slot0.name && slot0.name !== "Air") {
    var def = gc1PuzzleItemGetDefByItemName(slot0.name);
    if (def) {
      var attrs =
        slot0.attributes ||
        slot0.metadata ||
        (typeof globalThis.gc1GetPuzzleItemAttributes === "function"
          ? globalThis.gc1GetPuzzleItemAttributes(def)
          : def.attributes);
      try {
        api.setItemSlot(playerId, 0, slot0.name, 1, attrs);
      } catch (e) {}
    }
  }
  for (var i = 1; i < 10; i++) {
    try {
      var slot = api.getItemSlot(playerId, i);
      if (slot && slot.name && slot.name !== "Air")
        api.setItemSlot(playerId, i, "Air", 0);
    } catch (e) {}
  }
  return true;
}

// turn on the inventory lock and optionally wipe the inventory first
function gc1PuzzleItemApplyInventoryLock(playerId, clearFirst) {
  if (!playerId || !api.checkValid(playerId)) return false;
  gc1PuzzleInventoryLockState.activeByPlayer[playerId] = true;
  if (clearFirst) {
    if (typeof globalThis.gc1ClearPlayerInventoryHard === "function")
      globalThis.gc1ClearPlayerInventoryHard(playerId);
    else if (typeof globalThis.gc1PuzzleItemClearInventory === "function")
      globalThis.gc1PuzzleItemClearInventory(playerId);
    else if (typeof gc1PuzzleItemClearInventory === "function")
      gc1PuzzleItemClearInventory(playerId);
  }
  try {
    if (typeof api.setClientOptions === "function")
      api.setClientOptions(playerId, { inventoryItemsMoveable: false });
    else api.setClientOption(playerId, "inventoryItemsMoveable", false);
  } catch (e) {}
  try {
    api.setSelectedInventorySlotI(playerId, 0);
  } catch (e) {}
  return true;
}

// turn the lock back off so normal inventory use returns
function gc1PuzzleItemReleaseInventoryLock(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  delete gc1PuzzleInventoryLockState.activeByPlayer[playerId];
  try {
    if (typeof api.setClientOptionToDefault === "function")
      api.setClientOptionToDefault(playerId, "inventoryItemsMoveable");
    else if (typeof api.setClientOption === "function")
      api.setClientOption(playerId, "inventoryItemsMoveable", true);
  } catch (e) {}
  return true;
}

// keep the important item in slot 0 even if the player tries to move away from it
function gc1PuzzleItemForceSlot0(playerId, delayMs) {
  if (
    !playerId ||
    !api.checkValid(playerId) ||
    !gc1PuzzleItemInventoryLockActive(playerId)
  )
    return false;
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        if (!api.checkValid(playerId)) return;
        gc1PuzzleItemNormalizeLockedInventory(playerId);
        try {
          api.setSelectedInventorySlotI(playerId, 0);
        } catch (e) {}
      },
      typeof delayMs === "number" ? delayMs : 0,
      GC1_PUZZLE_ITEM_SLOT_LOCK_GROUP + "_" + playerId,
    );
    return true;
  }
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  try {
    api.setSelectedInventorySlotI(playerId, 0);
  } catch (e) {}
  return true;
}

// queue the prompt loop again after a short delay
function gc1PuzzleItemScheduleLoop(delayMs) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") return;
  if (
    gc1PuzzleItemState.promptLoopTaskId &&
    typeof TS.isTaskActive === "function" &&
    TS.isTaskActive(gc1PuzzleItemState.promptLoopTaskId)
  )
    return;
  delayMs =
    typeof delayMs === "number" ? delayMs : GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY;
  var warmRemaining = (gc1PuzzleItemState.promptWarmUntil || 0) - Date.now();
  if (warmRemaining > delayMs) delayMs = warmRemaining;
  if (gc1PuzzleItemState.spawnRecords.length > 0)
    gc1PuzzleItemState.promptLoopTaskId = TS.run(
      gc1PuzzleItemTick,
      delayMs,
      GC1_PUZZLE_ITEM_PROMPT_GROUP,
    );
}

globalThis.gc1PuzzleItemScheduleLoop = gc1PuzzleItemScheduleLoop;

var GC1_PUZZLE_ITEM_PLAYERS_PER_TICK = 1;
// this is the main prompt scan
// it checks held items, nearby records, and whether the player should see a prompt
function gc1PuzzleItemTick() {
  if (gc1PuzzleItemNearInterrupt()) {
    gc1PuzzleItemScheduleLoop(GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY);
    return;
  }
  gc1PuzzleItemState.promptLoopTaskId = null;
  var ids = [];
  try {
    ids = api.getPlayerIds() || [];
  } catch (e) {}
  if (!ids.length) {
    gc1PuzzleItemScheduleLoop(GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY);
    return;
  }
  if ((gc1PuzzleItemState.promptWarmUntil || 0) > Date.now()) {
    gc1PuzzleItemScheduleLoop(GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY);
    return;
  }
  var startI = gc1PuzzleItemState.promptPlayerIndex || 0;
  if (startI >= ids.length) startI = 0;
  var endI = Math.min(startI + GC1_PUZZLE_ITEM_PLAYERS_PER_TICK, ids.length);
  gc1PuzzleItemState.promptPlayerIndex = endI;
  var anyVisible = false;
  var anyHeld = false;
  for (var pi = startI; pi < endI; pi++) {
    if (gc1PuzzleItemNearInterrupt()) {
      gc1PuzzleItemScheduleLoop(GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY);
      return;
    }
    var pId = ids[pi];
    var held = null;
    try {
      held = api.getHeldItem(pId);
    } catch (e) {}
    var heldDef = held ? gc1PuzzleItemGetDefFromItem(held) : null;
    if (heldDef) {
      anyHeld = true;
      gc1PuzzleItemSetCarryHint(
        pId,
        held.attributes && held.attributes.customDisplayName
          ? held.attributes.customDisplayName
          : heldDef.label || heldDef.itemName,
      );
      gc1PuzzleItemForceSlot0(pId, 0);
      gc1PuzzleItemClearPrompt(pId);
      continue;
    }
    gc1PuzzleItemClearCarryHint(pId);
    var pos = gc1PuzzleItemCachedPos(pId);
    if (
      !pos ||
      !gc1PuzzleItemHasNearbyRecord(pos, GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ)
    ) {
      gc1PuzzleItemClearPrompt(pId);
      continue;
    }
    var facing = gc1PuzzleItemCachedFacing(pId);
    var facingDir = facing ? facing.dir : null;
    var origin = Array.isArray(facing && facing.camPos) ? facing.camPos : pos;
    var focus =
      origin && facingDir
        ? gc1PuzzleItemGetFocusRecordCached(pId, origin, facingDir, null)
        : null;
    if (focus) {
      anyVisible = true;
      gc1PuzzleItemSetPrompt(
        pId,
        focus.label || gc1PuzzleItemGetLabel(focus.itemName),
      );
    } else {
      gc1PuzzleItemClearPrompt(pId);
    }
  }
  if (gc1PuzzleItemState.promptPlayerIndex >= ids.length)
    gc1PuzzleItemState.promptPlayerIndex = 0;
  gc1PuzzleItemScheduleLoop(
    anyVisible || anyHeld
      ? GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY
      : GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY,
  );
}

// when the player touches a puzzle item, try to give it to them cleanly
function gc1PuzzleItemPickup(playerId, targetEId) {
  if (gc1PuzzleItemNearInterrupt()) return false;
  var record = gc1PuzzleItemFindRecord(targetEId, playerId);
  if (!record) return false;
  var slot0 = null;
  try {
    slot0 = api.getItemSlot(playerId, 0);
  } catch (e) {}
  if (slot0 && slot0.name && slot0.name !== "Air") {
    try {
      api.sendMessage(playerId, "slot 1 full.", { color: "#ffd166" });
    } catch (e) {}
    return false;
  }
  var attrs =
    record.attrs ||
    (typeof globalThis.gc1GetPuzzleItemAttributes === "function"
      ? globalThis.gc1GetPuzzleItemAttributes(record)
      : record && record.label
        ? { customDisplayName: record.label }
        : undefined);
  var added = 0;
  try {
    added = api.giveItem(playerId, record.itemName, 1, attrs);
  } catch (e) {}
  if (!added) {
    try {
      api.setItemSlot(playerId, 0, record.itemName, 1, attrs);
      added = 1;
    } catch (e) {
      return false;
    }
  }
  gc1PuzzleItemForceSlot0(playerId, 0);
  gc1PuzzleItemRemoveRecord(record);
  return true;
}

// find the item definition for a specific item name
function gc1PuzzleItemGetDefByItemName(itemName) {
  var defs = Array.isArray(globalThis.GC1_PUZZLE_ITEM_DEFS)
    ? globalThis.GC1_PUZZLE_ITEM_DEFS
    : null;
  if (!defs || !itemName) return null;
  for (var i = 0; i < defs.length; i++) {
    var def = defs[i];
    if (def && String(def.itemName || "") === String(itemName)) return def;
  }
  return null;
}

// remove a native drop if the game spawned one in the same spot
function gc1PuzzleItemDeleteNearbyNativeDrop(x, y, z, itemName) {
  if (
    typeof api.getEntitiesInRect !== "function" ||
    typeof api.deleteItemDrop !== "function" ||
    typeof api.getItemDropName !== "function"
  )
    return false;
  var min = [x - 1.25, y - 1.25, z - 1.25];
  var max = [x + 1.25, y + 1.25, z + 1.25];
  var ids = [];
  var removed = false;
  try {
    ids = api.getEntitiesInRect(min, max) || [];
  } catch (e) {}
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i],
      name = "";
    try {
      name = api.getItemDropName(id) || "";
    } catch (e) {
      continue;
    }
    if (itemName && String(name) !== String(itemName)) continue;
    try {
      api.deleteItemDrop(id);
      removed = true;
    } catch (e) {}
  }
  return removed;
}

// if a drop got blocked, try to put the item back into the player's hand
function gc1PuzzleItemRestoreDroppedItem(playerId, itemName, itemAmount) {
  if (!playerId || !itemName || !api.checkValid(playerId)) return false;
  var def = gc1PuzzleItemGetDefByItemName(itemName);
  var attrs = def
    ? typeof globalThis.gc1GetPuzzleItemAttributes === "function"
      ? globalThis.gc1GetPuzzleItemAttributes(def)
      : def.attributes
    : undefined;
  try {
    var slot0 = api.getItemSlot(playerId, 0);
    if (!slot0 || !slot0.name || slot0.name === "Air") {
      api.setItemSlot(playerId, 0, itemName, 1, attrs);
      gc1PuzzleItemForceSlot0(playerId, 0);
      return true;
    }
  } catch (e) {}
  return false;
}

// remember a blocked drop so we can clean it up or restore it later
function gc1PuzzleItemRememberBlockedDrop(
  playerId,
  itemName,
  itemAmount,
  x,
  y,
  z,
) {
  gc1PuzzleNativeDropBlockState.last = {
    playerId: playerId || null,
    itemName: itemName || "",
    itemAmount: Number(itemAmount) || 1,
    pos: [Number(x) || 0, Number(y) || 0, Number(z) || 0],
    at: Date.now(),
  };
  return true;
}

// if the item already landed as a drop, delete it and treat the pickup as handled
function gc1PuzzleItemConsumeBlockedDrop(itemEId, itemName, x, y, z) {
  var rec = gc1PuzzleNativeDropBlockState.last;
  if (!rec) return false;
  if (Date.now() - rec.at > 2000) {
    delete gc1PuzzleNativeDropBlockState.last;
    return false;
  }
  if (rec.itemName && itemName && String(rec.itemName) !== String(itemName))
    return false;
  var dx = (Number(x) || 0) - rec.pos[0];
  var dy = (Number(y) || 0) - rec.pos[1];
  var dz = (Number(z) || 0) - rec.pos[2];
  if (dx * dx + dy * dy + dz * dz > 4) return false;
  try {
    if (typeof api.deleteItemDrop === "function") api.deleteItemDrop(itemEId);
  } catch (e) {}
  delete gc1PuzzleNativeDropBlockState.last;
  return true;
}

// one small wrapper for normal pickup plus the blocked-drop fallback path
function gc1PuzzleItemTryDropOrPickup(playerId, targetEId) {
  return gc1PuzzleItemPickup(playerId, targetEId);
}

// some blocks should act like usable puzzle blocks instead of dropping the item
function gc1PuzzleItemBlockLooksInteractable(blockName) {
  var name = String(blockName || "").toLowerCase();
  if (!name || name === "air") return false;
  return (
    name.indexOf("door") >= 0 ||
    name.indexOf("trapdoor") >= 0 ||
    name.indexOf("chest") >= 0
  );
}

// stop the game from doing a weird alt drop when the puzzle item rules want a pickup instead
function gc1PuzzleItemShouldSuppressAltDrop(
  playerId,
  x,
  y,
  z,
  block,
  targetEId,
) {
  if (targetEId) return true;
  if (gc1PuzzleItemBlockLooksInteractable(block)) return true;
  return false;
}

globalThis.gc1StartPuzzleItemSpawns = gc1PuzzleItemSpawnAll;
globalThis.gc1StartPuzzleItemSpawnsQueued = gc1PuzzleItemSpawnAllQueued;
globalThis.gc1StopPuzzleItemSpawns = function () {
  gc1PuzzleItemDeleteAll();
  return true;
};
globalThis.gc1PuzzleItemApplyInventoryLock = gc1PuzzleItemApplyInventoryLock;
globalThis.gc1PuzzleItemReleaseInventoryLock =
  gc1PuzzleItemReleaseInventoryLock;
globalThis.gc1PuzzleItemInventoryLockActive = gc1PuzzleItemInventoryLockActive;
globalThis.gc1PuzzleItemForceSlot0 = gc1PuzzleItemForceSlot0;
globalThis.gc1OnPlayerClick = function (
  playerId,
  wasAltClick,
  x,
  y,
  z,
  block,
  targetEId,
) {
  return gc1PuzzleItemPickup(playerId, targetEId);
};
globalThis.gc1OnPlayerAttemptAltAction = function (
  playerId,
  x,
  y,
  z,
  block,
  targetEId,
) {
  if (gc1PuzzleItemPickup(playerId, targetEId)) return "preventAction";
  if (gc1PuzzleItemShouldSuppressAltDrop(playerId, x, y, z, block, targetEId))
    return false;
  if (gc1PuzzleItemDropHeld(playerId)) return "preventAction";
};
globalThis.gc1OnPlayerAltAction = function (
  playerId,
  x,
  y,
  z,
  block,
  targetEId,
) {};
globalThis.gc1OnTouchscreenActionButton = function (playerId, touchDown) {
  if (touchDown) return false;
  return gc1PuzzleItemDropHeld(playerId) || gc1PuzzleItemPickup(playerId, null);
};
globalThis.gc1OnPlayerDropItem = function (
  playerId,
  x,
  y,
  z,
  itemName,
  itemAmount,
  fromIdx,
) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemRememberBlockedDrop(playerId, itemName, itemAmount, x, y, z);
  gc1PuzzleItemDeleteNearbyNativeDrop(x, y, z, itemName);
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(
      function () {
        if (
          !api.checkValid(playerId) ||
          !gc1PuzzleItemInventoryLockActive(playerId)
        )
          return;
        gc1PuzzleItemRestoreDroppedItem(playerId, itemName, itemAmount);
        gc1PuzzleItemNormalizeLockedInventory(playerId);
        gc1PuzzleItemForceSlot0(playerId, 0);
      },
      120,
      GC1_PUZZLE_ITEM_SLOT_LOCK_GROUP + "_drop_restore_" + playerId,
    );
    TS.run(
      function () {
        if (
          !api.checkValid(playerId) ||
          !gc1PuzzleItemInventoryLockActive(playerId)
        )
          return;
        gc1PuzzleItemRestoreDroppedItem(playerId, itemName, itemAmount);
        gc1PuzzleItemNormalizeLockedInventory(playerId);
        gc1PuzzleItemForceSlot0(playerId, 0);
      },
      360,
      GC1_PUZZLE_ITEM_SLOT_LOCK_GROUP + "_drop_restore_late_" + playerId,
    );
  }
  return "preventAction";
};
globalThis.gc1OnItemDropCreated = function (
  itemEId,
  itemName,
  itemAmount,
  x,
  y,
  z,
) {
  return gc1PuzzleItemConsumeBlockedDrop(itemEId, itemName, x, y, z);
};
globalThis.gc1OnPlayerMoveItemOutOfInventory = function (
  playerId,
  itemName,
  itemAmount,
  fromIdx,
  movementType,
) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  return "preventAction";
};
globalThis.gc1OnPlayerMoveInvenItem = function (playerId, i, j) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  return "preventAction";
};
globalThis.gc1OnPlayerMoveInvenItemWithAmt = function (playerId, i, j, amt) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  return "preventAction";
};
globalThis.gc1OnPlayerMoveItemIntoIdxs = function (
  playerId,
  start,
  end,
  moveIdx,
  itemAmount,
) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  return "preventAction";
};
globalThis.gc1OnPlayerSwapInvenSlots = function (playerId, i, j) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  gc1PuzzleItemForceSlot0(playerId, 0);
  return "preventAction";
};
globalThis.gc1OnPlayerSelectInventorySlot = function (playerId, slotIndex) {
  if (!gc1PuzzleItemInventoryLockActive(playerId)) return;
  gc1PuzzleItemNormalizeLockedInventory(playerId);
  if (slotIndex !== 0) {
    gc1PuzzleItemForceSlot0(playerId, 0);
    return "preventAction";
  }
  return false;
};
