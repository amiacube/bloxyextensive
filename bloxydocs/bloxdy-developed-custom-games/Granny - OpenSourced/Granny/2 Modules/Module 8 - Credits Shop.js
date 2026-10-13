/*
  Granny Open Source - Module 8

  this module was cleaned up a bit after the live version so people can read it easier
  the original version was more cramped and had way less comments than this
  we added more comments here so the credit shop is easier to understand
  if this ever starts pushing the 32,000 char limit for one code block then just minify some parts again lol
  make sure to join bloxdhub.com hehe
*/

/* Module 8 - Credits Shop */

// this module builds the credits shop item list and the chat hook around it
globalThis.gc1CreditsShopState = Object.assign(
  {
    created: false,
    version: 0,
  },
  typeof globalThis.gc1CreditsShopState === "object" &&
    globalThis.gc1CreditsShopState
    ? globalThis.gc1CreditsShopState
    : {},
);
var gc1CreditsShopState = globalThis.gc1CreditsShopState;

var GC1_CREDITS_CATEGORY = "gc1_credits";
var GC1_CREDITS_VERSION = 2;
var GC1_CREDITS_BLUE = "#6ecbff";
var GC1_CREDITS_ITEMS = [
  {
    key: "smaug",
    image: "Book",
    title: "Smaug_ / x.smaug",
    description:
      "Detailed the Granny house, added paintings and strong atmosphere details, built the basement, and will probably help shape later chapters and sections.",
    sortPriority: 300,
  },
  {// w delfineon
    key: "delfineon",
    image: "Compass",
    title: "SPECIAL THANKS TO delfineon / delfineonx",
    description:
      "Made the Task Scheduler powering this world's TS system. We use it a lot for staged systems, retries, loops, and interruption-safe timing.",
    sortPriority: 200,
  },
  {
    key: "crownix",
    image: "Diamond",
    title: "Crownix",
    description:
      "uhhh idk he did most of the stuff but he said join bloxdhub lol", // ye join bloxdhub broskie
    sortPriority: 100,
  },
];

// turn a credit item definition into the object the shop uses
function gc1CreditsShopItem(def) {
  return {
    image: def.image,
    imageColour: GC1_CREDITS_BLUE,
    cost: 0,
    canBuy: true,
    buyButtonText: "View",
    customTitle: def.title,
    description: def.description,
    onBoughtMessage: "Special thanks to...",
    sortPriority: def.sortPriority,
  };
}

// update or add one shop item
function gc1CreditsUpsertItem(categoryKey, itemKey, item) {
  try {
    api.createShopItem(categoryKey, itemKey, item);
    return true;
  } catch (e) {}
  try {
    if (typeof api.updateShopItem === "function") {
      api.updateShopItem(categoryKey, itemKey, item);
      return true;
    }
  } catch (e) {}
  return false;
}

function gc1CreditsShopEnsure() {
  if (gc1CreditsShopState.version !== GC1_CREDITS_VERSION) {
    gc1CreditsShopState.created = false;
    gc1CreditsShopState.version = GC1_CREDITS_VERSION;
  }
  if (gc1CreditsShopState.created) return true;
  try {
    api.configureShopCategory(GC1_CREDITS_CATEGORY, {
      customTitle: "Credits",
      description: "Special thanks to...",
      sortPriority: 9500,
      autoSelectCategory: true,
    });
  } catch (e) {}
  for (var i = 0; i < GC1_CREDITS_ITEMS.length; i++) {
    var item = GC1_CREDITS_ITEMS[i];
    gc1CreditsUpsertItem(
      GC1_CREDITS_CATEGORY,
      item.key,
      gc1CreditsShopItem(item),
    );
  }
  gc1CreditsShopState.created = true;
  return true;
}

// open the shop 
function gc1CreditsShopOpen(playerId) {
  if (!playerId || !api.checkValid(playerId)) return false;
  gc1CreditsShopEnsure();
  try {
    if (typeof api.configureShopCategoryForPlayer === "function")
      api.configureShopCategoryForPlayer(playerId, GC1_CREDITS_CATEGORY, {
        customTitle: "Credits",
        description: "Special thanks to...",
        sortPriority: 9500,
        autoSelectCategory: true,
      });
  } catch (e) {}
  var run = function () {
    try {
      api.openShop(playerId, false, GC1_CREDITS_CATEGORY, true);
      return true;
    } catch (e) {}
    return false;
  };
  if (typeof TS !== "undefined" && TS && typeof TS.run === "function") {
    TS.run(run, 100, "gc1_credits_shop_" + playerId);
    return true;
  }
  return run();
}

globalThis.gc1CreditsShopOpen = gc1CreditsShopOpen;
gc1CreditsShopEnsure();

globalThis.gc1CreditsShopPrevOnPlayerChat =
  typeof globalThis.gc1OnPlayerChat === "function"
    ? globalThis.gc1OnPlayerChat
    : null;
globalThis.gc1OnPlayerChat = function (playerId, chatMessage, channelName) {
  var msg = String(chatMessage || "")
    .toLowerCase()
    .trim();
  if (msg === "!credits" || msg === "!shop") {
    gc1CreditsShopOpen(playerId);
    return false;
  }
  if (typeof globalThis.gc1CreditsShopPrevOnPlayerChat === "function")
    return globalThis.gc1CreditsShopPrevOnPlayerChat(
      playerId,
      chatMessage,
      channelName,
    );
  return true;
};
