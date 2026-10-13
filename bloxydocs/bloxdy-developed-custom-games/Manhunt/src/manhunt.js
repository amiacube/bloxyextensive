// Using rtpManager, timeoutManager, scoreboardManager, playerDataManager, queueManager, tipManager From managers.js
// Using shopManager From shop.js
// Using MODE, colors, sounds, helpers From utils.js


globalThis.currManhunt = null;

const LOBBY = {
    spawn: [9.5, -255, 0.5],
    spawnExtents: 100
};
globalThis.LOBBY = LOBBY;

/**
 * Handles core game functionality like game start/end, etc.
 */
class Manhunt {
    REFRESH_RATE = 20;
    config;
    startTime = -1;
    running = false;
    updateTicks = 0;
    borderCooldownDur = 5;


    /**
     * Items that the runner has to obtain.
     * If the amount is an array, it's interpreted as a range like [min, max]
     */
    possibleItems = [
        { name: "Coal", amount: [80, 100] },
        { name: "Iron Bar", amount: [20, 30] },
        { name: "Gold Bar", amount: [10, 15] },
        { name: "Diamond", amount: [3, 5] },
        { name: "Moonstone", amount: 1 },
        { name: "Super Compressed Messy Stone", amount: 1 }
    ];


    // -- Initialization --
    constructor(players) {
        this.config = this.createConfig(players);
        helpers.queue(() => this.init());
    }

    createConfig(players) {
        const config = {};

        // Constants
        config.freezeDur = 8;
        config.speedDur  = 150;

        // Apply roles (runner and hunter)
        const runnerI = helpers.randomInt(0, players.length - 1);
        const runner = players.splice(runnerI, 1)[0];

        config.runner = runner;
        config.runnerName = api.getEntityName(runner);
        config.hunters = players;
        config.hunterNames = players.map(h => api.getEntityName(h));

        // Pick item
        let { name: itemName, amount: itemAmount } = helpers.randomPick(this.possibleItems);
        // If the amount is a range, pick a random number within it
        if(Array.isArray(itemAmount)) itemAmount = helpers.randomInt(itemAmount[0], itemAmount[1]);
        config.item = { name: itemName, amount: itemAmount };

        helpers.setMiddleText([
            { str: `${config.runnerName} is runner! They need to get ${itemAmount} `, style: { color: colors.yellow }},
            { icon: itemName },
            { str: `${itemName}`, style: { color: colors.yellow }}
        ], 5000);

        return config;
    }

    initHunter(id) {
        // Hunters can't see the runner's nametag
        api.setClientOption(id, "canSeeNametagsThroughWalls", false);
        // Green nametag with "Hunter" subtext
        api.setTargetedPlayerSettingForEveryone(
            id,
            "nameTagInfo",
            {
                backgroundColor: colors.lightgreen,
                subtitle: [{ str: "Hunter", style: { color: colors.lightgreen } }],
            },
            true
        );

        if(!api.isAlive(id)) api.forceRespawn(id);
        api.setClientOption(id, "fallDamage", true);

        // Update data
        playerDataManager.addPlayerData(id, "totalMatches", 1);
        playerDataManager.addPlayerData(id, "hunterMatches", 1);
        helpers.updateGTabData(id);
    }
    initRunner() {
        const id = this.config.runner;

        api.setClientOption(id, "canSeeNametagsThroughWalls", true);
        // Red nametag with "Runner" subtext
        api.setTargetedPlayerSettingForEveryone(
            id,
            "nameTagInfo",
            {
                backgroundColor: colors.red,
                subtitle: [{ str: "Runner", style: { color: colors.red } }],
            },
            true
        );

        if(!api.isAlive(id)) api.forceRespawn(id);
        api.setClientOption(id, "fallDamage", true);

        // Update data
        playerDataManager.addPlayerData(id, "totalMatches", 1);
        playerDataManager.addPlayerData(id, "runnerMatches", 1);
        helpers.updateGTabData(id);
    }
    init() {
        api.broadcastMessage("Starting manhunt...", { color: colors.yellow });
        this.running = true;

        this.initRunner();
        for(const hunter of this.config.hunters) {
            this.initHunter(hunter);
        }

        rtpManager.RTP();

        let c = 0;
        manhuntTickCb = () => {
            if((c++ % this.REFRESH_RATE) === 0) this.onUpdate();
        };

        this.start();
        scoreboardManager.updateInMatchScoreboard();
        sounds.drum();
    }

    // -- Updates --
    updatePlayersLeft() {
        if(!this.config?.hunters) {
            this.RESET();
            return;
        }
        const { hunters, hunterNames, runner } = this.config;

        if(!api.playerIsInGame(runner)) {
            this.config.runner = null;
            this.runnerLose();
            return true;
        }
        for(let i = hunters.length - 1; i >= 0; i--) {
            const hunter = hunters[i];
            if(api.playerIsInGame(hunter)) continue;

            hunters.splice(i, 1);
            hunterNames.splice(i, 1);
        }
        if(!hunters.length) {
            this.runnerWin();
            return true;
        }
    }
    onUpdate() {
        // Sanity check
        if(!this.config?.hunters) {
            this.RESET();
            return;
        }

        this.updateTicks++;

        const { hunters, runner } = this.config;

        scoreboardManager.updateInMatchScoreboard();

        // Check if the game is over
        const isOver = this.updatePlayersLeft();
        if(isOver) return;

        if(api.getInventoryItemAmount(runner, this.config.item.name) >= this.config.item.amount) {
            this.runnerWin();
            return;
        }

        // Update the hunters' Compass Target, Waypoints and middle text
        const runnerPos = api.getPosition(runner);
        for(const hunter of hunters) {
            const hunterPos = api.getPosition(hunter);
            const distance = helpers.distance(hunterPos, runnerPos);
            const formattedDist = distance.toFixed(0);

            // Middle text
            api.setClientOption(hunter, "middleTextLower", `Distance to runner: ${formattedDist}m`);

            // Compass
            if (!api.hasItem(hunter, "Compass")) {
                api.giveItem(hunter, "Compass", 1, { customDisplayName: "Tracking Compass", customAttributes: { trackingCompass: true } });
            }
            api.setClientOption(hunter, "compassTarget", runnerPos);

            // Show waypoints to every other hunter
            for(const otherHunter of hunters) {
                if(otherHunter === hunter) continue;

                const otherHunterPos = api.getPosition(otherHunter);
                const otherHunterDist = helpers.distance(hunterPos, otherHunterPos);
                const directionalArrowDist = 50;

                if(otherHunterDist >= directionalArrowDist) {
                    api.setDirectionArrow(hunter, otherHunter, otherHunterPos, [{ str: `${api.getEntityName(otherHunter)} (Hunter)`, style: { color: colors.lightgreen }}], true, {});
                } else {
                    api.clearDirectionArrow(hunter, otherHunter);
                }
            }
        }

        this.enforceBorder();
    }

    /**
     * Teleport players outside of the border back inside
     */
    enforceBorder() {
        const spawnPos = rtpManager.position;

        if(!spawnPos) return;
        if(this.updateTicks < this.borderCooldownDur) return;

        const maxDist = 750;
        const allPlayers = [this.config.runner, ...this.config.hunters];

        // Queued to be interrupt safe, which shouldn't be an issue anymore
        helpers.queue(() => {
            for (const player of allPlayers) {
                const currentPos = api.getPosition(player);
                const newPos = [...currentPos];
                let isOutsideBorder = false;

                // Clamp the position along all 3 axes
                for (let i = 0; i < 3; i++) {
                    const dist = currentPos[i] - spawnPos[i];
                    if (Math.abs(dist) <= maxDist) continue;

                    isOutsideBorder = true;
                    newPos[i] = spawnPos[i] + Math.sign(dist) * maxDist
                }

                // Teleport back
                if(isOutsideBorder) {
                    helpers.setMiddleText("You have gone too far! Turn back!", 5000, player);
                    api.setPosition(player, newPos);
                }
            }
        });
    }

    // -- Game start --
    hunterRun(id) {
        api.applyEffect(id, "Frozen", this.config.freezeDur * 1000, {});
        api.clearInventory(id);
        shopManager.applyKitChanges(id);
    }
    start() {
        this.startTime = api.now();

        const isOver = this.updatePlayersLeft();
        if(isOver) return;

        if(!this.config?.hunters) {
            this.RESET();
            return;
        }
        const { runner, hunters, speedDur, freezeDur } = this.config;

        const allPlayers = [runner, ...hunters];
        for(const player of allPlayers) {
            api.setHealth(player, 100);
        }

        api.applyEffect(runner, "Rested Speed", speedDur * 1000, {});
        api.clearInventory(runner);
        shopManager.applyKitChanges(runner);
        for(const hunter of hunters) {
            this.hunterRun(hunter);
        }
    }

    // -- Game end --
    runnerWin() {
        const dT = api.now() - this.startTime;
        const str = `Runner won in ${helpers.formatTime(dT)}`;
        api.broadcastMessage(str, { color: colors.yellow });
        helpers.setMiddleText([{ str, style: { color: colors.yellow }}], 2000);
        if(!this.config?.hunters) {
            this.RESET();
            return;
        }
        const { runner, hunters } = this.config;
        if(runner != null) {
            sounds.runnerWin(runner);
            playerDataManager.addPlayerData(runner, "totalWins", 1);
            playerDataManager.addPlayerData(runner, "runnerWins", 1);
            helpers.addCoins(runner, "runnerWin");

        }
        for(const id of hunters) {
            sounds.hunterLose(id);
        }

        // core logic, so make sure it actually runs
        helpers.queue(() => this.endGame());
    }
    runnerLose() {
        const dT = api.now() - this.startTime;
        const str = `Runner lost in ${helpers.formatTime(dT)}`;
        api.broadcastMessage(str, { color: colors.red });
        helpers.setMiddleText([{ str, style: { color: colors.red }}], 2000);
        const runner = this.config.runner;
        const hunters = this.config.hunters;
        if(runner != null) sounds.runnerLose(runner);
        for(const id of hunters) {
            sounds.hunterWin(id);
            playerDataManager.addPlayerData(id, "totalWins", 1);
            playerDataManager.addPlayerData(id, "hunterWins", 1);
            helpers.addCoins(id, "hunterWin");
        }

        // core logic, so make sure it actually runs
        helpers.queue(() => this.endGame());
    }

    endGame() {
        this.startTime = -1;
        this.running = false;

        manhuntTickCb = null;

        queueManager.init();

        const allPlayers = [this.config.runner, ...this.config.hunters];
        for(const player of allPlayers) {
            try {
                this.resetPlayer(player);
            } catch(e) {
                //Likely a player left, but we cant call updatePlayersLeft because that could be an infinite loop
                if(MODE === "dev") console.log(`Error resetting player, likely left ${e}`);
            }
        }

        // Queue this, so onPlayerKilled can still reference it
        helpers.queue(() => currManhunt = null);

        api.broadcastMessage("Manhunt ended.", { color: colors.yellow });
    }

    resetPlayer(id) {
        api.setClientOption(id, "canSeeNametagsThroughWalls", true);
        api.setClientOption(id, "middleTextLower", "");
        api.setClientOption(id, "fallDamage", false);

        api.setTargetedPlayerSettingForEveryone(
            id,
            "nameTagInfo",
            null,
            true
        );

        helpers.updateGTabData(id);

        api.clearDirectionArrow(id, null);
        api.clearInventory(id);
        api.setTotalAura(id, 0);
        api.setHealth(id, 100, undefined, true);
        api.setPosition(id, LOBBY.spawn);
        api.setCameraDirection(id, [0, 0, -1]);

        const effects = api.getEffects(id);
        for(const effect of effects) {
            api.removeEffect(id, effect);
        }

        shopManager.removeKitChanges(id);
    }

    /**
     * Hard reset
     */
    RESET() {
        this.startTime = -1;
        this.running = false;

        manhuntTickCb = null;

        queueManager.init();
        currManhunt = null;
    }
}
globalThis.Manhunt = Manhunt;

// -- Callbacks --
let manhuntTickCb = null;
CBs.tick = () => {
    manhuntTickCb?.call();
    timeoutManager.tick();

    tipManager.tick();
};

CBs.onPlayerDamagingOtherPlayer = function (attackingEid, damagedEid, damage) {
    // Players can't hit each other outside of games
    if(!currManhunt) return "preventDamage";
    // If a player damages themselves, don't interfere
    if(attackingEid === damagedEid) return;

    if(
        currManhunt.config.hunters.includes(attackingEid) &&
        currManhunt.config.hunters.includes(damagedEid)
    ) {
        // Hunters can't damage each other, but can still deal knockback
        return 0;
    }

    // Show the attacker how much damage they dealt
    api.sendFlyingMiddleMessage(attackingEid, damage.toString(), 90);
};

CBs.onPlayerAttemptAltAction = (id, x, y, z, block) => {
    if(!currManhunt) return;

    // Prevent right-clicking a bed
    if(/^[a-zA-Z]+ Bed($|\|)/.test(block)) {
        api.sendMessage(id, [{
            str: `${api.getEntityName(id)}, beds are disabled in Manhunt!!`,
            style: { color: "Red", fontWeight: "bold", fontSize: "1.2rem" }
        }]);
        sounds.error(id);
        return "preventAction";
    }

    const itemName = api.getHeldItem(id)?.name;
    // Disallow setting compass direction and spawning in pet mobs
    if(itemName?.startsWith("Compass") || itemName?.startsWith("Caught Mob ")) {
        return "preventAction";
    }
};

CBs.onPlayerDropItem = id => {
    if(!currManhunt) return;
    const item = api.getHeldItem(id);

    // Prevent dropping kit items or the compass
    if (item?.attributes?.customAttributes?.[shopManager.itemFlag] || item?.attributes?.customAttributes?.trackingCompass) {
        return "preventDrop";
    }
};

CBs.onPlayerJoin = id => {
    // Send welcome messages
    api.sendMessage(id, [ { str: "Welcome to manhunt!", style: { color: colors.yellow } }]);
    api.sendTopRightHelper(id, "cart-shopping", "Press B for kits", { duration: 10, color: colors.gold, fontSize: "1.3rem" });


    // Set client options
    api.setClientOption(id, "autoRespawn", true);
    api.setClientOption(id, "secsToRespawn", 3);
    api.setClientOption(id, "lobbyLeaderboardInfo", {
        player: { displayName: "Player", sortPriority: 3 },
        role: { displayName: "Role", sortPriority: 4 },
        kit: { displayName: "Kit", sortPriority: 5 },
        runnerWinPercent: { displayName: "Runner win %", sortPriority: 0 },
        totalWins: { displayName: "Total Wins", sortPriority: 1 },
        coins: { displayName: "Coins", sortPriority: 2 }
    });
    api.setClientOption(id, "fallDamage", false);


    // Reset the player
    api.clearInventory(id);
    api.setTotalAura(id, 0);
    api.setPosition(id, LOBBY.spawn);
    api.setCameraDirection(id, [0, 0, -1]);

    // Moonstone Chests could be used to keep items across games
    api.removeItemCraftingRecipes(id, "Moonstone Chest");

    // Don't allow players to break the lobby
    if(MODE !== "dev") {
        api.setCantChangeBlockRect(id, LOBBY.spawn.map(coord => coord + LOBBY.spawnExtents), LOBBY.spawn.map(coord => coord - LOBBY.spawnExtents));
    }


    // Tell managers about the new player
    scoreboardManager.updateScoreboardForPlayer(id);

    if(queueManager) queueManager.onJoin(id);
    playerDataManager.init(id);

    shopManager.init(id);


    // If a game is running, add this player as a hunter
    if(currManhunt) {
        timeoutManager.setTimeout(() => {
            currManhunt.config.hunters.push(id);
            currManhunt.config.hunterNames.push(api.getEntityName(id));

            currManhunt.initHunter(id);
            currManhunt.hunterRun(id);

            // This also applies equalizer effects as necessary
            const pos = rtpManager.onRespawn(id);
            if(pos) api.setPosition(id, ...pos);
        }, 20);
    }
};

CBs.onPlayerLeave = id => {
    if(queueManager) queueManager.onLeave(id);
    if(currManhunt) {
        // If the player is a hunter, remove other hunters' direction arrows pointing to them
        let hunters = currManhunt.config.hunters;
        if (hunters.includes(id)) {
            let otherHunters = hunters.filter(hunter => hunter !== id);
            for(const hunter of otherHunters) api.clearDirectionArrow(hunter, id);
        }
    }
};

CBs.onRespawnRequest = id => {
    return rtpManager.onRespawn(id);
};


CBs.onPlayerKilledOtherPlayer = (killer, killed) => {
    // Give the killer coins as reward
    if(!currManhunt) return;
    const { hunters, runner } = currManhunt.config;

    if(killed === runner && hunters.includes(killer)) {
        helpers.addCoins(killer, "runnerKill");
    } else if(killer === runner && hunters.includes(killed)) {
        helpers.addCoins(killer, "hunterKill");
    }
};

CBs.onAttemptKillPlayer = (killedEid) => {
    if(!currManhunt) return;
    if(killedEid === currManhunt.config.runner) {
        currManhunt.runnerLose();
    }
};

CBs.onPlayerKilledOtherPlayer = CBs.onMobKilledPlayer = (_, killedId) => {
    if(!currManhunt || !currManhunt.config.hunters.includes(killedId)) return;

    shopManager.onPlayerKilled(killedId);
};