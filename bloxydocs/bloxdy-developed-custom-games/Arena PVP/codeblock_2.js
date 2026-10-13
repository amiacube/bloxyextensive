// practice dummy system - spawns 3 immortal training targets that show damage numbers
let pendingAttachments = []
let staticMobs = []
let lastMobHealths = {} // tracks health to calculate damage dealt
let mobsInitialized = {} // prevents showing fake damage during spawn
let lastAttacker = {} // tracks who last hit each dummy

// config for the 3 practice dummies - positioned in a row
const dummyConfigs = [
    {
        name: "Practice Target 1",
        pos: [36.5, 83, 57.5],
        color: "Lime",
        texture: "lime_concrete"
    },
    {
        name: "Practice Target 2",
        pos: [36.5, 83, 60.5],
        color: "Yellow",
        texture: "yellow_concrete"
    },
    {
        name: "Practice Target 3",
        pos: [36.5, 83, 54.5],
        color: "Light Blue",
        texture: "light_blue_concrete"
    }
]

const spawnStaticMob = (config) => {
    const mobId = api.attemptSpawnMob("Draugr Huntress", config.pos[0], config.pos[1], config.pos[2])
    
    if (mobId) {
        staticMobs.push({ mobId, config })
        lastMobHealths[mobId] = 999999999
        mobsInitialized[mobId] = false
        
        // completely disable all ai and movement - this mob is a statue
        api.setMobSetting(mobId, "baseWalkingSpeed", 0)
        api.setMobSetting(mobId, "baseRunningSpeed", 0)
        api.setMobSetting(mobId, "walkingSpeedMultiplier", 0)
        api.setMobSetting(mobId, "runningSpeedMultiplier", 0)
        api.setMobSetting(mobId, "jumpCount", 0)
        api.setMobSetting(mobId, "baseJumpImpulseXZ", 0)
        api.setMobSetting(mobId, "baseJumpImpulseY", 0)
        api.setMobSetting(mobId, "chaseRadius", 0)
        api.setMobSetting(mobId, "hostilityRadius", 0)
        api.setMobSetting(mobId, "attackRadius", 0)
        api.setMobSetting(mobId, "attackDamage", 0)
        api.setMobSetting(mobId, "runAwayRadius", 0)
        api.setMobSetting(mobId, "territoryRadius", 0)
        
        // silent dummy - no sounds
        api.setMobSetting(mobId, "idleSound", null)
        api.setMobSetting(mobId, "attackSound", null)
        api.setMobSetting(mobId, "hurtSound", null)
        
        // basically immortal - high enough that it never dies
        api.setMobSetting(mobId, "maxHealth", 999999999)
        api.setMobSetting(mobId, "initialHealth", 999999999)
        
        // lock position and make it face east
        api.setPosition(mobId, config.pos[0], config.pos[1], config.pos[2])
        api.setVelocity(mobId, 0, 0, 0)
        api.setEntityHeading(mobId, 90)
        
        // queue mesh attachment with delay to prevent (Common) glitches
        pendingAttachments.push({ mobId, config, delay: 30 })
    }
}

tickCodeBlock2 = () => {
    // apply colored concrete textures to dummies after spawn delay
    for (let i = pendingAttachments.length - 1; i >= 0; i--) {
        const attachment = pendingAttachments[i]
        attachment.delay--
        if (attachment.delay <= 0) {
            const blockName = `${attachment.config.color} Concrete`
            const texture = attachment.config.texture
            
            // replace all body parts with colored concrete blocks
            api.updateEntityNodeMeshAttachment(attachment.mobId, "HeadMesh", "BloxdBlock", { blockName: blockName, size: 0.5, meshOffset: [0, 0, 0] }, [0, 0.24, 0], [0, 0, 0])
            api.updateEntityNodeMeshAttachment(attachment.mobId, "LegLeftMesh", "Box", { texture: texture, width: 0.3, height: 0.8, depth: 0.3 }, [0, -0.37, 0], [0, 0, 0])
            api.updateEntityNodeMeshAttachment(attachment.mobId, "LegRightMesh", "Box", { texture: texture, width: 0.3, height: 0.8, depth: 0.3 }, [0, -0.37, 0], [0, 0, 0])
            api.updateEntityNodeMeshAttachment(attachment.mobId, "TorsoNode", "Box", { texture: texture, width: 0.5, height: 0.73, depth: 0.3 }, [0, 0.36, 0], [0, 0, 0])
            api.updateEntityNodeMeshAttachment(attachment.mobId, "ArmLeftMesh", "Box", { texture: texture, width: 0.25, height: 0.73, depth: 0.25 }, [0, -0.36, 0], [0, 0, 0])
            api.updateEntityNodeMeshAttachment(attachment.mobId, "ArmRightMesh", "Box", { texture: texture, width: 0.25, height: 0.73, depth: 0.25 }, [0, -0.36, 0], [0, 0, 0])
            // notice how we use box for the other meshes instead of bloxdblock

            mobsInitialized[attachment.mobId] = true
            pendingAttachments.splice(i, 1)
        }
    }
    
    // main dummy logic - keeps them frozen and shows damage numbers
    for (const mob of staticMobs) {
        if (api.checkValid(mob.mobId)) {
            // force position every tick to prevent any movement (would be cool if the devs could add a new API which completely disables all mob features so it becomes lifeless?)
            api.setPosition(mob.mobId, mob.config.pos[0], mob.config.pos[1], mob.config.pos[2])
            api.setVelocity(mob.mobId, 0, 0, 0)
            api.setEntityHeading(mob.mobId, 90)
            
            const currentHealth = api.getHealth(mob.mobId)
            const lastHealth = lastMobHealths[mob.mobId]
            
            // damage detection - only show if mob is fully spawned and actually took damage
            if (mobsInitialized[mob.mobId] && currentHealth < lastHealth) {
                const damage = lastHealth - currentHealth
                
                // show damage number only to the player who hit the dummy
                const attackerId = lastAttacker[mob.mobId]
                if (attackerId && api.checkValid(attackerId)) {
                    api.sendFlyingMiddleMessage(attackerId, [
                        {str: `-${Math.round(damage)}`, style: {color: "#FF0000", fontSize: "2rem", fontWeight: "bold"}}
                    ], 100)
                }
            }
            
            // instant heal back to full - makes dummy immortal smh
            api.setHealth(mob.mobId, 999999999)
            lastMobHealths[mob.mobId] = 999999999
        }
    }
}

// spawn all 3 dummies on world load
for (const config of dummyConfigs) {
    spawnStaticMob(config)
}

// track who damages the practice dummies - called from world code callback
handleDummyDamage = (playerId, mobId) => {
    // check if this is one of our practice dummies
    for (const mob of staticMobs) {
        if (mob.mobId === mobId) {
            lastAttacker[mobId] = playerId
            break
        }
    }
}
