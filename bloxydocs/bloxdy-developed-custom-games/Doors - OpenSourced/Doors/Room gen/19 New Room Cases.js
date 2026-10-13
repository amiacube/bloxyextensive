// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

api.broadcastMessage("CB19 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

globalThis.generateNewRoomTypes = function (room, entX, entZ, entSide, prevExitY, roomNum) {
	if (room.type === "end") {
		// end room shuts the whole run down, so handle it first
		return generateEndRoom(entX, entZ, entSide, prevExitY, roomNum)
	}

	if (room.type === "catwalk") {
		// catwalk rooms use their own height and spacing
		return generateCatwalkRoom(entX, entZ, entSide, prevExitY, roomNum)
	}

	if (room.type === "cubby") {
		// cubby rooms are small and use a tight entry and exit layout
		const CW = 15, CD = 23
		const entryX = 7
		const exitX = room.mirrored ? 10 : 4
		const exitZ = 22
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - entryX
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - exitX
			roomZ = entZ - CD + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - entryX
		} else {
			roomX = entX - CW + 2
			roomZ = entZ - exitX
		}

		buildCubbyRoom(roomX, prevExitY, roomZ, room.mirrored ? 1 : 0, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, CW, CD)

		let newExitX, newExitZ, newExitSide

		// the exit stays on the far side so the next room lines up cleanly
		if (entSide === 2) {
			newExitX = roomX + exitX
			newExitZ = roomZ + CD
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + entryX
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX - 1
			newExitZ = roomZ + exitX
			newExitSide = 3
		} else {
			newExitX = roomX + CW
			newExitZ = roomZ + entryX
			newExitSide = 1
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastCubby = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// once the cubby room is finished, write the next board and continue
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// if the room is still building, give it a little more time
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	} else if (room.type === "curve") {
		// curve rooms turn the path and can mirror left or right (but the exit and entrance always face the same direction)
		const CRW = 18, CRD = 16
		const entryX = room.mirrored ? 8 : 9
		const exitX = room.mirrored ? 4 : 13
		const exitZ = 15
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - entryX
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - exitX
			roomZ = entZ - CRD + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - entryX
		} else {
			roomX = entX - CRW + 2
			roomZ = entZ - exitX
		}

		buildCurveRoom(roomX, prevExitY, roomZ, room.mirrored ? 1 : 0, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, CRW, CRD)

		let newExitX, newExitZ, newExitSide

		// the exit lands on the side that matches the turn
		if (entSide === 2) {
			// exiting south
			newExitX = roomX + exitX
			newExitZ = roomZ + CRD
			newExitSide = 0
		} else if (entSide === 0) {
			// exiting north
			newExitX = roomX + entryX
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			// exiting west
			newExitX = roomX - 1
			newExitZ = roomZ + exitX
			newExitSide = 3
		} else {
			// exiting east
			newExitX = roomX + CRW
			newExitZ = roomZ + entryX
			newExitSide = 1
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastCurve = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// curve rooms follow the same finish and wait flow as cubby rooms
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// keep checking until the room is finished
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	} else if (room.type === "kitchen") {
		// kitchen rooms are a bit smaller and rotate like the other compact rooms
		const KW = 13, KD = 19
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? KD : KW
		const dp = rotated ? KW : KD
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

		buildKitchenRoom(roomX, prevExitY, roomZ, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, wd, dp)

		let newExitX, newExitZ, newExitSide

		// kitchen exits stay centered so the next room stays aligned
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
		RS.lastKitchen = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// once the kitchen is done, place the room number and keep going
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// wait for the kitchen build to settle
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	} else if (room.type === "closet") {
		// closet rooms are compact and use the same size on both axes
		const CW = 15, CD = 19
		const entryX = 7
		const exitX = 7
		const exitZ = 18
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - entryX
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - exitX
			roomZ = entZ - CD + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - entryX
		} else {
			roomX = entX - CW + 2
			roomZ = entZ - exitX
		}

		buildClosetRoom(roomX, prevExitY, roomZ, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, CW, CD)

		let newExitX, newExitZ, newExitSide

		// closets keep the exit simple and centered
		if (entSide === 2) {
			newExitX = roomX + exitX
			newExitZ = roomZ + CD
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + entryX
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + CW
			newExitZ = roomZ + exitX
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + entryX
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastCloset = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// once the closet build finishes, mark the next room number
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// keep waiting until the closet is fully placed
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	} else if (room.type === "skinny") {
		// skinny rooms are narrow and can mirror left or right
		const SW = 15, SD = 19
		const entryX = 7
		const exitX = room.mirrored ? 9 : 5
		const exitZ = 18
		let roomX, roomZ

		if (entSide === 2) {
			roomX = entX - entryX
			roomZ = entZ - 1
		} else if (entSide === 0) {
			roomX = entX - exitX
			roomZ = entZ - SD + 2
		} else if (entSide === 3) {
			roomX = entX - 1
			roomZ = entZ - entryX
		} else {
			roomX = entX - SW + 2
			roomZ = entZ - exitX
		}

		buildSkinnyRoom(roomX, prevExitY, roomZ, room.mirrored ? 1 : 0, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, SW, SD)

		let newExitX, newExitZ, newExitSide

		// the mirrored version shifts the exit a bit so the layout still fits
		if (entSide === 2) {
			newExitX = roomX + exitX
			newExitZ = roomZ + SD
			newExitSide = 0
		} else if (entSide === 0) {
			newExitX = roomX + entryX
			newExitZ = roomZ - 1
			newExitSide = 2
		} else if (entSide === 3) {
			newExitX = roomX + SW
			newExitZ = roomZ + exitX
			newExitSide = 1
		} else {
			newExitX = roomX - 1
			newExitZ = roomZ + entryX
			newExitSide = 3
		}

		RS.exitX = newExitX
		RS.exitZ = newExitZ
		RS.exitSide = newExitSide
		RS.lastSkinny = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// skinny rooms use the same wait as the other compact rooms
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// give the room build a moment to settle
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	} else if (room.type === "newhallway") {
		// newer hallway rooms are a smaller hallway variant
		const HW = 13, HD = 17
		const rotated = entSide === 1 || entSide === 3
		const wd = rotated ? HD : HW
		const dp = rotated ? HW : HD
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

		buildHallwayRoom(roomX, prevExitY, roomZ, roomNum)
		regTunnelShape(roomNum, roomX, roomZ, wd, dp)

		let newExitX, newExitZ, newExitSide

		// hallway exits stay centered so the path keeps lining up
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
		RS.lastNewHall = RS.roomCount - 1

		if (typeof registerRoomDoors === "function") {
			registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
		}
		if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

		const waitForRoom = () => {
			if (BS.a === 0 && DC.a === 0) {
				// this hallway version still waits for build cleanup before continuing
				placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
				const delay = RS.throttleMode ? 45 : 25
				setTickTimeout(() => generateNextRoom(), delay)
			} else {
				// keep checking until the hallway is fully placed
				setTickTimeout(waitForRoom, 10)
			}
		}

		waitForRoom()
		return true
	}

	// if the room type is not one of the new ones, return false and let the older file handle it
	return false
}

globalThis.generateEndRoom = function (entX, entZ, entSide, prevExitY, roomNum) {
	// the end room shuts the run down for good
	RS.active = false
	RS.endRoomReached = true
	api.broadcastMessage(`[END ROOM] gen stopped permanently at room ${roomNum + 1}`, { color: "#FFD700" })

	const EW = 20, ED = 20
	const entryX = 9
	const roomYOffset = -5
	let roomX, roomZ

	// end room sits a little lower than the normal rooms
	if (entSide === 2) {
		roomX = entX - entryX
		roomZ = entZ - 1
	} else if (entSide === 0) {
		roomX = entX - entryX
		roomZ = entZ - ED + 2
	} else if (entSide === 3) {
		roomX = entX - 1
		roomZ = entZ - entryX
	} else {
		roomX = entX - EW + 2
		roomZ = entZ - entryX
	}

	const roomY = prevExitY + roomYOffset
	buildEndRoom(roomX, roomY, roomZ, roomNum)
	regTunnelShape(roomNum, roomX, roomZ, EW, ED)

	if (typeof registerAutoDoor === "function") {
		// the end door still needs to be tracked by the auto door system
		if (entSide === 2) {
			registerAutoDoor(roomX + entryX, prevExitY + 1, roomZ, 3, "Cedar Door")
		} else if (entSide === 0) {
			registerAutoDoor(roomX + entryX, prevExitY + 1, roomZ + ED - 1, 3, "Cedar Door")
		} else if (entSide === 3) {
			registerAutoDoor(roomX, prevExitY + 1, roomZ + entryX, 0, "Cedar Door")
		} else {
			registerAutoDoor(roomX + EW - 1, prevExitY + 1, roomZ + entryX, 0, "Cedar Door")
		}
	}

	if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

	const waitForRoom = () => {
		if (BS.a === 0) {
			// once the end room is done, send the final message and stop
			api.broadcastMessage("end room is complete. This is the final room.", { color: "#FFD700" })
			RS.active = false
			RS.endRoomReached = true
		} else {
			// if the build is still running, check again in a moment
			setTickTimeout(waitForRoom, 10)
		}
	}

	waitForRoom()
	return true
}

globalThis.generateCatwalkRoom = function (entX, entZ, entSide, prevExitY, roomNum) {
	// catwalk rooms sit higher and use their own spacing
	const CW = 21, CD = 19
	const entryX = 10
	const exitX = 10
	const exitZ = 18
	const roomYOffset = -6
	let roomX, roomZ

	// catwalk placement follows the same entrance side rules as the other rooms
	if (entSide === 2) {
		roomX = entX - entryX
		roomZ = entZ - 1
	} else if (entSide === 0) {
		roomX = entX - exitX
		roomZ = entZ - CD + 2
	} else if (entSide === 3) {
		roomX = entX - 1
		roomZ = entZ - entryX
	} else {
		roomX = entX - CW + 2
		roomZ = entZ - exitX
	}

	const roomY = prevExitY + roomYOffset
	buildCatwalkRoom(roomX, roomY, roomZ, roomNum)
	regTunnelShape(roomNum, roomX, roomZ, CW, CD)

	let newExitX, newExitZ, newExitSide

	// catwalk exits keep the same center line so the path stays smooth
	if (entSide === 2) {
		newExitX = roomX + exitX
		newExitZ = roomZ + CD
		newExitSide = 0
	} else if (entSide === 0) {
		newExitX = roomX + entryX
		newExitZ = roomZ - 1
		newExitSide = 2
	} else if (entSide === 3) {
		newExitX = roomX - 1
		newExitZ = roomZ + exitX
		newExitSide = 3
	} else {
		newExitX = roomX + CW
		newExitZ = roomZ + entryX
		newExitSide = 1
	}

	RS.exitX = newExitX
	RS.exitZ = newExitZ
	RS.exitSide = newExitSide
	RS.lastCatwalk = RS.roomCount - 1

	if (typeof registerRoomDoors === "function") {
		registerRoomDoors(roomNum, entX, prevExitY, entZ, entSide, newExitX, prevExitY, newExitZ, newExitSide)
	}
	if (typeof spawnDarkRoomParticles === "function") spawnDarkRoomParticles(roomNum)

	const waitForRoom = () => {
		if (BS.a === 0 && DC.a === 0) {
			// after the catwalk finishes, place the room number and continue
			placeRoomNumber(newExitX, prevExitY, newExitZ, newExitSide, roomNum + 1)
			const delay = RS.throttleMode ? 45 : 25
			setTickTimeout(() => generateNextRoom(), delay)
		} else {
			// catwalks still need the same wait loop as the other rooms
			setTickTimeout(waitForRoom, 10)
		}
	}

	waitForRoom()
	return true
}
