// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 20 - extra guiding light death messages */
api.broadcastMessage("System 20 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

// this file handles the extra death screens that couldnt fit in the other guiding light file
// a-120 and the void use the same helper, just with different text pools
globalThis.guidingLightMessagesA120 = {
	1: [
		"That one was different.",
		"Slower. Heavier.",
		"A-120 does not rush.",
		"It keeps coming back.",
		"If you hear the pounding... hide, and stay hidden."
	],
	2: [
		"You made it through the first pass, didn't you?",
		"That was never the hard part.",
		"A-120 leaves...",
		"and then it returns.",
		"Most step out too early."
	],
	3: [
		"You cannot treat it like A-60.",
		"Speed will not save you here.",
		"A-120 is patient.",
		"It tests how long you can endure the pressure.",
		"Not how fast you can run."
	],
	4: [
		"The sound matters.",
		"Those heavy beats are your warning.",
		"When they start, pay attention.",
		"When they stop, do not relax too soon.",
		"It may already be on its way back."
	],
	5: [
		"You've seen the pattern now.",
		"Pass. Silence. Return.",
		"That rhythm is intentional.",
		"It wants you to believe it's over.",
		"It rarely is."
	]
}

globalThis.guidingLightMessagesVoid = {
	1: [
		"You fell too far behind.",
		"These rooms do not like separation.",
		"Something noticed.",
		"If the others keep moving...",
		"you have to keep moving too."
	],
	2: [
		"That was not anger.",
		"It was correction.",
		"The farther you drift from the group...",
		"the harder this place pulls you back.",
		"Try not to let it happen again."
	],
	3: [
		"There is safety in staying together.",
		"Not comfort. Safety.",
		"When someone is left alone here...",
		"the rooms begin to close around them.",
		"You felt that, didn't you?"
	],
	4: [
		"You cannot linger forever.",
		"Not here.",
		"If the others press forward, follow them.",
		"Distance becomes dangerous down here.",
		"More dangerous than silence."
	],
	5: [
		"The thing that found you is not hunting.",
		"Not exactly.",
		"It only appears when someone starts to disappear.",
		"Stay with the group.",
		"Do not let the rooms separate you."
	]
}

globalThis.loadExtraDeaths = (pId, slot, key) => {
	// this keeps the death count helpers reusable for other screens too
	try {
		const item = api.getMoonstoneChestItemSlot(pId, slot)
		if (item && item.attributes && item.attributes.customAttributes && item.attributes.customAttributes[key]) {
			return JSON.parse(item.attributes.customAttributes[key])
		}
		return 0
	} catch (e) {
		return 0
	}
}

globalThis.saveExtraDeaths = (pId, slot, key, deaths) => {
	// the placeholder item is just there so the custom data has somewhere to live
	try {
		api.setMoonstoneChestItemSlot(pId, slot, "Bread", 1, {
			customAttributes: { [key]: JSON.stringify(deaths) }
		})
	} catch (e) {}
}

globalThis.showGuidingLightExtra = (pId, messages) => {
	// all of the extra death screens use the same pacing and fade structure
	if (typeof markRunPlayerEliminated === "function") markRunPlayerEliminated(pId)
	api.forceRespawn(pId, globalThis.RSP || [92.5, 128, 101.5])

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 1.0])
	}, 2)

	let delay = 30
	for (let i = 0; i < messages.length; i++) {
		if (i < messages.length - 1) {
			setTickTimeout(() => {
				if (!api.playerIsInGame(pId)) return
				api.playSound(pId, "suspenseRiser", 0.9, 0.4)
			}, delay)
		}

		delay += 15
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.sendFlyingMiddleMessage(pId, [{ str: messages[i], style: { color: "#b3d9ff", fontSize: "1.8rem" } }], 0, 4000)
			api.playSound(pId, "pistol_magazine_load_02", 0.6, 0.7)
		}, delay)
		delay += 80
	}

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 0.7])
	}, delay + 1)
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 0.4])
	}, delay + 26)
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", null)
	}, delay + 51)
	setTickTimeout(() => {
		if (typeof showPostGuidingLightDeathScreen === "function") showPostGuidingLightDeathScreen(pId)
	}, delay + 56)
}

globalThis.showGuidingLightA120 = (pId, deathOverride) => {
	// a-120 uses slot 8 so it does not collide with the other counters
	let deaths = deathOverride || loadExtraDeaths(pId, 8, "a120Deaths") + 1
	if (!deathOverride) saveExtraDeaths(pId, 8, "a120Deaths", deaths)
	const messageSet = Math.min(deaths, 5)
	showGuidingLightExtra(pId, guidingLightMessagesA120[messageSet])
}

globalThis.showGuidingLightVoid = (pId, deathOverride) => {
	// the void gets its own slot too since it has a different feeling from the normal deaths (slot 9)
	let deaths = deathOverride || loadExtraDeaths(pId, 9, "voidDeaths") + 1
	if (!deathOverride) saveExtraDeaths(pId, 9, "voidDeaths", deaths)
	const messageSet = Math.min(deaths, 5)
	showGuidingLightExtra(pId, guidingLightMessagesVoid[messageSet])
}
