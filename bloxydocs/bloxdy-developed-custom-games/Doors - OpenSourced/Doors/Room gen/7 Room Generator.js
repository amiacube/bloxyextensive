// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// room generator - random dungeon generation with turn rules
api.broadcastMessage("Codeblock 7 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

// main run state for the generator
// this keeps track of room order, last picks, and where the next room should attach
globalThis.END_ROOM_TARGET_A = 1001
globalThis.RS = {
	active: false,
	exitX: 0,
	exitY: 0,
	exitZ: 0,
	exitSide: 0,
	canLeft: true,
	canRight: true,
	roomCount: 0,
	targetRooms: 1000,
	initialRooms: 25,
	bufferSize: 20,
	batchSize: 3,
	lastLRoom: -1,
	lastNotch: -1,
	lastBook: -1,
	lastHall: -1,
	lastZ: -1,
	lastEye: -1,
	lastPuzzle: -1,
	lastCubby: -1,
	lastCurve: -1,
	lastKitchen: -1,
	lastCloset: -1,
	lastSkinny: -1,
	lastNewHall: -1,
	skipSideRooms: false,
	forceTurn: null,
	throttleMode: false,
	generationPaused: false,
	endRoomReached: false
}

globalThis.startGeneration = function (startX, startY, startZ, initialRooms = 25, throttled = true) {
	// reset the run state before the first room gets built
	RS.active = true
	RS.exitX = startX
	RS.exitY = startY
	RS.exitZ = startZ
	RS.exitSide = 0
	RS.canLeft = true
	RS.canRight = true
	RS.roomCount = 0
	RS.targetRooms = 1000
	RS.initialRooms = initialRooms
	RS.lastLRoom = -1
	RS.lastNotch = -1
	RS.lastBook = -1
	RS.lastHall = -1
	RS.lastZ = -1
	RS.lastEye = -1
	RS.lastPuzzle = -1
	RS.lastCubby = -1
	RS.lastCurve = -1
	RS.lastKitchen = -1
	RS.lastCloset = -1
	RS.lastSkinny = -1
	RS.lastNewHall = -1
	RS.lastCatwalk = -1
	RS.skipSideRooms = false
	RS.throttleMode = throttled
	RS.generationPaused = false

	// room 1 is always the spawn room so the rest of the chain starts from one known point
	buildSpawnRoom(startX, startY, startZ)

	const waitSpawn = () => {
		if (BS.a === 0) {
			// once the spawn build is done, lock in the first exit and move on
			RS.exitX = startX + 7
			RS.exitZ = startZ + 20
			RS.exitSide = 0
			RS.roomCount = 1

			// register the spawn bounds so dark room and other systems know where the start sits
			if (typeof registerRoomBounds === "function") {
				registerRoomBounds(0, startX + 7.5, startZ + 10, 15, 20)
			}

			setTickTimeout(() => generateNextRoom(), 10)
		} else {
			// if the spawn is still building, check again shortly
			setTickTimeout(waitSpawn, 1)
		}
	}

	waitSpawn()
}

globalThis.selectNextRoom = function () {
	const sinceL = RS.roomCount - RS.lastLRoom
	const sinceN = RS.roomCount - RS.lastNotch
	const sinceB = RS.roomCount - RS.lastBook
	const sinceH = RS.roomCount - RS.lastHall
	const sinceZ = RS.roomCount - RS.lastZ
	const sinceE = RS.roomCount - RS.lastEye
	const sinceP = RS.roomCount - RS.lastPuzzle
	const sinceCubby = RS.roomCount - RS.lastCubby
	const sinceCurve = RS.roomCount - RS.lastCurve
	const sinceKitchen = RS.roomCount - RS.lastKitchen
	const sinceCloset = RS.roomCount - RS.lastCloset
	const sinceSkinny = RS.roomCount - RS.lastSkinny
	const sinceNewHall = RS.roomCount - RS.lastNewHall
	const sinceCatwalk = RS.roomCount - RS.lastCatwalk

	// the last slot is always the end room
	if (RS.roomCount === END_ROOM_TARGET_A - 1) {
		return { type: "end", turn: 0 }
	}

	// new room pool with closet, skinny, cubby, curve, kitchen, catwalk, and hallway
	// recently used rooms get a lower chance so the run does not repeat itself too much
	const rand = Math.random()
	const cubbyChance = sinceCubby >= 1 ? 0.20 : 0.14
	const curveChance = sinceCurve >= 1 ? 0.40 : 0.28
	const kitchenChance = sinceKitchen >= 1 ? 0.60 : 0.42
	const closetChance = sinceCloset >= 1 ? 0.72 : 0.50
	const skinnyChance = sinceSkinny >= 1 ? 0.80 : 0.56
	const catwalkChance = sinceCatwalk >= 1 ? 0.86 : 0.60

	// if nothing else fits, fall back to hallway
	// hallway is the safe default when the pool does not pick anything else
	if (sinceCubby >= 1 && rand < cubbyChance) {
		const mirrored = Math.random() < 0.5
		return { type: "cubby", turn: 0, mirrored }
	}

	if (sinceCurve >= 1 && rand < curveChance) {
		const mirrored = Math.random() < 0.5
		return { type: "curve", turn: 0, mirrored }
	}

	if (sinceKitchen >= 1 && rand < kitchenChance) {
		return { type: "kitchen", turn: 0 }
	}

	if (sinceCloset >= 1 && rand < closetChance) {
		return { type: "closet", turn: 0 }
	}

	if (sinceSkinny >= 1 && rand < skinnyChance) {
		const mirrored = Math.random() < 0.5
		return { type: "skinny", turn: 0, mirrored }
	}

	if (sinceCatwalk >= 1 && rand < catwalkChance) {
		return { type: "catwalk", turn: 0 }
	}

	// default to hallway
	return { type: "newhallway", turn: 0 }
}

globalThis.calcNextEntrance = function (exitX, exitY, exitZ, exitSide) {
	if (exitSide === 0) return { entX: exitX, entY: exitY, entZ: exitZ, entSide: 2 }
	if (exitSide === 1) return { entX: exitX, entY: exitY, entZ: exitZ, entSide: 3 }
	if (exitSide === 2) return { entX: exitX, entY: exitY, entZ: exitZ, entSide: 0 }
	if (exitSide === 3) return { entX: exitX, entY: exitY, entZ: exitZ, entSide: 1 }
	return { entX: exitX, entY: exitY, entZ: exitZ, entSide: 0 }
}

globalThis.generateNextRoom = function () {
	// stop if the end room was already reached
	if (RS.endRoomReached) return

	// stop if generation is already turned off
	if (!RS.active) return
	if (RS.generationPaused) return

	if (RS.roomCount >= RS.initialRooms && RS.throttleMode) {
		// throttled starts only need the first chunk before they pause
		RS.active = false
		return
	}

	if (RS.roomCount >= RS.targetRooms) {
		// hard stop after the target room count
		RS.active = false
		return
	}

	// pick the room before the count changes
	let room = selectNextRoom()

	// bump room count now before building
	const nextRoomNum = RS.roomCount
	if (nextRoomNum + 1 === END_ROOM_TARGET_A) {
		room = { type: "end", turn: 0 }
	}
	RS.roomCount++

	// do not force active back on if this is the end room
	if (room.type !== "end") {
		RS.active = true
	}

	const prevExitX = RS.exitX
	const prevExitY = RS.exitY
	const prevExitZ = RS.exitZ
	const prevExitSide = RS.exitSide
	let entX, entZ, entSide

	// the next room always starts from the side the last room exited from
	if (prevExitSide === 0) {
		entX = prevExitX
		entZ = prevExitZ
		entSide = 2
	} else if (prevExitSide === 1) {
		entX = prevExitX
		entZ = prevExitZ
		entSide = 3
	} else if (prevExitSide === 2) {
		entX = prevExitX
		entZ = prevExitZ
		entSide = 0
	} else {
		entX = prevExitX
		entZ = prevExitZ
		entSide = 1
	}

	const loadRadius = room.type === "hallway" ? 64 : 32

	// preload blocks around the entrance so the room can build without a cold start
	for (let dx = -loadRadius; dx <= loadRadius; dx += 32) {
		for (let dz = -loadRadius; dz <= loadRadius; dz += 32) {
			api.getBlock(entX + dx, prevExitY, entZ + dz)
		}
	}

	// mark dark rooms before the build starts so the lighting systems stay in sync
	if (typeof shouldRoomBeDark === "function" && shouldRoomBeDark(nextRoomNum + 1, room.type)) {
		if (typeof markRoomAsDark === "function") markRoomAsDark(nextRoomNum + 1)
	}

	setTickTimeout(() => {
		// short delay so the staged build can grab the area cleanly
		generateRoomByType(room, entX, entZ, entSide, prevExitY, nextRoomNum, prevExitX, prevExitY, prevExitZ, prevExitSide)
	}, 10)
}

globalThis.checkRoomBuffer = function (playerRoomNum) {
	if (!RS || RS.generationPaused || RS.active || playerRoomNum === -1 || RS.endRoomReached) return

	const roomsAhead = RS.roomCount - playerRoomNum
	if (roomsAhead < RS.bufferSize && RS.roomCount < RS.targetRooms) {
		// wake generation back up if the player is getting close to the end of the buffer
		RS.throttleMode = false
		RS.active = true
		RS.generationPaused = false
		generateNextRoom()
	}
}
