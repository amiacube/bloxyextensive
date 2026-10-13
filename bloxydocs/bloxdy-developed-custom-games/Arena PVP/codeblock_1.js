// player state tracking - using sets for quick lookups
const playerOnSpeedBlock = new Set()
const playerInArena = new Set() // tracks if player is in the PVP arena rect (combat zone)

const arenaMin = [47, 63, 37]
const arenaMax = [88, 89, 78] 

handlePlayerJoin = (pId) => {
    // spawn in lobby mode - players start in peaceful area OUTSIDE the arena
    api.setClientOption(pId, "creative", false)
    api.setClientOption(pId, "canChange", false)
    
    // disable pvp in lobby but still allow mob attacks for testing
    for (const otherId of api.getPlayerIds()) {
        if (otherId !== pId) {
            api.setOtherEntitySetting(pId, otherId, "canAttack", false)
            api.setOtherEntitySetting(otherId, pId, "canAttack", false)
        }
    }
}

handleRespawn = (pId) => {
    // send player back to lobby mode when they die - same setup as join
    playerInArena.delete(pId)
    api.setClientOption(pId, "creative", false)
    api.setClientOption(pId, "canChange", false)
    
    // re-disable pvp for this player
    for (const otherId of api.getPlayerIds()) {
        if (otherId !== pId) {
            api.setOtherEntitySetting(pId, otherId, "canAttack", false)
            api.setOtherEntitySetting(otherId, pId, "canAttack", false)
        }
    }
}

// checks what blocks players are standing on and their zone position - runs every 2 ticks for performance
// note; i could use onblockstand here, but after playing around with it, i figured it was too in-effective (keeps causing issues since it runs upto 80 ticks per second)
let blockCheckTick = 0

checkPlayerBlocks = () => {
    blockCheckTick++
    if (blockCheckTick < 2) return
    blockCheckTick = 0
    
    for (const pId of api.getPlayerIds()) {
        const blocks = api.getBlockTypesPlayerStandingOn(pId)
        const pos = api.getPosition(pId)
        
        // rect-based zone system - INSIDE rect is ARENA (combat), OUTSIDE is LOBBY (peaceful - NO pvp between players)
        const isInArena = api.isInsideRect(pos, arenaMin, arenaMax)
        
        if (isInArena) {
            if (!playerInArena.has(pId)) {
                playerInArena.add(pId)
                
                // entering ARENA - enable full combat mode with health system
                api.setClientOption(pId, "creative", false)
                api.setClientOption(pId, "canChange", false)
                api.setClientOption(pId, "invincible", false)
                api.setClientOption(pId, "initialHealth", 100)
                api.setClientOption(pId, "maxHealth", 100)
                api.setHealth(pId, 100)
                
                // enable pvp for everyone
                for (const otherId of api.getPlayerIds()) {
                    if (otherId !== pId) {
                        api.setOtherEntitySetting(pId, otherId, "canAttack", true)
                        api.setOtherEntitySetting(otherId, pId, "canAttack", true)
                    }
                }
            }
        } else {
            if (playerInArena.has(pId)) {
                playerInArena.delete(pId)
                
                // leaving ARENA - disable pvp and remove health bar
                api.setClientOption(pId, "creative", false)
                api.setClientOption(pId, "canChange", false)
                api.setHealth(pId, null) // remove health bar entirely
                
                for (const otherId of api.getPlayerIds()) {
                    if (otherId !== pId) {
                        api.setOtherEntitySetting(pId, otherId, "canAttack", false)
                        api.setOtherEntitySetting(otherId, pId, "canAttack", false)
                    }
                }
            }
        }
        
        // red concrete = speed boost pad - gives 2x speed while standing on it
        if (blocks.includes("Red Concrete")) {
            if (!playerOnSpeedBlock.has(pId)) {
                playerOnSpeedBlock.add(pId)
                api.setClientOption(pId, "speedMultiplier", 2)
            }
        } else {
            // not on red concrete anymore - instantly remove speed boost
            if (playerOnSpeedBlock.has(pId)) {
                playerOnSpeedBlock.delete(pId)
                api.setClientOption(pId, "speedMultiplier", 1)
            }
        }
    }
}

// main tick loop - checks player positions
tickCodeBlock1 = () => {
    checkPlayerBlocks()
}
