// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// exciting part hehe

/* system 16 - a-60 entity (for the rooms) */
api.broadcastMessage("System 16 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const A60_SAFE_GAP = 4
const A60_GUARANTEE_GAP = 15
const A60_EARLIEST_ROOM = 56
const A60_A120_SEPARATION = 3

// a60 keeps the chase path, warning state, and spawn timing in one place
globalThis.A60_ROOMS = []
globalThis.A60 = {
	a: false,
	pos: null,
	p: [],
	sp: 6.0,
	baseSp: 6.0,
	comboSp: 2.4,
	st: 0,
	fc: 0,
	sndTimer: 0,
	warning: false,
	pending: false,
	warningSoundAt: 0,
	spawnAt: 0,
	checkTimer: 0,
	lastSpawn: -1,
	cooldownEnd: -1,
	cycleStart: 0,
	spawnedRooms: {},
	lastCheckedRoom: -1,
	delayType: "current"
}
globalThis.a60WarningCrosshair = {}

// record room for a-60 pathfinding
// each room gets stored so the chase can reuse the actual room layout
globalThis.recordA60Room = (type, px, py, pz, mirrored) => {
	A60_ROOMS.push({ type, px, py, pz, mirrored, num: A60_ROOMS.length })
}

globalThis.showA60WarningCrosshair = (pId) => {
	if (!api.playerIsInGame(pId)) return
	try {
		api.setClientOption(pId, "crosshairText", [
			{ icon: "fa-solid fa-exclamation", style: { color: "#ff4d4d", fontSize: "2.1rem", opacity: 0.95 } }
		])
		a60WarningCrosshair[pId] = 1
	} catch (_e) {}
}

globalThis.clearA60WarningCrosshair = (pId) => {
	if (a60WarningCrosshair[pId] && api.playerIsInGame(pId)) {
		try {
			api.setClientOption(pId, "crosshairText", "")
		} catch (_e) {}
	}
	delete a60WarningCrosshair[pId]
}

globalThis.spawnA60 = () => {
	// a-60 does not spawn if a-120 is already in its own active state
	if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return

	const ps = api.getPlayerIds()
	if (ps.length === 0 || A60_ROOMS.length === 0) return

	// find the backmost and furthest forward players so the path can cover the active stretch
	let minRoom = Infinity
	let maxRoom = -1
	for (const pId of ps) {
		const pPos = api.getPosition(pId)
		if (!pPos) continue
		const cr = getRoomNum(pPos[0], pPos[2])
		if (cr < minRoom) minRoom = cr
		if (cr > maxRoom) maxRoom = cr
	}

	if (minRoom === Infinity || maxRoom === -1) return

	// start 12 rooms behind the backmost player and only travel a little past the furthest player
	const startRoom = Math.max(0, minRoom - 12)
	const endRoom = Math.min(A60_ROOMS.length - 1, maxRoom + 2)

	// build the waypoint path from the stored room pieces
	// this is why the chase follows the actual room path instead of any random path
	A60.p = []
	for (let i = startRoom; i <= endRoom; i++) {
		const r = A60_ROOMS[i]
		let wp = null

		// each room type maps to its own waypoint set
		if (r.type === "spawn" && typeof SPAWN_WAYPOINTS !== "undefined") {
			wp = SPAWN_WAYPOINTS.north_south
		} else if (r.type === "cubby" && typeof CUBBY_WAYPOINTS !== "undefined") {
			wp = CUBBY_WAYPOINTS[r.mirrored ? "mirrored" : "normal"].north_south
		} else if (r.type === "curve" && typeof CURVE_WAYPOINTS !== "undefined") {
			wp = CURVE_WAYPOINTS[r.mirrored ? "mirrored" : "normal"].north_south
		} else if (r.type === "kitchen" && typeof KITCHEN_WAYPOINTS !== "undefined") {
			wp = KITCHEN_WAYPOINTS.north_south
		} else if (r.type === "closet" && typeof CLOSET_WAYPOINTS !== "undefined") {
			wp = CLOSET_WAYPOINTS.north_south
		} else if (r.type === "skinny" && typeof SKINNY_WAYPOINTS !== "undefined") {
			wp = SKINNY_WAYPOINTS[r.mirrored ? "mirrored" : "normal"].north_south
		} else if (r.type === "hallway" && typeof HALLWAY_WAYPOINTS !== "undefined") {
			wp = HALLWAY_WAYPOINTS.north_south
		}

		if (wp) {
			for (const w of wp) A60.p.push([r.px + w.x, r.py + 5, r.pz + w.z])
		}
	}

	if (A60.p.length === 0) return

	// warning state starts before the actual entity shows up
	A60.warning = true
	A60.spawnAt = systemTick + 12
	A60.warningSoundAt = systemTick + 4
	A60.st = 0
	A60.fc = 0
	A60.sndTimer = 0
	// initialize the line of sight check timer
	A60.checkTimer = 0

	// check if the a-90 combo should happen during the warning
	// if yes, a-60 slows down so the combo can breathe
	if (typeof planA90Combo === "function" && planA90Combo()) {
		A60.sp = A60.comboSp
	} else {
		A60.sp = A60.baseSp
	}

	for (const pId of api.getPlayerIds()) showA60WarningCrosshair(pId)
}

globalThis.spawnA60Test = (pId) => {
	// test spawn for devs and debugging, not part of the normal live flow
	const pos = api.getPosition(pId)
	if (!pos || A60.a || A60.warning) return false

	const y = pos[1] + 1
	const z = pos[2]
	A60.p = [
		[pos[0] - 36, y, z],
		[pos[0] - 24, y, z],
		[pos[0] - 12, y, z],
		[pos[0], y, z],
		[pos[0] + 12, y, z],
		[pos[0] + 24, y, z],
		[pos[0] + 36, y, z]
	]
	A60.warning = true
	A60.spawnAt = systemTick + 12
	A60.warningSoundAt = systemTick + 4
	A60.a = false
	A60.pos = null
	A60.fc = 0
	A60.sndTimer = 0
	A60.checkTimer = 0

	if (typeof planA90Combo === "function" && planA90Combo()) {
		A60.sp = A60.comboSp
	} else {
		A60.sp = A60.baseSp
	}

	for (const pId of api.getPlayerIds()) showA60WarningCrosshair(pId)
	return true
}

globalThis.updateA60 = () => {
	try {
		// warning state comes first, because the chase has to wake up before anything else moves
		if (A60.warning) {
			if (systemTick >= A60.spawnAt && !A60.a) {
				A60.a = true
				A60.pos = A60.p[0] ? [...A60.p[0]] : null
				A60.fc = 0
				for (const pId of api.getPlayerIds()) {
					clearA60WarningCrosshair(pId)
				}
			}

			if (systemTick >= A60.warningSoundAt) {
				for (const pId of api.getPlayerIds()) {
					api.playSound(pId, "zapAccent2", 0.03, 0.05)
				}
				A60.warningSoundAt = 999999999
			}

			if (A60.a) A60.warning = false
			return
		}

		if (!A60.a || !A60.pos || A60.p.length === 0) return

		// the current target point is the next point in the chase path
		const target = A60.p[A60.fc]
		if (!target) {
			A60.a = false
			A60.pos = null
			for (const pId of api.getPlayerIds()) {
				clearA60WarningCrosshair(pId)
			}
			return
		}

		const dx = target[0] - A60.pos[0]
		const dy = target[1] - A60.pos[1]
		const dz = target[2] - A60.pos[2]
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

		// once a-60 reaches a waypoint, move to the next one
		if (dist < 4) {
			A60.fc++
			if (A60.fc >= A60.p.length) {
				A60.a = false
				A60.pos = null
				for (const pId of api.getPlayerIds()) {
					clearA60WarningCrosshair(pId)
				}
			}
			return
		}

		const dirX = dx / dist
		const dirY = dy / dist
		const dirZ = dz / dist
		A60.pos[0] += dirX * A60.sp
		A60.pos[1] += dirY * A60.sp
		A60.pos[2] += dirZ * A60.sp

		// check line of sight to players every 10 ticks so it does not spam the server
		if (!A60.checkTimer) A60.checkTimer = 0
		if (++A60.checkTimer >= 10) {
			A60.checkTimer = 0

			// check for a-90 combo spawn while a-60 is active
			if (typeof checkA90WithA60 === "function") {
				checkA90WithA60()
			}

			// check all players at once but only every 10 ticks to reduce load
			for (const pId of api.getPlayerIds()) {
				// skip players hiding in closets
				if (playersInCloset && playersInCloset[pId] && typeof playersInCloset[pId] === "object") continue

				const pPos = api.getPosition(pId)
				if (!pPos) continue

				// only care about players who are close enough to matter
				const pdx = pPos[0] - A60.pos[0]
				const pdy = pPos[1] - A60.pos[1]
				const pdz = pPos[2] - A60.pos[2]
				const pDist = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz)

				if (pDist <= 15) {
					// compare room numbers so a-60 can see through the room chain
					const a60Room = typeof getRoomNum === "function" ? getRoomNum(A60.pos[0], A60.pos[2]) : -1
					const playerRoom = typeof getRoomNum === "function" ? getRoomNum(pPos[0], pPos[2]) : -1

					// kill if in the same room or the next room over
					const roomDiff = Math.abs(a60Room - playerRoom)
					if (roomDiff <= 1) {
						// mark that a-60 is killing this player
						if (!globalThis.lastKiller) globalThis.lastKiller = {}
						globalThis.lastKiller[pId] = "A60"

						api.applyHealthChange(pId, -100)
						if (typeof showGuidingLight === "function") {
							setTickTimeout(() => {
								if (!api.isAlive(pId) && globalThis.lastKiller[pId] === "A60") {
									showGuidingLight(pId)
									delete globalThis.lastKiller[pId]
								}
							}, 5)
						}
					}
				}
			}
		}

		// spawn a60 particle (yes... the entity was a particle all along)
		api.playParticleEffect({
			dir1: [dirX, dirY, dirZ],
			dir2: [dirX, dirY, dirZ],
			pos1: A60.pos,
			pos2: A60.pos,
			texture: "soul_0",
			minLifeTime: 0.3,
			maxLifeTime: 0.4,
			minEmitPower: A60.sp * 8,
			maxEmitPower: A60.sp * 8,
			minSize: 8.0,
			maxSize: 8.0,
			manualEmitCount: 3,
			gravity: [0, 0, 0],
			colorGradients: [
				{ timeFraction: 0, minColor: [255, 0, 0, 1], maxColor: [255, 0, 0, 1] },
				{ timeFraction: 0.85, minColor: [255, 0, 0, 1], maxColor: [255, 0, 0, 1] },
				{ timeFraction: 1, minColor: [255, 0, 0, 0], maxColor: [255, 0, 0, 0] }
			],
			velocityGradients: [
				{ timeFraction: 0, factor: 1, factor2: 1 },
				{ timeFraction: 1, factor: 0.2, factor2: 0.2 }
			],
			blendMode: 1
		})

		// play sound every few ticks while a-60 is active
		if (++A60.sndTimer >= 3) {
			A60.sndTimer = 0
			api.broadcastSound("zapAccent2", 1.0, 0.15, { playerIdOrPos: A60.pos, maxHearDist: 60, refDistance: 5 })
		}
	} catch (e) {
		api.broadcastMessage("[A60 ERROR] " + e.toString(), { color: "#ff0000" })
	}
}

globalThis.checkPlayerRoomForA60 = () => {
	// this decides when a-60 should spawn based on how far the players have pushed ahead
	if (A60.a || A60.warning || A60.pending || A60_ROOMS.length < 5) return
	if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return

	let rn = -1
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || snap.roomNum === -1) continue
		if (snap.roomNum > rn) rn = snap.roomNum
	}

	if (rn === -1) return
	if (rn < A60_EARLIEST_ROOM) return
	if (typeof A120 !== "undefined" && A120.lastSpawn !== -1 && rn <= A120.lastSpawn + A60_A120_SEPARATION) return
	if (A60.spawnedRooms[rn]) return
	if (rn <= A60.cooldownEnd) return
	if (A60.lastCheckedRoom === rn) return
	A60.lastCheckedRoom = rn

	// the farther the players get ahead, the more likely a60 is to spawn
	const roomsSinceLastSpawn = A60.lastSpawn === -1 ? A60_GUARANTEE_GAP : rn - A60.lastSpawn
	if (roomsSinceLastSpawn <= A60_SAFE_GAP) return
	const forceSpawn = roomsSinceLastSpawn >= A60_GUARANTEE_GAP
	const rampProgress = (roomsSinceLastSpawn - (A60_SAFE_GAP + 1)) / (A60_GUARANTEE_GAP - (A60_SAFE_GAP + 1))
	const chance = forceSpawn ? 1 : Math.max(0.08, Math.min(0.9, 0.08 + rampProgress * 0.82))

	const checkRooms = [rn]
	if (rn > 0) checkRooms.push(rn - 1)

	let hasNearbyClosets = false
	let delayType = "current"
	for (const checkRn of checkRooms) {
		const room = A60_ROOMS[checkRn]
		if (room && (room.type === "cubby" || room.type === "closet" || room.type === "skinny" || room.type === "hallway" || room.type === "catwalk")) {
			hasNearbyClosets = true
			if (checkRn !== rn) delayType = "previous"
			break
		}
	}

	if (!hasNearbyClosets) return
	if (forceSpawn || Math.random() < chance) {
		A60.delayType = delayType
		A60.pending = true
		A60.lastSpawn = rn
		A60.cooldownEnd = rn + A60_SAFE_GAP
		A60.spawnedRooms[rn] = true

		// warning delay changes a bit depending on whether the target room is current or previous
		const preWarningDelay = delayType === "previous"
			? 40 + Math.floor(Math.random() * 41)
			: 100 + Math.floor(Math.random() * 101)
		setTickTimeout(() => {
			if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) {
				A60.pending = false
				return
			}
			A60.pending = false
			spawnA60()
		}, preWarningDelay)
	}
}

globalThis.cleanupA60Player = (pId) => {
	clearA60WarningCrosshair(pId)
}
