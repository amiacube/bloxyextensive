// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// we added a lot more comments here so it is easier to follow now
// if you try to paste the full file into one code block, it may go over the 32,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// make sure to join bloxdhub.com hehe

/* System 3 - Puzzle Items */

var GC1_PUZZLE_ITEM_GROUP = "gc1_puzzle_items";
var GC1_PUZZLE_ITEM_PROMPT_GROUP = "gc1_puzzle_items_prompt";
var GC1_PUZZLE_ITEM_DROP_GROUP = "gc1_puzzle_items_drop";
var GC1_PUZZLE_ITEM_PICKUP_DIST = 4.5;
var GC1_PUZZLE_ITEM_PICKUP_DOT = 0.85;
var GC1_PUZZLE_ITEM_PROMPT_DIST = 3.5;
var GC1_PUZZLE_ITEM_PICKUP_DIST_SQ =
  GC1_PUZZLE_ITEM_PICKUP_DIST * GC1_PUZZLE_ITEM_PICKUP_DIST;
var GC1_PUZZLE_ITEM_PROMPT_DOT = 0.94;
var GC1_PUZZLE_ITEM_PROMPT_DIST_SQ =
  GC1_PUZZLE_ITEM_PROMPT_DIST * GC1_PUZZLE_ITEM_PROMPT_DIST;
var GC1_PUZZLE_ITEM_PROMPT_DOT_SQ =
  GC1_PUZZLE_ITEM_PROMPT_DOT * GC1_PUZZLE_ITEM_PROMPT_DOT;
var GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY = 500;
var GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY = 1000;
var GC1_PUZZLE_ITEM_PROMPT_WARMUP_MS = 1200;
var GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST = 6;
var GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ =
  GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST * GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST;
var GC1_PUZZLE_ITEM_UI_DELAY = 50;
var GC1_PUZZLE_ITEM_DROP_SIZE_MULT = 0.92;
var GC1_PUZZLE_ITEM_DROP_FLOOR_GROUND_Y = 56;
var GC1_PUZZLE_ITEM_DROP_FLOOR_1_Y = 62;
var GC1_PUZZLE_ITEM_DROP_BASEMENT_Y = 51;
var GC1_PUZZLE_ITEM_DROP_STAIRS_UP_POINTS = [
  [26.0, 57, 25.5],
  [26.0, 58, 24.5],
  [26.0, 59, 23.5],
  [26.0, 60, 22.5],
  [26.0, 61, 21.5],
  [26.0, 62, 20.5],
];
var GC1_PUZZLE_ITEM_DROP_STAIRS_DOWN_POINTS = [
  [17.5, 56, 23.5],
  [17.5, 55, 22.5],
  [17.5, 54, 21.5],
  [17.5, 53, 20.5],
  [17.5, 52, 19.5],
  [17.5, 51, 18.5],
];

// the puzzle item list is the whole loot pool for the run
// each entry says what item spawns, what it looks like, and how the player interacts with it
globalThis.GC1_PUZZLE_ITEM_DEFS = [
  {
    key: "axe",
    itemName: "Iron Axe",
    label: "Axe",
    attributes: { customDisplayName: "Axe" },
    offset: [0, -0.04, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.08, Math.PI * 0.5],
    hitbox: 0.2,
  },
  {
    key: "shears",
    itemName: "Shears",
    label: "Wire Cutters",
    attributes: { customDisplayName: "Wire Cutters" },
    offset: [0, -0.04, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.2, Math.PI * 0.5],
    hitbox: 0.2,
  },
  {
    key: "mace",
    itemName: "Iron Mace",
    label: "Screwdriver",
    attributes: { customDisplayName: "Screwdriver" },
    offset: [0, -0.04, 0],
    rot: [Math.PI * 0.5, Math.PI * 0.12, Math.PI * 0.5],
    hitbox: 0.22,
  },
  {
    key: "jump_pad",
    itemName: "Jump Pad",
    label: "Code",
    offset: [0, -0.04, 0],
    rot: [Math.PI * 0.5, 0, Math.PI * 0.5],
    hitbox: 0.34,
  },
  {
    key: "vase",
    itemName: "Empty Bottle",
    label: "Vase",
    attributes: { customDisplayName: "Vase" },
    fixedPos: [28.5, 63, 7.5],
    offset: [0, 0.14, 0],
    rot: [0, -Math.PI * 0.75, 0],
    dropRot: [Math.PI * 0.5, -Math.PI * 0.75, Math.PI * 0.5],
    hitbox: 0.22,
  },
];

globalThis.GC1_PUZZLE_ITEM_POINTS = [
  { id: 1, pos: [9.5, 57, 17.5] },
  { id: 2, pos: [25.5, 57, 21.5] },
  { id: 3, pos: [36.5, 57, 23.5] },
  { id: 4, pos: [23.5, 56, 12.5] },
  { id: 5, pos: [22.5, 52, 23.5] },
  { id: 6, pos: [23.5, 51, 25.5] },
  { id: 7, pos: [32.5, 62, 22.5] },
  { id: 8, pos: [11.5, 62, 11.5] },
  { id: 9, pos: [4.5, 62, 9.5] },
  { id: 10, pos: [12.5, 63, 24.5] },
];

// this state keeps track of every spawned item and the prompt UI that follows the player around
// the rest of the system reads this object when it needs to know what is on the floor right now
globalThis.gc1PuzzleItemState = Object.assign(
  {
    spawned: false,
    spawnIds: [],
    spawnRecords: [],
    lastResult: null,
    lastDrop: null,
    lastDropSerial: 0,
    promptLoopTaskId: null,
    promptWarmUntil: 0,
    promptVisible: {},
    carryHintVisible: {},
    promptPlayerIndex: 0,
  },
  typeof globalThis.gc1PuzzleItemState === "object" &&
    globalThis.gc1PuzzleItemState
    ? globalThis.gc1PuzzleItemState
    : {},
);
var gc1PuzzleItemState = globalThis.gc1PuzzleItemState;

// these little helpers keep the code from repeating the same tiny object and array jobs everywhere
function gc1PuzzleItemClonePos(pos) {
  return Array.isArray(pos) ? [pos[0], pos[1], pos[2]] : [0, 0, 0];
}

function gc1PuzzleItemShuffle(list) {
  for (var i = list.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}

// interruption checks stay in one helper
function gc1PuzzleItemNearInterrupt() {
  return typeof api.isNearInterrupt === "function" && api.isNearInterrupt();
}

// the loop bridge lets other systems reschedule puzzle work without knowing the internal function names
function gc1PuzzleItemScheduleLoopBridge(delayMs) {
  var scheduleFn = globalThis.gc1PuzzleItemScheduleLoop;
  if (typeof scheduleFn === "function") return scheduleFn(delayMs);
  return null;
}

// defs get cached by item name so the spawn and pickup flow can look things up fast
function gc1PuzzleItemGetDefByName(itemName) {
  if (!itemName) return null;
  var map = globalThis.gc1PuzzleItemDefMap;
  if (!map) {
    map = Object.create(null);
    for (var i = 0; i < globalThis.GC1_PUZZLE_ITEM_DEFS.length; i++) {
      var def = globalThis.GC1_PUZZLE_ITEM_DEFS[i];
      if (def && def.itemName) map[def.itemName] = def;
    }
    globalThis.gc1PuzzleItemDefMap = map;
  }
  return map[itemName] || null;
}

// some worlds override the spawn list, so this gives them one easy hook to plug into
function gc1PuzzleItemGetSpawnDefs() {
  var defs = globalThis.GC1_PUZZLE_ITEM_DEFS.slice();
  if (typeof globalThis.gc1GetPuzzleSpawnDefs === "function") {
    try {
      var nextDefs = globalThis.gc1GetPuzzleSpawnDefs(defs.slice());
      if (Array.isArray(nextDefs) && nextDefs.length) defs = nextDefs;
    } catch (e) {}
  }
  return defs;
}

function gc1PuzzleItemGetDefFromItem(item) {
  return item && item.name ? gc1PuzzleItemGetDefByName(item.name) : null;
}

function gc1PuzzleItemGetLabel(defOrName) {
  if (!defOrName) return "";
  if (typeof defOrName === "string") {
    var def = gc1PuzzleItemGetDefByName(defOrName);
    return def ? def.label || def.itemName : defOrName;
  }
  return defOrName.label || defOrName.itemName || "";
}

function gc1PuzzleItemUiGroup(playerId, suffix) {
  return "gc1_puzzle_item_ui_" + playerId + "_" + suffix;
}

// these cached reads keep the prompt logic from hammering the api over and over
function gc1PuzzleItemCachedFacing(playerId) {
  return typeof GC !== "undefined" && GC && typeof GC.getFacing === "function"
    ? GC.getFacing(playerId)
    : (function () {
        try {
          return api.getPlayerFacingInfo(playerId);
        } catch (e) {}
        return null;
      })();
}

function gc1PuzzleItemCachedTarget(playerId) {
  return typeof GC !== "undefined" && GC && typeof GC.getTarget === "function"
    ? GC.getTarget(playerId)
    : (function () {
        try {
          return api.getPlayerTargetInfo(playerId);
        } catch (e) {}
        return null;
      })();
}

function gc1PuzzleItemCachedPos(playerId) {
  return typeof GC !== "undefined" && GC && typeof GC.getPos === "function"
    ? GC.getPos(playerId)
    : (function () {
        try {
          return api.getPosition(playerId);
        } catch (e) {}
        return null;
      })();
}

function gc1PuzzleItemUi(playerId, suffix, cb) {
  if (!playerId || typeof cb !== "function") return null;
  var runUi = function () {
    if (typeof GC !== "undefined" && GC && typeof GC.queueApi === "function") {
      GC.queueApi(function () {
        try {
          cb();
        } catch (e) {}
      });
      return;
    }
    try {
      cb();
    } catch (e) {}
  };
  if (typeof globalThis.gc1QueueLatestTask === "function")
    return globalThis.gc1QueueLatestTask(
      gc1PuzzleItemUiGroup(playerId, suffix),
      runUi,
      GC1_PUZZLE_ITEM_UI_DELAY,
    );
  runUi();
  return null;
}

// the crosshair prompt tells the player when they are looking at an item they can grab
function gc1PuzzleItemClearPrompt(playerId) {
  if (!playerId || !gc1PuzzleItemState.promptVisible[playerId]) return;
  gc1PuzzleItemState.promptVisible[playerId] = false;
  gc1PuzzleItemUi(playerId, "crosshair", () => {
    if (!api.checkValid(playerId)) return;
    api.setClientOptionToDefault(playerId, "crosshairText");
    api.setClientOptionToDefault(playerId, "touchscreenActionButton");
  });
}

function gc1PuzzleItemSetPrompt(playerId, itemName) {
  if (
    !playerId ||
    !itemName ||
    gc1PuzzleItemState.promptVisible[playerId] === itemName
  )
    return;
  gc1PuzzleItemState.promptVisible[playerId] = itemName;
  gc1PuzzleItemUi(playerId, "crosshair", () => {
    if (!api.checkValid(playerId)) return;
    if (typeof api.setClientOptions === "function") {
      api.setClientOptions(playerId, {
        crosshairText: "Pick up " + itemName,
        touchscreenActionButton: "Pick Up",
      });
      return;
    }
    api.setClientOption(playerId, "crosshairText", "Pick up " + itemName);
    api.setClientOption(playerId, "touchscreenActionButton", "Pick Up");
  });
}

// the carry hint is the little bottom text that tells the player how to drop what they picked up
function gc1PuzzleItemClearCarryHint(playerId) {
  if (!playerId || !gc1PuzzleItemState.carryHintVisible[playerId]) return;
  gc1PuzzleItemState.carryHintVisible[playerId] = false;
  gc1PuzzleItemUi(playerId, "lower", () => {
    if (api.checkValid(playerId))
      api.setClientOptionToDefault(playerId, "middleTextLower");
  });
}

function gc1PuzzleItemSetCarryHint(playerId, itemName) {
  if (
    !playerId ||
    !itemName ||
    gc1PuzzleItemState.carryHintVisible[playerId] === itemName
  )
    return;
  gc1PuzzleItemState.carryHintVisible[playerId] = itemName;
  gc1PuzzleItemUi(playerId, "lower", () => {
    if (api.checkValid(playerId))
      api.setClientOption(
        playerId,
        "middleTextLower",
        "Right click air to drop " + itemName,
      );
  });
}

// these helpers keep all prompt ui off the screen when the player moves away or the item is gone
function gc1PuzzleItemClearAllPrompts() {
  var ids = [];
  try {
    ids = api.getPlayerIds() || [];
  } catch (e) {}
  for (var i = 0; i < ids.length; i++) {
    if (gc1PuzzleItemNearInterrupt()) return;
    gc1PuzzleItemClearPrompt(ids[i]);
    gc1PuzzleItemClearCarryHint(ids[i]);
  }
}

// spawn points are shared across all items, so we keep them in a small copied array
function gc1PuzzleItemGetSpawnPoints() {
  return globalThis.GC1_PUZZLE_ITEM_POINTS.map(function (entry) {
    return {
      id: entry.id,
      pos: entry.pos.slice(),
    };
  });
}

// spawn positions and point ids get resolved here so fixed items and random items can share the same spawn code
function gc1PuzzleItemResolveSpawnPos(def, point) {
  if (def && Array.isArray(def.fixedPos) && def.fixedPos.length >= 3)
    return gc1PuzzleItemClonePos(def.fixedPos);
  return gc1PuzzleItemClonePos(point && point.pos);
}

function gc1PuzzleItemResolveSpawnPointId(def, point, fallbackId) {
  if (def && Array.isArray(def.fixedPos) && def.fixedPos.length >= 3)
    return def.key + "_fixed";
  if (point && point.id != null) return point.id;
  return fallbackId;
}

function gc1PuzzleItemHasFixedPos(def) {
  return !!(def && Array.isArray(def.fixedPos) && def.fixedPos.length >= 3);
}

// drop distance helpers keep the floor logic readable
function gc1PuzzleItemDropPointDistSq(a, b) {
  if (!a || !b) return Infinity;
  var dx = a[0] - b[0],
    dy = a[1] - b[1],
    dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function gc1PuzzleItemIsNearPointSet(pos, points, maxDistSq) {
  if (!pos || !points || !points.length) return false;
  for (var i = 0; i < points.length; i++) {
    if (gc1PuzzleItemDropPointDistSq(pos, points[i]) <= maxDistSq) return true;
  }
  return false;
}

function gc1PuzzleItemClassifyDropFloor(pos) {
  if (!pos || pos.length < 3)
    return { floorId: "unknown", areaType: "unknown" };
  var stairDistSq = 1.55 * 1.55;
  var nearUpstairs = gc1PuzzleItemIsNearPointSet(
    pos,
    GC1_PUZZLE_ITEM_DROP_STAIRS_UP_POINTS,
    stairDistSq,
  );
  var nearDownstairs = gc1PuzzleItemIsNearPointSet(
    pos,
    GC1_PUZZLE_ITEM_DROP_STAIRS_DOWN_POINTS,
    stairDistSq,
  );
  if (nearUpstairs || nearDownstairs)
    return { floorId: "stairs", areaType: "stairs" };
  if (pos[1] >= GC1_PUZZLE_ITEM_DROP_FLOOR_1_Y - 2)
    return { floorId: "floor1", areaType: "floor1" };
  if (pos[1] <= GC1_PUZZLE_ITEM_DROP_BASEMENT_Y + 2)
    return { floorId: "basement", areaType: "basement" };
  if (pos[1] >= GC1_PUZZLE_ITEM_DROP_FLOOR_GROUND_Y - 2)
    return { floorId: "ground", areaType: "ground_floor" };
  return { floorId: "ground", areaType: "ground_floor" };
}

// when a dropped item moves, this syncs the target data back into the chase system
function gc1PuzzleItemSyncDroppedTarget(record, meta, retriesLeft) {
  if (!record || !record.meshIds || !record.meshIds.length) return false;
  var meshId = record.meshIds[0];
  if (!meshId || !api.checkValid(meshId)) {
    record.landed = true;
    return false;
  }
  var livePos = null;
  try {
    livePos = api.getPosition(meshId);
  } catch (e) {}
  if (!livePos || livePos.length < 3) {
    record.landed = true;
    return false;
  }
  var nextPos = [livePos[0], livePos[1], livePos[2]];
  var prevPos = record.chasePos
    ? record.chasePos.slice()
    : record.pos
      ? record.pos.slice()
      : null;
  var prevFloorId = record.chaseFloorId || record.dropFloorId || "unknown";
  var dropFloor = gc1PuzzleItemClassifyDropFloor(nextPos);
  var isActiveDrop = !!(
    gc1PuzzleItemState.lastDrop &&
    gc1PuzzleItemState.lastDrop.serial === meta.dropSerial &&
    gc1PuzzleItemState.lastDrop.meshId === meshId
  );
  record.pos = nextPos.slice();
  record.landed = true;
  record.dropFloorId = dropFloor.floorId;
  record.dropAreaType = dropFloor.areaType;
  record.dropLevelY = nextPos[1];
  record.chasePos = nextPos.slice();
  record.chaseFloorId = dropFloor.floorId;
  record.chaseAreaType = dropFloor.areaType;
  if (isActiveDrop) {
    gc1PuzzleItemState.lastDrop.targetPos = nextPos.slice();
    gc1PuzzleItemState.lastDrop.floorId = dropFloor.floorId;
    gc1PuzzleItemState.lastDrop.areaType = dropFloor.areaType;
    gc1PuzzleItemState.lastDrop.dropLevelY = nextPos[1];
  }
  var movedFar =
    !prevPos || gc1PuzzleItemDropPointDistSq(prevPos, nextPos) >= 0.9025;
  var floorChanged = prevFloorId !== dropFloor.floorId;
  if (
    isActiveDrop &&
    (movedFar || floorChanged) &&
    typeof globalThis.gc1SignalMainFloorMeshTarget === "function"
  ) {
    globalThis.gc1SignalMainFloorMeshTarget(nextPos, meshId, {
      playerId: meta.playerId,
      itemName: meta.itemName,
      label: meta.label,
      floorId: dropFloor.floorId,
      areaType: dropFloor.areaType,
      dropSerial: meta.dropSerial,
    });
  }
  if (
    isActiveDrop &&
    retriesLeft > 0 &&
    typeof TS !== "undefined" &&
    TS &&
    typeof TS.run === "function"
  ) {
    TS.run(
      function () {
        gc1PuzzleItemSyncDroppedTarget(record, meta, retriesLeft - 1);
      },
      dropFloor.floorId === "stairs" ? 200 : 350,
      GC1_PUZZLE_ITEM_DROP_GROUP,
    );
  }
  return true;
}

function gc1PuzzleItemGetItemSlot(playerId, itemName) {
  for (var i = 0; i < 9; i++) {
    var slot = null;
    try {
      slot = api.getItemSlot(playerId, i);
    } catch (e) {}
    if (slot && slot.name === itemName) return i;
  }
  return -1;
}

function gc1PuzzleItemClearInventory(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  try {
    if (typeof api.clearInventory === "function") api.clearInventory(playerId);
  } catch (e) {}
  try {
    api.setSelectedInventorySlotI(playerId, 0);
  } catch (e) {}
  return true;
}

function gc1PuzzleItemDeleteRecord(record) {
  if (!record || !record.meshIds) return;
  for (var i = 0; i < record.meshIds.length; i++) {
    try {
      api.deleteMeshEntity(record.meshIds[i]);
    } catch (e) {}
  }
  record.meshIds = [];
}

function gc1PuzzleItemRebuildCache(kept) {
  var ids = [];
  for (var i = 0; i < kept.length; i++) {
    var rec = kept[i];
    if (!rec || !rec.meshIds) continue;
    for (var j = 0; j < rec.meshIds.length; j++) ids.push(rec.meshIds[j]);
  }
  gc1PuzzleItemState.spawnRecords = kept;
  gc1PuzzleItemState.spawnIds = ids;
  gc1PuzzleItemState.spawned = kept.length > 0;
}

function gc1PuzzleItemDeleteAll() {
  for (var i = 0; i < gc1PuzzleItemState.spawnRecords.length; i++) {
    gc1PuzzleItemDeleteRecord(gc1PuzzleItemState.spawnRecords[i]);
  }
  gc1PuzzleItemState.promptLoopTaskId = null;
  gc1PuzzleItemState.promptWarmUntil = 0;
  gc1PuzzleItemState.promptPlayerIndex = 0;
  if (typeof TS !== "undefined" && TS && typeof TS.stop === "function")
    TS.stop(GC1_PUZZLE_ITEM_PROMPT_GROUP);
  gc1PuzzleItemClearAllPrompts();
  gc1PuzzleItemState.promptVisible = {};
  gc1PuzzleItemState.carryHintVisible = {};
  gc1PuzzleItemRebuildCache([]);
}

function gc1PuzzleItemAddRecord(
  def,
  pos,
  meshIds,
  label,
  attrs,
  spawnPointId,
  landed,
) {
  var record = {
    key: def.key,
    itemName: def.itemName,
    label: label || def.label,
    attrs: attrs,
    spawnPointId: spawnPointId,
    pos: gc1PuzzleItemClonePos(pos),
    meshIds: meshIds.slice(),
    landed: landed !== false,
  };
  for (var i = 0; i < meshIds.length; i++)
    gc1PuzzleItemState.spawnIds.push(meshIds[i]);
  gc1PuzzleItemState.spawnRecords.push(record);
  gc1PuzzleItemState.spawned = true;
  return record;
}

function gc1PuzzleItemSpawnSize(def) {
  if (!def) return 0.32;
  if (def.key === "shears") return 0.31;
  if (def.key === "mace" || def.key === "jump_pad") return 0.34;
  if (def.key === "vase") return 0.38;
  return 0.32;
}

function gc1PuzzleItemGetRotation(def, doPhysics) {
  if (def && doPhysics && Array.isArray(def.dropRot)) return def.dropRot;
  if (def && Array.isArray(def.rot)) return def.rot;
  return [Math.PI * 0.5, 0, Math.PI * 0.5];
}

function gc1PuzzleItemSpawnMesh(
  def,
  pos,
  playerId,
  doPhysics,
  yOffset,
  sizeMult,
) {
  if (!def || !pos) return [];
  var mul = typeof sizeMult === "number" ? sizeMult : 1;
  var off = Array.isArray(def.offset) ? def.offset : [0, 0.03, 0];
  var worldPos = [
    pos[0] + off[0],
    pos[1] + (typeof yOffset === "number" ? yOffset : off[1]),
    pos[2] + off[2],
  ];
  var physics = {
    doPhysics: !!doPhysics,
    collidesEntities: false,
    widthExpandAmt: typeof def.hitbox === "number" ? def.hitbox : 0.2,
    heightExpandAmt: typeof def.hitbox === "number" ? def.hitbox : 0.2,
  };
  var meshId = null;
  try {
    meshId = api.attemptCreateMeshEntity(
      "BloxdBlock",
      { blockName: def.itemName, size: gc1PuzzleItemSpawnSize(def) * mul },
      "",
      physics,
      playerId,
    );
  } catch (e) {}
  if (!meshId) {
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
          width: box[0] * mul,
          height: box[1] * mul,
          depth: box[2] * mul,
          texture: box[3],
          diffuseColor: [225, 225, 225],
        },
        "",
        physics,
        playerId,
      );
    } catch (e) {}
  }
  if (!meshId) return [];
  try {
    api.setPosition(meshId, worldPos[0], worldPos[1], worldPos[2]);
  } catch (e) {}
  try {
    var rot = gc1PuzzleItemGetRotation(def, doPhysics);
    api.setEntityRotation(meshId, rot[0], rot[1], rot[2]);
  } catch (e) {}
  return [meshId];
}

function gc1PuzzleItemCanSeeRecord(playerId, record, facing, targetInfo) {
  if (!record || !record.pos || record.landed === false) return false;
  if (facing === undefined || facing === null) {
    facing = gc1PuzzleItemCachedFacing(playerId);
  }
  if (!facing || !Array.isArray(facing.dir)) return false;
  var origin = null;
  if (Array.isArray(facing.camPos)) {
    origin = facing.camPos;
  } else {
    origin = gc1PuzzleItemCachedPos(playerId);
  }
  if (!origin) return false;
  var viewData = gc1PuzzleItemBuildViewData(record, origin, facing.dir);
  if (!viewData) return false;
  if (targetInfo === undefined) {
    targetInfo = gc1PuzzleItemCachedTarget(playerId);
  }
  return !gc1PuzzleItemViewBlocked(origin, viewData, targetInfo);
}

function gc1PuzzleItemCanPickupRecord(playerId, record) {
  if (!record || !record.pos || record.landed === false) return false;
  var pos = gc1PuzzleItemCachedPos(playerId);
  if (!pos) return false;
  var dx = record.pos[0] - pos[0];
  var dy = record.pos[1] - pos[1];
  var dz = record.pos[2] - pos[2];
  return dx * dx + dy * dy + dz * dz <= GC1_PUZZLE_ITEM_PICKUP_DIST_SQ;
}

function gc1PuzzleItemHasNearbyRecord(pos, maxDistSq) {
  if (!pos) return false;
  var records = gc1PuzzleItemState.spawnRecords;
  for (var i = 0; i < records.length; i++) {
    if (gc1PuzzleItemNearInterrupt()) return false;
    var record = records[i];
    if (
      !record ||
      !record.pos ||
      record.landed === false ||
      !record.meshIds ||
      !record.meshIds.length
    )
      continue;
    var dx = record.pos[0] - pos[0];
    var dy = record.pos[1] - pos[1];
    var dz = record.pos[2] - pos[2];
    if (dx * dx + dy * dy + dz * dz <= maxDistSq) return true;
  }
  return false;
}

function gc1PuzzleItemBuildViewData(record, origin, dir) {
  if (!record || !record.pos || record.landed === false || !origin || !dir)
    return null;
  var tx = record.pos[0],
    ty = record.pos[1] + 0.18,
    tz = record.pos[2];
  var dx = tx - origin[0],
    dy = ty - origin[1],
    dz = tz - origin[2];
  var distSq = dx * dx + dy * dy + dz * dz;
  if (distSq > GC1_PUZZLE_ITEM_PROMPT_DIST_SQ) return null;
  if (distSq < 0.001)
    return { tx: tx, ty: ty, tz: tz, dist: 0, dot: 1, distSq: 0 };
  var dotProd = dx * dir[0] + dy * dir[1] + dz * dir[2];
  if (dotProd <= 0) return null;
  if (dotProd * dotProd < GC1_PUZZLE_ITEM_PROMPT_DOT_SQ * distSq) return null;
  var dist = Math.sqrt(distSq);
  return {
    tx: tx,
    ty: ty,
    tz: tz,
    dist: dist,
    dot: dotProd / dist,
    distSq: distSq,
  };
}

function gc1PuzzleItemViewBlocked(origin, viewData, targetInfo) {
  try {
    if (targetInfo && targetInfo.position) {
      var tx = targetInfo.position[0] + 0.5 - origin[0];
      var ty = targetInfo.position[1] + 0.5 - origin[1];
      var tz = targetInfo.position[2] + 0.5 - origin[2];
      var blockerDist = tx * tx + ty * ty + tz * tz;
      var threshold = viewData.dist - 0.6;
      if (blockerDist < threshold * threshold) return true;
    }
  } catch (e) {}
  return false;
}

function gc1PuzzleItemGetFocusRecordCached(
  playerId,
  origin,
  facingDir,
  targetInfo,
) {
  if (gc1PuzzleItemNearInterrupt() || !facingDir || !origin) return null;
  var bestRecord = null;
  var bestDot = -1;
  var bestDistSq = Infinity;
  var records = gc1PuzzleItemState.spawnRecords;
  for (var i = 0; i < records.length; i++) {
    if (gc1PuzzleItemNearInterrupt()) break;
    var record = records[i];
    if (
      !record ||
      !record.meshIds ||
      !record.meshIds.length ||
      record.landed === false
    )
      continue;
    var viewData = gc1PuzzleItemBuildViewData(record, origin, facingDir);
    if (!viewData) continue;
    if (gc1PuzzleItemViewBlocked(origin, viewData, targetInfo)) continue;
    if (
      viewData.dot > bestDot ||
      (viewData.dot === bestDot && viewData.distSq < bestDistSq)
    ) {
      bestRecord = record;
      bestDot = viewData.dot;
      bestDistSq = viewData.distSq;
    }
  }
  return bestRecord;
}

function gc1PuzzleItemGetFocusRecord(playerId) {
  if (gc1PuzzleItemNearInterrupt()) return null;
  var facing = gc1PuzzleItemCachedFacing(playerId);
  if (!facing || !Array.isArray(facing.dir)) return null;
  var targetInfo = gc1PuzzleItemCachedTarget(playerId);
  var origin = Array.isArray(facing.camPos)
    ? facing.camPos
    : gc1PuzzleItemCachedPos(playerId);
  return gc1PuzzleItemGetFocusRecordCached(
    playerId,
    origin,
    facing ? facing.dir : null,
    targetInfo,
  );
}

function gc1PuzzleItemFindRecord(targetEId, playerId) {
  if (targetEId) {
    for (var i = 0; i < gc1PuzzleItemState.spawnRecords.length; i++) {
      var record = gc1PuzzleItemState.spawnRecords[i];
      if (!record || !record.meshIds || !record.meshIds.length) continue;
      for (var j = 0; j < record.meshIds.length; j++) {
        if (record.meshIds[j] === targetEId)
          return gc1PuzzleItemCanPickupRecord(playerId, record) ? record : null;
      }
    }
    return null;
  }
  var focus = gc1PuzzleItemGetFocusRecord(playerId);
  if (focus) return focus;
  var facing = gc1PuzzleItemCachedFacing(playerId);
  var targetInfo = gc1PuzzleItemCachedTarget(playerId);
  for (var i = 0; i < gc1PuzzleItemState.spawnRecords.length; i++) {
    var record = gc1PuzzleItemState.spawnRecords[i];
    if (!record || !record.meshIds || !record.meshIds.length) continue;
    if (
      playerId &&
      !gc1PuzzleItemCanSeeRecord(playerId, record, facing, targetInfo)
    )
      continue;
    return record;
  }
  return null;
}

function gc1PuzzleItemRemoveRecord(record) {
  if (!record) return;
  gc1PuzzleItemDeleteRecord(record);
  var kept = [];
  for (var i = 0; i < gc1PuzzleItemState.spawnRecords.length; i++) {
    var current = gc1PuzzleItemState.spawnRecords[i];
    if (current && current !== record) kept.push(current);
  }
  gc1PuzzleItemRebuildCache(kept);
}

function gc1PuzzleItemPlayGroundSound(playerId, defOrRecord) {
  var key = defOrRecord && defOrRecord.key ? defOrRecord.key : "";
  var soundName = key === "vase" ? "glass1" : "bullet_shell_bounce_general_07";
  var pitch = key === "vase" ? 2 : 0.7;
  try {
    api.playSound(playerId, soundName, 1, pitch, {
      playerIdOrPos: playerId,
      maxHearDist: 24,
      refDistance: 4,
    });
  } catch (e) {}
}

// the spawn loop places every puzzle item into the world
// this is the part that turns the item defs into actual pickups the player can find
function gc1PuzzleItemSpawnAll(playerId, options) {
  if (gc1PuzzleItemNearInterrupt())
    return {
      ok: false,
      spawnedCount: 0,
      attemptedCount: 0,
      records: [],
      failures: ["near interrupt"],
    };
  gc1PuzzleItemDeleteAll();
  if (typeof globalThis.gc1BeforePuzzleItemSpawnAll === "function") {
    try {
      globalThis.gc1BeforePuzzleItemSpawnAll();
    } catch (e) {}
  }
  var defs = gc1PuzzleItemGetSpawnDefs();
  var points = gc1PuzzleItemShuffle(gc1PuzzleItemGetSpawnPoints());
  var result = {
    ok: false,
    spawnedCount: 0,
    attemptedCount: defs.length,
    records: [],
    failures: [],
  };
  if (!defs.length) result.failures.push("no puzzle item defs");
  if (!points.length) result.failures.push("no spawn points");
  if (result.failures.length) {
    gc1PuzzleItemState.lastResult = result;
    if (gc1PuzzleItemState.spawned) {
      gc1PuzzleItemState.promptWarmUntil =
        Date.now() + GC1_PUZZLE_ITEM_PROMPT_WARMUP_MS;
      gc1PuzzleItemScheduleLoopBridge();
    }
    return result;
  }
  var silentSpawn = !!(options && options.silentSpawn);
  for (var i = 0; i < defs.length; i++) {
    if (gc1PuzzleItemNearInterrupt()) {
      result.failures.push("near interrupt");
      break;
    }
    var def = defs[i];
    var point = points[i % points.length];
    var pos = gc1PuzzleItemResolveSpawnPos(def, point);
    var meshIds = gc1PuzzleItemSpawnMesh(def, pos, playerId, false);
    if (!meshIds.length) {
      result.failures.push(
        gc1PuzzleItemGetLabel(def) +
          " failed @ " +
          gc1PuzzleItemResolveSpawnPointId(def, point, i + 1),
      );
      continue;
    }
    var attrs =
      typeof globalThis.gc1GetPuzzleItemAttributes === "function"
        ? globalThis.gc1GetPuzzleItemAttributes(def)
        : def.attributes;
    var record = gc1PuzzleItemAddRecord(
      def,
      pos,
      meshIds,
      def.label,
      attrs,
      gc1PuzzleItemResolveSpawnPointId(def, point, i + 1),
      true,
    );
    result.records.push({
      key: record.key,
      itemName: record.itemName,
      spawnPointId: record.spawnPointId,
      pos: gc1PuzzleItemClonePos(record.pos),
      meshIds: record.meshIds.slice(),
    });
    result.spawnedCount++;
    if (
      !silentSpawn &&
      typeof TS !== "undefined" &&
      typeof TS.run === "function"
    ) {
      TS.run(
        function () {
          gc1PuzzleItemPlayGroundSound(playerId, def);
        },
        250,
        "gc1_puzzle_item_sound_" + def.key + "_" + i,
      );
    }
  }
  result.ok = result.spawnedCount >= result.attemptedCount;
  if (result.spawnedCount > 0 && !result.ok)
    result.failures.push(
      "partial spawn " + result.spawnedCount + "/" + result.attemptedCount,
    );
  if (!result.ok && !result.failures.length)
    result.failures.push("no valid mesh ids");
  gc1PuzzleItemState.lastResult = result;
  if (gc1PuzzleItemState.spawned) gc1PuzzleItemScheduleLoopBridge();
  return result;
}

// the queued version does the same work but spreads it out so the world does not hitch
function gc1PuzzleItemSpawnAllQueued(playerId, options, onDone) {
  if (typeof TS === "undefined" || !TS || typeof TS.run !== "function") {
    var fallback = gc1PuzzleItemSpawnAll(playerId, options);
    if (typeof onDone === "function") onDone(fallback);
    return fallback;
  }
  gc1PuzzleItemDeleteAll();
  if (typeof globalThis.gc1BeforePuzzleItemSpawnAll === "function") {
    try {
      globalThis.gc1BeforePuzzleItemSpawnAll();
    } catch (e) {}
  }
  if (typeof TS.stop === "function") TS.stop(GC1_PUZZLE_ITEM_GROUP);
  var context = {
    defs: gc1PuzzleItemGetSpawnDefs(),
    points: gc1PuzzleItemShuffle(gc1PuzzleItemGetSpawnPoints()),
    playerId: playerId,
    options: options || {},
    result: {
      ok: false,
      spawnedCount: 0,
      attemptedCount: 0,
      records: [],
      failures: [],
    },
    done: false,
    index: 0,
  };
  if (!context.defs.length) context.result.failures.push("no puzzle item defs");
  if (!context.points.length) context.result.failures.push("no spawn points");
  context.result.attemptedCount = context.defs.length;
  if (context.result.failures.length) {
    context.result.ok = false;
    gc1PuzzleItemState.lastResult = context.result;
    if (typeof onDone === "function") onDone(context.result);
    return context.result;
  }
  var next = function () {
    if (context.done) return;
    if (
      typeof globalThis.gc1RuntimeCoolingDown === "function" &&
      globalThis.gc1RuntimeCoolingDown()
    ) {
      TS.run(next, 350, GC1_PUZZLE_ITEM_GROUP);
      return;
    }
    if (gc1PuzzleItemNearInterrupt()) {
      TS.run(next, 300, GC1_PUZZLE_ITEM_GROUP);
      return;
    }
    if (context.index >= context.defs.length) {
      context.result.ok =
        context.result.spawnedCount >= context.result.attemptedCount;
      if (context.result.spawnedCount > 0 && !context.result.ok)
        context.result.failures.push(
          "partial spawn " +
            context.result.spawnedCount +
            "/" +
            context.result.attemptedCount,
        );
      if (!context.result.ok && !context.result.failures.length)
        context.result.failures.push("no valid mesh ids");
      gc1PuzzleItemState.lastResult = context.result;
      if (gc1PuzzleItemState.spawned) {
        gc1PuzzleItemState.promptWarmUntil =
          Date.now() + GC1_PUZZLE_ITEM_PROMPT_WARMUP_MS;
        gc1PuzzleItemScheduleLoopBridge();
      }
      context.done = true;
      if (typeof onDone === "function") onDone(context.result);
      return;
    }
    var i = context.index;
    var def = context.defs[i];
    var point = context.points[i % context.points.length];
    var pos = gc1PuzzleItemResolveSpawnPos(def, point);
    var meshIds = gc1PuzzleItemSpawnMesh(def, pos, playerId, false);
    if (meshIds.length) {
      var attrs =
        typeof globalThis.gc1GetPuzzleItemAttributes === "function"
          ? globalThis.gc1GetPuzzleItemAttributes(def)
          : def.attributes;
      var record = gc1PuzzleItemAddRecord(
        def,
        pos,
        meshIds,
        def.label,
        attrs,
        gc1PuzzleItemResolveSpawnPointId(def, point, i + 1),
        true,
      );
      context.result.records.push({
        key: record.key,
        itemName: record.itemName,
        spawnPointId: record.spawnPointId,
        pos: gc1PuzzleItemClonePos(record.pos),
        meshIds: record.meshIds.slice(),
      });
      context.result.spawnedCount++;
      if (!context.options.silentSpawn)
        TS.run(
          function () {
            gc1PuzzleItemPlayGroundSound(playerId, def);
          },
          250,
          "gc1_puzzle_item_sound_" + def.key + "_" + i,
        );
    } else {
      context.result.failures.push(
        gc1PuzzleItemGetLabel(def) +
          " failed @ " +
          gc1PuzzleItemResolveSpawnPointId(def, point, i + 1),
      );
    }
    context.index++;
    TS.run(next, 300, GC1_PUZZLE_ITEM_GROUP);
  };
  TS.run(next, 300, GC1_PUZZLE_ITEM_GROUP);
  return context.result;
}

// this handles dropping the held item back into the world and tagging it with the right metadata
function gc1PuzzleItemDropHeldCore(playerId, options) {
  var held = null;
  try {
    held = api.getHeldItem(playerId);
  } catch (e) {}
  var def = gc1PuzzleItemGetDefFromItem(held);
  if (!def) return false;
  var pos = gc1PuzzleItemCachedPos(playerId);
  if (!pos) return false;
  if (!options || options.consumeHeld !== false) {
    try {
      api.removeItemName(playerId, held.name, 1);
    } catch (e) {
      return false;
    }
  }
  var exact = !!(options && options.exact);
  var spawnPos = exact
    ? [pos[0], pos[1] + 0.3, pos[2]]
    : [pos[0], pos[1] + 1.25, pos[2]];
  var dropFloor = gc1PuzzleItemClassifyDropFloor(spawnPos);
  var meshIds = gc1PuzzleItemSpawnMesh(
    def,
    spawnPos,
    playerId,
    true,
    0,
    GC1_PUZZLE_ITEM_DROP_SIZE_MULT,
  );
  if (!meshIds.length) return false;
  var vel =
    options && Array.isArray(options.velocity)
      ? options.velocity
      : [0, -0.15, 0];
  try {
    api.setVelocity(meshIds[0], vel[0] || 0, vel[1] || 0, vel[2] || 0);
  } catch (e) {}
  var record = gc1PuzzleItemAddRecord(
    def,
    spawnPos,
    meshIds,
    held.attributes && held.attributes.customDisplayName
      ? held.attributes.customDisplayName
      : def.label,
    held.attributes,
    null,
    false,
  );
  record.dropFloorId = dropFloor.floorId;
  record.dropAreaType = dropFloor.areaType;
  record.dropLevelY = spawnPos[1];
  gc1PuzzleItemState.lastDrop = {
    serial: (gc1PuzzleItemState.lastDropSerial || 0) + 1,
    playerId: playerId,
    itemName: held.name,
    playerPos: gc1PuzzleItemClonePos(pos),
    spawnPos: gc1PuzzleItemClonePos(spawnPos),
    targetPos: gc1PuzzleItemClonePos(spawnPos),
    meshId: meshIds[0],
    floorId: dropFloor.floorId,
    areaType: dropFloor.areaType,
    createdAt: Date.now(),
  };
  gc1PuzzleItemState.lastDropSerial = gc1PuzzleItemState.lastDrop.serial;
  if (typeof globalThis.gc1SignalMainFloorMeshTarget === "function") {
    globalThis.gc1SignalMainFloorMeshTarget(spawnPos, meshIds[0], {
      playerId: playerId,
      itemName: held.name,
      label: record.label,
      floorId: dropFloor.floorId,
      areaType: dropFloor.areaType,
      dropSerial: gc1PuzzleItemState.lastDrop.serial,
    });
  }
  gc1PuzzleItemScheduleLoopBridge();
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    var dropMeta = {
      playerId: playerId,
      itemName: held.name,
      label: record.label,
      dropSerial: gc1PuzzleItemState.lastDrop.serial,
    };
    TS.run(
      function () {
        gc1PuzzleItemSyncDroppedTarget(record, dropMeta, 2);
        gc1PuzzleItemPlayGroundSound(playerId, def);
      },
      options && typeof options.soundDelayMs === "number"
        ? options.soundDelayMs
        : 250,
      GC1_PUZZLE_ITEM_DROP_GROUP,
    );
  }
  return true;
}

function gc1PuzzleItemDropHeld(playerId) {
  return gc1PuzzleItemDropHeldCore(playerId, null);
}

// the prompt exports are kept global because other systems need to call them
globalThis.GC1_PUZZLE_ITEM_PROMPT_GROUP = GC1_PUZZLE_ITEM_PROMPT_GROUP;
globalThis.GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY =
  GC1_PUZZLE_ITEM_PROMPT_ACTIVE_DELAY;
globalThis.GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY =
  GC1_PUZZLE_ITEM_PROMPT_IDLE_DELAY;
globalThis.GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ =
  GC1_PUZZLE_ITEM_PROMPT_ROUGH_DIST_SQ;
globalThis.gc1PuzzleItemNearInterrupt = gc1PuzzleItemNearInterrupt;
globalThis.gc1PuzzleItemGetDefFromItem = gc1PuzzleItemGetDefFromItem;
globalThis.gc1PuzzleItemGetLabel = gc1PuzzleItemGetLabel;
globalThis.gc1PuzzleItemCachedFacing = gc1PuzzleItemCachedFacing;
globalThis.gc1PuzzleItemCachedPos = gc1PuzzleItemCachedPos;
globalThis.gc1PuzzleItemSetPrompt = gc1PuzzleItemSetPrompt;
globalThis.gc1PuzzleItemClearPrompt = gc1PuzzleItemClearPrompt;
globalThis.gc1PuzzleItemSetCarryHint = gc1PuzzleItemSetCarryHint;
globalThis.gc1PuzzleItemClearCarryHint = gc1PuzzleItemClearCarryHint;
globalThis.gc1PuzzleItemHasNearbyRecord = gc1PuzzleItemHasNearbyRecord;
globalThis.gc1PuzzleItemGetFocusRecordCached =
  gc1PuzzleItemGetFocusRecordCached;
globalThis.gc1PuzzleItemFindRecord = gc1PuzzleItemFindRecord;
globalThis.gc1PuzzleItemGetItemSlot = gc1PuzzleItemGetItemSlot;
globalThis.gc1PuzzleItemClearInventory = gc1PuzzleItemClearInventory;
globalThis.gc1PuzzleItemRemoveRecord = gc1PuzzleItemRemoveRecord;
globalThis.gc1PuzzleItemDeleteAll = gc1PuzzleItemDeleteAll;
globalThis.gc1PuzzleItemDropHeld = gc1PuzzleItemDropHeld;
globalThis.gc1PuzzleItemForceDropHeld = function (playerId) {
  return gc1PuzzleItemDropHeldCore(playerId, {
    exact: true,
    velocity: [0, -0.05, 0],
    soundDelayMs: 80,
  });
};
// if u see this, u have to join bloxdhub or a spider will play on ur bloxd account while ur sleeping
globalThis.gc1PuzzleItemSpawnAll = gc1PuzzleItemSpawnAll;
globalThis.gc1PuzzleItemSpawnAllQueued = gc1PuzzleItemSpawnAllQueued;
