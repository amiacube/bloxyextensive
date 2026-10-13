// Using currManhunt From manhunt.js
// Using shopManager From shop.js
// Using timeoutManager, playerDataManager From managers.js


// This can be either "prod" or "dev".
// Setting it to dev will enable more verbose logs, have a shorter queue time, etc
const MODE = "prod";
globalThis.MODE = MODE;

/**
 * A basic color palette.
 * Try to use this for all colors (i.e. dont use #eeff43 anywhere, use colors.yellow)
 */
const colors = {
    red: "#ff3800",
    orange: "#c78f26",
    yellow: "yellow",
    gold: "#FFDF00",
    lightgreen: "#2eeb82",
    green: "green",
    blue: "#61f3ff",
    purple: "#c339db"
};
globalThis.colors = colors;

const sounds = {
    error(id) {
        id !== null ? api.playSound(id, "bass", 1, 1) : api.broadcastSound("bass", 1, 1);
    },
    success(id) {
        api.playSound(id, "exp_collect", 1, 1);
    },
    drum() {
        api.broadcastSound("drumSwish2", 1, 1);
    },
    runnerWin(id) {
        api.playSound(id, "trumpetFlare", 1, 1);
    },
    hunterWin(id) {
        api.playSound(id, "trumpetNote3", 1, 1);
    },
    runnerLose(id) {
        api.playSound(id, "glass", 1, 1);
    },
    hunterLose(id) {
        api.playSound(id, "laugh3", 1, 1);
    }
};
globalThis.sounds = sounds;

/**
 * How many coins each "type" gets
 */
const coinDistribution = {
    runnerWin: 40,
    hunterWin: 10,
    runnerKill: 20,
    hunterKill: 5,

    mysteryKit: -100,
    kitRefund: 40,

    parkour: 20
};
/**
 * What message gets displayed when receiving coins
 */
const coinMessages = {
    runnerWin: "for winning as the runner",
    hunterWin: "for winning as a hunter",
    runnerKill: "for killing the runner",
    hunterKill: "for killing a hunter",

    mysteryKit: "for buying a Mystery Kit",
    kitRefund: "as refund",

    parkour: "for completing the parkour"
};

/**
 * Utility functions
 */
const helpers = {
    /**
     * Turns a timestamp in milliseconds into a string of format
     * "Minutes:Seconds"
     */
    formatTime(timeMs) {
        const dT = Math.floor(timeMs / 1000);
        const s = dT % 60;
        const m = Math.floor(dT / 60);
        return `${m}:${s.toString().padStart(2, 0)}`;
    },
    /**
     * Execute a function in the next tick
     */
    queue(fn) {
        timeoutManager.setTimeout(fn, 1);
    },

    randomInt(from, to) {
        return from + Math.floor(Math.random() * (to - from + 1));
    },
    randomPick(array) {
        return array[this.randomInt(0, array.length - 1)];
    },

    distance(v1, v2) {
        const dx = v2[0] - v1[0];
        const dy = v2[1] - v1[1];
        const dz = v2[2] - v1[2];
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },

    setMiddleText(text, time, playerId) {
        if(playerId) {
            api.setClientOption(playerId, "middleTextUpper", text);
            timeoutManager.setTimeout(() => {
                api.setClientOption(playerId, "middleTextUpper", "");
            }, time / 1000 * 20);
        } else {
            for(const player of api.getPlayerIds()) {
                api.setClientOption(player, "middleTextUpper", text);
            }

            timeoutManager.setTimeout(() => {
                for(const player of api.getPlayerIds()) {
                    api.setClientOption(player, "middleTextUpper", "");
                }
            }, time / 1000 * 20);
        }
    },
    updateGTabData(id, data = playerDataManager.getPlayerData(id)) {
        let role = "Waiting";
        if(currManhunt?.running) {
            const { hunters, runner } = currManhunt.config;
            if(id === runner) role = "Runner";
            else if(hunters.includes(id)) role = "Hunter";
        }

        api.setTargetedPlayerSettingForEveryone(id, "lobbyLeaderboardValues", {
            player: api.getEntityName(id),
            role,
            kit: shopManager.kits[data.selectedKit].displayName,
            runnerWinPercent: ((data.runnerWins / data.runnerMatches * 100) || 0).toFixed(2) + "%",
            totalWins: data.totalWins,
            coins: data.coins
        }, true);

        const color = role === "Runner" ? colors.red : role === "Hunter" ? colors.lightgreen : "gray";
        api.setTargetedPlayerSettingForEveryone(id, "colorInLobbyLeaderboard", color, true);
    },

    addCoins(id, type) {
        const amount = coinDistribution[type];

        // Update data
        playerDataManager.addPlayerData(id, "coins", amount);
        shopManager.updateCoins(id, amount);

        // Send message
        const prefix = amount >= 0 ? "+" : "";
        api.sendMessage(id, [
            { str: `${prefix}${amount} Coins `,  style: { color: colors.lightgreen } },
            { str: coinMessages[type], style: { color: colors.lightgreen } }
        ]);
        if(amount >= 0) sounds.success(id);
    }
};
globalThis.helpers = helpers;