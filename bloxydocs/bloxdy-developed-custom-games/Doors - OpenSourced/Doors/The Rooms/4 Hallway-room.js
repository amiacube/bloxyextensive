// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// hallway room builder
api.broadcastMessage("Room type 4 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const HALLWAY_WALL = "Light Gray Chalk Bricks"
const HALLWAY_FLOOR = "Gray Planks"
const HW = 13, HH = 7, HD = 17

// block dictionary from the sample room
const hallwayBlockDict = [
	"Gray Planks",
	"Light Gray Chalk Bricks",
	"Jungle Wood Planks",
	"Cobweb",
	"Bookshelf|meta|rot2|books6",
	"Empty Bookshelf|meta|rot2|books0",
	"Jungle Door|meta|rot4|closed",
	"_Jungle Door Top|meta|rot4|closed",
	"Cedar Door|meta|rot3|closed",
	"_Cedar Door Top|meta|rot3|closed",
	"Board|meta|rot3",
	"Crate",
	"Patterned Black Glass"
]

// interior decorative blocks from the sample hallway
// format: x|y|z|blockIdx
const hallwayDecorData = "8|11|31|2,8|11|33|2,8|11|35|2,8|11|36|3,8|11|37|4,8|11|38|4,8|11|39|5,8|11|40|4,8|11|41|4,8|11|42|4,8|11|43|3,8|11|44|3,8|11|45|5,8|12|31|2,8|12|33|2,8|12|35|2,8|12|37|4,8|12|38|3,8|12|39|3,8|12|40|4,8|12|41|5,8|12|42|4,8|12|43|5,8|12|44|4,8|12|45|5,8|13|31|2,8|13|32|2,8|13|33|2,8|13|34|2,8|13|35|2,8|13|38|5,8|13|39|4,8|13|40|3,8|13|41|4,8|13|45|4,8|14|40|5,8|15|41|3,9|11|32|6,9|11|34|6,9|12|32|7,9|12|34|7,13|11|30|8,13|11|46|8,13|12|30|9,13|12|46|9,13|13|45|10,17|11|31|11,17|11|36|11,17|11|41|12,17|11|42|12,17|11|43|12,17|11|44|12,17|11|45|12,17|12|31|11,17|12|42|12,17|12|43|12,17|12|44|12,18|11|31|11,18|11|32|11,18|11|33|11,18|11|34|11,18|11|35|11,18|11|36|11,18|11|37|11,18|11|41|12,18|11|42|12,18|11|43|12,18|11|44|12,18|11|45|3,18|12|31|11,18|12|32|11,18|12|33|11,18|12|34|11,18|12|35|11,18|12|36|11,18|12|37|11,18|12|41|12,18|12|42|3,18|12|43|12,18|12|44|12,18|12|45|12,18|13|31|11,18|13|32|3,18|13|34|11,18|13|35|11,18|13|36|11,18|13|37|3,18|13|42|3,18|13|43|12,18|13|44|3,18|13|45|3,18|14|34|11,18|14|35|3,18|15|34|3,13|11|34|1,13|11|38|1,13|11|42|1,13|12|34|1,13|12|38|1,13|12|42|1,13|13|30|1,13|13|34|1,13|13|38|1,13|13|42|1,13|13|46|1,13|14|30|1,13|14|34|1,13|14|38|1,13|14|42|1,13|14|46|1,13|15|30|1,13|15|34|1,13|15|38|1,13|15|42|1,13|15|46|1".split(",")

globalThis.buildHallwayRoom = function (px, py, pz, roomNum) {
	// hallway rooms are part of the core path, so the current room number gets set here
	BS.a = 1
	BS.t = "hallway"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: roomNum || 0 }
	globalThis.lastHallwayRoom = { px, py, pz }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cHallway = function () {
	const d = BS.d

	// hallway builds in a few big phases because it is a long corridor

	// phase 0: floor and ceiling together
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + HW - 1, d.py, d.pz + HD - 1], HALLWAY_FLOOR)
		api.setBlockRect([d.px, d.py + 6, d.pz], [d.px + HW - 1, d.py + 6, d.pz + HD - 1], HALLWAY_WALL)
		BS.p++
		return
	}

	// phase 1: entrance row
	if (BS.p === 1) {
		// entrance at z=0, door sits in the center
		api.setBlockRect([d.px, d.py, d.pz], [d.px + HW - 1, d.py, d.pz], HALLWAY_WALL)
		api.setBlock(d.px + 6, d.py, d.pz, HALLWAY_FLOOR)
		BS.p++
		return
	}

	// phase 2: walls
	if (BS.p === 2) {
		// north and south
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + HW - 1, d.py + 5, d.pz], HALLWAY_WALL)
		api.setBlockRect([d.px, d.py + 1, d.pz + HD - 1], [d.px + HW - 1, d.py + 5, d.pz + HD - 1], HALLWAY_WALL)
		// west and east
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 5, d.pz + HD - 1], HALLWAY_WALL)
		api.setBlockRect([d.px + HW - 1, d.py + 1, d.pz], [d.px + HW - 1, d.py + 5, d.pz + HD - 1], HALLWAY_WALL)
		BS.p++
		return
	}

	// phase 3: decorative blocks
	if (BS.p === 3) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 3
		// the hallway sample uses encoded positions, so we unpack a few entries each tick
		for (let i = 0; i < batch && d.decorIdx < hallwayDecorData.length; i++, d.decorIdx++) {
			const entry = hallwayDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split("|")
			const blockName = hallwayBlockDict[parseInt(blockIdx)]
			// sample hallway uses x: 7-19, y: 10-16, z: 30-46
			// subtract the base offset so the room lines up right
			const worldX = d.px + parseInt(x) - 7
			const worldY = d.py + parseInt(y) - 10
			const worldZ = d.pz + parseInt(z) - 30
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= hallwayDecorData.length) BS.p++
		return
	}

	// phase 4: register doors
	if (BS.p === 4) {
		// entry door at north
		const entryX = d.px + 6
		const entryZ = d.pz + 0
		if (typeof registerAutoDoor === "function") {
			registerAutoDoor(entryX, d.py + 1, entryZ, 3, "Cedar Door")
		}
		// exit door at south
		const exitX = d.px + 6
		const exitZ = d.pz + HD - 1
		if (typeof registerAutoDoor === "function") {
			registerAutoDoor(exitX, d.py + 1, exitZ, 3, "Cedar Door")
		}
		BS.p++
		return
	}

	// phase 5: room label board
	if (BS.p === 5) {
		// board is already placed in the room, this just sets the visible room number
		const exitX = d.px + 6
		const exitZ = d.pz + 16
		const boardX = exitX
		const boardY = d.py + 3
		const boardZ = exitZ - 1
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 6: complete
	if (BS.p === 6) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("hallway", d.px, d.py, d.pz, false)
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		setTickTimeout(() => {
			const wp = HALLWAY_WAYPOINTS.north_south
			for (const w of wp) {
				// api.playParticleEffect({
				// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+3,d.pz+w.z],pos2:[d.px+w.x,d.py+3,d.pz+w.z],
				// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
				// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
				// colorGradients:[{timeFraction:0,minColor:[128,0,128,1],maxColor:[128,0,128,1]}],
				// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
				// })
			}
		}, 5)
		return
	}
}

// hallway room waypoints for the entites
globalThis.HALLWAY_WAYPOINTS = {
	north_south: [{ x: 6.5, z: 3.5 }, { x: 6.5, z: 13.5 }],
	south_north: [{ x: 6.5, z: 13.5 }, { x: 6.5, z: 3.5 }]
}

globalThis.getHallwayWaypoint = function (pId) {
	// debug helper for room origin and waypoint math
	if (!lastHallwayRoom) {
		api.sendMessage(pId, "No hallway room spawned yet!", { color: "#ff0000" })
		return
	}
	const pos = api.getPosition(pId)
	if (!pos) return
	const rx = pos[0] - lastHallwayRoom.px
	const rz = pos[2] - lastHallwayRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	api.sendMessage(pId, `Room: hallway`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastHallwayRoom.px}, ${lastHallwayRoom.py}, ${lastHallwayRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })
	// api.playParticleEffect({
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastHallwayRoom.px+wx,lastHallwayRoom.py+3,lastHallwayRoom.pz+wz],
	// pos2:[lastHallwayRoom.px+wx,lastHallwayRoom.py+3,lastHallwayRoom.pz+wz],
	// texture:"heart",minLifeTime:10,maxLifeTime:10,minEmitPower:0,maxEmitPower:0,
	// minSize:0.8,maxSize:0.8,manualEmitCount:1,gravity:[0,0,0],
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}
