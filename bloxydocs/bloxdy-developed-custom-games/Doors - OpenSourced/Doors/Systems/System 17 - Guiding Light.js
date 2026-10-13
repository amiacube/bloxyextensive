// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 17 - guiding light death messages */
api.broadcastMessage("System 17 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const GUIDING_LIGHT_SLOT = 6

// a-90 gets its own message set because the death state works a little differently
globalThis.guidingLightMessagesA90 = {
	1: [
		"Ah… so you've met A-90.",
		"I was wondering when that would happen.",
		"It's not like A-60.",
		"A-60 hunts.",
		"A-90… observes."
	],
	2: [
		"Did you feel it?",
		"That moment when everything stopped?",
		"A-90 doesn't move like the others.",
		"It doesn't need to.",
		"It just… waits."
	],
	3: [
		"You couldn't move, could you?",
		"That's what A-90 does.",
		"It freezes you in place.",
		"And if you so much as twitch…",
		"well… you saw what happened."
	],
	4: [
		"Most people panic when they can't move.",
		"They think they can fight it.",
		"They think they can look away.",
		"But A-90 sees everything.",
		"Even the smallest movement."
	],
	5: [
		"The trick is to stay absolutely still.",
		"Not just your body.",
		"Your eyes too.",
		"Don't look around.",
		"Don't even blink."
	],
	6: [
		"A-90 has been watching these halls for longer than most.",
		"It's patient.",
		"Very patient.",
		"And it's very good at what it does.",
		"Most don't survive the second encounter."
	],
	7: [
		"You're learning, though.",
		"Each time you come back…",
		"you understand a little more.",
		"A-90 is just one of many things down here.",
		"And you're running out of time."
	]
}

// a-60 uses the main guiding light message pool
globalThis.guidingLightMessages = {
	1: [
		"This one's tricky…",
		"Hmm… we haven't met yet, have we?",
		"I suppose I should introduce myself… though you'll only see me when things go wrong.",
		"The one that got you just now…",
		"That was A-60."
	],
	2: [
		"Hmm… you died again.",
		"That's alright. Most do the first few times.",
		"A-60 moves very quickly.",
		"Faster than most things down here.",
		"If you notice something red rushing through the halls…",
		"you're already very close to danger."
	],
	3: [
		"Did you hear it that time?",
		"A-60 doesn't arrive silently.",
		"There's usually a faint sound first…",
		"Something like static.",
		"It's easy to miss if you aren't paying attention."
	],
	4: [
		"Hmm… A-60 caught you again.",
		"When it begins moving through the halls…",
		"it rarely slows down.",
		"If you stay out in the open…",
		"it will reach you before you realize it."
	],
	5: [
		"You're getting closer… I can tell.",
		"These halls have places to hide.",
		"Lockers, mostly.",
		"If A-60 is coming…",
		"finding one quickly might help you survive."
	],
	6: [
		"Hmm… still struggling with A-60?",
		"Don't worry.",
		"Even the ones who made it far… learned the hard way.",
		"Just remember…",
		"if you hear the warning…",
		"you don't have long."
	],
	7: [
		"A-60 has been here for a long time.",
		"Long before you arrived.",
		"Long before many others.",
		"These halls…",
		"are very familiar to it."
	]
}

globalThis.loadA60Deaths = (pId) => {
	// the death count is stored in a chest slot so it survives between sessions
	try {
		const item = api.getMoonstoneChestItemSlot(pId, GUIDING_LIGHT_SLOT)
		if (item && item.attributes && item.attributes.customAttributes && item.attributes.customAttributes.a60Deaths) {
			return JSON.parse(item.attributes.customAttributes.a60Deaths)
		}
		return 0
	} catch (e) {
		return 0
	}
}

globalThis.saveA60Deaths = (pId, deaths) => {
	// bread is just the placeholder item, the custom attribute holds the real value
	try {
		api.setMoonstoneChestItemSlot(pId, GUIDING_LIGHT_SLOT, "Bread", 1, {
			customAttributes: { a60Deaths: JSON.stringify(deaths) }
		})
	} catch (e) {}
}

globalThis.showPostGuidingLightDeathScreen = (pId) => {
	if (!api.playerIsInGame(pId)) return
	// after the message sequence, this puts the player back into the normal death flow
	api.setClientOptions(pId, {
		usePlayAgainButton: true,
		autoRespawn: false,
		secsToRespawn: 1,
		respawnButtonText: "Stay in lobby"
	})
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.killLifeform(pId)
	}, 2)
}

globalThis.showGuidingLight = (pId, deathOverride) => {
	// this is the normal guiding light flow for a-60 deaths
	// the message set changes a bit as the player keeps dying
	let deaths = deathOverride || loadA60Deaths(pId) + 1
	if (!deathOverride) saveA60Deaths(pId, deaths)
	if (typeof markRunPlayerEliminated === "function") markRunPlayerEliminated(pId)

	// get message set, capped so the later deaths reuse the same pacing
	const messageSet = Math.min(deaths, 7)
	const messages = guidingLightMessages[messageSet]

	// respawn the player first so the screen can reset cleanly
	api.forceRespawn(pId, globalThis.RSP || [92.5, 128, 101.5])

	// then fade to a dark screen so the message shows better 
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 1.0])
	}, 2)

	// show messages sequentially with gaps
	// the blank time at the start makes the message sequence feel heavier
	let delay = 30 // 1.5 seconds in ticks (20 ticks per second)
	for (let i = 0; i < messages.length; i++) {
		// play suspense riser at the start of the gap, except for the last message (so it sounds like some spooky background music)
		if (i < messages.length - 1) {
			setTickTimeout(() => {
				if (!api.playerIsInGame(pId)) return
				api.playSound(pId, "suspenseRiser", 0.9, 0.4)
			}, delay)
		}

		// short gap after the riser before the message shows
		delay += 15 // 750ms (15 ticks) gap

		// show the line and play the message sound together
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.sendFlyingMiddleMessage(pId, [{ str: messages[i], style: { color: "#b3d9ff", fontSize: "1.8rem" } }], 0, 4000)
			api.playSound(pId, "pistol_magazine_load_02", 0.6, 0.7)
		}, delay)

		// give the line enough time to be read
		delay += 80 // 4000ms display (80 ticks)
	}

	// fade the tint out gradually
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

globalThis.loadA90Deaths = (pId) => {
	// same setup as a-60, just stored in a different slot
	try {
		const item = api.getMoonstoneChestItemSlot(pId, 7) // Slot 7 for A-90 deaths
		if (item && item.attributes && item.attributes.customAttributes && item.attributes.customAttributes.a90Deaths) {
			return JSON.parse(item.attributes.customAttributes.a90Deaths)
		}
		return 0
	} catch (e) {
		return 0
	}
}

globalThis.saveA90Deaths = (pId, deaths) => {
	// keep the a-90 death count in the same persistent format
	try {
		api.setMoonstoneChestItemSlot(pId, 7, "Bread", 1, {
			customAttributes: { a90Deaths: JSON.stringify(deaths) }
		})
	} catch (e) {}
}

globalThis.showGuidingLightA90 = (pId, deathOverride) => {
	// a-90 uses the same structure, just with its own message set
	// the pacing stays familiar so the player knows what kind of screen this is
	let deaths = deathOverride || loadA90Deaths(pId) + 1
	if (!deathOverride) saveA90Deaths(pId, deaths)
	if (typeof markRunPlayerEliminated === "function") markRunPlayerEliminated(pId)

	// get message set, capped so the later deaths reuse the same pacing
	const messageSet = Math.min(deaths, 7)
	const messages = guidingLightMessagesA90[messageSet]

	// respawn the player first so the screen can reset cleanly
	api.forceRespawn(pId, globalThis.RSP || [92.5, 128, 101.5])

	// then fade to a dark screen so the message hit lands better
	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 1.0])
	}, 2)

	// show messages sequentially with gaps
	// the blank time at the start makes the message sequence feel heavier
	let delay = 30 // 1.5 seconds in ticks (20 ticks per second)
	for (let i = 0; i < messages.length; i++) {
		// play suspense riser at the start of the gap, except for the last message
		if (i < messages.length - 1) {
			setTickTimeout(() => {
				if (!api.playerIsInGame(pId)) return
				api.playSound(pId, "suspenseRiser", 0.9, 0.4)
			}, delay)
		}

		// short gap after the riser before the message shows
		delay += 15 // 750ms (15 ticks) gap

		// show the line and play the message sound together
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.sendFlyingMiddleMessage(pId, [{ str: messages[i], style: { color: "#b3d9ff", fontSize: "1.8rem" } }], 0, 4000)
			api.playSound(pId, "pistol_magazine_load_02", 0.6, 0.7)
		}, delay)

		// give the line enough time to be read
		delay += 80 // 4000ms display (80 ticks)
	}

	// fade the tint out gradually
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

globalThis.testGuidingLight = (pId, deathNum) => {
	showGuidingLight(pId, deathNum)
}

globalThis.testGuidingLightA90 = (pId, deathNum) => {
	showGuidingLightA90(pId, deathNum)
}

globalThis.cleanupGuidingLight = (pId) => {
	// nothing to clear here right now
}

globalThis.showGuidingLightWin = (pId) => {
	// win screen uses the same guiding light style, just with the ending lines
	// this is the end of the run, so the tone gets a little softer
	if (typeof markRunPlayerEliminated === "function") markRunPlayerEliminated(pId)
	api.setPosition(pId, ...(globalThis.RSP || [92.5, 128, 101.5]))

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 1.0])
	}, 2)

	// these are the ending lines after the player reaches the end
	const messages = [
		"So... you made it.",
		"Or maybe this place wanted you to.",
		"Most never get this far.",
		"The rooms change people.",
		"Sometimes they leave different than they entered.",
		"If this feels like an ending...",
		"don't trust that feeling.",
		"To be continued..."
	]

	let delay = 20
	for (let i = 0; i < messages.length; i++) {
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.sendFlyingMiddleMessage(pId, [{ str: messages[i], style: { color: "#b3d9ff", fontSize: "1.8rem" } }], 0, 4000)
			api.playSound(pId, "pistol_magazine_load_02", 0.6, 0.7)
		}, delay)
		delay += 80
	}

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 0.6])
	}, delay + 1)

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", [0.02, 0.02, 0.08, 0.3])
	}, delay + 20)

	setTickTimeout(() => {
		if (!api.playerIsInGame(pId)) return
		api.setClientOption(pId, "cameraTint", null)
	}, delay + 40)
}
