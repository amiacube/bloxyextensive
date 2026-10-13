// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 21 - join intro */
api.broadcastMessage("System 21 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

// this is the small intro sequence that plays when a player joins the game
globalThis.JOIN_SPAWN_POS = globalThis.RSP || [92.5, 128, 101.5] // spawn pos
globalThis.joinIntroState = globalThis.joinIntroState || {}

globalThis.setJoinIntroFrozen = (pId, frozen) => {
	// freeze just the movement bits while the intro is showing
	const lobbyOpts = globalThis.LMO || { speedMultiplier: 1, walkingSpeed: 4.7, runningSpeed: 4.7, jumpAmount: 0 }
	api.setClientOptions(
		pId,
		frozen
			? {
					speedMultiplier: 0,
					jumpAmount: 0
				}
			: {
					speedMultiplier: lobbyOpts.speedMultiplier,
					walkingSpeed: lobbyOpts.walkingSpeed,
					runningSpeed: lobbyOpts.runningSpeed,
					jumpAmount: lobbyOpts.jumpAmount
				}
	)
}

globalThis.skipJoinIntro = (pId) => {
	// this gets called when the player skips the intro early (tho this did not make it into the full game... yet)
	const st = joinIntroState[pId]
	if (!st || !st.active) return false
	st.active = false
	api.setClientOptions(pId, {
		cameraTint: null,
		middleTextLower: ""
	})
	api.sendFlyingMiddleMessage(pId, "", 0, 10)
	setJoinIntroFrozen(pId, false)
	delete joinIntroState[pId]
	return true
}

globalThis.skipJoinIntroToNormal = (pId) => {
	// this sends the player straight into the normal lobby setup (again, this did not make it into the full game)
	const hadIntro = skipJoinIntro(pId)
	api.setClientOptions(pId, {
		cameraTint: null,
		middleTextLower: "",
		creative: true,
		canChange: true,
		invincible: false,
		canSeeNametagsThroughWalls: false,
		speedMultiplier: 1,
		walkingSpeed: 4,
		runningSpeed: 7,
		jumpAmount: 8
	})
	return hadIntro || true
}

globalThis.startJoinIntro = (pId) => {
	// if the game is already loaded, we jump straight into the title flow
	const alreadyLoaded = cbLoaded && sysLoaded && roomsLoaded
	joinIntroState[pId] = { active: true, phase: alreadyLoaded ? "title" : "loading" }
	api.setPosition(pId, JOIN_SPAWN_POS)
	setJoinIntroFrozen(pId, true)
	api.setClientOptions(pId, {
		cameraTint: [0, 0, 0, 1],
		middleTextLower: ""
	})

	const showIntroLine = (playerId, text, lifetime, size) => {
		api.sendFlyingMiddleMessage(playerId, [{ str: text, style: { color: "#ffffff", fontSize: size || "2.2rem" } }], 0, lifetime)
	}

	const playIntroPulse = (delay) => {
		setTickTimeout(() => {
			if (!api.playerIsInGame(pId)) return
			api.playSound(pId, "pulseFromTheDark", 0.85, 0.42)
		}, delay)
	}

	playIntroPulse(0)

	const beginTitle = () => {
		const st = joinIntroState[pId]
		if (!st || !st.active) return
		st.phase = "title"
		api.setClientOption(pId, "middleTextLower", "")

		// title card comes in slow so the player has a second to settle in
		setTickTimeout(() => {
			const cur = joinIntroState[pId]
			if (!cur || !cur.active || cur.phase !== "title") return
			showIntroLine(pId, "Crownix presents...", 3000, "2.3rem")
			api.playSound(pId, "pulseFromTheDark", 0.85, 0.42)
			api.playSound(pId, "pistol_magazine_load_02", 0.45, 0.75)
		}, 15)

		setTickTimeout(() => {
			const cur = joinIntroState[pId]
			if (!cur || !cur.active || cur.phase !== "title") return
			showIntroLine(pId, "Doors - The Rooms", 4200, "3.2rem")
			api.setClientOption(pId, "middleTextLower", "")
			api.playSound(pId, "pistol_magazine_load_02", 0.55, 0.68)
		}, 95)

		// this is the little promo line that stays in the intro
		setTickTimeout(() => {
			const cur = joinIntroState[pId]
			if (!cur || !cur.active) return
			api.sendFlyingMiddleMessage(
				pId,
				[
					{ str: "Make sure to join ", style: { color: "#ffffff", fontSize: "1.55rem" } },
					{ str: globalThis.JIS || "Bloxdhub.com", style: { color: "#6ee7ff", fontSize: "1.55rem" } } // man... im telling u. join bloxdhub. this is ur sign.
				],
				0,
				3200
			)
		}, 180)

		setTickTimeout(() => {
			const cur = joinIntroState[pId]
			if (!cur || !cur.active) return
			cur.phase = "fade"
			const fadeSteps = 8
			for (let i = 0; i <= fadeSteps; i++) {
				setTickTimeout(() => {
					const s = joinIntroState[pId]
					if (!s || !s.active) return
					const alpha = Math.max(0, 1 - i / fadeSteps)
					api.setClientOption(pId, "cameraTint", [0, 0, 0, alpha])
					if (i === fadeSteps) {
						api.setClientOptions(pId, {
							middleTextLower: ""
						})
						setJoinIntroFrozen(pId, false)
						delete joinIntroState[pId]
					}
				}, i * 5)
			}
		}, 275)
	}

	const showLoading = () => {
		const st = joinIntroState[pId]
		if (!st || !st.active || st.phase !== "loading") return
		showIntroLine(pId, "Loading the game...", 2800, "2.25rem")
		api.setClientOption(pId, "middleTextLower", "")
		setTickTimeout(showLoading, 45)
	}

	if (!alreadyLoaded) showLoading()

	const waitUntilLoaded = () => {
		const st = joinIntroState[pId]
		if (!st || !st.active || st.phase !== "loading") return
		if (cbLoaded && sysLoaded && roomsLoaded) {
			beginTitle()
			return
		}
		setTickTimeout(waitUntilLoaded, 5)
	}

	if (alreadyLoaded) beginTitle()
	else waitUntilLoaded()
}
