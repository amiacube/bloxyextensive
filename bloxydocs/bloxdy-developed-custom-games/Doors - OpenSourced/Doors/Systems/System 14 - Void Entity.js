// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 14 - void entity */
api.broadcastMessage("System 14 loaded", { color: "#FFD700" })

// make sure to join https://bloxdhub.com

const VOID_ROOM_THRESHOLD = 8
const VOID_WARNING_THRESHOLD = 4
const VOID_TELEPORT_DELAY = 60
const VOID_COOLDOWN_TICKS = 120

// void player data keeps track of who is being targeted and what speed boost they have
globalThis.voidPlayerData = {}

globalThis.initVoidTracking = (pId) => {
	// each player gets their own tiny state bundle so the void logic can stay simple
	voidPlayerData[pId] = {
		isBeingVoided: false,
		voidStartTime: null,
		spinInterval: null,
		lastRoom: -1,
		lastVoidTick: -999999,
		speedBoost: 1
	}
}

globalThis.getVoidSpeedBoost = (roomsBehind) => {
	// the farther behind you are, the more the void pushes your speed up
	if (roomsBehind < 2) return 1
	if (roomsBehind === 2) return 1.2
	if (roomsBehind === 3) return 1.35
	if (roomsBehind === 4) return 1.5
	if (roomsBehind === 5) return 1.65
	if (roomsBehind === 6) return 1.8
	return 1.95
}

globalThis.applyVoidSpeedBoost = (pId, mult) => {
	// speed boost is temporary, so we apply it with the same base values the run already uses
	if (!api.playerIsInGame(pId)) return
	const base = globalThis.LMO || { speedMultiplier: 1, walkingSpeed: 4.7, runningSpeed: 4.7, jumpAmount: 0 }
	queueAPI(() => {
		api.setClientOptions(pId, {
			speedMultiplier: base.speedMultiplier * mult,
			walkingSpeed: base.walkingSpeed * mult,
			runningSpeed: base.runningSpeed * mult
		})
	})
}

globalThis.resetVoidSpeedBoost = (pId) => {
	// put the player back to normal speed once the void pressure is over
	if (!api.playerIsInGame(pId)) return
	const base = globalThis.LMO || { speedMultiplier: 1, walkingSpeed: 4.7, runningSpeed: 4.7, jumpAmount: 0 }
	queueAPI(() => {
		api.setClientOptions(pId, {
			speedMultiplier: base.speedMultiplier,
			walkingSpeed: base.walkingSpeed,
			runningSpeed: base.runningSpeed
		})
	})
}

globalThis.getFurthestVoidTarget = () => {
	// the void always hunts the player who is furthest ahead in the run
	let best = null
	for (const pId of getSnapshotPlayerIds()) {
		const snap = getPlayerSnapshot(pId)
		if (!snap || !snap.inGame || !snap.pos || snap.roomNum === -1) continue
		if (!best || snap.roomNum > best.roomNum) {
			best = { pId, roomNum: snap.roomNum, pos: snap.pos }
		}
	}
	return best
}

globalThis.checkVoidCondition = (pId, furthestTarget) => {
	// void logic only runs for tracked players who are not already in the void sequence
	if (!voidPlayerData[pId]) {
		initVoidTracking(pId)
		return
	}

	const vData = voidPlayerData[pId]
	if (vData.isBeingVoided) return
	if (systemTick - vData.lastVoidTick < VOID_COOLDOWN_TICKS) return
	if (!furthestTarget || furthestTarget.pId === pId) return

	const snap = getPlayerSnapshot(pId)
	if (!snap || !snap.inGame || !snap.pos || snap.roomNum === -1) return

	const playerRoom = snap.roomNum
	if (vData.lastRoom !== playerRoom) {
		vData.lastRoom = playerRoom
	}

	const roomsBehind = furthestTarget.roomNum - playerRoom
	const desiredBoost = getVoidSpeedBoost(roomsBehind)
	if (vData.speedBoost !== desiredBoost) {
		// keep the player speed matched to how far behind they are
		vData.speedBoost = desiredBoost
		if (desiredBoost > 1) applyVoidSpeedBoost(pId, desiredBoost)
		else resetVoidSpeedBoost(pId)
	}

	// if you are the only player or not far enough behind, the void stays quiet
	if (api.getPlayerIds().length === 1 || roomsBehind < VOID_WARNING_THRESHOLD) {
		return
	}

	// warning range gives the player a chance to notice the problem before anything happens
	if (roomsBehind >= VOID_WARNING_THRESHOLD && roomsBehind < VOID_ROOM_THRESHOLD) {
		queueAPI(() => {
			api.setClientOption(pId, "middleTextLower", "You are falling behind...")
		})
		setTickTimeout(() => {
			if (api.playerIsInGame(pId)) {
				queueAPI(() => api.setClientOption(pId, "middleTextLower", ""))
			}
		}, 40)
	}

	if (roomsBehind >= VOID_ROOM_THRESHOLD) {
		// once the gap gets too big, the full void sequence starts
		triggerVoidEntity(pId, furthestTarget)
	}
}

globalThis.triggerVoidEntity = (pId, targetData) => {
	// once the void starts, we lock the player in and push the whole sequence forward
	// this is the point where the chase becomes unavoidable
	const vData = voidPlayerData[pId]
	if (!vData || vData.isBeingVoided) return
	if (!targetData || !targetData.pos || targetData.roomNum === -1) return

	vData.isBeingVoided = true
	if (vData.speedBoost !== 1) {
		vData.speedBoost = 1
		resetVoidSpeedBoost(pId)
	}

	vData.voidStartTime = api.now()
	vData.lastVoidTick = systemTick
	startVoidCameraEffects(pId)

	setTickTimeout(() => {
		queueAPI(() => api.playSound(pId, "wraithGrunt2", 1.0, 0.6))
	}, 15)

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		teleportToPlayer(pId, targetData)
	}, 50)

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		endVoidEffects(pId)
	}, 52)
}

globalThis.startVoidCameraEffects = (pId) => {
	// the void uses a dark tint and a spin so it feels like the player is getting pulled apart
	// the idea is to make the player feel dragged toward the target
	const vData = voidPlayerData[pId]
	if (!vData) return

	queueAPI(() => {
		api.setClientOption(pId, "cameraTint", [0, 0, 0, 0.2])
		api.setClientOption(pId, "middleTextLower", "You are falling behind...")
	})

	let tickCount = 0
	const spinInterval = setTickInterval(() => {
		if (!api.playerIsInGame(pId) || !voidPlayerData[pId]?.isBeingVoided) {
			clearTickInterval(spinInterval)
			return
		}

		tickCount++
		const fadeProgress = tickCount / 35
		const tintAlpha = 0.2 + fadeProgress * 0.8
		queueAPI(() => {
			api.setClientOption(pId, "cameraTint", [0, 0, 0, Math.min(1.0, tintAlpha)])
		})
	}, 1)

	vData.spinInterval = spinInterval
}

globalThis.teleportToPlayer = (pId, targetData) => {
		// the void jumps the player right onto the target and hits them hard
		// this is the actual grab, so the target gets punished right away
	if (!targetData || !targetData.pos) return

	const ex = targetData.pos[0]
	const ey = targetData.pos[1]
	const ez = targetData.pos[2]
	const oldHealth = api.getHealth(pId)
	if (!globalThis.lastKiller) globalThis.lastKiller = {}
	globalThis.lastKiller[pId] = "Void"

	queueAPI(() => {
		api.setPosition(pId, ex, ey, ez)
		api.setHealth(pId, oldHealth - 60)
		api.playParticleEffect({
			dir1: [-1, -1, -1],
			dir2: [1, 1, 1],
			pos1: [ex - 0.5, ey, ez - 0.5],
			pos2: [ex + 0.5, ey + 2, ez + 0.5],
			texture: "soul_0",
			minLifeTime: 0.5,
			maxLifeTime: 0.8,
			minEmitPower: 3,
			maxEmitPower: 6,
			minSize: 1.5,
			maxSize: 2.5,
			manualEmitCount: 30,
			gravity: [0, -5, 0],
			colorGradients: [
				{ timeFraction: 0, minColor: [20, 20, 60, 1], maxColor: [40, 40, 100, 1] },
				{ timeFraction: 1, minColor: [10, 10, 30, 0], maxColor: [20, 20, 50, 0] }
			],
			velocityGradients: [
				{ timeFraction: 0, factor: 1, factor2: 1 },
				{ timeFraction: 1, factor: 0.2, factor2: 0.2 }
			],
			blendMode: 1
		})
		api.sendTopRightHelper(pId, "person-falling-burst", "Achievement Unlocked!\nSlow Poke", {
			duration: 6,
			width: 320,
			height: 90,
			color: "#1a0a2e",
			textAndIconColor: "#9d4edd",
			iconSizeMult: 2,
			fontSize: "1.125rem"
		})
	})

	if (voidPlayerData[pId]) {
		// store the room number so the next pass knows where the player got caught
		voidPlayerData[pId].lastRoom = targetData.roomNum
	}

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		if (!api.isAlive(pId) && globalThis.lastKiller && globalThis.lastKiller[pId] === "Void") {
			// guiding light handles the death screen after the void kill lands
			if (typeof showGuidingLightVoid === "function") showGuidingLightVoid(pId)
			delete globalThis.lastKiller[pId]
		}
	}, 5)
}

globalThis.endVoidEffects = (pId) => {
	// once the void sequence ends, restore the camera and movement state
	// the fade out is short so the player can get back to normal fast
	const vData = voidPlayerData[pId]
	if (!vData) return

	if (vData.spinInterval) {
		clearTickInterval(vData.spinInterval)
		vData.spinInterval = null
	}

	let fadeOutTicks = 0
	const fadeOutInterval = setTickInterval(() => {
		if (!api.playerIsInGame(pId)) {
			clearTickInterval(fadeOutInterval)
			return
		}

		fadeOutTicks++
		const fadeOutProgress = fadeOutTicks / 30
		const tintAlpha = 1.0 - fadeOutProgress * 1.0
		queueAPI(() => {
			// the fade gives the screen a soft return instead of a hard snap
			api.setClientOption(pId, "cameraTint", [0.9, 0.9, 0.95, Math.max(0, tintAlpha)])
			api.setClientOption(pId, "middleTextLower", "")
		})

		if (fadeOutTicks >= 30) {
			clearTickInterval(fadeOutInterval)
			queueAPI(() => {
				api.setClientOption(pId, "cameraTint", [0.35, 0.28, 0.45, 0.05])
			})
		}
	}, 1)

	vData.isBeingVoided = false
	vData.voidStartTime = null
	if (vData.speedBoost !== 1) {
		vData.speedBoost = 1
		resetVoidSpeedBoost(pId)
	}
}

globalThis.cleanupVoidTracking = (pId) => {
	// remove the tracking entry and undo any boost if the player leaves
	if (voidPlayerData[pId]) {
		if (voidPlayerData[pId].speedBoost && voidPlayerData[pId].speedBoost !== 1) {
			resetVoidSpeedBoost(pId)
		}
		if (voidPlayerData[pId].spinInterval) {
			clearTickInterval(voidPlayerData[pId].spinInterval)
		}
		delete voidPlayerData[pId]
	}
}
