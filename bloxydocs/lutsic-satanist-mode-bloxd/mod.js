//Satanist mode

//Required lobby settings:
//Enable Day & Night OFF
//Survival Guns OFF

//Credits:

//lutsic - developer
//Artian - tester
//Ocelot - the guy for who i stole day-night cycle code
//==================================================
// INITIALIZATION
//==================================================
onPlayerJoin = (player) => {
    api.sendMessage(player, "Satanist mode activated!");
    api.sendMessage(player, "Good luck.", { color: "red" });
    api.setDefaultMobSetting("Draugr Warper", "initialHealth", 10);
    api.setDefaultMobSetting("Draugr Warper", "onDeathAura", 0);
    api.setDefaultMobSetting("Draugr Zombie", "attackDamage", 110);
    api.setDefaultMobSetting("Frost Zombie", "attackDamage", 110);
    api.setDefaultMobSetting("Cave Golem", "attackDamage", 150);
    api.setDefaultMobSetting("Draugr Skeleton", "attackInterval", 1000);
    api.setDefaultMobSetting("Frost Skeleton", "attackInterval", 1000);
    api.setDefaultMobSetting("Magma Golem", "attackInterval", 1000);
    checkMoonstoneChest(player);
    /*CRONE*/
    api.setDefaultMobSetting("Crone", "runningSpeedMultiplier", 1.9);
    api.setDefaultMobSetting("Crone", "initialHealth", 2500);
    api.setDefaultMobSetting("Crone", "maxHealth", 2500);
    api.setDefaultMobSetting("Crone", "attackDamage", 150);
    api.setDefaultMobSetting("Crone", "chaseRadius", 1000);
    api.setDefaultMobSetting("Crone", "onDeathItemDrops", [
        {itemName:"Crone Spawn Orb", probabilityOfDrop:1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"AK-47|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"M16|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"MP40|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"TAR-21|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"M1911|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Double Barrel|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"AWP|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Deagle|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Striker-12|RequiresAmmo", probabilityOfDrop:0.05, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"DMR|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Minigun|RequiresAmmo", probabilityOfDrop:0.05, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"FMR|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"SKAR|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Block-19|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"Mini Izu|RequiresAmmo", probabilityOfDrop:0.1, dropMinAmount:1, dropMaxAmount:1,},
        {itemName:"GPMG|RequiresAmmo", probabilityOfDrop:0.05, dropMinAmount:1, dropMaxAmount:1,},
    ]);

    api.setDefaultMobSetting("Stalker", "onDeathItemDrops", [
        {itemName:"Draugr Reaver Spawn Orb", probabilityOfDrop:0.05, dropMinAmount:1, dropMaxAmount:1,},
    ]);



    //CRAFTING RECIPES
    api.editItemCraftingRecipes(player, "Crone Spawn Orb", [{
      requires: [
        { items: ["Knight Heart"], amt: 1 },
        { items: ["Rotten Flesh"], amt: 10 },
        { items: ["Rotten Brain"], amt: 5 }
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Ammo", [{
      requires: [
        { items: ["Gold Bar"], amt: 1 },
        { items: ["Iron Bar"], amt: 2 }
      ],
       produces: 3,
      station: "Workbench"
    }]);

    api.editItemCraftingRecipes(player, "Landing Pad", [{
      requires: [
        { items: ["White Wool"], amt: 8 },
        { items: ["Iron Bar"], amt: 2 }
      ],
       produces: 1,
      station: "Workbench"
    }]);

    api.editItemCraftingRecipes(player, "Kill Spikes", [{
      requires: [
        { items: ["Diamond Spikes"], amt: 16 },
        { items: ["Fireball"], amt: 16 },
        { items: ["Moonstone"], amt: 4 },
        { items: ["Golem Eye"], amt: 4 },
        { items: ["Knight Heart"], amt: 4 }
      ],
       produces: 1,
      station: "Workbench"
    }]);

    api.editItemCraftingRecipes(player, "Weak Jump Pad", [{
      requires: [
        { items: ["Landing Pad"], amt: 1 },
        { items: ["Brown Mushroom"], amt: 1 },
        { items: ["Red Mushroom"], amt: 1 },
        { items: ["Iron Bar"], amt: 2 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Jump Pad", [{
      requires: [
        { items: ["Weak Jump Pad"], amt: 1 },
        { items: ["Crystal"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Strong Jump Pad", [{
      requires: [
        { items: ["Jump Pad"], amt: 1 },
        { items: ["Gold Bar"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);
    
    api.editItemCraftingRecipes(player, "Super Jump Pad", [{
      requires: [
        { items: ["Strong Jump Pad"], amt: 1 },
        { items: ["Fireball"], amt: 8 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

    
    api.editItemCraftingRecipes(player, "Crystal", [{
      requires: [
        { items: ["Aura XP Orb"], amt: 1 },
        { items: ["Glass"], amt: 9 },
      ],
       produces: 3,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Wood Hang Glider", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 4 },
        { items: ["Cotton"], amt: 4 },
        { items: ["Moonstone"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Iron Hang Glider", [{
      requires: [
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Maple Wood Planks"], amt: 4 },
        { items: ["Cotton"], amt: 4 },
        { items: ["Moonstone"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Gold Hang Glider", [{
      requires: [
        { items: ["Gold Bar"], amt: 4 },
        { items: ["Maple Wood Planks"], amt: 4 },
        { items: ["Cotton"], amt: 4 },
        { items: ["Moonstone"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Diamond Hang Glider", [{
      requires: [
        { items: ["Diamond"], amt: 4 },
        { items: ["Maple Wood Planks"], amt: 4 },
        { items: ["Cotton"], amt: 4 },
        { items: ["Moonstone"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Light Blue Car", [{
      requires: [
        { items: ["Hyper Compressed Messy Stone"], amt: 1 },
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Gold Bar"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Off Roader", [{
      requires: [
        { items: ["Hyper Compressed Messy Stone"], amt: 1 },
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Gold Bar"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


api.editItemCraftingRecipes(player, "Red Kart", [{
      requires: [
        { items: ["Hyper Compressed Messy Stone"], amt: 1 },
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Gold Bar"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

    
api.editItemCraftingRecipes(player, "Speedboat", [{
      requires: [
        { items: ["Hyper Compressed Messy Stone"], amt: 1 },
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Gold Bar"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


api.editItemCraftingRecipes(player, "Hovercraft", [{
      requires: [
        { items: ["Hyper Compressed Messy Stone"], amt: 1 },
        { items: ["Iron Bar"], amt: 4 },
        { items: ["Gold Bar"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);



api.editItemCraftingRecipes(player, "Moonstone Remote Explosive", [{
      requires: [
        { items: ["Moonstone Explosive"], amt: 1 },
        { items: ["Iron Bar"], amt: 2 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


    
api.editItemCraftingRecipes(player, "Wood Spear", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Spear", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Spear", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Spear", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Spear", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);



api.editItemCraftingRecipes(player, "Wood Dagger", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Dagger", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Dagger", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Dagger", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Dagger", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);    




api.editItemCraftingRecipes(player, "Wood Club", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Club", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Club", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Club", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Club", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);


api.editItemCraftingRecipes(player, "Wood Mace", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Mace", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Mace", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Mace", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Mace", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);



api.editItemCraftingRecipes(player, "Wood Whip", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Whip", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Whip", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Whip", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Whip", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);




api.editItemCraftingRecipes(player, "Wood Boomerang", [{
      requires: [
        { items: ["Maple Wood Planks"], amt: 3 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Stone Boomerang", [{
      requires: [
        { items: ["Messy Stone"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Iron Boomerang", [{
      requires: [
        { items: ["Iron Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Gold Boomerang", [{
      requires: [
        { items: ["Gold Bar"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

api.editItemCraftingRecipes(player, "Diamond Boomerang", [{
      requires: [
        { items: ["Diamond"], amt: 2 },
        { items: ["Maple Wood Planks"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

    
    
    
    //HARDMODE CRAFTS
    let hardmode = api.getLobbyDbValue("hardmode");
    if (hardmode == null) {
        hardmode = 0;
        }
    if (hardmode == 1) {


        
    api.editItemCraftingRecipes(player, "Frag Grenade", [{
      requires: [
        { items: ["Iron Bar"], amt: 1 },
        { items: ["Fireball"], amt: 1 },
      ],
       produces: 2,
      station: "Workbench"
    }]);


    api.editItemCraftingRecipes(player, "Smoke Grenade", [{
      requires: [
        { items: ["Coal"], amt: 1 },
        { items: ["Frag Grenade"], amt: 1 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

        
    api.editItemCraftingRecipes(player, "Super RPG", [{
      requires: [
        { items: ["Fireball"], amt: 16 },
        { items: ["Iron Bar"], amt: 4 },
      ],
       produces: 1,
      station: "Workbench"
    }]);

        
    }
};




//==================================================
// GLOBAL VARIABLES
//==================================================

//GOD TEST
let godTestActive = false
let ticksPassed = 0
let diedToGodTest = false
//CRONE
let killed_by_crone = false
let croneBossfight = false
let cronosId = ""
//AURA
let auraBoostSecondsPassed = 0
let auraSecond = 0




//==================================================
// KILLING MOB EVENTS
//==================================================
onPlayerKilledMob = (playerId, mobId) => {
	//"God hates you" message
    let seenGodHatesYou = api.getPlayerDbValue(playerId, "seenGodHatesYou");
    if (seenGodHatesYou == null) {
        seenGodHatesYou = 0;
        }
    if (seenGodHatesYou == 0) {
        api.sendMessage(playerId, "God hates you.",  { color: "red" });
        seenGodHatesYou = 1;
        api.setPlayerDbValue(playerId, "seenGodHatesYou", seenGodHatesYou);  
    }
    // Mobs with no additional mob after killing.
    if (api.getEntityType(mobId) === "Draugr Warper") {
        return;
    }
    if (api.getEntityType(mobId) === "Magma Golem") {
        return;
    }
    if (api.getEntityType(mobId) === "Stalker") {
        return;
    }
	
	// God Test Logic | Draugr Reaver
    if (api.getEntityType(mobId) === "Draugr Reaver") {
        api.broadcastMessage("You provoked wrath of the God!", {"color":"red"})
        godTestActive = true
        api.setDefaultMobSetting("Magma Golem", "initialHealth", 9999);
        api.setDefaultMobSetting("Magma Golem", "maxHealth", 9999);
        api.setDefaultMobSetting("Magma Golem", "runningSpeedMultiplier", 2);
        api.setDefaultMobSetting("Magma Golem", "walkingSpeedMultiplier", 2);
        api.setDefaultMobSetting("Draugr Warper", "initialHealth", 9999);
        api.setDefaultMobSetting("Draugr Warper", "maxHealth", 9999);
        api.setDefaultMobSetting("Draugr Warper", "runningSpeedMultiplier", 2);
        api.setDefaultMobSetting("Draugr Warper", "walkingSpeedMultiplier", 2);
        api.getMobIds().forEach(mid=>api.despawnMob(mid));

        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Magma Golem", api.getPosition(pid)[0] - 5, api.getPosition(pid)[1], api.getPosition(pid)[2]));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Magma Golem", api.getPosition(pid)[0] + 5, api.getPosition(pid)[1], api.getPosition(pid)[2]));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Magma Golem", api.getPosition(pid)[0], api.getPosition(pid)[1], api.getPosition(pid)[2] - 5));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Magma Golem", api.getPosition(pid)[0], api.getPosition(pid)[1], api.getPosition(pid)[2] + 5));

        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Draugr Warper", api.getPosition(pid)[0] - 5, api.getPosition(pid)[1], api.getPosition(pid)[2]));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Draugr Warper", api.getPosition(pid)[0] + 5, api.getPosition(pid)[1], api.getPosition(pid)[2]));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Draugr Warper", api.getPosition(pid)[0], api.getPosition(pid)[1], api.getPosition(pid)[2] - 5));
        api.getPlayerIds().forEach(pid=>api.attemptSpawnMob("Draugr Warper", api.getPosition(pid)[0], api.getPosition(pid)[1], api.getPosition(pid)[2] + 5));
        
        return;
    }
	
	
	
	
	// Crone Killed | Hardmode activation
    if (api.getEntityType(mobId) === "Crone") {
        api.broadcastSound("horrorFright",1,0.9)
            let hardmode = api.getLobbyDbValue("hardmode");
            if (hardmode == null) {
                hardmode = 0;
                }
            if (hardmode == 0) {
            api.broadcastMessage("Horrors are spreading across the world...", { color: "red"});
                hardmode = 1;
                api.setLobbyDbValue("hardmode", hardmode);  
            }
         api.getPlayerIds().forEach(pid=>api.applyEffect(pid, "Blindness", 1, {}));
         api.setDefaultMobSetting("Crone", "attackDamage", 150);
        return;
    }   
    
	
	// Magma golem spawn
    if (api.getEntityType(mobId) === "Cave Golem" || api.getEntityType(mobId) === "Frost Golem") {
        api.applyEffect(playerId, "Speed", 5000, {});

        const pos = api.getPosition(mobId);

        api.attemptSpawnMob(
            "Magma Golem",
            pos[0],
            pos[1],
            pos[2]
        );
        return;
    }
	
	
	
    //Spawning Warper if any other mob was killed
    api.applyEffect(playerId, "Speed", 10000, {});

    const pos = api.getPosition(mobId);

    api.attemptSpawnMob(
        "Draugr Warper",
        pos[0],
        pos[1],
        pos[2]
    );
};







//==================================================
// HIT EVENTS
//==================================================
onMobDamagingPlayer = (mobId, playerId) => {
	//If warper dont do anything
    if (api.getEntityType(mobId) === "Draugr Warper") {
        return;
    }

    //If warper dont do anything
    if (api.getEntityType(mobId) === "Crone") {
        api.applyEffect(playerId, "Blindness", 99999999, {})
        api.setDefaultMobSetting("Crone", "attackDamage", 1000);
        return;
    }
	
	//Higher limit for Stalkers
        if (api.getEntityType(mobId) === "Stalker") {
        
        let walkingSpeedMultiplier = api.getMobSetting(mobId, "walkingSpeedMultiplier", true);
        walkingSpeedMultiplier += 0.1;
         if (walkingSpeedMultiplier >= 1.5) {
            api.setMobSetting(mobId, "walkingSpeedMultiplier", 1.5);
        } else {api.setMobSetting(mobId, "walkingSpeedMultiplier", walkingSpeedMultiplier);}
    
        let runningSpeedMultiplier = api.getMobSetting(mobId, "runningSpeedMultiplier", true);
        runningSpeedMultiplier += 0.1;
        if (runningSpeedMultiplier >= 1.5) {
            api.setMobSetting(mobId, "runningSpeedMultiplier", 1.5);
        } else {api.setMobSetting(mobId, "runningSpeedMultiplier", runningSpeedMultiplier);}
    
        let attackInterval = api.getMobSetting(mobId, "attackInterval", true);
        attackInterval -= 75;
            
        if (attackInterval <= 200) {
            attackInterval = 200;
            api.setMobSetting(mobId, "attackInterval", attackInterval);
        } else { api.setMobSetting(mobId, "attackInterval", attackInterval); }
            
        return;
    }
	//Boost mob stats after getting hit
    let walkingSpeedMultiplier = api.getMobSetting(mobId, "walkingSpeedMultiplier", true);
    walkingSpeedMultiplier += 0.1;
    api.setMobSetting(mobId, "walkingSpeedMultiplier", walkingSpeedMultiplier);

    let runningSpeedMultiplier = api.getMobSetting(mobId, "runningSpeedMultiplier", true);
    runningSpeedMultiplier += 0.1;
    api.setMobSetting(mobId, "runningSpeedMultiplier", runningSpeedMultiplier);

    let attackInterval = api.getMobSetting(mobId, "attackInterval", true);
    attackInterval -= 75;
    if (attackInterval <= 200) {
        attackInterval = 200;
        api.setMobSetting(mobId, "attackInterval", attackInterval);
    } else { api.setMobSetting(mobId, "attackInterval", attackInterval); }


	//Dropping aura to 0
    api.setAuraLevel(playerId, 0);
};




//==================================================
// INF EFFECT FUNCTION
//==================================================
function inf_effect(player, items, effect, food) {
        let tier = checkTier(items)
        if (tier >= 1) {
        try {
            if (items.some(item => item && item.name === food && item.amount >= 30)) {
                api.applyEffect(player, effect, 99999999, {});
            } else {
                api.applyEffect(player, effect, 1, {});
            }
            } catch (error) {
                api.log("error", String(error));
                api.applyEffect(player, effect, 1, {});
            }
        } else {api.applyEffect(player, effect, 1, {});}
}


//==================================================
// CHECK TIER FUNCTION
//==================================================
function checkTier(items) {
    let tier = 0
    
    try {
        if (items.some(item => item && item.name === "Moonstone")) {
            tier = 1
            return tier
        } else {
            tier = 0
        }
    } catch {
        return tier
    }
    
}







//==================================================
// CHECKING MOONSTONE CHEST FUNCTION
//==================================================
function checkMoonstoneChest(player) {
    let items = api.getMoonstoneChestItems(player);



    
    let tier = checkTier(items)

    inf_effect(player, items, "Mining Yield", "Beetroot")
    inf_effect(player, items, "X-Ray Vision", "Carrot")
    inf_effect(player, items, "Heat Resistance", "Chili Pepper")
    inf_effect(player, items, "Health Regen", "Cherry")
    inf_effect(player, items, "Speed", "Cracked Coconut")
    inf_effect(player, items, "Damage", "Plum")
    inf_effect(player, items, "Damage Reduction", "Pear")
    inf_effect(player, items, "Invisible", "Melon Slice")
    inf_effect(player, items, "Jump Boost", "Watermelon Slice")

    
	/*Double Jump*/
    if (tier >= 1) {
        try {
            if (items.some(item => item && item.name === "Banana" && item.amount >= 30)) {
                api.setClientOption(player, "airJumpCount", 1);
            } else {
                api.setClientOption(player, "airJumpCount", 0);
            }
            } catch (error) {
                api.log("error", String(error));
                api.setClientOption(player, "airJumpCount", 0);
            }
        

    } else {
        api.setClientOption(player, "airJumpCount", 0);
    }
}




//==================================================
// MOONSTONE CHEST UPDATED CHECK
//==================================================
onChestUpdated = (player, isMoonstoneChest) => {
    if (!isMoonstoneChest) {
        return;
    }
    checkMoonstoneChest(player);
}




//==================================================
// RANDOM INT
//==================================================
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}





//==================================================
// PLAYER SPAWN MOB
//==================================================
onPlayerSpawnMob = (player, mobId, mobType) => {
    //Crone
    if (mobType === "Crone") {
        cronosId = mobId
        croneBossfight = true
    }

    //Draugr Reaver
    if (mobType === "Draugr Reaver") {
        api.getPlayerIds().forEach(pid=>api.queueMiddleTextUpper(pid, "Reaver, the Divine Envoy summoned!", 3000))
    }
}



//==================================================
// MOB KILLED PLAYER
//==================================================
onMobKilledPlayer = (mob, player) => {
	
	//CRONE
    if (croneBossfight) {
            killed_by_crone = true
            api.despawnMob(cronosId)
            let deaths = api.getPlayerDbValue(player, "croneDeaths");
        
            if (deaths == null) {
                deaths = 0;
            }

            deaths++;
        
            api.setPlayerDbValue(player, "croneDeaths", deaths);        
            croneBossfight = false
        }



	//GOD TEST DEATH
    if (godTestActive) {
        api.setDefaultMobSetting("Magma Golem", "initialHealth", 200);
        api.setDefaultMobSetting("Magma Golem", "maxHealth", 200);
        api.setDefaultMobSetting("Magma Golem", "runningSpeedMultiplier", 1);
        api.setDefaultMobSetting("Magma Golem", "walkingSpeedMultiplier", 1);
        api.setDefaultMobSetting("Draugr Warper", "initialHealth", 10);
        api.setDefaultMobSetting("Draugr Warper", "maxHealth", 10);
        api.setDefaultMobSetting("Draugr Warper", "runningSpeedMultiplier", 1);
        api.setDefaultMobSetting("Draugr Warper", "walkingSpeedMultiplier", 1);     
        api.getMobIds().forEach(mid=>api.despawnMob(mid));
        godTestActive = false
        diedToGodTest = true
    }
	
	
	
	//KEEP INVENTORY
    return "keepInventory"      
    
}





//==================================================
// RESPAWN REQUEST
//==================================================
onRespawnRequest = (player) => {

    //BUFFS
    checkMoonstoneChest(player)
    
    
	//DEATH COUNTER and message
    let totalDeaths = api.getPlayerDbValue(player, "totalDeaths");
    if (totalDeaths == null) {
        totalDeaths = 0;
    }
    totalDeaths++;
    api.setPlayerDbValue(player, "totalDeaths", totalDeaths);    
    
    const pos = api.getPosition(player);
    api.sendMessage(player, `You died at ${Math.round(pos[0])}, ${Math.round(pos[1])}, ${Math.round(pos[2])}. Death #${totalDeaths}.`);
    

	
	//KILLED BY CRONE
	api.getPlayerIds().forEach(pid=>api.applyEffect(pid, "Blindness", 1, {}));
    api.setDefaultMobSetting("Crone", "attackDamage", 150);
    
    if (killed_by_crone) {
    api.giveItem(player, "Crone Spawn Orb") 
    killed_by_crone = false
    let deaths = api.getPlayerDbValue(player, "croneDeaths") || 0;
    api.sendMessage(player, `Attempt #${deaths}.`, {"color":"red"});

    }


	//DIED TO GOD TEST
    if (diedToGodTest){
        api.giveItem(player, "Draugr Reaver Spawn Orb")
        diedToGodTest = false
        ticksPassed = 0
    }
}






//==================================================
// ON SPAWN MOB
//==================================================
onWorldSpawnMob = (mobId, mobType, x, y, z) => {
	
    //SLIME SPAWN
	num = getRandomInt(20)
        if (num == 0) {
            api.despawnMob(mobId)
            api.attemptSpawnMob("Slime", x, y, z)
        } else {


    
	//STALKER SPAWN IF HARDMODE
    let hardmode = api.getLobbyDbValue("hardmode");
    if (hardmode == null) {
        hardmode = 0;
        }
    if (hardmode == 1) {
        num = getRandomInt(3)
        if (num == 0) {
            api.despawnMob(mobId)
            api.attemptSpawnMob("Stalker", x, y, z)
        }
    }
}

    
}


//==================================================
// SPAWN 67
//==================================================
onPlayerChat = (player, message) => {
    if (message == "67") {
        const pos = api.getPosition(player)
        api.attemptSpawnMob("67", pos[0], pos[1], pos[2])
    }
}





//==================================================
// DAY NIGHT CYCLE
//==================================================
function getTimeColor(index) {
index=index%10000
let segmentSize = 10000 / 11;
let segment = Math.floor((index - 1) / segmentSize);
let positionInSegment = (index - 1) % segmentSize;
let ratio = positionInSegment / segmentSize;
let r, g, b;
switch (segment) {
case 0:
r = 255;
g = Math.round(255 * (1 - ratio/2));
b = Math.round(255 * (1 - ratio));
break;
case 1:
r = Math.round(255 * (1 - ratio));
g = Math.round(255 * (0.5 - ratio/2));
b = 0;
break;
case 2:
case 3:
case 4:
r = 0;
g = 0;
b = 0;
break;
case 5:
r = Math.round(255 * ratio);
g = Math.round(255 * ratio/2);
b = 0;
break;
case 6:
r = 255;
g = Math.round(255 * ((1/2)+(ratio/2)));
b = Math.round(255 * ratio);
break;
case 7:
case 8:
case 9:
case 10:
r = 255;
g = 255;
b = 255;
break;
default:
return [255,255,255];
}
return [r,g,b];
}


//==================================================
// EMOTE EVENT | AURA USE
//==================================================
onPlayerPlayedEmote = (player) => {
    auraBoostSeconds = api.getAuraInfo(player).level
    if (auraBoostSeconds == undefined) {
        auraBoostSeconds = 0;
    }
    
    api.setPlayerDbValue(player, "auraBoostSeconds", auraBoostSeconds);    

}

//==================================================
// AURA USE FUNCTION
//==================================================
function use_aura(player) {
    let auraBoostSeconds = api.getPlayerDbValue(player, "auraBoostSeconds");
    if (auraBoostSeconds == null) {
        auraBoostSeconds = 0;
    }
    if (auraBoostSeconds > 0) {
        auraSecond += 0.05
        if (auraSecond >= 1) {
            auraBoostSeconds -= 1
            api.setAuraLevel(player, auraBoostSeconds)
            api.setPlayerDbValue(player, "auraBoostSeconds", auraBoostSeconds);
            auraSecond = 0
            api.setClientOption(player, "dealingDamageMultiplier", 2)
        }
    } else {api.setClientOption(player, "dealingDamageMultiplier", 1)}
}


//==================================================
// CHOOSING PLAYERS TO CHASE
//==================================================
function choose_players () {
    let allPlayers = api.getPlayerIds()

    api.getMobIds().forEach(mid=>api.setMobAiState(mid, "chasing", {"targetId": allPlayers[getRandomInt(allPlayers.length)]}))
}





//==================================================
// TICK UPDATE
//==================================================
tick = () => {
	
// DAY NIGHT
if (!godTestActive) {
api.getPlayerIds().forEach(pid=>api.setClientOption(pid,"skyBox",{ type: "earth", vertexTint:getTimeColor((api.now()/120/*how long the cycle should last, in multiples of 10 seconds*/)%10000)}));
}

// AURA DAMAGE BOOST
api.getPlayerIds().forEach(pid=>use_aura(pid))

    
// CRONE
if (croneBossfight) {
    try {
    api.getPlayerIds().forEach(pid=>api.queueMiddleTextLower(pid, `${api.getHealth(cronosId)}/2500`, 25))
    }
    catch {
        croneBossfight = false
    }
}



// GOD TEST
if (godTestActive) {
    ticksPassed++
    
    api.getPlayerIds().forEach(pid=>api.setClientOption(pid,"skyBox",{ type: "earth", vertexTint:[getRandomInt(255),getRandomInt(255),getRandomInt(255)]}));
    
    api.getPlayerIds().forEach(pid=>api.queueMiddleTextLower(pid, `${Math.round(60 - (ticksPassed/20))}s`, 38))

    
    choose_players()

    
    api.getPlayerIds().forEach(pid=>api.removeItemName(pid, "Wood Hang Glider", 1))
    api.getPlayerIds().forEach(pid=>api.removeItemName(pid, "Iron Hang Glider", 1))
    api.getPlayerIds().forEach(pid=>api.removeItemName(pid, "Gold Hang Glider", 1))
    api.getPlayerIds().forEach(pid=>api.removeItemName(pid, "Diamond Hang Glider", 1))
    
    if (ticksPassed/20 > 60) {
        api.setDefaultMobSetting("Magma Golem", "initialHealth", 200);
        api.setDefaultMobSetting("Magma Golem", "maxHealth", 200);
        api.setDefaultMobSetting("Magma Golem", "runningSpeedMultiplier", 1);
        api.setDefaultMobSetting("Magma Golem", "walkingSpeedMultiplier", 1);
        api.setDefaultMobSetting("Draugr Warper", "initialHealth", 10);
        api.setDefaultMobSetting("Draugr Warper", "maxHealth", 10);
        api.setDefaultMobSetting("Draugr Warper", "runningSpeedMultiplier", 1);
        api.setDefaultMobSetting("Draugr Warper", "walkingSpeedMultiplier", 1);  
        api.broadcastMessage("God is impressed!", {"color":"red"})
        godTestActive = false
        api.getPlayerIds().forEach(pid=>api.queueMiddleTextUpper(pid, "You are an Angel!", 10000))
        api.getPlayerIds().forEach(pid=>api.setPlayerGamemode(pid, "creative"))
        api.getMobIds().forEach(mid=>api.despawnMob(mid));
        ticksPassed = 0
    }
}

    
} 
