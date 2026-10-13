// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// system 1 - closet interaction handler
api.broadcastMessage("System 1 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

globalThis.playersInCloset = {}
globalThis.hideCooldowns = {}
globalThis.cooldownMsgActive = {}
globalThis.occupiedClosets = {}
globalThis.lastClosetMsg = {}
globalThis.pendingClosetActions = {}
globalThis.closetUpdateTick = 0

// players in closets keeps the active hide state per player
// hide cooldowns block spam hide loops after a player leaves
// occupied closets keeps two players out of the same closet at once
// last closet msg lets us only update the prompt when it changes
// pending closet actions stops double clicks from firing twice

const ACHIEVEMENT_SLOT = 5

globalThis.loadPlayerAchievements = (pId) => {
	try {
		// the achievement flag is stored in a chest slot so it persists between sessions
		const item = api.getMoonstoneChestItemSlot(pId, ACHIEVEMENT_SLOT)
		if (item && item.attributes && item.attributes.customAttributes && item.attributes.customAttributes.closetDweller) {
			return JSON.parse(item.attributes.customAttributes.closetDweller)
		}

		return false
	} catch (e) {
		return false
	}
}

globalThis.saveClosetAchievement = (pId) => {
	try {
		// bread is just the holder item, the real data sits in the custom attribute
		api.setMoonstoneChestItemSlot(pId, ACHIEVEMENT_SLOT, "Bread", 1, {
			customAttributes: { closetDweller: JSON.stringify(true) }
		})
	} catch (e) {}
}

globalThis.executeClosetAction = function (action) {
	if (!action || !api.playerIsInGame(action.pId)) return

	const { pId, type, x, doorY, z, rot, closetKey, tPos, fDir, savedTint } = action

	// small camera pause so the move feels clean instead of jittery
	if (typeof blockCameraEffectsTemporarily === "function") {
		blockCameraEffectsTemporarily(pId, 10)
	}

	if (type === "exit") {
		// exit path puts the player back in the room and clears the hide state
		// this is the normal leave flow when the player clicks from inside the closet
		api.setPosition(pId, tPos[0], tPos[1], tPos[2])
		api.setCameraDirection(pId, fDir)
		playersInCloset[pId] = false
		delete occupiedClosets[closetKey]

		// restore the old tint if we saved one, otherwise open the view back up
		const restoredTint = savedTint === undefined ? null : savedTint
		api.setClientOptions(pId, {
			speedMultiplier: 1,
			cameraRoll: 0,
			cameraTint: restoredTint
		})

		// progressive darkness comes back after the closet exit so the room stays in sync
		// this keeps the room lighting aligned with wtvr area the player returned to
		if (typeof applyProgressiveDarkness === "function" && typeof getRoomNum === "function") {
			const pos = api.getPosition(pId)
			if (pos) {
				const roomNum = getRoomNum(pos[0], pos[2])
				if (roomNum !== -1) {
					setTickTimeout(() => {
						applyProgressiveDarkness(pId, roomNum)
					}, 2)
				}
			}
		}

		if (hideCooldowns[pId]) {
			// clear the cooldown so the next hide timer starts fresh
			delete hideCooldowns[pId]
		}

		return
	}

	// enter path moves the player into the closet and locks movement for the hide state
	// this is the part that turns the player into a hidden body inside the closet volume
	api.setPosition(pId, tPos[0], tPos[1], tPos[2])
	api.setCameraDirection(pId, fDir)
	api.setClientOptions(pId, {
		speedMultiplier: 0,
		cameraTint: [0.1, 0.1, 0.15, 0.6]
	})

	// remember which player owns this closet while they are inside
	occupiedClosets[closetKey] = pId
	playersInCloset[pId] = {
		pos: tPos,
		time: Date.now(),
		doorX: x,
		doorY: doorY,
		doorZ: z,
		rot: rot,
		closetKey: closetKey,
		savedTint: savedTint
	}
}

globalThis.handleClosetClick = function (pId, x, y, z, block) {
	// only closet doors are allowed through this handler
	// this keeps the system from touching random blocks by mistake
	if (!block || (!block.startsWith("Jungle Door") && !block.startsWith("_Jungle Door Top"))) return
	if (pendingClosetActions[pId]) return "preventAction"

	// the top half and bottom half share the same closet position
	const doorY = block.startsWith("_Jungle Door Top") ? y - 1 : y
	let rot = 1
	const r2s = "rot2"
	const r3s = "rot3"
	const r4s = "rot4"
	if (block.includes(r2s)) rot = 2
	if (block.includes(r3s)) rot = 3
	if (block.includes(r4s)) rot = 4

	// the key is the exact door position, not the player position
	const closetKey = `${x},${doorY},${z}`
	const pPos = api.getPosition(pId)
	if (!pPos) return "preventAction"

	const isInCloset = playersInCloset[pId] && typeof playersInCloset[pId] === "object" && playersInCloset[pId].closetKey === closetKey
	let tPos, fDir

	if (isInCloset) {
		// exiting the closet uses the same door position, just from the inside
		// the offset changes based on which way the door faces
		const data = playersInCloset[pId]
		const rot = data.rot

		if (rot === 1) {
			tPos = [x + 0.5, doorY, z - 1.5]
			fDir = [0, 0, -1]
		} else if (rot === 2) {
			tPos = [x - 1.5, doorY, z + 0.5]
			fDir = [-1, 0, 0]
		} else if (rot === 3) {
			tPos = [x + 0.5, doorY, z + 1.5]
			fDir = [0, 0, 1]
		} else {
			tPos = [x + 1.5, doorY, z + 0.5]
			fDir = [1, 0, 0]
		}

		pendingClosetActions[pId] = true
		setTickTimeout(() => {
			// do the actual exit on the next tick so the click does not double fire
			delete pendingClosetActions[pId]
			executeClosetAction({
				pId,
				type: "exit",
				x,
				doorY,
				z,
				rot,
				closetKey,
				tPos,
				fDir,
				savedTint: data.savedTint
			})
		}, 1)
	} else {
		// entering a closet needs a few checks first so two players do not grab the same spot
		// this is where occupancy and cooldown get enforced
		if (occupiedClosets[closetKey]) {
			// somebody is already inside this closet
			api.setClientOption(pId, "middleTextLower", [{ str: "Closet Occupied", style: { color: "#ff0000" } }])
			setTickTimeout(() => {
				const current = api.getClientOption(pId, "middleTextLower")
				if (current && current[0] && current[0].str === "Closet Occupied") {
					api.setClientOption(pId, "middleTextLower", "")
				}
			}, 40)
			return "preventAction"
		}

		if (hideCooldowns[pId] && Date.now() < hideCooldowns[pId]) {
			// this blocks immediate re entry after leaving the closet
			const remaining = Math.ceil((hideCooldowns[pId] - Date.now()) / 1000)
			cooldownMsgActive[pId] = true
			api.setClientOption(pId, "middleTextLower", [{ str: `Wait ${remaining}s to hide again`, style: { color: "#ff0000" } }])
			setTickTimeout(() => {
				cooldownMsgActive[pId] = false
				const current = api.getClientOption(pId, "middleTextLower")
				if (current && current[0] && current[0].str && current[0].str.includes("Wait") && current[0].str.includes("to hide again")) {
					api.setClientOption(pId, "middleTextLower", "")
				}
			}, 40)
			return "preventAction"
		}

		// calculate the inner position based on the door rotation
		// each rotation moves the player one block into the closet from a different side
		if (rot === 1) {
			tPos = [x + 0.5, doorY, z + 1.5]
			fDir = [0, 0, -1]
		} else if (rot === 2) {
			tPos = [x + 1.5, doorY, z + 0.5]
			fDir = [-1, 0, 0]
		} else if (rot === 3) {
			tPos = [x + 0.5, doorY, z - 0.5]
			fDir = [0, 0, 1]
		} else {
			tPos = [x - 0.5, doorY, z + 0.5]
			fDir = [1, 0, 0]
		}

		// save the current tint so we can restore it after the player exits
		const savedTint = api.getClientOption(pId, "cameraTint")
		pendingClosetActions[pId] = true
		setTickTimeout(() => {
			// enter on the next tick so the click system does not keep the action alive
			delete pendingClosetActions[pId]
			executeClosetAction({
				pId,
				type: "enter",
				x,
				doorY,
				z,
				rot,
				closetKey,
				tPos,
				fDir,
				savedTint
			})
		}, 1)
	}

	return "preventAction"
}

globalThis.updateClosetPlayers = function () {
	closetUpdateTick++
	const shouldCheckTargets = closetUpdateTick % 10 === 0

	// the target scan only runs every few ticks so it doesnt spam the server
	// this keeps the prompt update cheap and light
	if (shouldCheckTargets) {
		for (const pId of api.getPlayerIds()) {
			// this flag tells us whether the player is already hidden in some closet
			const isInCloset = playersInCloset[pId] && typeof playersInCloset[pId] === "object"
			const tInfo = api.getPlayerTargetInfo(pId)

			if (tInfo && tInfo.position) {
				// target info gives us the block the player is looking at
				const [x, y, z] = tInfo.position
				const block = api.getBlock(x, y, z)

				if (block && (block.startsWith("Jungle Door") || block.startsWith("_Jungle Door Top"))) {
					// only show prompts on actual closet doors (NOT on any door)
					const doorY = block.startsWith("_Jungle Door Top") ? y - 1 : y
					if (cooldownMsgActive[pId]) continue

					let rot = 1
					if (block.includes("rot2")) rot = 2
					else if (block.includes("rot3")) rot = 3
					else if (block.includes("rot4")) rot = 4

					const pPos = api.getPosition(pId)
					if (!pPos) continue

					// the door key is based on exact door coordinates (used for the hotel)
					const closetKey = `${x},${doorY},${z}`
					const actuallyInCloset = isInCloset && playersInCloset[pId] && playersInCloset[pId].closetKey === closetKey
					let msg

					// the text changes based on whether the door is open, occupied, or already being used
					if (occupiedClosets[closetKey] && !actuallyInCloset) {
						msg = "Occupied"
					} else {
						msg = actuallyInCloset ? "Click to Exit" : "Click to Hide"
						if (!actuallyInCloset && hideCooldowns[pId] && Date.now() < hideCooldowns[pId]) {
							const remaining = Math.ceil((hideCooldowns[pId] - Date.now()) / 1000)
							msg = `Cooldown: ${remaining}s`
						}
					}

					if (lastClosetMsg[pId] !== msg) {
						lastClosetMsg[pId] = msg
						api.setClientOption(pId, "middleTextLower", [{ str: msg, style: { color: "#ffffffff" } }])
					}

					continue
				}
			}

			if (lastClosetMsg[pId]) {
				// clear the old prompt once the player stops looking at a closet
				delete lastClosetMsg[pId]
				api.setClientOption(pId, "middleTextLower", "")
			}
		}
	}

	// this part keeps the hide effect alive while the player stays inside the closet
	// it also handles cleanup if somebody leaves the game while hidden
	for (const pId in playersInCloset) {
		const data = playersInCloset[pId]
		if (!data || typeof data !== "object" || !data.pos) continue

		if (!api.playerIsInGame(pId)) {
			// if the player left, release the closet right away
			if (data.closetKey) delete occupiedClosets[data.closetKey]
			delete playersInCloset[pId]
			continue
		}

		// the longer the player stays hidden, the stronger the closet effect feels
		const hideTime = Date.now() - data.time
		const progress = Math.min(hideTime / 12000, 0.6)

		/* Disabled forced closet kickout for now.
        // ONLY used for the hotel chapter which isnt released.
		if (hideTime >= 12000) {
			const kickProgress = (hideTime - 12000) / 1000
			if (kickProgress >= 0.1 && !data.whiteFlashShown) {
				data.whiteFlashShown = true
				api.setClientOptions(pId, { cameraRoll: 0, cameraRollTransitionMs: 100, cameraTint: [1, 1, 1, 0.95] })
				api.playSound(pId, "horrorAccent1", 1.0, 0.7)
			}
			if (kickProgress >= 0.5 && !data.kickExecuted) {
				data.kickExecuted = true
				const rot = data.rot
				const x = data.doorX
				const y = data.doorY
				const z = data.doorZ
				let tPos, fDir
				if (rot === 1) {
					tPos = [x + 0.5, y - 1, z - 1.5]
					fDir = [0, 0, -1]
				} else if (rot === 2) {
					tPos = [x - 1.5, y - 1, z + 0.5]
					fDir = [-1, 0, 0]
				} else if (rot === 3) {
					tPos = [x + 0.5, y - 1, z + 1.5]
					fDir = [0, 0, 1]
				} else {
					tPos = [x + 1.5, y - 1, z + 0.5]
					fDir = [1, 0, 0]
				}
				api.attemptApplyDamage({
					eId: pId,
					hitEId: pId,
					attemptedDmgAmt: 30,
					withItem: "Fist",
					isTrueDamage: true
				})
				if (!data.hideNotificationShown) {
					data.hideNotificationShown = true
					const hasAchievement = loadPlayerAchievements(pId)
					if (!hasAchievement) {
						saveClosetAchievement(pId)
						api.sendTopRightHelper(pId, "door-closed", "Achievement Unlocked!\nCloset Dweller", {
							duration: 6,
							width: 320,
							height: 90,
							color: "#2a1515",
							textAndIconColor: "#ffd700",
							iconSizeMult: 2,
							fontSize: "1.125rem"
						})
					}
				}
				api.setPosition(pId, tPos[0], tPos[1], tPos[2])
				api.setCameraDirection(pId, fDir)
				api.setClientOptions(pId, { speedMultiplier: 1, cameraRoll: 0, cameraRollTransitionMs: 200, cameraTint: null })
				hideCooldowns[pId] = Date.now() + 10000
				if (data.closetKey) delete occupiedClosets[data.closetKey]
				playersInCloset[pId] = false
			}
			continue
		}
		*/

		if (progress <= 0.6) {
			if (closetUpdateTick % 10 === 0) {
				// keep the tint soft while the player is inside the closet
				api.setClientOption(pId, "cameraTint", [0.1, 0.1, 0.15, 0.6])
			}
		}

		/* Disabled closet camera shake while entities pass by for now. Does too much work and doesnt look too good right now.
		if (typeof RUSH !== "undefined" && RUSH.pos && RUSH.st > 1 && closetUpdateTick % 2 === 0) {
			const rushPos = RUSH.pos
			const pdx = rushPos[0] - data.pos[0]
			const pdy = rushPos[1] - data.pos[1]
			const pdz = rushPos[2] - data.pos[2]
			const pdSquared = pdx * pdx + pdy * pdy + pdz * pdz
			if (pdSquared < 1600) {
				const pd = Math.sqrt(pdSquared)
				const rot = data.rot
				let baseDir
				if (rot === 1) baseDir = [0, 0, -1]
				else if (rot === 2) baseDir = [-1, 0, 0]
				else if (rot === 3) baseDir = [0, 0, 1]
				else baseDir = [1, 0, 0]
				const si = Math.max(0, (40 - pd) / 40 * 0.08)
				const shakeX = (Math.random() - 0.5) * si
				const shakeY = (Math.random() - 0.5) * si
				const shakeZ = (Math.random() - 0.5) * si
				const nd = [baseDir[0] + shakeX, baseDir[1] + shakeY, baseDir[2] + shakeZ]
				const ln = Math.sqrt(nd[0] * nd[0] + nd[1] * nd[1] + nd[2] * nd[2])
				if (ln > 0) {
					nd[0] /= ln
					nd[1] /= ln
					nd[2] /= ln
					api.setCameraDirection(pId, nd)
				}
			}
		}
		if (typeof AMBUSH !== "undefined" && AMBUSH.pos && AMBUSH.st > 1 && closetUpdateTick % 2 === 0) {
			const ambushPos = AMBUSH.pos
			const pdx = ambushPos[0] - data.pos[0]
			const pdy = ambushPos[1] - data.pos[1]
			const pdz = ambushPos[2] - data.pos[2]
			const pdSquared = pdx * pdx + pdy * pdy + pdz * pdz
			if (pdSquared < 1600) {
				const pd = Math.sqrt(pdSquared)
				const rot = data.rot
				let baseDir
				if (rot === 1) baseDir = [0, 0, -1]
				else if (rot === 2) baseDir = [-1, 0, 0]
				else if (rot === 3) baseDir = [0, 0, 1]
				else baseDir = [1, 0, 0]
				const si = Math.max(0, (40 - pd) / 40 * 0.08)
				const shakeX = (Math.random() - 0.5) * si
				const shakeY = (Math.random() - 0.5) * si
				const shakeZ = (Math.random() - 0.5) * si
				const nd = [baseDir[0] + shakeX, baseDir[1] + shakeY, baseDir[2] + shakeZ]
				const ln = Math.sqrt(nd[0] * nd[0] + nd[1] * nd[1] + nd[2] * nd[2])
				if (ln > 0) {
					nd[0] /= ln
					nd[1] /= ln
					nd[2] /= ln
					api.setCameraDirection(pId, nd)
				}
			}
		}
		*/
	}
}

globalThis.cleanupClosetPlayer = function (pId) {
	// hard cleanup for disconnects and unloads
	// this clears every closet related state so nothing gets stuck after a leave
	const data = playersInCloset[pId]
	if (data && data.closetKey) {
		delete occupiedClosets[data.closetKey]
	}

	delete playersInCloset[pId]
	delete hideCooldowns[pId]
	delete cooldownMsgActive[pId]
	delete lastClosetMsg[pId]
	delete pendingClosetActions[pId]
}
