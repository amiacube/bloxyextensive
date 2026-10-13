// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// system 5 - dark room manager
const msg = "System 5 loaded"
api.broadcastMessage(msg, { color: "#FFD700" })
// make sure to join https://bloxdhub.com


// DR keeps the room ranges, dark room flags, and player state all in one place
globalThis.DR = {
	dr: {},
	rb: {},
	rd: {},
	dm: {},
	ls: {},
	db: [],
	pr: {},
	ch: 0,
	iv: null,
	sl: 0,
	tg: 0,
	ld: false,
	dc: 0,
	inStreak: false
}

applyDark = (p) => {
	try {
		queueAPI(() => {
			// the dark preset turns off normal visibility and pushes the fog in hard
			api.setClientOptions(p, {
				fogChunkDistanceOverride: 0,
				fogColourOverride: "#0a0a0a",
				skyBox: {
					type: "earth",
					turbidity: 95,
					luminance: 0.08,
					vertexTint: [0.1, 0.1, 0.15]
				}
			})
		})
	} catch (e) {}
}

removeDark = (p) => {
	try {
		queueAPI(() => {
			// normal preset restores the world look after the player leaves a dark room
			api.setClientOptions(p, {
				fogChunkDistanceOverride: null,
				fogColourOverride: null,
				skyBox: {
					type: "earth",
					turbidity: 30,
					luminance: 1.2,
					inclination: 0.25,
					azimuth: 200,
					infiniteDistance: 1,
					yCameraOffset: 5,
					vertexTint: [0.85, 0.7, 1.0]
				}
			})
		})
	} catch (e) {}
}

globalThis.registerRoomBounds = function (rn, cx, cz, wd = 20, dp = 20) {
	// store the room rectangle so later systems can tell where a player is standing
	DR.rb[rn] = {
		mnX: cx - wd / 2,
		mxX: cx + wd / 2,
		mnZ: cz - dp / 2,
		mxZ: cz + dp / 2
	}
}

globalThis.registerRoomDoors = function (rn, ex, ey, ez, es, ox, oy, oz, os) {
	// each room keeps track of its entrance and exit door positions
	DR.rd[rn] = {
		en: { x: ex, y: ey, z: ez, s: es },
		ex: { x: ox, y: oy, z: oz, s: os }
	}

	const ek1 = `${ex},${ey},${ez}`
	const ek2 = `${ex},${ey + 1},${ez}`
	if (!DR.dm) DR.dm = {}
	DR.dm[ek1] = rn
	DR.dm[ek2] = rn
}

getRoomNum = (x, z) => {
	// this checks the player position against all stored room bounds
	for (let rn in DR.rb) {
		const b = DR.rb[rn]
		if (x >= b.mnX && x < b.mxX && z >= b.mnZ && z < b.mxZ) {
			if (DR.ls && DR.ls[rn]) {
				const ls = DR.ls[rn]
				const inL1 = x >= ls.l1.x && x < ls.l1.x + ls.l1.w && z >= ls.l1.z && z < ls.l1.z + ls.l1.l
				const inL2 = x >= ls.l2.x && x < ls.l2.x + ls.l2.w && z >= ls.l2.z && z < ls.l2.z + ls.l2.l
				if (inL1 || inL2) return parseInt(rn)
			} else {
				return parseInt(rn)
			}
		}
	}

	return -1
}

updatePlayers = () => {
	// commented out for the rooms because progressive darkness handles the prod version now
	// this is kept around for the hotel mode path
	/*
	const ps = api.getPlayerIds()
	for (let p of ps) {
		try {
			const pos = api.getPosition(p)
			if (!pos) continue
			const px = pos[0], pz = pos[2]
			let shouldBeDark = false
			const cr = getRoomNum(px, pz)
			if (cr !== -1 && DR.dr[cr] === 1) {
				shouldBeDark = true
			}
			if (cr !== -1 && typeof checkRoomBuffer === "function") {
				if (!DR.plr) DR.plr = {}
				if (DR.plr[p] !== cr) {
					DR.plr[p] = cr
					checkRoomBuffer(cr)
				}
			}
			const pr = DR.pr[p]
			const wasDark = pr === -2 || pr === -3
			if (shouldBeDark) {
				if (!wasDark) {
					DR.pr[p] = -2
					applyDark(p)
				} else if (pr === -3) {
					DR.pr[p] = -2
				}
			} else if (wasDark) {
				if (pr === -3) {
				} else {
					DR.pr[p] = cr
					removeDark(p)
				}
			} else if (pr !== cr && pr !== -3) {
				DR.pr[p] = cr
			}
		} catch (e) {}
	}
	*/
}

globalThis.checkDoorForDarkness = function (pId, x, y, z) {
	// when a tracked door opens, we check if that room should be dark
	const k = `${x},${y},${z}`
	const rn = DR.dm[k]
	if (rn !== undefined && DR.dr[rn] === 1) {
		const pr = DR.pr[pId]
		const wasAlreadyDark = pr === -2 || pr === -3
		if (!wasAlreadyDark) {
			queueAPI(() => {
				api.playSound(pId, "warperGrunt1", 1.0, 1, { playerIdOrPos: [x, y, z], maxHearDist: 50 })
			})
		}
		DR.pr[pId] = -3
		applyDark(pId)
	}
}

globalThis.markRoomAsDark = function (rn) {
	// flag the room so the player gets the dark preset when entering it
	DR.dr[rn] = 1
}

globalThis.forceRoomDark = function (rn) {
	// room zero is the spawn area, so it stays normal
	if (rn === 0) return
	DR.dr[rn] = 1
}

globalThis.spawnDarkRoomParticles = function (rn) {
	// particle effects are currently not used in the open source build
}

globalThis.shouldRoomBeDark = function (rn, roomType) {
	// the early rooms stay bright so the run opens cleanly
	if (rn <= 6 || roomType === "eyeroom") return false

	if (DR.dc > 0) {
		DR.dc--
		return false
	}

	// the streak system spreads out the dark rooms so they do not cluster hard
	if (DR.inStreak) {
		const streakChances = [0.6, 0.35, 0.15]
		const idx = rn - DR.sl - 1
		if (idx >= streakChances.length) {
			DR.inStreak = false
			DR.dc = 2
			DR.ch = 0
			return false
		}

		const chance = streakChances[idx]
		const isDark = Math.random() < chance
		if (isDark) {
			DR.sl = rn
			return true
		} else {
			DR.inStreak = false
			DR.dc = 2
			DR.ch = 0
			return false
		}
	} else {
		DR.ch += 0.07
		const isDark = Math.random() < DR.ch
		if (isDark) {
			DR.sl = rn
			DR.inStreak = true
			return true
		}
		return false
	}
}

globalThis.startDarkRoomSystem = () => {
	// the system only needs a one time start flag right now
	if (DR.iv) return
	DR.iv = true
}

globalThis.resetDarkRoomSystem = () => {
	// full reset clears every tracked room and every player tint state
	DR.dr = {}
	DR.rb = {}
	DR.rd = {}
	DR.dm = {}
	DR.ls = {}
	DR.db = []
	DR.pr = {}
	DR.sl = 0
	DR.tg = 0
	DR.ld = false
	DR.ch = 0
	DR.dc = 0
	DR.inStreak = false

	const ps = api.getPlayerIds()
	for (let p of ps) {
		removeDark(p)
	}

	const msg5 = "Dark room system reset"
	api.broadcastMessage(msg5, { color: "#9370DB" })
}

globalThis.cleanupDarkRoomPlayer = (p) => {
	// remove only the live player state here
	delete DR.pr[p]
}

startDarkRoomSystem()
