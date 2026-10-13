// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 18 - a-90 entity */
api.broadcastMessage("System 18 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const A90_STANDALONE_INTERVAL = 600
const A90_STANDALONE_COOLDOWN = 200
const A90_COMBO_CHANCE = 0.75

// a-90 keeps separate state because it can run alone or pair with a-60
globalThis.A90 = {
	active: false,
	players: {},
	lastStandaloneCheck: 0,
	lastComboCheck: 0,
	lastSpawnTime: 0,
	lastStandaloneSpawnTime: 0,
	comboPlanned: false,
	comboPending: false,
	comboSpawnAt: 0
}

globalThis.beginA90ForPlayer = (pId) => {
	// do not stack a-90 on the same player twice
	if (A90.players[pId]) return false

	const pos = api.getPosition(pId)
	if (!pos) return false

	// a-90 starts with the eye phase before it freezes the player
	A90.players[pId] = {
		startPos: null,
		startCamDir: null,
		startTime: systemTick,
		phase: "eye",
		eyeEndTime: systemTick + 14,
		stopEndTime: systemTick + 54
	}

	api.sendFlyingMiddleMessage(pId, [{ str: "\u{1F441}\uFE0F", style: { fontSize: "8rem" } }], 0, 750)
	api.playSound(pId, "reaverGrunt3", 0.50, 0.7)
	return true
}

globalThis.spawnA90ForPlayer = (pId) => {
	// a short cooldown keeps the same player from getting spammed
	if (systemTick - A90.lastSpawnTime < 200) return false
	const spawned = beginA90ForPlayer(pId)
	if (spawned) A90.lastSpawnTime = systemTick
	return spawned
}

globalThis.spawnA90ForPlayers = (playerIds) => {
	// this is the multi player version used when the game wants a group hit
	if (systemTick - A90.lastSpawnTime < 200) return false

	let spawnedAny = false
	for (const pId of playerIds) {
		if (beginA90ForPlayer(pId)) spawnedAny = true
	}

	if (spawnedAny) A90.lastSpawnTime = systemTick
	return spawnedAny
}

globalThis.getA90StandaloneChance = (furthestRoom) => {
	// the deeper the run gets, the more a-90 is allowed to appear on its own
	if (furthestRoom < 90) return 0.05
	if (furthestRoom < 200) return 0.14
	if (furthestRoom < 400) return 0.18
	return 0.22
}

globalThis.updateA90 = () => {
	// update every other tick
	if (!A90.updateTimer) A90.updateTimer = 0
	if (++A90.updateTimer < 2) return
	A90.updateTimer = 0

	for (const pId in A90.players) {
		if (!api.playerIsInGame(pId)) {
			delete A90.players[pId]
			continue
		}

		const data = A90.players[pId]

		if (data.phase === "eye") {
			// the eye phase gives the player a tiny warning before the freeze lands
			if (systemTick >= data.eyeEndTime) {
				const currentPos = api.getPosition(pId)
				const facingInfo = api.getPlayerFacingInfo(pId)
				if (!currentPos || !facingInfo) {
					delete A90.players[pId]
					continue
				}

				data.startPos = [...currentPos]
				data.startCamDir = [...facingInfo.dir]
				data.phase = "stop"

				const currentTint = api.getClientOption(pId, "cameraTint")
				data.savedTint = currentTint

				api.setClientOptions(pId, {
					cameraTint: [0.8, 0.05, 0.05, 0.85]
				})
				api.playSound(pId, "zapAccent1", 0.50, 0.2)
				api.playSound(pId, "zapAccent2", 0.50, 0.4)
				api.sendFlyingMiddleMessage(pId, [{ str: "\u{1F6D1}", style: { fontSize: "10rem" } }], 0, 2000)
				api.playSound(pId, "reaverAttack3", 0.50, 0.7)
			}
		} else if (data.phase === "stop") {
			// during the stop phase the player has to stay still and keep the same view angle
			const currentPos = api.getPosition(pId)
			const facingInfo = api.getPlayerFacingInfo(pId)
			if (!currentPos || !facingInfo) {
				delete A90.players[pId]
				continue
			}

			const dx = currentPos[0] - data.startPos[0]
			const dy = currentPos[1] - data.startPos[1]
			const dz = currentPos[2] - data.startPos[2]
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

			const currentDir = facingInfo.dir
			const dotProduct =
				data.startCamDir[0] * currentDir[0] +
				data.startCamDir[1] * currentDir[1] +
				data.startCamDir[2] * currentDir[2]

			// any movement or big camera change means the player failed the freeze
			if (dist > 0.1 || dotProduct < 0.999) {
				killPlayerA90(pId)
				delete A90.players[pId]
				continue
			}

			// if the timer runs out and they stayed still, the warning can end cleanly
			if (systemTick >= data.stopEndTime) {
				data.phase = "end"
				api.setClientOptions(pId, {
					cameraTint: data.savedTint || null
				})
				delete A90.players[pId]
			}
		}
	}
}

globalThis.getValidA90Players = () => {
	// only players inside the room chain count for the standalone check
	return api.getPlayerIds().filter((pId) => {
		const pos = api.getPosition(pId)
		if (!pos) return false
		const roomNum = typeof getRoomNum === "function" ? getRoomNum(pos[0], pos[2]) : -1
		return roomNum > 0
	})
}

globalThis.checkA90Standalone = () => {
	// a-90 stays out of the way if the bigger entities are already active
	if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return
	if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return
	if (systemTick - A90.lastStandaloneCheck < A90_STANDALONE_INTERVAL) return
	A90.lastStandaloneCheck = systemTick
	if (systemTick - A90.lastStandaloneSpawnTime < A90_STANDALONE_COOLDOWN) return

	const playerIds = getValidA90Players()
	if (playerIds.length === 0) return

	let furthestRoom = -1
	for (const pId of playerIds) {
		const pos = api.getPosition(pId)
		if (!pos) continue
		const roomNum = typeof getRoomNum === "function" ? getRoomNum(pos[0], pos[2]) : -1
		if (roomNum > furthestRoom) furthestRoom = roomNum
	}

	if (furthestRoom <= 0) return
	const chance = getA90StandaloneChance(furthestRoom)
	if (Math.random() < chance) {
		if (spawnA90ForPlayers(playerIds)) A90.lastStandaloneSpawnTime = systemTick
	}
}

globalThis.planA90Combo = () => {
	// this rolls once when a-60 is getting ready to attack
	const planned = Math.random() < A90_COMBO_CHANCE
	A90.comboPlanned = planned
	A90.comboPending = false
	A90.comboSpawnAt = 0
	return planned
}

globalThis.checkA90WithA60 = () => {
	// a-90 only joins the combo when a-60 is already active and close enough to matter
	if (typeof A60 === "undefined" || !A60.a || !A60.pos) {
		A90.comboPending = false
		A90.comboSpawnAt = 0
		return
	}
	if (!A90.comboPlanned && !A90.comboPending) return

	if (systemTick - A90.lastComboCheck < 20) return
	A90.lastComboCheck = systemTick

	if (A90.comboPending) {
		if (systemTick < A90.comboSpawnAt) return
		spawnA90ForPlayers(getValidA90Players())
		A90.comboPending = false
		A90.comboPlanned = false
		A90.comboSpawnAt = 0
		return
	}

	let shouldSpawn = false
	for (const pId of api.getPlayerIds()) {
		const pos = api.getPosition(pId)
		if (!pos) continue

		const dx = pos[0] - A60.pos[0]
		const dy = pos[1] - A60.pos[1]
		const dz = pos[2] - A60.pos[2]
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

		if (dist <= 150) {
			shouldSpawn = true
			break
		}
	}

	if (shouldSpawn) {
		A90.comboPending = true
		A90.comboSpawnAt = systemTick + 40
	}
}

globalThis.killPlayerA90 = (pId) => {
	// a-90 has a fast little death flash so the stop feels instant
	api.sendFlyingMiddleMessage(pId, [{ str: "", style: { fontSize: "10rem" } }], 0, 0)

	api.playSound(pId, "zapAccent1", 0.50, 0.2)
	api.playSound(pId, "zapAccent2", 0.50, 0.4)

	api.setClientOptions(pId, {
		cameraTint: [1.0, 1.0, 1.0, 0.9]
	})

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOptions(pId, {
			cameraTint: [0, 0, 0, 1.0]
		})
	}, 2)

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return

		if (!globalThis.lastKiller) globalThis.lastKiller = {}
		globalThis.lastKiller[pId] = "A90"

		api.applyHealthChange(pId, -100)

		setTickTimeout(() => {
			if (!api.isAlive(pId) && globalThis.lastKiller[pId] === "A90") {
				if (typeof showGuidingLightA90 === "function") {
					showGuidingLightA90(pId)
				}
				delete globalThis.lastKiller[pId]
			}
		}, 5)
	}, 14)
}

globalThis.cleanupA90Player = (pId) => {
	// a-90 only needs its per player entry cleared
	if (A90.players[pId]) {
		delete A90.players[pId]
	}
}
