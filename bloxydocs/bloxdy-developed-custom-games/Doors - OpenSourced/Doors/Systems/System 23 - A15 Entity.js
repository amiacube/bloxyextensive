// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references


// most boring entity in the game ._.
/* system 23 - a15 entity */
api.broadcastMessage("System 23 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const A15_SAFE_GAP = 4
const A15_GUARANTEE_GAP = 13
const A15_EARLIEST_ROOM = 10
const A15_LAST_ROOM = 54

// yea idk man this system is p much a clone of entity a60
globalThis.A15 = {
	a: false,
	pos: null,
	p: [],
	sp: 3.0,
	fc: 0,
	sndTimer: 0,
	warning: false,
	pending: false,
	warningSoundAt: 0,
	spawnAt: 0,
	checkTimer: 0,
	lastSpawn: -1,
	lastCheckedRoom: -1,
	cooldownEnd: -1,
	spawnedRooms: {}
}

globalThis.getA15WaypointSet = (room) => {
	// a15 follows the same room pieces as the other entity systems
	if (!room) return null
	if (room.type === "spawn" && typeof SPAWN_WAYPOINTS !== "undefined") return SPAWN_WAYPOINTS.north_south
	if (room.type === "cubby" && typeof CUBBY_WAYPOINTS !== "undefined") return CUBBY_WAYPOINTS[room.mirrored ? "mirrored" : "normal"].north_south
	if (room.type === "curve" && typeof CURVE_WAYPOINTS !== "undefined") return CURVE_WAYPOINTS[room.mirrored ? "mirrored" : "normal"].north_south
	if (room.type === "kitchen" && typeof KITCHEN_WAYPOINTS !== "undefined") return KITCHEN_WAYPOINTS.north_south
	if (room.type === "closet" && typeof CLOSET_WAYPOINTS !== "undefined") return CLOSET_WAYPOINTS.north_south
	if (room.type === "skinny" && typeof SKINNY_WAYPOINTS !== "undefined") return SKINNY_WAYPOINTS[room.mirrored ? "mirrored" : "normal"].north_south
	if (room.type === "hallway" && typeof HALLWAY_WAYPOINTS !== "undefined") return HALLWAY_WAYPOINTS.north_south
	if (room.type === "catwalk" && typeof CATWALK_WAYPOINTS !== "undefined") return CATWALK_WAYPOINTS.north_south
	return null
}

globalThis.showA15Warning = () => {
	// the warning is short and simple so this is p much a tutorial for the player to understand
	for (const pId of api.getPlayerIds()) {
		if (!api.playerIsInGame(pId)) continue
		api.sendFlyingMiddleMessage(pId, [{ str: "he's coming!", style: { color: "#d18bff", fontSize: "2rem" } }], 0, 5200)
	}
}

globalThis.spawnA15 = () => {
	// do not overlap with the later entities
	if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return false
	if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return false
	if (!A60_ROOMS.length) return false

	let minRoom = Infinity
	let maxRoom = -1
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || snap.roomNum === -1) continue
		if (snap.roomNum < minRoom) minRoom = snap.roomNum
		if (snap.roomNum > maxRoom) maxRoom = snap.roomNum
	}
	if (minRoom === Infinity || maxRoom === -1) return false

	const startRoom = Math.max(0, minRoom - 8)
	const endRoom = Math.min(A60_ROOMS.length - 1, maxRoom + 1)
	if (startRoom > endRoom) return false

	// a15 only makes sense if the current stretch still has proper hide rooms
	let hasNearbyClosets = false
	for (let i = Math.max(0, maxRoom - 1); i <= Math.min(A60_ROOMS.length - 1, maxRoom); i++) {
		const room = A60_ROOMS[i]
		if (room && (room.type === "cubby" || room.type === "closet" || room.type === "skinny" || room.type === "hallway" || room.type === "catwalk")) {
			hasNearbyClosets = true
			break
		}
	}
	if (!hasNearbyClosets) return false

	const path = []
	for (let i = startRoom; i <= endRoom; i++) {
		const room = A60_ROOMS[i]
		const wp = getA15WaypointSet(room)
		if (!wp) continue
		for (const w of wp) path.push([room.px + w.x, room.py + 5, room.pz + w.z])
	}
	if (!path.length) return false

	A15.p = path
	A15.pos = null
	A15.fc = 0
	A15.a = false
	A15.warning = true
	A15.pending = false
	A15.warningSoundAt = systemTick + 6
	A15.warningRepeatAt = systemTick + 22
	A15.spawnAt = systemTick + 42
	A15.sndTimer = 0
	A15.checkTimer = 0
	showA15Warning()
	return true
}

globalThis.spawnA15Test = (pId) => {
	// quick test spawn for debugging the chase path
	const pos = api.getPosition(pId)
	if (!pos || A15.a || A15.warning) return false

	const y = pos[1] + 1
	const z = pos[2]
	A15.p = [
		[pos[0] - 30, y, z],
		[pos[0] - 20, y, z],
		[pos[0] - 10, y, z],
		[pos[0], y, z],
		[pos[0] + 10, y, z],
		[pos[0] + 20, y, z],
		[pos[0] + 30, y, z]
	]
	A15.pos = null
	A15.fc = 0
	A15.a = false
	A15.warning = true
	A15.warningSoundAt = systemTick + 5
	A15.warningRepeatAt = systemTick + 18
	A15.spawnAt = systemTick + 36
	A15.sndTimer = 0
	A15.checkTimer = 0
	showA15Warning()
	return true
}

globalThis.updateA15 = () => {
	try {
		// warning first, chase second
		if (A15.warning) {
			if (systemTick >= A15.warningSoundAt) {
				for (const pId of api.getPlayerIds()) {
					api.playSound(pId, "horrorMaleDrone", 0.55, 0.62)
				}
				A15.warningSoundAt = 999999999
			}

			if (systemTick >= A15.warningRepeatAt && systemTick < A15.spawnAt) {
				for (const pId of api.getPlayerIds()) {
					api.playSound(pId, "horrorMaleDrone", 0.48, 0.56)
				}
				A15.warningRepeatAt = 999999999
			}

			if (systemTick >= A15.spawnAt && !A15.a) {
				A15.a = true
				A15.pos = A15.p[0] ? [...A15.p[0]] : null
				A15.fc = 0
			}

			if (A15.a) A15.warning = false
			return
		}

		if (!A15.a || !A15.pos || !A15.p.length) return

		const target = A15.p[A15.fc]
		if (!target) {
			A15.a = false
			A15.pos = null
			return
		}

		const dx = target[0] - A15.pos[0]
		const dy = target[1] - A15.pos[1]
		const dz = target[2] - A15.pos[2]
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist < 4) {
			A15.fc++
			if (A15.fc >= A15.p.length) {
				A15.a = false
				A15.pos = null
			}
			return
		}

		const dirX = dx / dist
		const dirY = dy / dist
		const dirZ = dz / dist
		A15.pos[0] += dirX * A15.sp
		A15.pos[1] += dirY * A15.sp
		A15.pos[2] += dirZ * A15.sp

		// line of sight checks are throttled so this does not get noisy
		if (++A15.checkTimer >= 10) {
			A15.checkTimer = 0
			for (const pId of api.getPlayerIds()) {
				if (playersInCloset && playersInCloset[pId] && typeof playersInCloset[pId] === "object") continue

				const pPos = api.getPosition(pId)
				if (!pPos) continue

				const pdx = pPos[0] - A15.pos[0]
				const pdy = pPos[1] - A15.pos[1]
				const pdz = pPos[2] - A15.pos[2]
				if (Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz) > 15) continue

				const a15Room = typeof getRoomNum === "function" ? getRoomNum(A15.pos[0], A15.pos[2]) : -1
				const playerRoom = typeof getRoomNum === "function" ? getRoomNum(pPos[0], pPos[2]) : -1
				if (Math.abs(a15Room - playerRoom) <= 1) {
					if (!globalThis.lastKiller) globalThis.lastKiller = {}
					globalThis.lastKiller[pId] = "A15"

					api.applyHealthChange(pId, -100)
					if (typeof showGuidingLight === "function") {
						setTickTimeout(() => {
							if (!api.isAlive(pId) && globalThis.lastKiller[pId] === "A15") {
								showGuidingLight(pId)
								delete globalThis.lastKiller[pId]
							}
						}, 5)
					}
				}
			}
		}

		api.playParticleEffect({
			dir1: [dirX, dirY, dirZ],
			dir2: [dirX, dirY, dirZ],
			pos1: A15.pos,
			pos2: A15.pos,
			texture: "soul_0",
			minLifeTime: 0.28,
			maxLifeTime: 0.38,
			minEmitPower: A15.sp * 7,
			maxEmitPower: A15.sp * 7,
			minSize: 6.4,
			maxSize: 6.4,
			manualEmitCount: 3,
			gravity: [0, 0, 0],
			colorGradients: [
				{ timeFraction: 0, minColor: [184, 96, 255, 1], maxColor: [184, 96, 255, 1] },
				{ timeFraction: 0.85, minColor: [184, 96, 255, 1], maxColor: [184, 96, 255, 1] },
				{ timeFraction: 1, minColor: [184, 96, 255, 0], maxColor: [184, 96, 255, 0] }
			],
			velocityGradients: [
				{ timeFraction: 0, factor: 1, factor2: 1 },
				{ timeFraction: 1, factor: 0.2, factor2: 0.2 }
			],
			blendMode: 1
		})

		if (++A15.sndTimer >= 3) {
			A15.sndTimer = 0
			api.broadcastSound("zapAccent2", 1.0, 0.15, { playerIdOrPos: A15.pos, maxHearDist: 60, refDistance: 5 })
		}
	} catch (e) {
		api.broadcastMessage("[A15 ERROR] " + e.toString(), { color: "#ff0000" })
	}
}

globalThis.checkPlayerRoomForA15 = () => {
	// a15 is the early game check, so it stays in the first chunk of rooms
	if (A15.a || A15.warning || A15.pending || A60_ROOMS.length < 5) return
	if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return
	if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return

	let rn = -1
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || snap.roomNum === -1) continue
		if (snap.roomNum > rn) rn = snap.roomNum
	}

	if (rn === -1 || rn < A15_EARLIEST_ROOM || rn >= A15_LAST_ROOM + 1) return
	if (rn <= A15.cooldownEnd) return
	if (A15.lastCheckedRoom === rn) return
	A15.lastCheckedRoom = rn

	const roomsSinceLastSpawn = A15.lastSpawn === -1 ? rn - A15_EARLIEST_ROOM : rn - A15.lastSpawn
	if (roomsSinceLastSpawn <= A15_SAFE_GAP) return
	const forceSpawn = roomsSinceLastSpawn >= A15_GUARANTEE_GAP
	const rampProgress = (roomsSinceLastSpawn - (A15_SAFE_GAP + 1)) / (A15_GUARANTEE_GAP - (A15_SAFE_GAP + 1))
	const chance = forceSpawn ? 1 : Math.max(0.1, Math.min(0.88, 0.1 + rampProgress * 0.78))

	// a15 only spawns if the current room stretch still contains hide rooms
	const room = A60_ROOMS[rn]
	if (!room || (room.type !== "cubby" && room.type !== "closet" && room.type !== "skinny" && room.type !== "hallway" && room.type !== "catwalk")) return

	if (forceSpawn || Math.random() < chance) {
		A15.pending = true
		A15.lastSpawn = rn
		A15.cooldownEnd = rn + A15_SAFE_GAP

		setTickTimeout(() => {
			A15.pending = false
			if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return
			if (typeof A120 !== "undefined" && (A120.a || A120.warning || A120.pending)) return
			spawnA15()
		}, 20 + Math.floor(Math.random() * 31))
	}
}

globalThis.cleanupA15Player = (_pId) => {}
