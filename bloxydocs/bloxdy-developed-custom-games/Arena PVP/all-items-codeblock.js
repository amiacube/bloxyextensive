// simple codeblock that gives all weapons, armor, and food

// clear inventory first
api.clearInventory(playerId)

// restore arrows cuz there needed
api.setItemSlot(playerId, 45, "Arrow", 999)

// give all diamond weapons
api.giveItem(playerId, "Diamond Sword", 1)
api.giveItem(playerId, "Diamond Bow", 1)
api.giveItem(playerId, "Diamond Crossbow", 1)
api.giveItem(playerId, "Diamond Spear", 1)
api.giveItem(playerId, "Diamond Dagger", 1)
api.giveItem(playerId, "Diamond Club", 1)
api.giveItem(playerId, "Diamond Mace", 1)

// give all food
api.giveItem(playerId, "Bread", 999)
api.giveItem(playerId, "Plum", 999)
api.giveItem(playerId, "Corn", 999)
api.giveItem(playerId, "Pear", 999)
api.giveItem(playerId, "Cherry", 999)
api.giveItem(playerId, "Mango", 999)

// give all armor (AFTER food so it doesnt crowd the inven)
api.giveItem(playerId, "Diamond Helmet", 1)
api.giveItem(playerId, "Diamond Chestplate", 1)
api.giveItem(playerId, "Diamond Gauntlets", 1)
api.giveItem(playerId, "Diamond Leggings", 1)
api.giveItem(playerId, "Diamond Boots", 1)

// play sound and send message
api.playSound(playerId, "magicAccent3", 1, 1)
api.sendMessage(playerId, [
    {str: "All items equipped!", style: {color: "#00FF00", fontSize: "1.2rem", fontWeight: "bold"}}
])
