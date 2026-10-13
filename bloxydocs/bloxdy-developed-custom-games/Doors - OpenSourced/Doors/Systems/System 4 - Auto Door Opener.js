// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// system 4 - auto door opener and door sound hook
api.broadcastMessage("System 4 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

// auto doors stores every tracked door and auto door positions marks the blocks the system should watch
globalThis.autoDoors = []
globalThis.autoDoorPositions = {}

globalThis.registerAutoDoor = function (x, y, z, rot, doorType) {
	// the first lobby door gets handled elsewhere, so we skip double registering it here
	if (firstDoorPos && x === firstDoorPos.x && y === firstDoorPos.y && z === firstDoorPos.z) return

	const dt = doorType || "Palm Door"
	autoDoors.push({ x, y, z, rot, dt })
	autoDoorPositions[`${x},${y},${z}`] = true
	autoDoorPositions[`${x},${y + 1},${z}`] = true
}

globalThis.checkAutoDoorChange = function (pId, x, y, z, fromBlock, toBlock) {
	// opening a tracked door plays the move sound and then the open sound a moment later
	if (fromBlock && fromBlock.includes("Palm Door") && toBlock && toBlock.includes("open")) {
		api.playSound(pId, "shotgun_load_bullet_02", 0.8, 1, { playerIdOrPos: [x, y, z], maxHearDist: 20 })
		setTickTimeout(() => {
			api.playSound(pId, "trapdoorOpen", 0.6, 1, { playerIdOrPos: [x, y, z], maxHearDist: 20 })
		}, 5)

		// some rooms need extra checks when the door opens, so we hook those here
		if (typeof checkDoorForDarkness === "function") {
			checkDoorForDarkness(pId, x, y, z)
		}
		if (typeof checkDoorForEyeEntity === "function") {
			checkDoorForEyeEntity(pId, x, y, z)
		}
	}

	// the first lobby door is allowed to close, the rest stay locked once they open
	if (fromBlock && fromBlock.includes("Palm Door") && toBlock && toBlock.includes("closed")) {
		if (firstDoorPos && x === firstDoorPos.x && y === firstDoorPos.y && z === firstDoorPos.z) {
			return
		}

		return "preventChange"
	}
}

globalThis.cleanupAutoDoorPlayer = function (pId) {
	// nothing to clear here yet, but the hook stays in place for future cleanup
}

globalThis.resetAutoDoors = function () {
	// full reset clears all tracked doors and block markers
	autoDoors = []
	autoDoorPositions = {}
	globalThis.autoDoors = autoDoors
	globalThis.autoDoorPositions = autoDoorPositions
}
