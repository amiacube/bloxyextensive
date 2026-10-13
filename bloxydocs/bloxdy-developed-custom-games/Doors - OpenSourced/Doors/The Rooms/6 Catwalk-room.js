// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// this was the hardest room for me, so i left extra comments.
api.broadcastMessage("Room type 6 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const CATWALK_WALL = "Light Gray Chalk Bricks"
const CATWALK_FLOOR = "Gray Planks"
const CW = 21, CH = 12, CD = 19

// the catwalk is flipped around, so some door and slab rotations need to be swapped
// that part looks odd on purpose because the room was exported facing the wrong way
const catwalkBlockDict = [
  "Gray Planks",
  "Smooth Andesite",
  "Light Gray Chalk Bricks",
  "Smooth Andesite Slab|meta|rot3|side",
  "Jungle Wood Planks",
  "Smooth Andesite Slab|meta|rot2|side",
  "Jungle Door|meta|rot3|closed",
  "_Jungle Door Top|meta|rot3|closed",
  "Smooth Andesite Slab|meta|rot1|side",
  "Smooth Andesite Slab|meta|rot1|top",
  "Smooth Andesite Slab|meta|rot4|side",
  "Pine Wood Planks",
  "Jungle Slab|meta|rot2|side",
  "White Concrete",
  "Jungle Slab",
  "Jungle Slab|meta|rot3|side",
  "Black Concrete Slab|meta|rot3|side",
  "Cedar Door|meta|rot3|closed",
  "_Cedar Door Top|meta|rot3|closed",
  "Board|meta|rot3",
  "Jungle Slab|meta|rot4|side"
]

// these are the decorative placements inside the room
// the room is rotated, but the stored positions stay in the same local format
// format: x|y|z|blockIdx using decimal coordinates with pipes between parts
const catwalkDecorData = ["24|14|11|1","24|15|11|1","24|16|11|1","24|17|11|1","24|18|11|1","24|19|11|1","24|20|11|1","24|20|10|1","24|20|9|1","24|20|8|1","24|20|7|1","24|20|6|2","23|14|11|1","23|15|11|1","23|16|11|1","23|17|11|1","23|18|11|1","23|19|11|1","23|20|11|1","23|20|10|1","23|20|9|1","23|20|8|1","23|20|7|1","23|20|6|2","23|21|11|3","23|21|7|4","23|22|7|4","23|23|7|4","22|14|11|1","22|15|18|5","22|15|17|5","22|15|16|5","22|15|15|5","22|15|14|5","22|15|13|5","22|15|12|5","22|15|11|1","22|16|17|5","22|16|16|5","22|16|15|5","22|16|14|5","22|16|13|5","22|16|12|5","22|16|11|1","22|17|16|5","22|17|15|5","22|17|14|5","22|17|13|5","22|17|12|5","22|17|11|1","22|18|15|5","22|18|14|5","22|18|13|5","22|18|12|5","22|18|11|1","22|19|14|5","22|19|13|5","22|19|12|5","22|19|11|1","22|20|13|5","22|20|12|5","22|20|11|1","22|20|10|1","22|20|9|1","22|20|8|1","22|20|7|1","22|20|6|2","22|21|12|5","22|21|11|3","22|21|8|6","22|22|8|7","22|23|7|4","21|14|18|1","21|14|17|1","21|14|11|1","21|15|17|8","21|15|16|9","21|15|15|1","21|15|14|1","21|15|13|1","21|15|12|1","21|15|11|1","21|16|16|8","21|16|15|9","21|16|14|1","21|16|13|1","21|16|12|1","21|16|11|1","21|17|15|8","21|17|14|9","21|17|13|1","21|17|12|1","21|17|11|1","21|18|14|8","21|18|13|9","21|18|12|1","21|18|11|1","21|19|13|8","21|19|12|9","21|19|11|1","21|20|12|8","21|20|11|1","21|20|10|1","21|20|9|1","21|20|8|1","21|20|7|1","21|20|6|2","21|21|7|4","21|22|7|4","21|23|7|4","20|14|18|1","20|14|17|1","20|14|11|1","20|15|17|8","20|15|16|9","20|15|15|1","20|15|14|1","20|15|13|1","20|15|12|1","20|15|11|1","20|16|16|8","20|16|15|9","20|16|14|1","20|16|13|1","20|16|12|1","20|16|11|1","20|17|15|8","20|17|14|9","20|17|13|1","20|17|12|1","20|17|11|1","20|18|14|8","20|18|13|9","20|18|12|1","20|18|11|1","20|19|13|8","20|19|12|9","20|19|11|1","20|20|12|8","20|20|11|1","20|20|10|1","20|20|9|1","20|20|8|1","20|20|7|1","20|20|6|2","19|14|18|1","19|14|17|1","19|14|11|1","19|15|17|8","19|15|16|9","19|15|15|1","19|15|14|1","19|15|13|1","19|15|12|1","19|15|11|1","19|16|16|8","19|16|15|9","19|16|14|1","19|16|13|1","19|16|12|1","19|16|11|1","19|17|15|8","19|17|14|9","19|17|13|1","19|17|12|1","19|17|11|1","19|18|14|8","19|18|13|9","19|18|12|1","19|18|11|1","19|19|13|8","19|19|12|9","19|19|11|1","19|20|12|8","19|20|11|1","19|20|10|1","19|20|9|1","19|20|8|1","19|20|7|1","19|20|6|2","18|14|11|1","18|15|18|10","18|15|17|10","18|15|16|10","18|15|15|10","18|15|14|10","18|15|13|10","18|15|12|10","18|15|11|1","18|16|17|10","18|16|16|10","18|16|15|10","18|16|14|10","18|16|13|10","18|16|12|10","18|16|11|1","18|17|16|10","18|17|15|10","18|17|14|10","18|17|13|10","18|17|12|10","18|17|11|1","18|18|15|10","18|18|14|10","18|18|13|10","18|18|12|10","18|18|11|1","18|19|14|10","18|19|13|10","18|19|12|10","18|19|11|1","18|20|13|10","18|20|12|10","18|20|11|1","18|20|10|1","18|20|9|1","18|20|8|1","18|20|7|1","18|20|6|2","18|21|12|10","18|21|11|3","17|14|11|1","17|15|11|1","17|16|11|1","17|17|11|1","17|18|11|1","17|19|11|1","17|20|11|1","17|20|10|1","17|20|9|1","17|20|8|1","17|20|7|1","17|20|6|2","17|21|11|3","16|14|11|1","16|15|23|5","16|15|22|5","16|15|11|1","16|16|23|5","16|16|22|5","16|16|11|1","16|17|11|1","16|18|11|1","16|19|11|1","16|20|11|1","16|20|10|1","16|20|9|1","16|20|8|1","16|20|7|1","16|20|6|2","16|21|23|5","16|21|22|5","16|21|21|5","16|21|20|5","16|21|19|5","16|21|18|5","16|21|17|5","16|21|16|5","16|21|15|5","16|21|14|5","16|21|13|5","16|21|12|5","16|21|11|3","15|14|11|1","15|15|23|11","15|15|22|11","15|15|20|12","15|15|12|4","15|15|11|1","15|16|12|4","15|16|11|1","15|17|12|4","15|17|11|1","15|18|11|1","15|19|11|1","15|20|23|9","15|20|22|9","15|20|21|9","15|20|20|9","15|20|19|9","15|20|18|9","15|20|17|9","15|20|16|9","15|20|15|9","15|20|14|9","15|20|13|9","15|20|12|9","15|20|11|1","15|20|10|1","15|20|9|1","15|20|8|1","15|20|7|1","15|20|6|2","14|14|11|1","14|15|23|13","14|15|22|11","14|15|20|14","14|15|19|15","14|15|13|6","14|15|11|1","14|16|23|16","14|16|19|15","14|16|13|7","14|16|11|1","14|17|12|4","14|17|11|1","14|18|11|1","14|19|11|1","14|20|23|9","14|20|22|9","14|20|21|9","14|20|20|9","14|20|19|9","14|20|18|9","14|20|17|9","14|20|16|9","14|20|15|9","14|20|14|9","14|20|13|9","14|20|12|9","14|20|11|1","14|20|10|1","14|20|9|1","14|20|8|1","14|20|7|1","14|20|6|0","14|21|24|17","14|21|6|17","14|22|24|18","14|22|6|18","14|23|23|19","13|14|11|1","13|15|23|11","13|15|22|11","13|15|20|20","13|15|12|4","13|15|11|1","13|16|12|4","13|16|11|1","13|17|12|4","13|17|11|1","13|18|11|1","13|19|11|1","13|20|23|9","13|20|22|9","13|20|21|9","13|20|20|9","13|20|19|9","13|20|18|9","13|20|17|9","13|20|16|9","13|20|15|9","13|20|14|9","13|20|13|9","13|20|12|9","13|20|11|1","13|20|10|1","13|20|9|1","13|20|8|1","13|20|7|1","13|20|6|2","12|14|11|1","12|15|23|10","12|15|22|10","12|15|11|1","12|16|23|10","12|16|22|10","12|16|11|1","12|17|11|1","12|18|11|1","12|19|11|1","12|20|11|1","12|20|10|1","12|20|9|1","12|20|8|1","12|20|7|1","12|20|6|2","12|21|23|10","12|21|22|10","12|21|21|10","12|21|20|10","12|21|19|10","12|21|18|10","12|21|17|10","12|21|16|10","12|21|15|10","12|21|14|10","12|21|13|10","12|21|12|10","12|21|11|3","11|14|11|1","11|15|11|1","11|16|11|1","11|17|11|1","11|18|11|1","11|19|11|1","11|20|11|1","11|20|10|1","11|20|9|1","11|20|8|1","11|20|7|1","11|20|6|2","11|21|11|3","10|14|11|1","10|15|18|5","10|15|17|5","10|15|16|5","10|15|15|5","10|15|14|5","10|15|13|5","10|15|12|5","10|15|11|1","10|16|17|5","10|16|16|5","10|16|15|5","10|16|14|5","10|16|13|5","10|16|12|5","10|16|11|1","10|17|16|5","10|17|15|5","10|17|14|5","10|17|13|5","10|17|12|5","10|17|11|1","10|18|15|5","10|18|14|5","10|18|13|5","10|18|12|5","10|18|11|1","10|19|14|5","10|19|13|5","10|19|12|5","10|19|11|1","10|20|13|5","10|20|12|5","10|20|11|1","10|20|10|1","10|20|9|1","10|20|8|1","10|20|7|1","10|20|6|2","10|21|12|5","10|21|11|3","9|14|18|1","9|14|17|1","9|14|11|1","9|15|17|8","9|15|16|9","9|15|15|1","9|15|14|1","9|15|13|1","9|15|12|1","9|15|11|1","9|16|16|8","9|16|15|9","9|16|14|1","9|16|13|1","9|16|12|1","9|16|11|1","9|17|15|8","9|17|14|9","9|17|13|1","9|17|12|1","9|17|11|1","9|18|14|8","9|18|13|9","9|18|12|1","9|18|11|1","9|19|13|8","9|19|12|9","9|19|11|1","9|20|12|8","9|20|11|1","9|20|10|1","9|20|9|1","9|20|8|1","9|20|7|1","9|20|6|2","8|14|18|1","8|14|17|1","8|14|11|1","8|15|17|8","8|15|16|9","8|15|15|1","8|15|14|1","8|15|13|1","8|15|12|1","8|15|11|1","8|16|16|8","8|16|15|9","8|16|14|1","8|16|13|1","8|16|12|1","8|16|11|1","8|17|15|8","8|17|14|9","8|17|13|1","8|17|12|1","8|17|11|1","8|18|14|8","8|18|13|9","8|18|12|1","8|18|11|1","8|19|13|8","8|19|12|9","8|19|11|1","8|20|12|8","8|20|11|1","8|20|10|1","8|20|9|1","8|20|8|1","8|20|7|1","8|20|6|2","7|14|18|1","7|14|17|1","7|14|11|1","7|15|17|8","7|15|16|9","7|15|15|1","7|15|14|1","7|15|13|1","7|15|12|1","7|15|11|1","7|16|16|8","7|16|15|9","7|16|14|1","7|16|13|1","7|16|12|1","7|16|11|1","7|17|15|8","7|17|14|9","7|17|13|1","7|17|12|1","7|17|11|1","7|18|14|8","7|18|13|9","7|18|12|1","7|18|11|1","7|19|13|8","7|19|12|9","7|19|11|1","7|20|12|8","7|20|11|1","7|20|10|1","7|20|9|1","7|20|8|1","7|20|7|1","7|20|6|2","7|21|7|4","7|22|7|4","7|23|7|4","6|14|11|1","6|15|18|10","6|15|17|10","6|15|16|10","6|15|15|10","6|15|14|10","6|15|13|10","6|15|12|10","6|15|11|1","6|16|17|10","6|16|16|10","6|16|15|10","6|16|14|10","6|16|13|10","6|16|12|10","6|16|11|1","6|17|16|10","6|17|15|10","6|17|14|10","6|17|13|10","6|17|12|10","6|17|11|1","6|18|15|10","6|18|14|10","6|18|13|10","6|18|12|10","6|18|11|1","6|19|14|10","6|19|13|10","6|19|12|10","6|19|11|1","6|20|13|10","6|20|12|10","6|20|11|1","6|20|10|1","6|20|9|1","6|20|8|1","6|20|7|1","6|20|6|2","6|21|12|10","6|21|11|3","6|21|8|6","6|22|8|7","6|23|7|4","5|14|11|1","5|15|11|1","5|16|11|1","5|17|11|1","5|18|11|1","5|19|11|1","5|20|11|1","5|20|10|1","5|20|9|1","5|20|8|1","5|20|7|1","5|20|6|2","5|21|11|3","5|21|7|4","5|22|7|4","5|23|7|4","4|14|11|1","4|15|11|1","4|16|11|1","4|17|11|1","4|18|11|1","4|19|11|1","4|20|11|1","4|20|10|1","4|20|9|1","4|20|8|1","4|20|7|1","4|20|6|2"]

globalThis.buildCatwalkRoom = function (px, py, pz, roomNum) {
	BS.a = 1
	BS.t = "catwalk"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: roomNum || 0 }
	globalThis.lastCatwalkRoom = { px, py, pz }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cCatwalk = function () {
	const d = BS.d

	// phase 0: build the first half of the floor
	// this room is wide, so we split the build up to keep each tick light
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CW - 1, d.py, d.pz + 9], CATWALK_FLOOR)
		BS.p++
		return
	}

	// phase 1: build the second half of the floor
	if (BS.p === 1) {
		api.setBlockRect([d.px, d.py, d.pz + 10], [d.px + CW - 1, d.py, d.pz + CD - 1], CATWALK_FLOOR)
		BS.p++
		return
	}

	// phase 2: build the first half of the ceiling
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + 11, d.pz], [d.px + CW - 1, d.py + 11, d.pz + 9], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 3: build the second half of the ceiling
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 11, d.pz + 10], [d.px + CW - 1, d.py + 11, d.pz + CD - 1], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 4: build the north wall
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + CW - 1, d.py + 10, d.pz], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 5: build the south wall
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 1, d.pz + CD - 1], [d.px + CW - 1, d.py + 10, d.pz + CD - 1], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 6: build the west wall
	if (BS.p === 6) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 10, d.pz + CD - 1], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 7: build the east wall
	if (BS.p === 7) {
		api.setBlockRect([d.px + CW - 1, d.py + 1, d.pz], [d.px + CW - 1, d.py + 10, d.pz + CD - 1], CATWALK_WALL)
		BS.p++
		return
	}

	// phase 8: place the decorative blocks in small batches
	// this room has a lot of decor, so the batch stays small on purpose
	if (BS.p === 8) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 6
		for (let i = 0; i < batch && d.decorIdx < catwalkDecorData.length; i++, d.decorIdx++) {
			const entry = catwalkDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split("|")
			const blockName = catwalkBlockDict[parseInt(blockIdx)]
			// rotated catwalk uses x: 4-24, y: 14-25, z: 6-24
			// subtract the base offset so the saved room coords line up with world coords
			const worldX = d.px + parseInt(x) - 4
			const worldY = d.py + parseInt(y) - 14
			const worldZ = d.pz + parseInt(z) - 6
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= catwalkDecorData.length) BS.p++
		return
	}

	// phase 9: write the room number onto the board
	// the board is already in the decor data, so we only need to set the text
	if (BS.p === 9) {
		const boardX = d.px + 10
		const boardY = d.py + 9
		const boardZ = d.pz + 17
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 10: finish the room and store the room marker
	if (BS.p === 10) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("catwalk", d.px, d.py, d.pz, false)

		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		setTickTimeout(() => {
			const wp = CATWALK_WAYPOINTS.south_north // reversed direction
			for (const w of wp) {
				// this is only a visual test for the entity path
				// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+9,d.pz+w.z],pos2:[d.px+w.x,d.py+9,d.pz+w.z],
				// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
				// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
				// colorGradients:[{timeFraction:0,minColor:[255,165,0,1],maxColor:[255,165,0,1]}],
				// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
				// })
			}
		}, 5)
		return
	}
}

// catwalk room waypoints
// the entrance and exit are swapped because the room is rotated
globalThis.CATWALK_WAYPOINTS = {
	south_north: [{ x: 10.5, z: 13.5 }, { x: 10.5, z: 5.5 }], // reversed because the room faces the other direction
	north_south: [{ x: 10.5, z: 5.5 }, { x: 10.5, z: 13.5 }] // reversed because the room faces the other direction
}

globalThis.getCatwalkWaypoint = function (pId) {
	if (!lastCatwalkRoom) {
		api.sendMessage(pId, "No catwalk room spawned yet!", { color: "#ff0000" })
		return
	}
	const pos = api.getPosition(pId)
	if (!pos) return

	const rx = pos[0] - lastCatwalkRoom.px
	const rz = pos[2] - lastCatwalkRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5

	api.sendMessage(pId, `Room: catwalk (rotated 180 degrees)`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastCatwalkRoom.px}, ${lastCatwalkRoom.py}, ${lastCatwalkRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })

	// this is only a visual test for the entity path
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastCatwalkRoom.px+wx,lastCatwalkRoom.py+9,lastCatwalkRoom.pz+wz],
	// pos2:[lastCatwalkRoom.px+wx,lastCatwalkRoom.py+9,lastCatwalkRoom.pz+wz],
	// it helps check if the waypoint route looks good
	// not needed and does not show in prod, which is why it stays commented out
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}






