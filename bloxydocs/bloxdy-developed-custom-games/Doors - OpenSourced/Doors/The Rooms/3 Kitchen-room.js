// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// kitchen room builder
api.broadcastMessage("Room type 3 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const KITCHEN_WALL = "Light Gray Chalk Bricks"
const KITCHEN_FLOOR = "Gray Planks"
const KW = 13, KH = 7, KD = 19

// block dictionary from the sample room
const kitchenBlockDict = [
	"Gray Planks",
	"Light Gray Chalk Bricks",
	"White Concrete",
	"Cedar Wood Planks",
	"Kitchen Worktop",
	"Hob Boiling",
	"Furnace|meta|rot2",
	"Slicing Board",
	"Boiling Pot",
	"Hob Frying",
	"Cedar Slab",
	"Cedar Door|meta|rot3|closed",
	"Cedar Slab|meta|rot3|side",
	"_Cedar Door Top|meta|rot3|closed",
	"Board|meta|rot3",
	"Pine Trapdoor|meta|rot4|open",
	"Coconut Block",
	"Fruity Maple Leaves"
]

// interior decorative blocks from the sample room
// format: x|y|z|blockIdx
const kitchenDecorData = [
	"8|11|12|2","8|11|14|3","8|11|15|3","8|11|16|3","8|11|17|3","8|11|18|3","8|11|19|3","8|11|20|3","8|11|21|3","8|11|22|4","8|11|26|5",
	"8|12|12|6","8|12|15|7","8|12|18|8","8|12|21|9","11|11|19|10","12|11|21|10","14|11|22|10","16|11|21|10","13|11|9|11","13|11|20|12",
	"13|11|21|3","13|11|27|11","13|12|9|13","13|12|21|12","13|12|27|13","13|13|26|14","17|14|14|15","17|14|15|15","17|14|16|15",
	"17|14|17|15","17|14|18|15","17|14|19|15","17|14|20|15","17|14|21|15","17|14|22|15","18|11|13|4","18|11|14|3","18|11|15|3",
	"18|11|16|3","18|11|17|3","18|11|18|3","18|11|19|3","18|11|20|3","18|11|21|3","18|11|22|3","18|11|26|16","18|12|15|7",
	"18|12|18|9","18|12|21|8","18|12|26|17","18|13|26|17","18|14|14|3","18|14|15|3","18|14|16|3","18|14|17|3","18|14|18|3",
	"18|14|19|3","18|14|20|3","18|14|21|3","18|14|22|3","18|15|14|3","18|15|15|3","18|15|16|3","18|15|17|3","18|15|18|3",
	"18|15|19|3","18|15|20|3","18|15|21|3","18|15|22|3" // "Blo|xdhub|.com :P"
]

globalThis.buildKitchenRoom = function (px, py, pz, roomNum) {
	// room number is already known when this one gets built
	BS.a = 1
	BS.t = "kitchen"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: roomNum || 0 }
	globalThis.lastKitchenRoom = { px, py, pz }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cKitchen = function () {
	const d = BS.d

	// the kitchen is also phased so the big block list does not happen all at once

	// phase 0: build floor
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + KW - 1, d.py, d.pz + KD - 1], KITCHEN_FLOOR)
		BS.p++
		return
	}

	// phase 1: entrance row
	if (BS.p === 1) {
		// entrance is at z=0, door sits in the center
		api.setBlockRect([d.px, d.py, d.pz], [d.px + KW - 1, d.py, d.pz], KITCHEN_WALL)
		api.setBlock(d.px + 6, d.py, d.pz, KITCHEN_FLOOR)
		BS.p++
		return
	}

	// phase 2: ceiling
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + 6, d.pz], [d.px + KW - 1, d.py + 6, d.pz + KD - 1], KITCHEN_WALL)
		BS.p++
		return
	}

	// phase 3: north wall
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + KW - 1, d.py + 5, d.pz], KITCHEN_WALL)
		BS.p++
		return
	}

	// phase 4: south wall
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 1, d.pz + KD - 1], [d.px + KW - 1, d.py + 5, d.pz + KD - 1], KITCHEN_WALL)
		BS.p++
		return
	}

	// phase 5: west wall
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 5, d.pz + KD - 1], KITCHEN_WALL)
		BS.p++
		return
	}

	// phase 6: east wall
	if (BS.p === 6) {
		api.setBlockRect([d.px + KW - 1, d.py + 1, d.pz], [d.px + KW - 1, d.py + 5, d.pz + KD - 1], KITCHEN_WALL)
		BS.p++
		return
	}

	// phase 7: place decorative blocks in batches
	if (BS.p === 7) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 3
		// the sample room uses compact encoded positions, so we unpack a few each tick
		for (let i = 0; i < batch && d.decorIdx < kitchenDecorData.length; i++, d.decorIdx++) {
			const entry = kitchenDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split("|")
			const blockName = kitchenBlockDict[parseInt(blockIdx)]
			// sample kitchen uses x: 7-19, y: 10-16, z: 9-27
			// subtract the base offset so the room lands in the right place
			const worldX = d.px + parseInt(x) - 7
			const worldY = d.py + parseInt(y) - 10
			const worldZ = d.pz + parseInt(z) - 9
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= kitchenDecorData.length) BS.p++
		return
	}

	// phase 8: room number board
	if (BS.p === 8) {
		// board is already in the room, this just sets the text people read 
		const exitX = d.px + 6
		const exitZ = d.pz + 18
		const boardX = exitX
		const boardY = d.py + 3
		const boardZ = exitZ - 1
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 9: complete
	if (BS.p === 9) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("kitchen", d.px, d.py, d.pz, false)
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		setTickTimeout(() => {
			const wp = KITCHEN_WAYPOINTS.north_south
			for (const w of wp) {
				// api.playParticleEffect({
				// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+3,d.pz+w.z],pos2:[d.px+w.x,d.py+3,d.pz+w.z],
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

// kitchen room waypoints for the entites
globalThis.KITCHEN_WAYPOINTS = {
	north_south: [{ x: 6.5, z: 5.5 }, { x: 6.5, z: 13.5 }],
	south_north: [{ x: 6.5, z: 13.5 }, { x: 6.5, z: 5.5 }]
}

globalThis.getKitchenWaypoint = function (pId) {
	// debug helper for room origin and waypoint math
	if (!lastKitchenRoom) {
		api.sendMessage(pId, "No kitchen room spawned yet!", { color: "#ff0000" })
		return
	}
	const pos = api.getPosition(pId)
	if (!pos) return
	const rx = pos[0] - lastKitchenRoom.px
	const rz = pos[2] - lastKitchenRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	api.sendMessage(pId, `Room: kitchen`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastKitchenRoom.px}, ${lastKitchenRoom.py}, ${lastKitchenRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })
	// api.playParticleEffect({
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastKitchenRoom.px+wx,lastKitchenRoom.py+3,lastKitchenRoom.pz+wz],
	// pos2:[lastKitchenRoom.px+wx,lastKitchenRoom.py+3,lastKitchenRoom.pz+wz],
	// texture:"heart",minLifeTime:10,maxLifeTime:10,minEmitPower:0,maxEmitPower:0,
	// minSize:0.8,maxSize:0.8,manualEmitCount:1,gravity:[0,0,0],
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}
