// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 19 - a120 entity */
api.broadcastMessage("System 19 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const A120_SAFE_GAP = 8
const A120_GUARANTEE_GAP = 22
const A120_EARLIEST_ROOM = 116

// a120 needs a lot of state because it can warn, travel, reverse, and combo with a-90
globalThis.A120 = {
	a: false,
	pos: null,
	p: [],
	sp: 2.1,
	baseSp: 2.1,
	comboSp: 1.3,
	fc: 0,
	sndTimer: 0,
	warning: false,
	pending: false,
	warningSoundAt: 0,
	warningRepeatAt: 0,
	warningParticleAt: 0,
	spawnAt: 0,
	checkTimer: 0,
	lastSpawn: -1,
	lastCheckedRoom: -1,
	cooldownEnd: -1,
	cycleStart: 0,
	spawnedRooms: {},
	passesLeft: 0,
	currentDirection: -1,
	comboPlanned: false,
	comboPending: false,
	comboSpawnAt: 0
}

globalThis.getA120WaypointSet = (room) => {
	// each room type uses the matching room builder waypoint set
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

globalThis.buildA120Path = (startRoom, endRoom, forward) => {
	// this converts room data into a movement path the entity can actually follow
	if (forward === undefined) forward = true
	const path = []
	if (typeof A60_ROOMS === "undefined" || !A60_ROOMS.length) return path

	const step = forward ? 1 : -1
	for (let i = startRoom; forward ? i <= endRoom : i >= endRoom; i += step) {
		const r = A60_ROOMS[i]
		const wp = getA120WaypointSet(r)
		if (!wp) continue

		const seq = forward ? wp : wp.slice().reverse()
		for (const w of seq) path.push([r.px + w.x, r.py + 5, r.pz + w.z])
	}

	return path
}

globalThis.planA120Combo = () => {
	// a120 can borrow the same a90 combo roll if that system is already using it
	return typeof planA90Combo === "function" ? planA90Combo() : Math.random() < 0.75
}

globalThis.triggerA120WarningParticles = () => {
	// warning particles are mostly there so the screen feels like it is building pressure
	for (const pId of api.getPlayerIds()) {
		const pos = api.getPosition(pId)
		if (!pos) continue

		api.playParticleEffect({
			dir1: [-0.12, 0.18, -0.12],
			dir2: [0.12, 0.4, 0.12],
			pos1: [pos[0] - 0.35, pos[1] + 0.85, pos[2] - 0.35],
			pos2: [pos[0] + 0.35, pos[1] + 1.7, pos[2] + 0.35],
			texture: "square_particle",
			minLifeTime: 0.28,
			maxLifeTime: 0.6,
			minEmitPower: 0.1,
			maxEmitPower: 0.25,
			minSize: 1.0,
			maxSize: 1.4,
			manualEmitCount: 5,
			gravity: [0, 0.03, 0],
			colorGradients: [
				{ timeFraction: 0, minColor: [235, 235, 235, 0.92], maxColor: [255, 255, 255, 0.92] },
				{ timeFraction: 1, minColor: [235, 235, 235, 0], maxColor: [255, 255, 255, 0] }
			],
			velocityGradients: [
				{ timeFraction: 0, factor: 1, factor2: 1 },
				{ timeFraction: 1, factor: 0.2, factor2: 0.2 }
			],
			blendMode: 1,
			hideDist: 90
		})
	}
}

globalThis.maybeSpawnA90WithA120 = () => {
	// if a120 is already close enough, the a90 combo can schedule itself
	if (!A120.comboPending && A120.comboPlanned) {
		for (const pId of api.getPlayerIds()) {
			const pos = api.getPosition(pId)
			if (!pos || !A120.pos) continue

			const dx = pos[0] - A120.pos[0]
			const dy = pos[1] - A120.pos[1]
			const dz = pos[2] - A120.pos[2]
			if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= 150) {
				A120.comboPending = true
				A120.comboSpawnAt = systemTick + 40
				break
			}
		}
	}

	if (A120.comboPending && systemTick >= A120.comboSpawnAt) {
		if (typeof spawnA90ForPlayers === "function" && typeof getValidA90Players === "function") {
			spawnA90ForPlayers(getValidA90Players())
		}
		A120.comboPending = false
		A120.comboPlanned = false
		A120.comboSpawnAt = 0
	}
}

globalThis.startA120Sequence = (minRoom, maxRoom) => {
	// the warning path starts ahead of the players and moves back through the active rooms
	if (typeof A60_ROOMS === "undefined" || A60_ROOMS.length === 0) return false
	const startRoom = Math.min(A60_ROOMS.length - 1, maxRoom + 10)
	const endRoom = Math.max(0, minRoom - 4)
	if (startRoom <= endRoom) return false

	const initialPath = buildA120Path(startRoom, endRoom, false)
	if (!initialPath.length) return false

	const extraPasses = Math.random() < 0.5 ? 1 : 2
	A120.p = initialPath
	A120.pos = initialPath[0].slice()
	A120.fc = 0
	A120.a = false
	A120.warning = true
	A120.pending = false
	A120.warningSoundAt = systemTick + 6
	A120.warningRepeatAt = systemTick + 20
	A120.warningParticleAt = systemTick + 20
	A120.spawnAt = systemTick + 56
	A120.sp = planA120Combo() ? A120.comboSp : A120.baseSp
	A120.sndTimer = 0
	A120.checkTimer = 0
	A120.currentDirection = -1
	A120.passesLeft = 1 + extraPasses
	A120.comboPlanned = A120.sp === A120.comboSp
	A120.comboPending = false
	A120.comboSpawnAt = 0
	triggerA120WarningParticles()
	return true
}

globalThis.spawnA120 = () => {
	// do not overlap with a-60, since both entities read the same room flow
	if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return false
	if (typeof getSnapshotPlayerIds !== "function" || typeof getPlayerSnapshot !== "function") return false

	let minRoom = Infinity
	let maxRoom = -1
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || snap.roomNum === -1) continue
		if (snap.roomNum < minRoom) minRoom = snap.roomNum
		if (snap.roomNum > maxRoom) maxRoom = snap.roomNum
	}

	if (minRoom === Infinity || maxRoom === -1) return false
	if (!startA120Sequence(minRoom, maxRoom)) return false
	A120.lastSpawn = maxRoom
	return true
}

globalThis.spawnA120Test = (pId) => {
	// test spawn used for dev checking
	const pos = api.getPosition(pId)
	if (!pos || A120.a || A120.warning) return false

	const y = pos[1] + 1
	const z = pos[2]
	A120.p = [
		[pos[0] + 54, y, z],
		[pos[0] + 42, y, z],
		[pos[0] + 30, y, z],
		[pos[0] + 18, y, z],
		[pos[0] + 9, y, z],
		[pos[0], y, z],
		[pos[0] - 9, y, z],
		[pos[0] - 18, y, z],
		[pos[0] - 30, y, z],
		[pos[0] - 42, y, z],
		[pos[0] - 54, y, z],
		[pos[0] - 42, y, z],
		[pos[0] - 30, y, z],
		[pos[0] - 18, y, z],
		[pos[0] - 9, y, z],
		[pos[0], y, z],
		[pos[0] + 9, y, z],
		[pos[0] + 18, y, z],
		[pos[0] + 30, y, z],
		[pos[0] + 42, y, z],
		[pos[0] + 54, y, z]
	]
	A120.pos = A120.p[0].slice()
	A120.fc = 0
	A120.a = false
	A120.warning = true
	A120.warningSoundAt = systemTick + 5
	A120.warningRepeatAt = systemTick + 18
	A120.warningParticleAt = systemTick + 18
	A120.spawnAt = systemTick + 64
	A120.sp = A120.baseSp
	A120.sndTimer = 0
	A120.checkTimer = 0
	A120.currentDirection = 0
	A120.passesLeft = 0
	A120.comboPlanned = false
	A120.comboPending = false
	A120.comboSpawnAt = 0
	triggerA120WarningParticles()
	return true
}

globalThis.finishA120Pass = () => {
	// a120 turns around after each pass until it runs out of passes
	if (A120.passesLeft <= 0) {
		A120.a = false
		A120.warning = false
		A120.pos = null
		A120.p = []
		A120.comboPlanned = false
		A120.comboPending = false
		A120.comboSpawnAt = 0
		return
	}

	const nextPath = A120.p.slice().reverse()
	if (!nextPath.length) {
		A120.a = false
		A120.pos = null
		return
	}

	A120.p = nextPath
	A120.pos = nextPath[0].slice()
	A120.fc = 0
	A120.passesLeft--
	setTickTimeout(() => {
		if (!A120.pos) return
		A120.a = true
	}, 20)
}

globalThis.updateA120 = () => {
	try {
		// warning mode runs before movement starts
		if (A120.warning) {
			if (systemTick >= A120.warningSoundAt) {
				for (const pId of api.getPlayerIds()) {
					api.playSound(pId, "lowDrum1", 0.5, 0.8)
				}
				A120.warningSoundAt = 999999999
			}

			if (systemTick >= A120.warningParticleAt && systemTick < A120.spawnAt) {
				triggerA120WarningParticles()
				A120.warningParticleAt = systemTick + 20
			}

			if (systemTick >= A120.warningRepeatAt && systemTick < A120.spawnAt) {
				for (const pId of api.getPlayerIds()) {
					api.playSound(pId, "lowDrum1", 0.42, 0.72)
				}
				A120.warningRepeatAt = systemTick + 20
			}

			const reachedSpawnTime = systemTick >= A120.spawnAt
			const notActive = !A120.a
			const hasPos = !!A120.pos
			if (reachedSpawnTime && notActive && hasPos) {
				A120.a = true
				A120.warning = false
			}
			return
		}

		if (!A120.a || !A120.pos || !A120.p.length) return

		const target = A120.p[A120.fc]
		if (!target) {
			A120.a = false
			finishA120Pass()
			return
		}

		const dx = target[0] - A120.pos[0]
		const dy = target[1] - A120.pos[1]
		const dz = target[2] - A120.pos[2]
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist < 4) {
			A120.fc++
			if (A120.fc >= A120.p.length) {
				A120.a = false
				finishA120Pass()
			}
			return
		}

		const dirX = dx / dist
		const dirY = dy / dist
		const dirZ = dz / dist
		A120.pos[0] += dirX * A120.sp
		A120.pos[1] += dirY * A120.sp
		A120.pos[2] += dirZ * A120.sp

		maybeSpawnA90WithA120()

		// line of sight only gets checked every 10 ticks so the server load stays sane
		if (++A120.checkTimer >= 10) {
			A120.checkTimer = 0
			const a120Room = typeof getRoomNum === "function" ? getRoomNum(A120.pos[0], A120.pos[2]) : -1

			for (const pId of api.getPlayerIds()) {
				// skip players who are already hiding in closets
				if (playersInCloset && playersInCloset[pId] && typeof playersInCloset[pId] === "object") continue

				const pPos = api.getPosition(pId)
				if (!pPos) continue

				const pdx = pPos[0] - A120.pos[0]
				const pdy = pPos[1] - A120.pos[1]
				const pdz = pPos[2] - A120.pos[2]
				if (Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz) > 18) continue

				const playerRoom = typeof getRoomNum === "function" ? getRoomNum(pPos[0], pPos[2]) : -1
				if (Math.abs(a120Room - playerRoom) <= 1) {
					if (!globalThis.lastKiller) globalThis.lastKiller = {}
					globalThis.lastKiller[pId] = "A120"

					const hp = api.getHealth(pId)
					api.setHealth(pId, hp - 100)

					if (typeof showGuidingLightA120 === "function" || typeof showGuidingLight === "function") {
						setTickTimeout(() => {
							if (!api.isAlive(pId) && globalThis.lastKiller[pId] === "A120") {
								if (typeof showGuidingLightA120 === "function") showGuidingLightA120(pId)
								else showGuidingLight(pId)
								delete globalThis.lastKiller[pId]
							}
						}, 5)
					}
				}
			}
		}

		// ✨ da entity was a particle all along ✨ (i think everyone knows that at this point but https://bloxdhub.com :p)
		api.playParticleEffect({
			dir1: [dirX, dirY, dirZ],
			dir2: [dirX, dirY, dirZ],
			pos1: A120.pos,
			pos2: A120.pos,
			texture: "scary_face",
			minLifeTime: 0.3,
			maxLifeTime: 0.45,
			minEmitPower: A120.sp * 7,
			maxEmitPower: A120.sp * 7,
			minSize: 8.5,
			maxSize: 8.5,
			manualEmitCount: 3,
			gravity: [0, 0, 0],
			colorGradients: [
				{ timeFraction: 0, minColor: [255, 255, 255, 1], maxColor: [255, 255, 255, 1] },
				{ timeFraction: 0.85, minColor: [255, 255, 255, 1], maxColor: [255, 255, 255, 1] },
				{ timeFraction: 1, minColor: [255, 255, 255, 0], maxColor: [255, 255, 255, 0] }
			],
			velocityGradients: [
				{ timeFraction: 0, factor: 1, factor2: 1 },
				{ timeFraction: 1, factor: 0.2, factor2: 0.2 }
			],
			blendMode: 1
		})

		if (++A120.sndTimer >= 5) {
			A120.sndTimer = 0
			api.broadcastSound("horrorAccent1", 0.9, 0.35, { playerIdOrPos: A120.pos, maxHearDist: 70, refDistance: 5 })
		}
	} catch (e) {
		api.broadcastMessage("[A120 ERROR] " + e.toString(), { color: "#ff0000" })
	}
}

globalThis.checkPlayerRoomForA120 = () => {
	// this is the spawn gate that decides if the current room progress is far enough
	if (A120.a || A120.warning || A120.pending) return
	if (typeof getSnapshotPlayerIds !== "function") return
	if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) return

	let furthestRoom = -1
	let hasNearbyClosets = false
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || snap.roomNum === -1) continue
		if (snap.roomNum > furthestRoom) furthestRoom = snap.roomNum
	}
	if (furthestRoom === -1) return
	if (furthestRoom < A120_EARLIEST_ROOM) return
	if (typeof A60 !== "undefined" && furthestRoom <= A60.lastSpawn + 3) return
	if (furthestRoom <= A120.cooldownEnd) return
	if (A120.lastCheckedRoom === furthestRoom) return
	A120.lastCheckedRoom = furthestRoom

	const checkRooms = [furthestRoom]
	if (furthestRoom > 0) checkRooms.push(furthestRoom - 1)

	// a120 only makes sense when there are nearby hide rooms in the current stretch
	for (const checkRn of checkRooms) {
		const room = typeof A60_ROOMS !== "undefined" ? A60_ROOMS[checkRn] : null
		if (
			room &&
			(room.type === "cubby" || room.type === "closet" || room.type === "skinny" || room.type === "hallway" || room.type === "catwalk")
		) {
			hasNearbyClosets = true
			break
		}
	}
	if (!hasNearbyClosets) return

	const roomsSinceLastSpawn = A120.lastSpawn === -1 ? A120_GUARANTEE_GAP : furthestRoom - A120.lastSpawn
	if (roomsSinceLastSpawn <= A120_SAFE_GAP) return
	const forceSpawn = roomsSinceLastSpawn >= A120_GUARANTEE_GAP
	const rampProgress = (roomsSinceLastSpawn - (A120_SAFE_GAP + 1)) / (A120_GUARANTEE_GAP - (A120_SAFE_GAP + 1))
	const chance = forceSpawn ? 1 : Math.max(0.06, Math.min(0.92, 0.06 + rampProgress * 0.86))

	if (forceSpawn || Math.random() < chance) {
		A120.pending = true
		A120.lastSpawn = furthestRoom
		A120.cooldownEnd = furthestRoom + A120_SAFE_GAP

		// a little delay keeps the warning from feeling instant every time
		const delay = 100 + Math.floor(Math.random() * 81)
		setTickTimeout(() => {
			if (typeof A60 !== "undefined" && (A60.a || A60.warning || A60.pending)) {
				A120.pending = false
				return
			}
			A120.pending = false
			spawnA120()
		}, delay)
	}
}

globalThis.cleanupA120Player = (pId) => {
	// no special per player cleanup yet, but the hook stays for future use
}
