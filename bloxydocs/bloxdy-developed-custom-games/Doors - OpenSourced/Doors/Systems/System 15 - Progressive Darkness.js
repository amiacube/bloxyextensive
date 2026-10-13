// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// system 15 - progressive darkness for the rooms
// darkness ramps up as the player moves deeper into the run
const msg = "System 15 loaded"
api.broadcastMessage(msg, { color: "#FFD700" })
// make sure to join https://bloxdhub.com

globalThis.PD = {
	playerRooms: {}, // last room each player was seen in
	playerDarkness: {}, // current darkness level per player
	updateInterval: 10
}

// apply progressive darkness based on room number
globalThis.applyProgressiveDarkness = (pId, roomNum) => {
	if (roomNum < 0) return

	// room 0 stays bright and room 160 reaches the cap
	// anything past that just stays at the same max feeling
	const darknessPercent = Math.min(100, Math.floor((roomNum / 160) * 100))

	// camera tint uses a soft cap so the game stays readable
	const opacity = Math.min(darknessPercent, 80) / 100

	queueAPI(() => {
		api.setClientOption(pId, "cameraTint", [0, 0, 0, opacity])
	})

	// fog gets stronger later in the run, but the early rooms stay open
	let fogDist = null
	if (darknessPercent >= 50) {
		// map 50 to 100 into a smaller fog distance curve
		// the early ramp is softer so the player can still read the room
		const t = (darknessPercent - 50) / 50
		fogDist = Math.pow(1 - t, 3) * 0.5
	}

	queueAPI(() => {
		api.setClientOption(pId, "fogChunkDistanceOverride", fogDist)
		api.setClientOption(pId, "fogColourOverride", fogDist !== null ? "#000000" : null)
	})

	// store the last value so other systems can read it if they need to
	PD.playerDarkness[pId] = darknessPercent
}

// update player darkness when they change rooms
globalThis.updateProgressiveDarkness = () => {
	const ids = typeof getSnapshotPlayerIds === "function" ? getSnapshotPlayerIds() : api.getPlayerIds()
	for (let pId of ids) {
		try {
			const snap = typeof getPlayerSnapshot === "function" ? getPlayerSnapshot(pId) : null
			const currentRoom = snap ? snap.roomNum : -1

			// when the room number changes, recalc the darkness for that player
			const prevRoom = PD.playerRooms[pId]
			if (currentRoom !== -1 && prevRoom !== currentRoom) {
				PD.playerRooms[pId] = currentRoom
				applyProgressiveDarkness(pId, currentRoom)
			}
		} catch (e) {}
	}
}

// start the progressive darkness system
globalThis.startProgressiveDarkness = () => {
	if (PD.interval) return
	PD.interval = setTickInterval(() => {
		updateProgressiveDarkness()
	}, PD.updateInterval)
}

// reset progressive darkness for a player
globalThis.resetProgressiveDarkness = (pId) => {
	queueAPI(() => {
		api.setClientOption(pId, "cameraTint", [0.35, 0.28, 0.45, 0.05])
		api.setClientOption(pId, "fogChunkDistanceOverride", null)
		api.setClientOption(pId, "fogColourOverride", null)
	})
	delete PD.playerRooms[pId]
	delete PD.playerDarkness[pId]
}

// cleanup when player leaves
globalThis.cleanupProgressiveDarknessPlayer = (pId) => {
	delete PD.playerRooms[pId]
	delete PD.playerDarkness[pId]
}

// start the system
startProgressiveDarkness()
