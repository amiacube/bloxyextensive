// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// room generator cases - simple rectangular rooms
api.broadcastMessage("Codeblock 16 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

globalThis.regTunnelShape = (rn, rx, rz, wd, dp) => {
	// store the room bounds so other systems know the room size and position
	if (typeof registerRoomBounds === "function") {
		registerRoomBounds(rn, rx + wd / 2, rz + dp / 2, wd, dp)
	}
}

globalThis.placeRoomNumber = function (entX, entY, entZ, entSide, roomNum) {
	// entx, entz = exit position, one block beyond the room
	// entside: 0=north, 1=east, 2=south, 3=west
	// board sits 2 blocks back from the exit, at y+3
	let boardX, boardY, boardZ

	if (entSide === 2) {
		// exiting south: board is 2 blocks north
		boardX = entX
		boardY = entY + 3
		boardZ = entZ - 2
	} else if (entSide === 0) {
		// exiting north: board is 2 blocks south
		boardX = entX
		boardY = entY + 3
		boardZ = entZ + 2
	} else if (entSide === 3) {
		// exiting west: board is 2 blocks east
		boardX = entX + 2
		boardY = entY + 3
		boardZ = entZ
	} else {
		// exiting east: board is 2 blocks west
		boardX = entX - 2
		boardY = entY + 3
		boardZ = entZ
	}

	// update the board with the room number
	const roomText = `A-${String(roomNum).padStart(3, "0")}`
	api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: roomText, textSize: 2 } } })
}

globalThis.generateRoomByType = function (room, entX, entZ, entSide, prevExitY, roomNum) {
	// try the newer room types first, from file 19
	if (typeof generateNewRoomTypes === "function") {
		const handled = generateNewRoomTypes(room, entX, entZ, entSide, prevExitY, roomNum)
		if (handled) return
	}

	if (room.type === "tunnel" || room.type === "tunnelSimple") {
		// tunnel rooms are the base layout and can optionally skip extra side pieces
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? 24 : 11
		const dp = rotated ? 11 : 24
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - dp + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - Math.floor(dp / 2)
		} else {
			roomX = entX - wd + 2
			roomZ = entZ - Math.floor(dp / 2)
		}

		const oldAddSide = globalThis.addSideRooms
		const oldAddDec = globalThis.addDecorations

		if (room.type === "tunnelSimple") {
			// simple tunnels do not use side rooms (pls note again that some of the code found in this repo is used for the hotel section of doors (Which is unreleased as of the time of this comment))
			globalThis.addSideRooms = undefined
		} else if (RS.skipSideRooms) {
			// some runs disable side rooms and decorations for a while
			globalThis.addSideRooms = undefined
			globalThis.addDecorations = undefined
		}

		buildTunnel(roomX, prevExitY, roomZ, entSide, roomNum, room.type === "tunnelSimple")
		regTunnelShape(roomNum, roomX, roomZ, wd, dp)

		let newExitX, newExitZ, newExitSide

		// the next exit is always placed on the far side of the room
		if (entSide === 2) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ + dp
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + wd
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.roomCount++

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// fill chests the usual way
				if (
					typeof fillRoomChests === "function" &&
					globalThis.ROOM_CHEST_POSITIONS &&
					globalThis.ROOM_CHEST_POSITIONS.has(roomNum)
				) {
					fillRoomChests(roomNum)
				}

				if (room.type === "tunnelSimple") {
					// bring the helper back after the simple tunnel finishes
					globalThis.addSideRooms = oldAddSide
				} else if (RS.skipSideRooms) {
					// restore the helpers that were turned off for this room
					globalThis.addSideRooms = oldAddSide
					globalThis.addDecorations = oldAddDec
				}

				const delay = RS.throttleMode ? 40 : 20
				// leave a short gap so the next room does not slam in too fast
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// if the build is still running, check again soon
				setTickTimeout(waitForRoom, 5)
			}
		}

		waitForRoom()
	} else if (room.type === "bookshelf") {
		// bookshelf rooms are wider and need a different offset layout
		const BW = 26, BD = 19
		const eO = 3
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? BD : BW
		const dp = rotated ? BW : BD
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - eO
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - eO
			roomZ = entZ - dp + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - eO
		} else {
			roomX = entX - wd + 2
			roomZ = entZ - eO
		}

		buildBookshelfRoom(roomX, prevExitY, roomZ, entSide, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, wd, dp)

		const xO = 3
		let entDoorX, entDoorZ

		// the entrance door uses the entry offset, not the exit side
		if (entSide === 2) {
			entDoorX = roomX + eO
			entDoorZ = roomZ
		} else if (entSide === 0) {
			entDoorX = roomX + eO
			entDoorZ = roomZ + dp - 1
		} else if (entSide === 3) {
			entDoorX = roomX
			entDoorZ = roomZ + eO
		} else {
			entDoorX = roomX + wd - 1
			entDoorZ = roomZ + eO
		}

		let newExitX, newExitZ, newExitSide

		if (entSide === 2) {
			newExitX = roomX + xO
			newExitZ = roomZ + dp
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + xO
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + wd
			newExitZ = roomZ + xO
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + xO
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastBook = RS.roomCount
		RS.roomCount++

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entDoorX, prevExitY, entDoorZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// fill chests the usual way
				if (
					typeof fillRoomChests === "function" &&
					globalThis.ROOM_CHEST_POSITIONS &&
					globalThis.ROOM_CHEST_POSITIONS.has(roomNum)
				) {
					fillRoomChests(roomNum)
				}

				const delay = RS.throttleMode ? 40 : 20
				// bookshelf rooms keep the same pacing as the other bigger rooms
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// wait for the room build and decoration pass to finish
				setTickTimeout(waitForRoom, 5)
			}
		}

		waitForRoom()
	} else if (room.type === "hallway") {
		// hallway rooms are long and narrow, so the width and depth swap more often
		const HW = 13, HD = 56
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? HD : HW
		const dp = rotated ? HW : HD
		const eO = Math.floor(HW / 2)
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - eO
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - eO
			roomZ = entZ - dp + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - eO
		} else {
			roomX = entX - wd + 2
			roomZ = entZ - eO
		}

		buildLongHallway(roomX, prevExitY, roomZ, entSide, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, wd, dp)

		let newExitX, newExitZ, newExitSide

		// hallway exits stay centered so the chain keeps lining up
		if (entSide === 2) {
			newExitX = roomX + eO
			newExitZ = roomZ + dp
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + eO
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + wd
			newExitZ = roomZ + eO
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + eO
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastHall = RS.roomCount
		RS.roomCount++

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// hallway rooms do not need the chest pass, so the next room can start sooner
				const delay = RS.throttleMode ? 40 : 20
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// wait until the hallway build fully settles
				setTickTimeout(waitForRoom, 5)
			}
		}

		waitForRoom()
	} else if (room.type === "eyeroom") {
		// eye rooms get their own bounds so the entity system can track them later
		const EW = 13, ED = 19
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? ED : EW
		const dp = rotated ? EW : ED
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - dp + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - Math.floor(dp / 2)
		} else {
			roomX = entX - wd + 2
			roomZ = entZ - Math.floor(dp / 2)
		}

		buildEyeRoom(roomX, prevExitY, roomZ, entSide, roomNum)
		if (typeof registerRoomBounds === "function") {
			registerRoomBounds(roomNum, roomX + wd / 2, roomZ + dp / 2, wd, dp)
		}

		// spawn the eye entity for this room
		if (typeof spawnEyeEntity === "function") {
			spawnEyeEntity(roomX, prevExitY, roomZ, entSide, `room_${roomNum}`)
		}

		let newExitX, newExitZ, newExitSide

		// keep the exit on the far side of the room
		if (entSide === 2) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ + dp
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + wd
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastEye = RS.roomCount
		RS.roomCount++

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// eye room uses the same wait step as the other bigger rooms
				const delay = RS.throttleMode ? 40 : 20
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// keep checking until the room and the entity setup are both done
				setTickTimeout(waitForRoom, 5)
			}
		}

		waitForRoom()
	} else if (room.type === "puzzle") {
		// puzzle rooms are bigger and need their own size math
		const PW = 17, PD = 29
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? PD : PW
		const dp = rotated ? PW : PD
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - Math.floor(wd / 2)
			roomZ = entZ - dp + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - Math.floor(dp / 2)
		} else {
			roomX = entX - wd + 2
			roomZ = entZ - Math.floor(dp / 2)
		}

		buildPuzzleRoom(roomX, prevExitY, roomZ, entSide, roomNum, rotated)
		if (typeof registerRoomBounds === "function") {
			registerRoomBounds(roomNum, roomX + wd / 2, roomZ + dp / 2, wd, dp)
		}

		let newExitX, newExitZ, newExitSide

		// puzzle exit points use the same direction rules as the other rooms
		if (entSide === 2) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ + dp
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + Math.floor(wd / 2)
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + wd
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + Math.floor(dp / 2)
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastPuzzle = RS.roomCount
		RS.roomCount++

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// puzzle rooms also wait for the build system to settle first
				const delay = RS.throttleMode ? 40 : 20
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// keep checking until the puzzle room is fully placed
				setTickTimeout(waitForRoom, 5)
			}
		}

		waitForRoom()
	} else {
		// anything not handled here falls through to the older complex room code
		generateComplexRoom(room, entX, entZ, entSide, prevExitY, roomNum)
	}
}
