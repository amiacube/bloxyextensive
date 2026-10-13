// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references



// people kept asking how the camera vfx worked, so uhhh yea the tricks are out now
// this did not stay around for long tho. people liked it, but it was heavy on the servers and kept hitting rate limits
// if you know a cleaner way to do this, hit me up on the bloxd.io discord server
// surely there is a better way to handle it :p

/* system 12 - camera effects */
api.broadcastMessage("System 12 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

globalThis.cameraPlayerData = {}
globalThis.cameraEffectsEnabled = {}
globalThis.cameraEffectsBlockedUntil = {}
globalThis.cameraWarningTint = {}

// these values control the turn tilt and the little walk bob the camera gets
const MAX_TILT = 0.12
const TILT_DECAY = 0.9
const TURN_SENSITIVITY = 1.5
const TURN_THRESHOLD = 0.004
const BOB_FREQUENCY = 1.8
const BOB_AMPLITUDE = 0.014
const BOB_VERTICAL_AMPLITUDE = 0.2
const BOB_VERTICAL_SMOOTHING = 0.84
const WALK_THRESHOLD = 0.12
const SPRINT_MULTIPLIER = 1.4

globalThis.updateCameraEffects = function () {
	// only run the camera work if there are actual players around
	const playerIds = api.getPlayerIds()
	const playerCount = playerIds.length
	if (playerCount === 0) return

	for (let i = 0; i < playerCount; i++) {
		const pId = playerIds[i]
		let data = cameraPlayerData[pId]

		// each player gets a tiny camera state bundle so we can track tilt and bob separately
		if (!data) {
			data = cameraPlayerData[pId] = {
				lastHeading: null,
				currentTilt: 0,
				bobPhase: 0,
				currentVerticalBob: 0
			}
		}

		const tintFx = cameraWarningTint[pId]
		if (tintFx) {
			// warning tint ramps in, holds, then fades out
			if (systemTick >= tintFx.endTick) {
				delete cameraWarningTint[pId]
				api.setClientOption(pId, "cameraTint", null)
			} else {
				const totalTicks = Math.max(1, tintFx.endTick - tintFx.startTick)
				const elapsed = systemTick - tintFx.startTick
				const progress = Math.max(0, Math.min(1, elapsed / totalTicks))
				let alpha = 0

				if (progress <= 0.5) alpha = tintFx.maxAlpha * (progress / 0.5)
				else alpha = tintFx.maxAlpha * ((1 - progress) / 0.5)

				api.setClientOption(pId, "cameraTint", [tintFx.r, tintFx.g, tintFx.b, alpha])
				data.lastHeading = null
				data.currentTilt = 0
				data.currentVerticalBob = 0
				data.bobPhase = 0
				continue
			}
		}

		const blockedUntil = cameraEffectsBlockedUntil[pId] || 0
		const inCloset = playersInCloset && playersInCloset[pId] && typeof playersInCloset[pId] === "object"
		if (inCloset || systemTick < blockedUntil) {
			// closet hiding and scripted moments both pause camera motion
			data.lastHeading = null
			data.currentTilt = 0
			data.currentVerticalBob = 0
			data.bobPhase = 0
			continue
		}

		const enabled = cameraEffectsEnabled[pId] === true
		const facingInfo = api.getPlayerFacingInfo(pId)
		const currentHeading = facingInfo.moveHeading

		if (!enabled) {
			// if effects are off, we still keep the last heading fresh so turning does not spike later
			data.lastHeading = currentHeading
			continue
		}

		let targetTilt = 0

		// quick turns add a small roll so the camera feels less static
		if (data.lastHeading !== null) {
			let headingDiff = currentHeading - data.lastHeading
			while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI
			while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI
			if (Math.abs(headingDiff) > TURN_THRESHOLD) {
				targetTilt = -headingDiff * TURN_SENSITIVITY
				targetTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetTilt))
			}
		}

		data.currentTilt = data.currentTilt * TILT_DECAY + targetTilt * (1 - TILT_DECAY)
		if (Math.abs(data.currentTilt) < 0.001) data.currentTilt = 0

		const vel = api.getVelocity(pId)
		const vx = vel[0], vz = vel[2]
		const horizontalSpeed = Math.sqrt(vx * vx + vz * vz)
		let bobRoll = 0
		let targetVerticalBob = 0

		// moving players get a small walk bob so the view feels alive
		if (horizontalSpeed > WALK_THRESHOLD) {
			const bobMultiplier = horizontalSpeed > 5 ? SPRINT_MULTIPLIER : 1
			data.bobPhase += horizontalSpeed * BOB_FREQUENCY * 0.05
			const sinPhase = Math.sin(data.bobPhase)
			bobRoll = sinPhase * BOB_AMPLITUDE * bobMultiplier
			targetVerticalBob = Math.abs(sinPhase) * BOB_VERTICAL_AMPLITUDE * bobMultiplier
		} else {
			data.bobPhase = 0
		}

		data.currentVerticalBob = data.currentVerticalBob * BOB_VERTICAL_SMOOTHING + targetVerticalBob * (1 - BOB_VERTICAL_SMOOTHING)
		if (isNaN(data.currentVerticalBob)) data.currentVerticalBob = 0

		const totalRoll = data.currentTilt + bobRoll
		api.setClientOption(pId, "cameraRoll", totalRoll)
		api.setPlayerPose(pId, "standing", [0, data.currentVerticalBob, 0])
		data.lastHeading = currentHeading
	}
}

globalThis.initCameraEffects = function (pId) {
	// join flow can call this once so the player starts with the effect system ready
	globalThis.enableCameraEffects(pId)
}

globalThis.startCameraWarningTint = function (pId, durationTicks, maxAlpha, r, g, b) {
	// this tint is used for warning moments and short scripted camera hits
	cameraWarningTint[pId] = {
		startTick: systemTick,
		endTick: systemTick + Math.max(1, durationTicks || 10),
		maxAlpha: maxAlpha || 0.35,
		r: r ?? 0.08,
		g: g ?? 0.08,
		b: b ?? 0.08
	}
}

globalThis.blockCameraEffectsTemporarily = function (pId, ticks) {
	// this is used when another system needs full control for a short moment
	cameraEffectsBlockedUntil[pId] = Math.max(cameraEffectsBlockedUntil[pId] || 0, systemTick + (ticks || 8))
	if (api.playerIsInGame(pId)) {
		api.setPlayerPose(pId, "standing", [0, 0, 0])
		api.setClientOptions(pId, { cameraRoll: 0, cameraRollTransitionMs: 50 })
	}
}

globalThis.enableCameraEffects = function (pId) {
	// turn the camera system on and reset the player state so it starts clean
	cameraEffectsEnabled[pId] = true
	if (!cameraPlayerData[pId]) {
		cameraPlayerData[pId] = {
			lastHeading: null,
			currentTilt: 0,
			bobPhase: 0,
			currentVerticalBob: 0
		}
	}

	cameraPlayerData[pId].lastHeading = null
	cameraPlayerData[pId].currentTilt = 0
	cameraPlayerData[pId].currentVerticalBob = 0
	cameraPlayerData[pId].bobPhase = 0
	api.setClientOptions(pId, { cameraRoll: 0, cameraRollTransitionMs: 50 })
}

globalThis.disableCameraEffects = function (pId) {
	// turn the system off and put the camera back into a plain state
	cameraEffectsEnabled[pId] = false
	if (!cameraPlayerData[pId]) {
		cameraPlayerData[pId] = {
			lastHeading: null,
			currentTilt: 0,
			bobPhase: 0,
			currentVerticalBob: 0
		}
	}

	cameraPlayerData[pId].lastHeading = null
	cameraPlayerData[pId].currentTilt = 0
	cameraPlayerData[pId].currentVerticalBob = 0
	cameraPlayerData[pId].bobPhase = 0
	api.setPlayerPose(pId, "standing", [0, 0, 0])
	api.setClientOptions(pId, { cameraRoll: 0, cameraRollTransitionMs: 50 })
}

globalThis.toggleCameraEffects = function (pId) {
	// simple on off helper for tests and admin tools
	if (cameraEffectsEnabled[pId] === true) {
		disableCameraEffects(pId)
		return false
	}

	enableCameraEffects(pId)
	return true
}

globalThis.cleanupCameraPlayer = function (pId) {
	// remove all temporary camera state when the player leaves
	delete cameraPlayerData[pId]
	delete cameraEffectsEnabled[pId]
	delete cameraEffectsBlockedUntil[pId]
	delete cameraWarningTint[pId]
}
