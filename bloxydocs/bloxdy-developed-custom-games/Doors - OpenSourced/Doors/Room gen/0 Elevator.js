// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

api.broadcastMessage("Codeblock 0 loaded", { color: "#FFD700" })

const WALL = "Stone Bricks"
const FLOOR = "Gray Planks"
const ROOF = "Light Gray Chalk Bricks"
const GLASS = "Light Gray Glass"
const ACCENT = "Black Concrete"
const RIDE_TINT = [0.26, 0.2, 0.06, 0.12]
const RIDE_TEXT_COLOR = "#d8c27c"

// ride state lives here so the open-source copy keeps the same flow
// this keeps the lobby, elevator, and spawn room on the same timeline
globalThis.RIDE_BUILD = {
	started: false,
	ready: false,
	elevX: -20000,
	elevY: 40,
	elevZ: -2000
}

// temp spot for the spawn doorway before the elevator seals it in
globalThis.pendingRideEntrance = null

// gives players the same run mode settings once the ride begins
globalThis.applyRunPlayerSettings = function (playerId) {
	// lock player state once the ride starts
	api.setClientOptions(playerId, {
		creative: false,
		canChange: false,
		invincible: false,
		canSeeNametagsThroughWalls: false,
		maxHealth: 100,
		initialHealth: 100,
		healthRegenAmount: 0,
		dealingDamageMultiplier: 0,
		receivingDamageMultiplier: 1
	})

	api.setHealth(playerId, 100, playerId, true)
}

// main ride entry
// starts the lobby, the elevator, and the room gen run
globalThis.startRoomsRide = function (pId) {
	const p = api.getPosition(pId)
	const elevX = Math.floor(p[0]) + 10
	const elevY = Math.floor(p[1])
	const elevZ = Math.floor(p[2])

	// build the lobby first so everyone starts in the same spot
	buildLobby(elevX, elevY, elevZ)

	const allPlayers = api.getPlayerIds()
	// small announcement before the ride starts
	// make sure to join https://bloxdhub.com
	for (const playerId of allPlayers) {
		api.sendMessage(playerId, "Starting ride...", { color: "#00ff00" })
	}

	setTickTimeout(() => {
		// blackout first so the intro starts clean
		for (const playerId of allPlayers) {
			api.setClientOption(playerId, "cameraTint", [0, 0, 0, 1])
		}

		setTickTimeout(() => {
			// move everyone into the elevator shaft and lock them to the forward view
			for (const playerId of allPlayers) {
				api.setPosition(playerId, elevX, elevY + 1, elevZ + 4)
				api.setCameraDirection(playerId, [0, 0, -1])
				if (typeof applyRunPlayerSettings === "function") {
					applyRunPlayerSettings(playerId)
				}
			}

			// helper for the intro lines
			// keeps the text and sound in one place so the timing stays simple
			const showRideText = (text) => {
				for (const playerId of allPlayers) {
					api.sendFlyingMiddleMessage(
						playerId,
						[{ str: text, style: { color: RIDE_TEXT_COLOR, fontSize: "1.8rem" } }],
						0,
						4800
					)
					api.playSound(playerId, "pistol_magazine_load_02", 0.6, 0.7)
				}
			}

			// a couple intro lines before the run starts
			setTickTimeout(() => {
				showRideText("Player, beware... you're in for a scare.")
			}, 5)

			setTickTimeout(() => {
				showRideText("Turn up the volume. The Rooms experience relies on it.")
			}, 110)

			setTickTimeout(() => {
				let fadeStep = 0

				// fade out the intro tint in small steps
				const fadeInterval = setTickInterval(() => {
					fadeStep++
					const alpha = 1 - fadeStep / 20

					if (fadeStep >= 20) {
						// clear the tint before the elevator animation starts
						for (const playerId of allPlayers) {
							api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], 0])
						}

						clearTickInterval(fadeInterval)

						setTickTimeout(() => {
							// start the elevator animation, then open the spawn entrance after it lands
							startElevator(() => {
								for (const playerId of allPlayers) {
									api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], 0])
								}

								if (typeof finalizeElevatorSpawnEntrance === "function") {
									finalizeElevatorSpawnEntrance()
								}
							})

							if (typeof buildElevatorSpawnRoom === "function") {
								buildElevatorSpawnRoom(elevX, elevY, elevZ)
							}
						}, 30)
					} else {
						for (const playerId of allPlayers) {
							api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], alpha])
						}
					}
				}, 2)
			}, 230)
		}, 5)
	}, 60)
}

// used when the ride is already built on the map and we just want to replay it
globalThis.startBuiltRoomsRide = function () {
	if (!RIDE_BUILD.ready) return false

	const elevX = RIDE_BUILD.elevX
	const elevY = RIDE_BUILD.elevY
	const elevZ = RIDE_BUILD.elevZ
	const allPlayers = api.getPlayerIds()

	// same intro flow, just reusing the built layout
	for (const playerId of allPlayers) {
		api.sendMessage(playerId, "Starting ride...", { color: "#00ff00" })
	}

	setTickTimeout(() => {
		// hard blackout before the ride starts moving
		for (const playerId of allPlayers) {
			api.setClientOption(playerId, "cameraTint", [0, 0, 0, 1])
		}

		setTickTimeout(() => {
			// place players into the fixed elevator position
			for (const playerId of allPlayers) {
				api.setPosition(playerId, elevX, elevY + 1, elevZ + 4)
				api.setCameraDirection(playerId, [0, 0, -1])
				if (typeof applyRunPlayerSettings === "function") {
					applyRunPlayerSettings(playerId)
				}
			}

			const showRideText = (text) => {
				for (const playerId of allPlayers) {
					api.sendFlyingMiddleMessage(
						playerId,
						[{ str: text, style: { color: RIDE_TEXT_COLOR, fontSize: "1.8rem" } }],
						0,
						4800
					)
					api.playSound(playerId, "pistol_magazine_load_02", 0.6, 0.7)
				}
			}

			setTickTimeout(() => {
				showRideText("Player, beware... you're in for a scare.")
			}, 5)

			setTickTimeout(() => {
				showRideText("Turn up the volume. The Rooms experience relies on it.")
			}, 110)

			// fade the tint out before the elevator starts
			setTickTimeout(() => {
				let fadeStep = 0

				const fadeInterval = setTickInterval(() => {
					fadeStep++
					const alpha = 1 - fadeStep / 20

					if (fadeStep >= 20) {
						// tint is gone, now start the ride
						for (const playerId of allPlayers) {
							api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], 0])
						}

						clearTickInterval(fadeInterval)

						setTickTimeout(() => {
							startElevator(() => {
								for (const playerId of allPlayers) {
									api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], 0])
								}
								if (typeof finalizeElevatorSpawnEntrance === "function") {
									finalizeElevatorSpawnEntrance()
								}
							})
						}, 30)
					} else {
						for (const playerId of allPlayers) {
							api.setClientOption(playerId, "cameraTint", [RIDE_TINT[0], RIDE_TINT[1], RIDE_TINT[2], alpha])
						}
					}
				}, 2)
			}, 230)
		}, 5)
	}, 60)

	return true
}

// called once the lobby is ready and we want to boot the run properly
globalThis.ensureRideBuildStarted = function () {
	if (RIDE_BUILD.started) return

	RIDE_BUILD.started = true

	const elevX = RIDE_BUILD.elevX
	const elevY = RIDE_BUILD.elevY
	const elevZ = RIDE_BUILD.elevZ

	// build the lobby shell before anything else
	if (typeof buildLobby === "function") {
		buildLobby(elevX, elevY, elevZ)
	}

	const waitLobby = () => {
		// wait for lobby build to finish, otherwise we can spawn stuff too early
		if (BS.a !== 0) {
			setTickTimeout(waitLobby, 5)
			return
		}

		// once lobby is done, build the spawn room and kick off generation
		if (typeof buildElevatorSpawnRoom === "function") {
			buildElevatorSpawnRoom(elevX, elevY, elevZ)
		}

		const recX = elevX - 7
		const recY = elevY
		const recZ = elevZ + 8

		if (typeof startGeneration === "function") {
			startGeneration(recX, recY, recZ, 1000, false)
		}

		// mark the build as ready so replay paths can use it later
		RIDE_BUILD.ready = true
	}

	waitLobby()
}

// lobby build is just the little elevator room before the main run starts
globalThis.buildLobby = function (px, py, pz) {
	const wd = 7, dp = 8, ht = 5
	px -= 3

	// keep the lobby geometry around for the later start callback
	globalThis.lastLobbyBuild = { px, py, pz, wd, dp, ht }
	RIDE_BUILD.lobby = { px, py, pz, wd, dp, ht }

	// bs handles the staged block building system
	BS.a = 1
	BS.t = "lobby"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, wd, dp, ht }
}

globalThis.cLobby = function () {
	const d = BS.d

	// stage 0, floor goes first
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + d.wd - 1, d.py, d.pz + d.dp - 1], FLOOR)
		BS.p++
		return
	}

	// stage 1, roof goes in next
	if (BS.p === 1) {
		api.setBlockRect([d.px, d.py + d.ht + 1, d.pz], [d.px + d.wd - 1, d.py + d.ht + 1, d.pz + d.dp - 1], ROOF)
		BS.p++
		return
	}

	// stage 2, front wall
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + d.wd - 1, d.py + 1, d.pz], WALL)
		BS.p++
		return
	}

	// stage 3, front glass band
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 2, d.pz], [d.px + d.wd - 1, d.py + d.ht, d.pz], GLASS)
		BS.p++
		return
	}

	// stage 4, back wall
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 1, d.pz + d.dp - 1], [d.px + d.wd - 1, d.py + 1, d.pz + d.dp - 1], WALL)
		BS.p++
		return
	}

	// stage 5, back wall upper section
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 2, d.pz + d.dp - 1], [d.px + d.wd - 1, d.py + d.ht, d.pz + d.dp - 1], WALL)
		BS.p++
		return
	}

	// stage 6, left wall
	if (BS.p === 6) {
		api.setBlockRect([d.px, d.py + 1, d.pz + 1], [d.px, d.py + 1, d.pz + d.dp - 2], WALL)
		BS.p++
		return
	}

	// stage 7, left glass band
	if (BS.p === 7) {
		api.setBlockRect([d.px, d.py + 2, d.pz + 1], [d.px, d.py + d.ht, d.pz + d.dp - 2], GLASS)
		BS.p++
		return
	}

	// stage 8, right wall
	if (BS.p === 8) {
		api.setBlockRect([d.px + d.wd - 1, d.py + 1, d.pz + 1], [d.px + d.wd - 1, d.py + 1, d.pz + d.dp - 2], WALL)
		BS.p++
		return
	}

	// stage 9, right glass band
	if (BS.p === 9) {
		api.setBlockRect([d.px + d.wd - 1, d.py + 2, d.pz + 1], [d.px + d.wd - 1, d.py + d.ht, d.pz + d.dp - 2], GLASS)
		BS.p++
		return
	}

	// stage 10, outer shell
	if (BS.p === 10) {
		api.setBlockRect([d.px - 3, d.py - 3, d.pz - 3], [d.px + d.wd + 2, d.py - 3, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 11, roof shell
	if (BS.p === 11) {
		api.setBlockRect([d.px - 3, d.py + d.ht + 4, d.pz - 3], [d.px + d.wd + 2, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 12, back shell
	if (BS.p === 12) {
		api.setBlockRect([d.px - 3, d.py - 3, d.pz - 3], [d.px + d.wd + 2, d.py + d.ht + 4, d.pz - 3], ACCENT)
		BS.p++
		return
	}

	// stage 13, left shell wall
	if (BS.p === 13) {
		api.setBlockRect([d.px - 3, d.py - 3, d.pz - 3], [d.px - 3, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 14, right shell wall
	if (BS.p === 14) {
		api.setBlockRect([d.px + d.wd + 2, d.py - 3, d.pz - 3], [d.px + d.wd + 2, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 15, front left extra shell
	if (BS.p === 15) {
		api.setBlockRect([d.px - 3, d.py - 3, d.pz + d.dp - 1], [d.px - 1, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 16, front right extra shell
	if (BS.p === 16) {
		api.setBlockRect([d.px + d.wd, d.py - 3, d.pz + d.dp - 1], [d.px + d.wd + 2, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 17, front ceiling lip
	if (BS.p === 17) {
		api.setBlockRect([d.px - 3, d.py - 3, d.pz + d.dp - 1], [d.px + d.wd + 2, d.py - 1, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// stage 18, rear ceiling lip
	if (BS.p === 18) {
		api.setBlockRect([d.px - 3, d.py + d.ht + 2, d.pz + d.dp - 1], [d.px + d.wd + 2, d.py + d.ht + 4, d.pz + d.dp - 1], ACCENT)
		BS.p++
		return
	}

	// final stage, mark the build done
	if (BS.p === 19) {
		d.elevatorStarted = false
		d.elevatorTime = 0
		d.particleInterval = null
		d.onFinish = null
		BS.a = 0
	}
}

// this is the actual spawn room that opens off the lobby side
globalThis.buildElevatorSpawnRoom = function (elevX, elevY, elevZ) {
	if (typeof buildSpawnRoom !== "function") return

	const roomX = elevX - 7
	const roomY = elevY
	const roomZ = elevZ + 8

	// use the real spawn room builder here, not a fake copy
	buildSpawnRoom(roomX, roomY, roomZ)

	const waitForSpawn = () => {
		if (BS.a === 0) {
			// once the spawn build is finished, remember where the entrance is
			const doorX = roomX + 7
			const doorZ = roomZ
			pendingRideEntrance = { doorX, doorZ, roomY }
		} else {
			setTickTimeout(waitForSpawn, 5)
		}
	}

	waitForSpawn()
}

// swaps the temporary opening into a real doorway once spawn is done
globalThis.finalizeElevatorSpawnEntrance = function () {
	if (!pendingRideEntrance) {
		setTickTimeout(() => finalizeElevatorSpawnEntrance(), 5)
		return
	}

	const d = pendingRideEntrance

	// fill the opening edges so the door sits inside a clean frame
	api.setBlockRect([d.doorX - 1, d.roomY, d.doorZ - 1], [d.doorX + 1, d.roomY, d.doorZ - 1], "Smooth Andesite")
	api.setBlock(d.doorX, d.roomY + 1, d.doorZ - 1, "Air")
	api.setBlock(d.doorX, d.roomY + 2, d.doorZ - 1, "Air")
	api.setBlock(d.doorX, d.roomY + 1, d.doorZ, "Cedar Door|meta|rot3|closed")
	api.setBlock(d.doorX, d.roomY + 2, d.doorZ, "_Cedar Door Top|meta|rot3|closed")

	// auto door registration keeps the door system aware of this entrance
	if (typeof registerAutoDoor === "function") {
		registerAutoDoor(d.doorX, d.roomY + 1, d.doorZ, 3, "Cedar Door")
	}

	pendingRideEntrance = null
}

// the elevator animation itself
globalThis.startElevator = function (onFinish) {
	const d = globalThis.lastLobbyBuild || RIDE_BUILD.lobby || BS.d
	if (!d || d.elevatorStarted) return

	d.elevatorStarted = true
	d.elevatorTime = 0
	d.onFinish = typeof onFinish === "function" ? onFinish : null

	const px = d.px, py = d.py, pz = d.pz, wd = d.wd, dp = d.dp

	// first sound hit so players know the ride is alive
	api.broadcastSound("warperGrunt3", 1.0, 0.2)

	const spawnParticles = (speed, texture, size) => {
		// particle helper, reused three times so the effect stays symmetrical
		const spawnY = py - 2
		const leftX1 = Math.floor(px - 2), leftX2 = Math.floor(px - 1)
		const rightX1 = Math.floor(px + wd + 1), rightX2 = Math.floor(px + wd + 2)
		const frontZ1 = Math.floor(pz - 2), frontZ2 = Math.floor(pz - 1)
		const spanX1 = Math.floor(px), spanX2 = Math.floor(px + wd - 1)
		const spanZ1 = Math.floor(pz), spanZ2 = Math.floor(pz + dp - 1)
		const lifetime = speed < 2 ? 4 : 0.8
		const lifetimeMax = speed < 2 ? 5 : 1.2

		api.playParticleEffect({
			dir1: [0, 1, 0],
			dir2: [0, 1, 0],
			pos1: [leftX1, spawnY, frontZ1],
			pos2: [leftX2, spawnY, spanZ2],
			texture,
			minLifeTime: lifetime,
			maxLifeTime: lifetimeMax,
			minEmitPower: speed,
			maxEmitPower: speed * 1.5,
			minSize: size,
			maxSize: size * 1.8,
			manualEmitCount: 10,
			hideDist: 220,
			gravity: [0, speed * 10, 0],
			colorGradients: [{ timeFraction: 0, minColor: [255, 255, 255, 1], maxColor: [255, 255, 255, 1] }],
			velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
			blendMode: 1
		})

		api.playParticleEffect({
			dir1: [0, 1, 0],
			dir2: [0, 1, 0],
			pos1: [rightX1, spawnY, frontZ1],
			pos2: [rightX2, spawnY, spanZ2],
			texture,
			minLifeTime: lifetime,
			maxLifeTime: lifetimeMax,
			minEmitPower: speed,
			maxEmitPower: speed * 1.5,
			minSize: size,
			maxSize: size * 1.8,
			manualEmitCount: 10,
			hideDist: 220,
			gravity: [0, speed * 10, 0],
			colorGradients: [{ timeFraction: 0, minColor: [255, 255, 255, 1], maxColor: [255, 255, 255, 1] }],
			velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
			blendMode: 1
		})

		api.playParticleEffect({
			dir1: [0, 1, 0],
			dir2: [0, 1, 0],
			pos1: [spanX1, spawnY, frontZ1],
			pos2: [spanX2, spawnY, frontZ2],
			texture,
			minLifeTime: lifetime,
			maxLifeTime: lifetimeMax,
			minEmitPower: speed,
			maxEmitPower: speed * 1.5,
			minSize: size,
			maxSize: size * 1.8,
			manualEmitCount: 10,
			hideDist: 220,
			gravity: [0, speed * 10, 0],
			colorGradients: [{ timeFraction: 0, minColor: [255, 255, 255, 1], maxColor: [255, 255, 255, 1] }],
			velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
			blendMode: 1
		})
	}

	d.particleInterval = setTickInterval(() => {
		d.elevatorTime += 2

		// little sound beats to keep the timing active
		if (d.elevatorTime === 65 || d.elevatorTime === 90 || d.elevatorTime === 110) {
			api.broadcastSound("warperGrunt3", 1.0, 0.5)
		}

		let speed, texture, size

		// fast buildup phase
		if (d.elevatorTime <= 20) {
			const progress = d.elevatorTime / 20
			speed = progress * 40
			texture = "square_particle"
			size = 0.3
		// heavy middle phase
		} else if (d.elevatorTime <= 73) {
			const progress = (d.elevatorTime - 20) / 53
			speed = 40 + progress * 80
			texture = "drift"
			size = 0.7
		// slowdown before the drop
		} else if (d.elevatorTime <= 93) {
			const progress = (d.elevatorTime - 73) / 20
			speed = 120 - progress * 120
			texture = speed > 40 ? "drift" : "square_particle"
			size = speed > 40 ? 0.7 : 0.3
		// tiny calm phase before cleanup
		} else if (d.elevatorTime <= 130) {
			speed = 0.5
			texture = "square_particle"
			size = 0.4
		} else {
			// done. clean up, open the door, then hand control back to the run
			clearTickInterval(d.particleInterval)
			d.elevatorStarted = false

			// if the run was throttled for setup, remove that now
			if (typeof RS !== "undefined" && RS.throttleMode) {
				RS.throttleMode = false
			}

			setTickTimeout(() => {
				// play the landing sound right before we open the door
				api.broadcastSound("levelup", 1.0, 1.0)

				// choose the real door position if we already stored it
				const openX = pendingRideEntrance ? pendingRideEntrance.doorX : px + Math.floor(wd / 2)
				const backZ = pendingRideEntrance ? pendingRideEntrance.doorZ - 1 : pz + dp - 1

				// open the doorway back into the spawn room
				api.setBlock(openX, py + 1, backZ, "Air")
				api.setBlock(openX, py + 2, backZ, "Air")

				// fire the finish callback if one was passed in
				if (d.onFinish) {
					const finishCb = d.onFinish
					d.onFinish = null
					finishCb(px, py, pz, wd, dp)
				}
			}, 100)

			return
		}

		spawnParticles(speed, texture, size)
	}, 6)
}
