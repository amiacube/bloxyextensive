// simple codeblock that gives all diamond armor

// give all diamond armor pieces
api.giveItem(playerId, "Diamond Helmet", 1)
api.giveItem(playerId, "Diamond Chestplate", 1)
api.giveItem(playerId, "Diamond Gauntlets", 1)
api.giveItem(playerId, "Diamond Leggings", 1)
api.giveItem(playerId, "Diamond Boots", 1)

// play sound and send message
api.playSound(playerId, "magicAccent3", 1, 1)
api.sendMessage(playerId, [
    {str: "Full diamond armor equipped!", style: {color: "#00FFFF", fontSize: "1.2rem", fontWeight: "bold"}}
])
