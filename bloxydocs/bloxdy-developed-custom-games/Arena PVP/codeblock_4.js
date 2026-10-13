// codeblock 4 - ALL floating items system (weapons, armor, fruits, equip everything)
// handles spawning and maintaining all the floating item waypoints

// tracking system for all the floating items in the arena
const floatingItems = new Map()

// weapon shop configuration - each waypoint gets one weapon type
const weaponTypes = ["Chestplate", "Mace", "Spear", "Club", "Dagger", "Sword", "Crossbow", "Bow", "Bread", "Plum", "Corn", "Pear", "Cherry", "Mango"]
const material = "Diamond"

// spawn positions for weapon stations
const waypoints = [
    [96.5, 85.2, 48.5],  // Armour
    [96.5, 85.2, 44.5],  // Mace
    [96.5, 85.2, 40.5],  // Spear
    [96.5, 85.2, 36.5],  // Club
    [96.5, 85.2, 32.5],  // Dagger
    [96.5, 85.2, 28.5],  // Sword
    [92.5, 85.2, 28.5],  // Crossbow
    [88.5, 85.2, 28.5],  // Bow
    [96.5, 85.2, 66.5],  // Bread
    [96.5, 85.2, 70.5],  // Plum
    [96.5, 85.2, 74.5],  // Corn
    [96.5, 85.2, 78.5],  // Pear
    [96.5, 85.2, 82.5],  // Cherry
    [96.5, 85.2, 86.5]   // Mango 
]

// all items waypoint - cycles through all items for display
const allItemsWaypoint = [100.5, 85.2, 57.5]
const allItemsList = [
    "Diamond Sword", "Diamond Bow", "Diamond Crossbow", "Diamond Spear",
    "Diamond Dagger", "Diamond Club", "Diamond Mace", "Bread",
    "Plum", "Corn", "Pear", "Cherry"
]
let currentAllItemsIndex = 0

let currentIndex = 0
let spawningComplete = false // guard to prevent double spawning

// spawns weapon stations one by one at each waypoint
const spawnNext = () => {
    if (currentIndex < waypoints.length) {
        const [x, y, z] = waypoints[currentIndex]
        const weaponType = weaponTypes[currentIndex]
        const isArmor = weaponType === "Chestplate"
        const isFood = ["Bread", "Plum", "Corn", "Pear", "Cherry", "Mango"].includes(weaponType)
        const weaponName = isFood ? weaponType : `${material} ${weaponType}`
        const displayName = isArmor ? "Armour" : weaponType
        
        // load chunk before spawning to prevent any bugs (just incase)
        api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))
        setTickTimeout(() => {
            // spawn the floating item - players cant pick it up like norm
            const itemId = api.createItemDrop(x, y, z, weaponName, 1, false, {})
            if (itemId) {
                floatingItems.set(itemId, { x, y, z, weaponType, isArmor })
                // disable pickup for all players - they interact with it differently
                for (const pid of api.getPlayerIds()) {
                    api.setCantPickUpItem(pid, itemId)
                }
            }
            
            // spawn invisible mob as a label holder - scaled down so only nametag shows (creds to aura on youtube for this hack)
            const mobId = api.attemptSpawnMob("Wildcat", x, y - 4.2, z, {name: "s"})
            if (mobId) {
                api.scalePlayerMeshNodes(mobId, {"TorsoNode": [0, 4, 0]}) 
                api.setTargetedPlayerSettingForEveryone(mobId, "nameTagInfo", {backgroundColor: "rgba(0,0,0,0)", content: [{str: displayName, style: {fontSize: "60px", color: "#FFFFFF"}}]}, true)
                api.setMobSetting(mobId, "walkingSpeedMultiplier", 0) // frozen in place
                api.setMobSetting(mobId, "idleSound", null) // silent
            }
            
            // recursively spawn next station
            currentIndex++
            if (currentIndex < waypoints.length) {
                setTickTimeout(spawnNext, 1)
            }
        }, 1)
    }
}

// spawns the "Equip Everything" waypoint with cycling items
const spawnAllItems = () => {
    const [x, y, z] = allItemsWaypoint
    
    api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))
    setTickTimeout(() => {
        // spawn the first item
        const itemName = allItemsList[currentAllItemsIndex]
        const itemId = api.createItemDrop(x, y, z, itemName, 1, false, {})
        if (itemId) {
            floatingItems.set(itemId, { x, y, z, weaponType: "AllItems", isArmor: false, isAllItems: true })
            for (const pid of api.getPlayerIds()) {
                api.setCantPickUpItem(pid, itemId)
            }
        }
        
        // spawn nametag mob below the item - using fixed offset
        const mobY = y - 4.2
        api.getBlock(Math.floor(x), Math.floor(mobY), Math.floor(z)) // preload chunk for mob
        setTickTimeout(() => {
            const mobId = api.attemptSpawnMob("Wildcat", x, mobY, z, {name: "s"})
            if (mobId) {
                api.scalePlayerMeshNodes(mobId, {"TorsoNode": [0, 4, 0]}) 
                api.setTargetedPlayerSettingForEveryone(mobId, "nameTagInfo", {
                    backgroundColor: "rgba(0, 0, 0, 0.85)", 
                    content: [
                        {str: "Equip Everything" , style: {fontSize: "80px", color: "#00FFFF", fontWeight: "bold"}}
                    ]
                }, true)
                api.setMobSetting(mobId, "walkingSpeedMultiplier", 0)
                api.setMobSetting(mobId, "idleSound", null)
            }
        }, 2)
        
        // spawn weapons after all items
        setTickTimeout(spawnNext, 3)
    }, 1)
}

// kick off the spawn sequence 
// guard to prevent double execution
if (!spawningComplete) {
    spawningComplete = true
    spawnAllItems()
}

// flag to ensure intervals only run once
let intervalsInitialized = false

// initialize intervals after spawn completes
setTickTimeout(() => {
    if (intervalsInitialized) return
    intervalsInitialized = true
    
    // cycle through all items at the "Equip Everything" waypoint every 2 seconds
    setTickInterval(() => {
    currentAllItemsIndex = (currentAllItemsIndex + 1) % allItemsList.length
    
    // find and replace the all items station with next item
    for (const [itemId, data] of floatingItems) {
        if (data.isAllItems && api.checkValid(itemId)) {
            // delete old item first
            api.deleteItemDrop(itemId)
            floatingItems.delete(itemId)
            
            // wait a tick before spawning new one to ensure old one is gone
            setTickTimeout(() => {
                const itemName = allItemsList[currentAllItemsIndex]
                const newItemId = api.createItemDrop(data.x, data.y, data.z, itemName, 1, false, {})
                if (newItemId) {
                    floatingItems.set(newItemId, data)
                    for (const pid of api.getPlayerIds()) {
                        api.setCantPickUpItem(pid, newItemId)
                    }
                }
            }, 1)
            break
        }
    }
    }, 40)

    // respawn ALL floating items every 3 seconds to prevent despawning glitches
    // EXCEPT the "Equip Everything" item which is handled by the cycling interval
    setTickInterval(() => {
    const itemsArray = Array.from(floatingItems.entries())
    
    // stagger the respawns slightly to avoid lag spike
    itemsArray.forEach(([itemId, data], index) => {
        // skip "Equip Everything" - it's handled by the cycling interval
        if (data.isAllItems) {
            return
        }
        
        setTickTimeout(() => {
            // delete old item if it exists
            if (api.checkValid(itemId)) {
                api.deleteItemDrop(itemId)
            }
            
            // respawn the item
            let itemName
            const isFood = ["Bread", "Plum", "Corn", "Pear", "Cherry", "Mango"].includes(data.weaponType)
            if (isFood) {
                itemName = data.weaponType
            } else if (data.weaponType === "Chestplate") {
                itemName = `${material} Chestplate`
            } else {
                itemName = `${material} ${data.weaponType}`
            }
            const newItemId = api.createItemDrop(data.x, data.y, data.z, itemName, 1, false, {})
            if (newItemId) {
                floatingItems.delete(itemId)
                floatingItems.set(newItemId, data)
                for (const pid of api.getPlayerIds()) {
                    api.setCantPickUpItem(pid, newItemId)
                }
            }
        }, index * 2)
    })
    }, 60) // 60 ticks = 3 seconds
}, 100) // wait 5 seconds before starting intervals

// handle new players joining - prevent them from picking up display items
handlePlayerJoinItems = (pId) => {
    for (const itemId of floatingItems.keys()) {
        if (api.checkValid(itemId)) {
            api.setCantPickUpItem(pId, itemId)
        }
    }
}

// main tick loop - keeps items floating
tickCodeBlock4 = () => {
    // force all floating items to stay at their spawn height with upward velocity
    for (const [itemId, data] of floatingItems) {
        if (api.checkValid(itemId)) {
            api.setVelocity(itemId, 0, 1, 0)
        }
    }
}
