// kill tracking and ui system - shows player kills on nametags and updates sidebar
const playerKills = new Map()
const ARENA_STATS_SLOT = 1 // moonstone chest slot for persistent kill storage

// loads player kill count from moonstone chest - persists across sessions
loadPlayerKills = (pId) => {
    try {
        const item = api.getMoonstoneChestItemSlot(pId, ARENA_STATS_SLOT)
        
        if (item && item.attributes && item.attributes.customAttributes && item.attributes.customAttributes.arenaKills) {
            const kills = JSON.parse(item.attributes.customAttributes.arenaKills)
            playerKills.set(pId, kills || 0)
        } else {
            playerKills.set(pId, 0)
        }
    } catch (error) {
        playerKills.set(pId, 0)
    }
}

// saves kill count to moonstone chest - uses bread as item for data storage
savePlayerKills = (pId) => {
    try {
        const kills = playerKills.get(pId) || 0
        api.setMoonstoneChestItemSlot(pId, ARENA_STATS_SLOT, "Bread", 1, {
            customAttributes: { arenaKills: JSON.stringify(kills) }
        })
    } catch (error) {}
}

// initializes kill tracking for new players
initializePlayerKills = (pId) => {
    if (!playerKills.has(pId)) {
        loadPlayerKills(pId)
    }
}

// updates player nametag with kill count subtitle
updatePlayerSubtitle = (pId) => {
    try {
        const kills = playerKills.get(pId) || 0
        const playerName = api.getEntityName(pId)
        
        const nameTagInfo = {
            content: [
                {str: playerName, style: {color: "white", fontWeight: "bold"}}
            ],
            subtitle: [
                {str: "💀 " + kills + " Kills", style: {color: "#FFAA00", fontSize: "0.875rem", fontWeight: "bold"}}
            ],
            subtitleBackgroundColor: "rgba(0, 0, 0, 0.8)"
        }
        
        // sets nametag for everyone including new joiners - important for visibility
        api.setTargetedPlayerSettingForEveryone(pId, "nameTagInfo", nameTagInfo, true)
    } catch (error) {}
}

// refreshes all player nametags - needed when new player joins so they can see existing players stats
updateAllPlayerSubtitles = () => {
    for (const pId of api.getPlayerIds()) {
        if (playerKills.has(pId)) {
            updatePlayerSubtitle(pId)
        }
    }
}

// increments kill count when player gets a kill
handlePlayerKill = (attackerId) => {
    if (!playerKills.has(attackerId)) {
        playerKills.set(attackerId, 0)
    }
    playerKills.set(attackerId, playerKills.get(attackerId) + 1)
    savePlayerKills(attackerId)
    updatePlayerSubtitle(attackerId)
}

// updates the right sidebar with player count and game info
updateSidebar = () => {
    const playerCount = api.getNumPlayers()
    
    // uhhhh yall should join bloxdhub if ur reading this - idk hehe
    const sidebarText = [
        {str: "     ARENA", style: {color: "#FFFFFF", fontSize: "1.4rem", fontWeight: "bold"}},
        {str: "PVP\n\n", style: {color: "#FFAA00", fontSize: "1.4rem", fontWeight: "bold"}},
        {icon: "fa-solid fa-user-group", style: {color: "#4DA6FF", fontSize: "1rem"}},
        {str: " Players: " + playerCount + "/15\n", style: {color: "#FFFFFF", fontSize: "1rem", fontWeight: "bold"}},
        {str: "\n", style: {color: "white"}},
        {icon: "fa-solid fa-crosshairs", style: {color: "#FF4444", fontSize: "0.9rem"}},
        {str: " Free-for-all combat!\n", style: {color: "#FF4444", fontSize: "0.9rem", fontWeight: "bold"}},
        {icon: "fa-solid fa-trophy", style: {color: "#FFD700", fontSize: "0.9rem"}},
        {str: " Get kills to dominate!\n", style: {color: "#FFD700", fontSize: "0.9rem", fontWeight: "bold"}},
        {str: "\n", style: {color: "white"}},
        {icon: "fa-solid fa-crown", style: {color: "#FFB830", fontSize: "1rem"}},
        {str: " Made by Crownix\n", style: {color: "#FFB830", fontSize: "1rem", fontWeight: "bold"}},
        {str: "\n", style: {color: "white"}},
        {str: (typeof getBloxdhubSidebarLink === 'function' ? getBloxdhubSidebarLink() : "🌐 https://bloxdhub.com") + "\n", style: {color: "cyan", fontWeight: "bold", fontSize: "0.9rem"}},
        {str: "Unofficial social hub for Bloxd", style: {color: "white", fontSize: "0.8rem"}}
    ]
    
    for (const pId of api.getPlayerIds()) {
        api.setClientOption(pId, "RightInfoText", sidebarText)
    }
}

// handles new player joining - loads their stats and updates ui for everyone
handlePlayerJoinUI = (pId) => {
    initializePlayerKills(pId)
    
    // update this players subtitle
    if (typeof gameState !== 'undefined' && gameState.initialized) {
        // game already running - update immediately
        updatePlayerSubtitle(pId)
        // critical: refresh all nametags so new player can see existing players stats
        updateAllPlayerSubtitles()
    } else {
        // first player - wait for system to fully load
        setTickTimeout(() => {
            updatePlayerSubtitle(pId)
        }, 20)
    }
    
    updateSidebar()
}

// main tick loop for ui updates and reminders
let tickCounter = 0
let lastReminderTime = 0
const reminderInterval = 60000 // sends bloxdhub link every cuz why not

sendBloxdhubLink = () => {
    try {
        if (typeof getBloxdhubLink === 'function') {
            const formattedLink = getBloxdhubLink()
            api.broadcastMessage(formattedLink)
        } else {
            // fallback if helper function doesnt exist
            api.broadcastMessage([
                {str: "Reminder: Join ", style: {color: "white", fontWeight: "bold", fontSize: "1rem"}},
                {str: "https://bloxdhub.com", style: {color: "cyan", fontWeight: "bold", fontSize: "1rem"}},
                {str: " — the unofficial social hub for Bloxd players!", style: {color: "white", fontWeight: "bold", fontSize: "1rem"}}
            ])
        }
    } catch (e) {}
}

tickCodeBlock3 = () => {
    tickCounter++
    
    // refresh sidebar every second to keep player count accurate
    if (tickCounter % 20 === 0) {
        updateSidebar()
    }
    
    // periodic bloxdhub reminder - not too spammy tho
    const currentTime = Date.now()
    if (currentTime - lastReminderTime >= reminderInterval) {
        lastReminderTime = currentTime
        sendBloxdhubLink()
    }
}
