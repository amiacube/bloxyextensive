// Using currManhunt, LOBBY From manhunt.js
// Using MODE, colors, helpers From utils.js


/**
 * Teleports players to a random location, on the ground
 */
class RTPManager {
	range = [-100_000, 100_000];
	position;

	#getRandomPos() {
		return [
			helpers.randomInt(...this.range),
			110,
			helpers.randomInt(...this.range)
		];
	}
	#finalize(position) {
		// Teleport every player to `position`
		this.position = position;

		const allPlayers = [currManhunt.config.runner, ...currManhunt.config.hunters];
		for(const player of allPlayers) {
			api.setPosition(player, position);
		}
	}
	#rtpInternal(currPos = this.#getRandomPos()) {
		const solid = api.getBlockSolidity(...currPos);
		const loaded = api.isBlockInLoadedChunk(...currPos);

		if(!loaded) {
			// If the chunk isn't loaded yet, wait 1 tick and try again (api.getBlockSolidity will load the chunk)
			helpers.queue(() => this.#rtpInternal(currPos));
			return;
		}

		if(solid) {
			// Found ground
			// Teleport everyone to the block above it (centered)
			const pos = [ currPos[0] + 0.5, currPos[1] + 1, currPos[2] + 0.5];
			this.#finalize(pos);
			return;
		}

		const block = api.getBlock(...currPos);
		if(block === "Lava" || block === "Water") {
			// Place a block of dirt so people dont die in lava
			api.setBlock("Dirt", ...currPos);

			// Teleport everyone to the block above that (centered)
			const pos = [ currPos[0] + 0.5, currPos[1] + 1, currPos[2] + 0.5];
			this.#finalize(pos);
			return;

			/*
			Different approach: Try another random position.
			This can cause error when too many chunks are loaded, so it's commented out here.

			if(MODE === "dev") api.broadcastMessage(`Debug: Bad RTP position: ${currPos}`, { color: colors.red });
			this.#rtpInternal();
			return;
			*/
		}

		// If the current block is neither solid nor a fluid, go and check the position below
		currPos[1]--;
		this.#rtpInternal(currPos);
	}
	RTP() {
		this.#rtpInternal();
	}

	onRespawn(id) {
		// Outside of a game, respawn at the lobby
		if(!currManhunt) return LOBBY.spawn;

        // Runners and hunters get respawned at the current RTP position;
        // Hunters also get equalizer effects
		if(id === currManhunt.config.runner) return this.position;
		if(currManhunt.config.hunters?.includes(id)) {
            this.#applyEqualizerEffects(id);

            return this.position;
        }
	}
    #applyEqualizerEffects(id) {
        // Give a hunter effects to be able to catch up to the runner after they died
        const runnerPos = api.getPosition(currManhunt.config.runner);
        const distanceToRunner = helpers.distance(this.position, runnerPos);
        const elapsedTime = (api.now() - currManhunt.startTime) / 1000;

        if(distanceToRunner <= 100) return;

        let timeFactor = 0;
        if(elapsedTime > 60) {
            timeFactor = Math.pow(elapsedTime, 1.02);
        }
        let equalizerEffectDur = Math.floor((15 * Math.floor(distanceToRunner / 100)) + (timeFactor / 10)) * 1000;
        let speedDur = equalizerEffectDur;
        let jumpDur = equalizerEffectDur / 2;
        api.applyEffect(id, "Rested Speed", speedDur, {});
        api.applyEffect(id, "Jump Boost", jumpDur, {});

    }
}

/**
 * Schedule Functions for future ticks.
 * The actual logic here isn't too important to understand if you want to learn from this code.
 */
class TimeoutManager {
	queue = {};
	currTick = 0;
	interruptedLastTick = false;

	setTimeout(fn, delayTicks) {
		const execTick = this.currTick + delayTicks;
		this.queue[execTick] ??= [];
		this.queue[execTick].push(fn);
	}
	tick() {
		if(!this.interruptedLastTick) this.currTick++;

		const fns = this.queue[this.currTick];

		if(!fns) return;

		this.interruptedLastTick = true;
		for(let i = fns.length - 1; i >= 0; i--) {
			try { fns[i].call(); } catch(e) { if(MODE === "dev") console.log("Error in Timeout: ", e.message); }
			fns.pop();
		}
        delete this.queue[this.currTick];
		this.interruptedLastTick = false;
	}
}

/**
 * Handles RightInfoText
 */
class ScoreboardManager {
    // What the scoreboard currently shows
	state = "";

    stateType = null;
	// The header will always be at the top of the scoreboard
    header = { str: "\tManhunt\n", style: { color: colors.yellow, fontWeight: "Bold", fontSize: "1.5rem" } };
	// The footer will always be at the bottom
	footer = [
		{ str: "\n--------\nCheck out ", style: { fontSize: ".9rem" } },
		// +'s to bypass bloxd's chat filter
		{ str: "h+t+t+p+s+:+/+/+b+l+o+x+d+h+u+b+.+c+o+m+/".replaceAll("+",""), style: { color: colors.blue, fontWeight: "Bold", fontSize: ".9rem" } },
		{ str: "\nAn unofficial social hub for bloxd", style: { fontSize: ".8rem" } }
	];
    playerDataTexts = {};

	updateQueueScoreboard(time) {
        this.stateType = "queue";
		const timeStr = helpers.formatTime(time * 1000);

		this.setScoreboardState([
			{ str: "\nWelcome to ", style: { color: colors.yellow } },
            { str: "Manhunt", style: { color: colors.lightgreen, fontStyle: "bold" } },
            { str: "!", style: { color: colors.yellow } },

			{ str: "\nStarting in: ", style: { color: colors.yellow } },
            { str: timeStr, style: { color: colors.lightgreen } }
		]);
	}
	updateInMatchScoreboard() {
        this.stateType = "match";
		let { runnerName, hunterNames, item } = currManhunt.config;
		const { startTime } = currManhunt;

		let timeStr;
		if(startTime < 0) {
			timeStr = "0:00";
		} else {
			timeStr = helpers.formatTime(api.now() - startTime);
		}

		const scoreboardText = [
			{ str: "\nRunner's Objective: ", style: { color: colors.blue, fontStyle: "italic" } },
            { str: `${item.amount} `, style: { color: "White", fontWeight: "Bold" } },
            { icon: item.name },
            { str: `${item.name}`, style: { color: colors.lightgreen, fontWeight: "Bold" } },

			{ str: "\nTime: ", style: { color: colors.lightgreen, fontWeight: "Bold" } },
            { str: `${timeStr}` },

			{ str: "\nRunner:", style: { color: colors.red, fontWeight: "Bold" } },

			{ str: `\n\t${runnerName}` },

			{ str: "\nHunters:\n", style: { color: colors.lightgreen, fontWeight: "Bold"} },

			...hunterNames.flatMap(hunter => {
				return [
                    { str: "\t\u2022 ", style: { color: colors.lightgreen } },
                    { str: `${hunter}\n` }
                ];
			})
		];

		this.setScoreboardState(scoreboardText);
	}
	updateScoreboardForPlayer(id) {
		// Create a copy of our current state
        let state = this.state.slice();

		// If the player is in queue, append his player data (eg. wins) to the displayed state
        if(this.stateType === "queue" && this.playerDataTexts[id]) {
            state = state.concat(this.playerDataTexts[id]);
        }
		// Add the footer to the end
		state = state.concat(...this.footer);

		// Update their RightInfoText
		api.setClientOption(id, "RightInfoText", state);
	}

    playerDataConfig = {
		totalMatches: {
            display: "Total matches",
            order: 0
        },
        totalWins: {
            display: "Total wins",
            order: 1
        },
        runnerWins: {
            display: "Wins as runner",
            order: 1
        },
        coins: {
            display: "Coins",
            order: 3
        }
    };
    setPlayerData(id, data) {
        // Updates the player data text for a player
        let text = [];
        for(const key in data) {
            if(!this.playerDataConfig[key]) continue;

            const { display, order } = this.playerDataConfig[key];
            // Insert the data entry at the `order`th position.

            // Notice how we're adding an array of 2 items to the `text` array here,
            // making `text` schematically like: text = [
            //   [ string1, string2 ],
            //   [ string3, string4 ],
            //   ...
            // ];
            // The `text.flat()` call later will turn this into
            // the [ string1, string2, string3, ... ] that we actually want.
            text.splice(
                Math.min(order, text.length),
                0,
                [
                    { str: `\n${display}: `, style: { color: colors.yellow } },
                    { str: `${data[key]}`, style: { color: colors.lightgreen } }
                ]
            );
        }

        text = text.flat();

        // Empty line after the header
        text.unshift({ str: "\n" });

        this.playerDataTexts[id] = text;
    }
	setScoreboardState(state) {
        // Add the header
		state.unshift(this.header);

		this.state = state;
        // Update the state for every player
		for(const id of api.getPlayerIds()) {
			this.updateScoreboardForPlayer(id);
		}
	}
}

/**
 * Stores player data (eg. wins) inside of moonstone chest.
 * With the new database apis, doing things this way isn't necessary
 * anymore, but this was made before those were added.
 */
class PlayerDataManager {
    defaults = {
        totalMatches: 0,
		runnerMatches: 0,
		hunterMatches: 0,
        totalWins: 0,
        runnerWins: 0,
        hunterWins: 0,
		runnerKills: 0,
        hunterKills: 0,
		coins: 0,

		ownedKits: [ "default" ],
		selectedKit: "default"
    };

    constructor() {
        for(const id of api.getPlayerIds()) this.init(id);
    }

    #set(id, data) {
        api.setMoonstoneChestItemSlot(id, 0, "Fur", 1, {
            customAttributes: { manhuntData: data }
        });
        scoreboardManager.setPlayerData(id, data);
		helpers.updateGTabData(id, data);
    }
    getPlayerData(id) {
        return api.getMoonstoneChestItemSlot(id, 0)?.attributes?.customAttributes?.manhuntData;
    }
    addPlayerData(id, property, value) {
        const data = this.getPlayerData(id);
        data[property] += value;
        this.#set(id, data);
    }

    init(id) {
        const currentData = this.getPlayerData(id);

		if(currentData && currentData?.coins < 0) currentData.coins = 0;

		this.#set(id, Object.assign({}, this.defaults, currentData));
    }

    updatePlayerData(id, updatedAttributes = {}) {
		const currentData = this.getPlayerData(id);

		const newAttributes = {
			...currentData,
			...updatedAttributes
		};
		// Save the updated data
		this.#set(id, newAttributes);
	}
}

/**
 * Handles Queue, Countdown, Max Playercount, etc.
 */
class QueueManager {
	queuedPlayers;
	canPlay;
	config = {
		minPlayers: MODE === "dev" ? 2 : 2,
		maxPlayers: 6,
		startTime: MODE === "dev" ? 15: 60,
		shorterTime: 5
	};
	disabled = false;

	constructor() {
		// The `4` makes a 1v3 the recommended playercount
		api.setMaxPlayers(4, this.config.maxPlayers);
		this.init();
	}

	init(players = api.getPlayerIds().slice()) {
		this.disabled = false;
		this.queuedPlayers = new Set(players);
		this.canPlay = false;
		this.currTime = this.config.startTime;

		this.updateTime();
		this.checkPlayerCount();
	}

	updateTime(time = this.currTime - 1) {
		this.currTime = time;

		if(this.currTime <= 0) {
			if(this.canPlay) {
                // Start the game
				this.disabled = true;
				currManhunt = new Manhunt(Array.from(this.queuedPlayers).slice(0, this.config.maxPlayers));
				return;
			} else {
                // Not enough players, restart the timer
				api.broadcastMessage(`Only ${this.queuedPlayers.size}/${this.config.minPlayers} players. Wait for more to join`, { color: colors.yellow });
				this.updateTime(this.config.startTime);
				return;
			}
		}

		scoreboardManager.updateQueueScoreboard(this.currTime);

        // Update the time again after 1 second
		timeoutManager.setTimeout(() => this.updateTime(), 20);
	}

	checkPlayerCount() {
		const count = this.queuedPlayers.size;

		this.canPlay = count >= this.config.minPlayers;

        // With a full lobby, use the `shorterTime` (unless we're already below it)
		if(count >= this.config.maxPlayers && this.currTime > this.config.shorterTime) {
			api.broadcastMessage(`Lobby full, starting in ${this.config.shorterTime} seconds`, { color: colors.yellow });
			this.currTime = this.config.shorterTime;
		}
	}

	onJoin(id) {
		if(this.disabled) return;

		this.queuedPlayers.add(id);

		this.checkPlayerCount();
	}
	onLeave(id) {
		if(this.disabled) return;

		this.queuedPlayers.delete(id);

		this.checkPlayerCount();
	}
}

class TipManager {
    // Once every 2.5 minutes
    tipInterval = 150 * 20;
    #tipTickCounter = 0;

    tips = [
        "Craft gliders to go faster! Requires cotton and wood.", 
        "Craft boats to go faster! Requires wood.", 
        "Use a fat cactus as a melee weapon, it's better than a wooden sword!",
        "Loot structures to gain an advantage!",
        "Chili peppers can help the runner escape into lava!",
        "Eat fruits such as apples, plums, and pears to gain the advantage in combat!",
        "Use fruits such as coconuts, watermelons and mangos to escape!",
        "Eat carrots to view players through walls!",
        "Make armor to defend yourself!",
        "Don't worry about mobs killing you, they don't spawn!",
        "There's a border 750 blocks away from spawn!"
    ];

    broadcastTip() {
        api.broadcastMessage(`Tip: ${helpers.randomPick(this.tips)}`, { color: colors.yellow, fontWeight: "Bold" });
    }

    tick() {
        if((this.#tipTickCounter++ % this.tipInterval) === 0) this.broadcastTip();
    }
}


const rtpManager = new RTPManager();
const timeoutManager = new TimeoutManager();
const scoreboardManager = new ScoreboardManager();
const playerDataManager = new PlayerDataManager();
const queueManager = new QueueManager();
const tipManager = new TipManager();

globalThis.rtpManager = rtpManager;
globalThis.timeoutManager = timeoutManager;
globalThis.scoreboardManager = scoreboardManager;
globalThis.playerDataManager = playerDataManager;
globalThis.queueManager = queueManager;
globalThis.tipManager = tipManager;