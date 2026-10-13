// open source note:
// this file was cleaned up after launch so it is easier to follow
// original code was minified and barely had any comments
// if you try to paste the full file into the worldcode, it may go over the 64,000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// credit for the ticktimer goes to @_frostycaveman on discord

// this file is the brain of the world
// it loads the code blocks, keeps the timers alive, routes game events, and drives the active systems
var TTimers={};{const k=(c)=>api.broadcastMessage(c,{color:"#ff9d87"}),s=TTimers;let m=1,l=0,f=0,T=0,o=Infinity,a,x=0;globalThis.setTickTimeout=(c,i=0)=>{const e=m++,t=l+i;if(s[e]=[c,t,T,0],T)s[T][3]=e;else f=e;T=e;if(t<o)o=t;a=!0;if(!i){try{c()}catch(r){k("tti: "+r)}clearTickTimeout(e)}return e};globalThis.clearTickInterval=globalThis.clearTickTimeout=(c)=>{const i=s[c];if(i){const e=i[2],t=i[3];e?s[e][3]=t:f=t;t?s[t][2]=e:T=e;delete s[c]}};globalThis.setTickInterval=(c,i)=>{const e=setTickTimeout(c,(i||=1));s[e][4]=i;return e};globalThis.processTickTimers=(_c,i)=>{if(i||++l>=o){a=!1;let e=Infinity,t=f,c=0;for(;t&&c<100;){const r=s[t],u=t;t=r?r[3]:0;if(!r)continue;c++;if(r[1]<=l){try{r[0]()}catch(n){k("tt: "+n)}if(r[4]){const n=l+r[4];r[1]=n;if(n<e)e=n}else clearTickTimeout(u)}else if(r[1]<e)e=r[1]}o=e;if(a&&x<5){x++;processTickTimers(1,!0);x--}}}}

// api calls get queued so we do not try to push too much work in a single tick
// this keeps the world from spiking when a lot of blocks and player updates fire at once
var apiQueue = []
globalThis.queueAPI = (fn) => {
	apiQueue.push(fn)
}
globalThis.processAPIQueue = () => {
	const maxPerTick = 15
	let processed = 0
	while (apiQueue.length > 0 && processed < maxPerTick) {
		const fn = apiQueue.shift()
		try {
			fn()
		} catch (e) {
			api.broadcastMessage("API Queue: " + e, { color: "#ff9d87" })
		}
		processed++
	}
}

// shared builder state
// these objects are reused by the room builders and decoration systems
var BS = { a: 0, t: "", p: 0, s: 0, d: {} }
var SR = { a: 0, p: 0, d: {} }
var DC = { a: 0, t: "", p: 0, s: 0, d: {} }

var musicBlockTick = 0
var systemTick = 0

// global runtime flags and helper state
globalThis.spawnLoreBookClaimed = {}
globalThis.JIS = "Bloxdhub.com"
globalThis.LMO = { speedMultiplier: 1, walkingSpeed: 4.7, runningSpeed: 4.7, jumpAmount: 0 }
globalThis.MAX_PLAYERS = 3
globalThis.RSP = [92.5, 128, 101.5]

// the lobby keeps one slot free so the start flow is not cramped
globalThis.getLobbySoftMax = (maxPlayers) => {
	const max = Math.max(1, Math.floor(maxPlayers || 1))
	return max <= 1 ? 1 : Math.max(1, max - 1)
}

try {
	api.setMaxPlayers(globalThis.getLobbySoftMax(globalThis.MAX_PLAYERS), globalThis.MAX_PLAYERS)
} catch (_e) {}

// player snapshot data gets refreshed every tick so the later systems can work from one clean view
// this keeps later checks from hitting the api again and again for the same info
globalThis.playerSnapshot = { tick: -1, ids: [], byId: {} }
globalThis.getPlayerSnapshot = (pId) => playerSnapshot.byId[pId] || null
globalThis.getSnapshotPlayerIds = () => playerSnapshot.ids

// join intro can be delayed a bit, so this helper retries a few times before giving up
// some worlds load slower than others, so this is safer than calling it once and hoping
globalThis.sJI = (pId, attempt) => {
	if (typeof startJoinIntro === "function") {
		startJoinIntro(pId)
		return
	}
	if ((attempt || 0) >= 20) return
	setTickTimeout(() => {
		globalThis.sJI(pId, (attempt || 0) + 1)
	}, 2)
}

globalThis.iCO = (_pId, _attempt) => false

// some systems need to know if a player already has the guiding light book
// this checks every slot because the book can move around after pickup
globalThis.playerHasGuidingLightBook = (pId) => {
	for (let i = 0; i < 36; i++) {
		let item = null
		try {
			item = api.getItemSlot(pId, i)
		} catch (_e) {
			break
		}
		if (item && item.name === "Book" && item.attributes?.customAttributes?.isGuidingLightBook) return true
	}
	return false
}

// end door win path
// if the player clicks the final aspen door, guiding light takes over and shows the win screen
// this is the clean handoff at the end of the run
globalThis.tryHandleEndDoorWin = (pId, x, y, z, block) => {
	if (block && String(block).includes("Aspen Door") === false) return false
	const clickedNames = block
		? [String(block)]
		: [api.getBlock(x, y, z), api.getBlock(x, y - 1, z), api.getBlock(x, y + 1, z)]
			.filter(Boolean)
			.map((v) => String(v))
	if (!clickedNames.some((name) => name.includes("Aspen Door"))) return false
	if (typeof showGuidingLightWin === "function") {
		showGuidingLightWin(pId)
	} else {
		api.forceRespawn(pId, globalThis.RSP || [92.5, 128, 101.5])
		api.sendMessage(pId, "You won, pretty much. To be continued...", { color: "#b3d9ff" })
	}
	return true
}

// player snapshot gets rebuilt from live api data
// every tick gets a fresh list so the chase systems always see the current state
globalThis.updatePlayerSnapshot = () => {
	const ids = api.getPlayerIds()
	const byId = {}
	for (const pId of ids) {
		const inGame = api.playerIsInGame(pId)
		const pos = inGame ? api.getPosition(pId) : null
		byId[pId] = {
			pId,
			inGame,
			pos,
			roomNum: pos && typeof getRoomNum === "function" ? getRoomNum(pos[0], pos[2]) : -1
		}
	}
	playerSnapshot.tick = systemTick
	playerSnapshot.ids = ids
	playerSnapshot.byId = byId
}

// the world code blocks live at known positions in the map
// these positions are the boot chain for the open sourced version
const BX = x, BY = y, BZ = z // note, i cencored the actual coordinates for safety reasons... (tho im sure you can already find them)
const BLOCKS = [
	[BX, BY, BZ],
	[BX, BY, BZ - 1],
	[BX, BY, BZ - 2],
	[BX, BY, BZ - 3],
	[BX, BY, BZ - 4],
	[BX, BY, BZ - 5],
	[BX, BY, BZ - 6],
	[BX, BY, BZ - 7],
	[BX, BY, BZ - 8],
	[BX, BY, BZ - 9],
	[BX, BY, BZ - 10],
	[BX, BY, BZ - 11],
	[BX, BY, BZ - 12],
	[BX, BY, BZ - 13],
	[BX, BY, BZ - 14],
	[BX, BY, BZ - 15],
	[BX, BY, BZ - 16],
	[BX, BY, BZ - 17],
	[BX, BY, BZ - 18],
	[BX, BY, BZ - 19]
]
const SYSTEMS = [
	[BX + 1, BY, BZ - 1],
	[BX + 1, BY, BZ - 5],
	[BX + 1, BY, BZ - 11],
	[BX + 1, BY, BZ - 12],
	[BX + 1, BY, BZ - 14],
	[BX + 1, BY, BZ - 15],
	[BX + 1, BY, BZ - 16],
	[BX + 1, BY, BZ - 17],
	[BX + 1, BY, BZ - 18],
	[BX + 1, BY, BZ - 19],
	[BX + 1, BY, BZ - 20],
	[BX + 1, BY, BZ - 22],
	[BX + 1, BY, BZ - 23]
]
const JOIN_INTRO_SYSTEM = [BX + 1, BY, BZ - 21]
const ROOMS = [
	[BX - 1, BY, BZ],
	[BX - 1, BY, BZ - 1],
	[BX - 1, BY, BZ - 2],
	[BX - 1, BY, BZ - 3],
	[BX - 1, BY, BZ - 4],
	[BX - 1, BY, BZ - 5],
	[BX - 1, BY, BZ - 6],
	[BX - 1, BY, BZ - 7],
	[BX - 1, BY, BZ - 8]
]

// each code block stores a full script as text, so this helper simply reads it back and executes it
const exe = (x, y, z) => eval((api.getBlockData(x, y, z)?.persisted?.shared?.text ?? ""))

var cbLoaded = false, cbToLoad = BLOCKS.length, cbLoadedCount = 0
var sysLoaded = false, sysToLoad = SYSTEMS.length + 1, sysLoadedCount = 0
var roomsLoaded = false, roomsToLoad = ROOMS.length, roomsLoadedCount = 0

// first read all scripts from the world, then execute them in a staggered order
// doing it in chunks keeps the world from trying to boot everything on the same tick
for (const item of BLOCKS) {
	api.getBlock(item[0], item[1], item[2])
}
for (const item of SYSTEMS) {
	api.getBlock(item[0], item[1], item[2])
}
api.getBlock(JOIN_INTRO_SYSTEM[0], JOIN_INTRO_SYSTEM[1], JOIN_INTRO_SYSTEM[2])
for (const item of ROOMS) {
	api.getBlock(item[0], item[1], item[2])
}

setTickTimeout(() => {
	for (const item of BLOCKS) {
		setTickTimeout(() => {
			try {
				exe(item[0], item[1], item[2])
				cbLoadedCount++
				if (cbLoadedCount >= cbToLoad) cbLoaded = true
			} catch (e) {
				cbLoadedCount++
			}
		}, BLOCKS.indexOf(item) * 4)
	}

	setTickTimeout(() => {
		try {
			exe(JOIN_INTRO_SYSTEM[0], JOIN_INTRO_SYSTEM[1], JOIN_INTRO_SYSTEM[2])
			sysLoadedCount++
			if (sysLoadedCount >= sysToLoad) sysLoaded = true
		} catch (e) {
			sysLoadedCount++
		}
	}, 0)

	for (const item of SYSTEMS) {
		setTickTimeout(() => {
			try {
				exe(item[0], item[1], item[2])
				sysLoadedCount++
				if (sysLoadedCount >= sysToLoad) sysLoaded = true
			} catch (e) {
				sysLoadedCount++
			}
		}, SYSTEMS.indexOf(item) * 4 + BLOCKS.length * 4)
	}

	for (const item of ROOMS) {
		setTickTimeout(() => {
			try {
				exe(item[0], item[1], item[2])
				roomsLoadedCount++
				if (roomsLoadedCount >= roomsToLoad) roomsLoaded = true
			} catch (e) {
				roomsLoadedCount++
			}
		}, ROOMS.indexOf(item) * 4 + BLOCKS.length * 4 + SYSTEMS.length * 4)
	}

	setTickTimeout(() => {
		if (cbLoaded && sysLoaded && roomsLoaded) {
			api.broadcastMessage("Ready!", { color: "#00ff00" })
			if (typeof ensureRideBuildStarted === "function") ensureRideBuildStarted()
		}
	}, BLOCKS.length * 4 + SYSTEMS.length * 4 + ROOMS.length * 4 + 5)
}, 10)

// main tick loop
// this is where timers, api work, room builders, and the active systems all get a turn
tick = () => {
	processTickTimers()
	processAPIQueue()
	systemTick++
	updatePlayerSnapshot()

	// builder state machine
	// the current room build decides which helper should run this tick
	if (BS.a) {
		if (BS.t === "spawn" && typeof cSpawn === "function") cSpawn()
		else if (BS.t === "cubby" && typeof cCubby === "function") cCubby()
		else if (BS.t === "curve" && typeof cCurve === "function") cCurve()
		else if (BS.t === "kitchen" && typeof cKitchen === "function") cKitchen()
		else if (BS.t === "hallway" && typeof cHallway === "function") cHallway()
		else if (BS.t === "end" && typeof cEnd === "function") cEnd()
		else if (BS.t === "catwalk" && typeof cCatwalk === "function") cCatwalk()
		else if (BS.t === "closet" && typeof cCloset === "function") cCloset()
		else if (BS.t === "skinny" && typeof cSkinny === "function") cSkinny()
		else cB()
	}

	if (SR.a) cSR()
	if (DC.a) cDC()

	// clear the music option on a steady cadence so players dont hear random cheerful music... in a horror game lel
	// some client builds keep old music alive too long if we do not refresh it
	musicBlockTick++
	if (musicBlockTick >= 40) {
		musicBlockTick = 0
		for (const pId of api.getPlayerIds()) {
			api.setClientOption(pId, "music", null)
		}
	}

	// the active systems only run after the world is fully loaded
	// this avoids weird startup bugs where the scripts exist but the game world is not ready yet
	if (sysLoaded) {
		if (typeof updateClosetPlayers === "function") updateClosetPlayers()
		if (systemTick % 2 === 0 && typeof updateA15 === "function") updateA15()
		if (systemTick % 2 === 0 && typeof updateA60 === "function") updateA60()
		if (systemTick % 2 === 0 && typeof updateA120 === "function") updateA120()
		if (typeof updateA90 === "function") updateA90()

		// these checks do not need to run every single tick
		// a slower cadence is enough and saves a lot of wasted work
		if (systemTick % 10 === 0) {
			if (typeof checkPlayerRoomForA15 === "function") checkPlayerRoomForA15()
			if (typeof checkPlayerRoomForA60 === "function") checkPlayerRoomForA60()
			if (typeof checkPlayerRoomForA120 === "function") checkPlayerRoomForA120()
			if (typeof checkA90Standalone === "function") checkA90Standalone()
		}

		// the void system only needs to react when there are enough live players around it
		// no point running the full check when the round is basically empty
		if (systemTick % 40 === 0 && typeof getFurthestVoidTarget === "function" && typeof checkVoidCondition === "function") {
			const validVoidPlayers = getSnapshotPlayerIds().filter((pId) => {
				const snap = getPlayerSnapshot(pId)
				return snap && snap.inGame && snap.pos && snap.roomNum !== -1
			})
			if (validVoidPlayers.length >= 2) {
				const furthestVoidTarget = getFurthestVoidTarget()
				if (furthestVoidTarget) {
					for (const pId of validVoidPlayers) {
						checkVoidCondition(pId, furthestVoidTarget)
					}
				}
			}
		}
	}
}

// fallback builder dispatcher
// this still keeps some older names alive because a few helper blocks expect them
// the newer room flow does not use every branch here, but the old names still exist for safety
globalThis.cB = () => {
	if (BS.t === "spawn") cSpawn()
	else if (BS.t === "cubby") cCubby()
	else if (BS.t === "curve") cCurve()
	else if (BS.t === "kitchen") cKitchen()
	else if (BS.t === "lobby") cLobby()
	else if (BS.t === "rec") cRec()
	else if (BS.t === "tun") cTun()
	else if (BS.t === "lr") cLR()
	else if (BS.t === "nr") cNR()
	else if (BS.t === "bk") cBK()
	else if (BS.t === "lhall") cLHall()
	else if (BS.t === "zr") cZR()
	else if (BS.t === "eye") cEye()
	else if (BS.t === "puzzle") cPuzzle()
	else if (BS.t === "closet") cCloset()
	else if (BS.t === "skinny") cSkinny()
}

globalThis.cDC = () => {
	if (DC.t === "dec") cDec()
	else if (DC.t === "decL") cDecL()
	else if (DC.t === "decBK") cDecBK()
	else if (DC.t === "decN") cDecN()
	else if (DC.t === "decZ") cDecZ()
}

// player join is mostly client setup plus the delayed intro start
// this is where the world strips the player down to the standard settings for the run
globalThis.onPlayerJoin = (pId) => {
	api.setPosition(pId, ...RSP)
	api.setClientOptions(pId, {
		skyBox: { type: "earth", turbidity: 30, luminance: 1.2, inclination: 0.25, azimuth: 200, infiniteDistance: 1, yCameraOffset: 5, vertexTint: [0.85, 0.7, 1.0] }, // coool custm sky box lol
		cameraTint: [0.35, 0.28, 0.45, 0.05],
		cameraRollTransitionMs: 50,
		fogChunkDistanceOverride: null,
		fogColourOverride: null,
		movementBasedFovScale: 1.4,
		canSeeNametagsThroughWalls: false,
		music: null,
		creative: false,
		canChange: false,
		invincible: false,
		speedMultiplier: LMO.speedMultiplier,
		walkingSpeed: LMO.walkingSpeed,
		runningSpeed: LMO.runningSpeed,
		jumpAmount: LMO.jumpAmount,
		initialHealth: null,
		healthRegenAmount: 0
	})
	sJI(pId, 0)
	iCO(pId, 0)
	if (typeof initVoidTracking === "function") initVoidTracking(pId)
}

// eliminated players return through the normal respawn flow, but with the game state preserved
// the lobby start system decides who gets the full reset and who stays in the run
globalThis.onRespawnRequest = (pId) => {
	const rsp = globalThis.RSP || [92.5, 128, 101.5]
	if (globalThis.lobbyStartState && lobbyStartState.started && lobbyStartState.roster && lobbyStartState.roster[pId] && lobbyStartState.eliminated && lobbyStartState.eliminated[pId]) {
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.setClientOptions(pId, {
				cameraTint: [0.35, 0.28, 0.45, 0.05],
				fogChunkDistanceOverride: null,
				fogColourOverride: null,
				usePlayAgainButton: false,
				autoRespawn: false,
				respawnButtonText: "general:respawn",
				creative: false,
				canChange: false,
				invincible: false,
				canSeeNametagsThroughWalls: false,
				speedMultiplier: LMO.speedMultiplier,
				walkingSpeed: LMO.walkingSpeed,
				runningSpeed: LMO.runningSpeed,
				jumpAmount: LMO.jumpAmount,
				initialHealth: null,
				healthRegenAmount: 0
			})
		}, 2)
		return rsp
	}
	return rsp
}

// player leave has a lot of cleanup because several systems store per-player state
// if we miss one of these, ghost data can hang around and break the next run
globalThis.onPlayerLeave = (pId) => {
	if (typeof joinIntroState !== "undefined") delete joinIntroState[pId]
	if (typeof handleLobbyStartPlayerLeave === "function") handleLobbyStartPlayerLeave(pId)
	if (typeof cleanupClosetPlayer === "function") cleanupClosetPlayer(pId)
	if (typeof cleanupDarkRoomPlayer === "function") cleanupDarkRoomPlayer(pId)
	if (typeof cleanupCameraPlayer === "function") cleanupCameraPlayer(pId)
	if (typeof cleanupProgressiveDarknessPlayer === "function") cleanupProgressiveDarknessPlayer(pId)
	if (typeof cleanupA15Player === "function") cleanupA15Player(pId)
	if (typeof cleanupA60Player === "function") cleanupA60Player(pId)
	if (typeof cleanupA120Player === "function") cleanupA120Player(pId)
	if (typeof cleanupA90Player === "function") cleanupA90Player(pId)
	if (typeof cleanupGuidingLight === "function") cleanupGuidingLight(pId)
	if (typeof cleanupVoidTracking === "function") cleanupVoidTracking(pId)
	if (typeof clearPlayerMessage === "function") clearPlayerMessage(pId)
}

// the spawn book is a one-time pickup, so this handler guards the reward path
// the chest is used as a story pickup, not a normal loot chest
globalThis.onPlayerAttemptOpenChest = (pId, x, y, z, _isMoonstoneChest, _isIronChest) => {
	if (typeof lastSpawnLoreChest === "undefined" || !lastSpawnLoreChest) return
	if (x !== lastSpawnLoreChest.x || y !== lastSpawnLoreChest.y || z !== lastSpawnLoreChest.z) return
	if (playerHasGuidingLightBook(pId)) {
		api.sendMessage(pId, "You already have the book in your inventory.", { color: "#ffff00" })
		return "preventOpen"
	}
	if (spawnLoreBookClaimed[pId]) {
		api.sendMessage(pId, "You already took this message.", { color: "#ffff00" })
		return "preventOpen"
	}
	if (api.inventoryIsFull(pId)) {
		api.sendMessage(pId, "Make one free inventory slot to receive the message.", { color: "#ffff00" })
		return "preventOpen"
	}
	api.giveItem(pId, "Book", 1, globalThis.SPAWN_LORE_BOOK_ATTRS)
	spawnLoreBookClaimed[pId] = true
	api.setClientOption(pId, "middleTextUpper", [{ str: "The Guiding Light left something for you.", style: { color: "#b3d9ff", fontSize: "1.5rem" } }])
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "middleTextUpper", "")
	}, 60)
	return "preventOpen"
}

// alt action is used for doors, closet interaction, and the final end door win
// this is where the world decides what happens when someone clicks a block
globalThis.onPlayerAttemptAltAction = (pId, x, y, z, block) => {
	try {
		if (tryHandleEndDoorWin(pId, x, y, z, block)) return "preventAction"
		if (typeof handleClosetClick === "function") {
			const result = handleClosetClick(pId, x, y, z, block)
			if (result) return result
		}
	} catch (err) {
		api.sendMessage(pId, `Error in door click: ${err}`, { color: "#FF0000" })
	}
}

// the direct alt action hook stays here because some builds still expect it to exist
globalThis.onPlayerAltAction = (_pId, _x, _y, _z, _block) => {}

// chat goes through the display system first, then the world can still react to the text if needed
// lowerMsg is kept for future hooks even if the current file does not use it yet
globalThis.onPlayerChat = (pId, msg) => {
	if (typeof handlePlayerChat === "function") {
		handlePlayerChat(pId, msg)
	}
	const lowerMsg = msg.toLowerCase()
}

// chest updates are still used by the spawn lore flow
globalThis.onChestUpdated = (_initiatorEId, _isMoonstoneChest, x, y, z) => {
	if (typeof refreshSpawnLoreChest === "function" && x !== null && y !== null && z !== null) {
		refreshSpawnLoreChest(x, y, z, _initiatorEId)
	}
}
