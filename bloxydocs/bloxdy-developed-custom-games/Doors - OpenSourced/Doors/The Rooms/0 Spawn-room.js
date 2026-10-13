// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// spawn room builder
api.broadcastMessage("Room type 0 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const SPAWN_WALL = "Light Gray Chalk Bricks"
const SPAWN_FLOOR = "Red Planks"
const SW = 15, SH = 7, SD = 20

// decorative blocks from the sample room, kept here as the base layout map
const spawnDecorData = [
	"6,2,s,0","6,2,t,0","6,2,u,0","6,2,v,0","6,2,w,0","6,2,z,1","6,2,10,2","6,2,11,3","6,2,14,4","6,3,10,5","6,3,14,6","6,4,14,6",
	"7,2,r,7","7,2,s,8","7,2,t,8","7,2,u,8","7,2,v,8","7,2,w,8","7,2,x,9","7,7,r,10","7,7,s,10","7,7,u,10","7,7,v,10","7,7,w,10","7,7,x,10",
	"7,7,z,10","7,7,10,10","8,7,r,10","8,7,s,10","8,7,u,10","8,7,v,10","8,7,w,10","8,7,x,10","8,7,z,10","8,7,10,10","a,7,r,10","a,7,s,10",
	"a,7,u,10","a,7,v,10","a,7,w,10","a,7,x,10","a,7,z,10","a,7,10,10","b,2,m,11","b,3,m,11","b,4,m,11","b,7,r,10","b,7,s,10","b,7,u,10",
	"b,7,v,10","b,7,w,10","b,7,x,10","b,7,z,10","b,7,10,10","c,2,m,12","c,2,15,13","c,3,m,12","c,3,15,14","c,4,m,11","c,4,14,15","c,7,r,10",
	"c,7,s,10","c,7,u,10","c,7,v,10","c,7,w,10","c,7,x,10","c,7,z,10","c,7,10,10","d,2,m,11","d,3,m,11","d,4,m,11","d,7,r,10","d,7,s,10",
	"d,7,u,10","d,7,v,10","d,7,w,10","d,7,x,10","d,7,z,10","d,7,10,10","e,7,r,10","e,7,s,10","e,7,u,10","e,7,v,10","e,7,w,10","e,7,x,10",
	"e,7,z,10","e,7,10,10","g,7,r,10","g,7,s,10","g,7,u,10","g,7,v,10","g,7,w,10","g,7,x,10","g,7,z,10","g,7,10,10","h,2,r,7","h,2,s,8",
	"h,2,t,8","h,2,u,8","h,2,v,8","h,2,w,8","h,2,x,9","h,7,r,10","h,7,s,10","h,7,u,10","h,7,v,10","h,7,w,10","h,7,x,10","h,7,z,10",
	"h,7,10,10","i,2,s,16","i,2,t,16","i,2,u,16","i,2,v,16","i,2,w,16","i,2,14,4","i,3,14,6","i,4,14,6"
]
const spawnDecorDict = [
	"Black Concrete Slab|meta|rot4|side",
	"Gray Chalk Slab|meta|rot3|side",
	"Light Gray Concrete",
	"Gray Chalk Slab|meta|rot1|side",
	"Coconut Block",
	"Chest|meta|rot2",
	"Palm Leaves",
	"Black Concrete Slab|meta|rot3|side",
	"Black Concrete Slab",
	"Black Concrete Slab|meta|rot1|side",
	"White Glass",
	"Smooth Andesite",
	"Black Chalk Bricks",
	"Cedar Door|meta|rot3|open",
	"_Cedar Door Top|meta|rot3|open",
	"Board|meta|rot3",
	"Black Concrete Slab|meta|rot2|side"
]

globalThis.SPAWN_LORE_CHEST_SLOT = 13
globalThis.SPAWN_LORE_BOOK_ATTRS = {
	customDisplayName: "Guiding Note",
	customDescription: "A message left by the Guiding Light.",
	customAttributes: {
		isGuidingLightBook: true,
		pages: [
			"if you're reading this... then it worked.\n\nthe elevator won't go back up.\ni know you checked.\nyou're stuck here now.\n\nPage 1 of 5",
			"listen carefully. i don't have long.\n\nthis place isn't normal.\nit changes... it watches...\njust don't treat it like a building.\n\nPage 2 of 5",
			"stay active. keep moving.\nand listen. always listen.\nsometimes that's the only warning you'll get.\n\nPage 3 of 5",
			"stay close to your friends.\nplease. don't wander off alone.\n\nthis may be the only note you find.\ni can't promise there will be more.\n\nPage 4 of 5",
			"so remember what you can.\n\ni have to go.\n\nkeep moving.\n\n- by guiding light *\n\nPage 5 of 5"
		]
	}
}

globalThis.getSpawnLoreChestPos = (px, py, pz) => [px + 1, py + 2, pz + 14]
globalThis.fillSpawnLoreChest = (px, py, pz, playerId) => {
	// this is the little lore chest that lives in the spawn room
	// it gets filled after the room is built so the builder does not fight the chest slot
	const chestPos = getSpawnLoreChestPos(px, py, pz)
	globalThis.lastSpawnLoreChest = { x: chestPos[0], y: chestPos[1], z: chestPos[2] }
	api.setStandardChestItemSlot(chestPos, SPAWN_LORE_CHEST_SLOT, "Book", 1, playerId, globalThis.SPAWN_LORE_BOOK_ATTRS)
}
globalThis.refreshSpawnLoreChest = (x, y, z, playerId) => {
	// if someone breaks or swaps the chest, this puts the book back
	if (!lastSpawnLoreChest) return
	if (x !== lastSpawnLoreChest.x || y !== lastSpawnLoreChest.y || z !== lastSpawnLoreChest.z) return
	setTickTimeout(() => {
		// only restore the slot if the custom book is missing
		const existing = api.getStandardChestItemSlot([x, y, z], SPAWN_LORE_CHEST_SLOT)
		if (!existing || existing.name !== "Book" || !existing.attributes?.customAttributes?.isGuidingLightBook) {
			api.setStandardChestItemSlot([x, y, z], SPAWN_LORE_CHEST_SLOT, "Book", 1, playerId, globalThis.SPAWN_LORE_BOOK_ATTRS)
		}
	}, 2)
}

globalThis.buildSpawnRoom = function (px, py, pz) {
	// this is the room setup step
	// it stores the room origin and resets the builder state before the phased build starts
	BS.a = 1
	BS.t = "spawn"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: 0 }
	globalThis.lastSpawnRoom = { px, py, pz }
	// room zero is the spawn room, so the current room number starts here
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(0)
}

globalThis.cSpawn = function () {
	const d = BS.d

	// the builder runs in phases so the room can be placed over multiple ticks
	// that keeps the server from getting slammed (which causes those uh.. pesky nawty rate limits)

	// phase 0: build floor layer (y=0, entire 15x20)
	if (BS.p === 0) {
		// layer y=0: 15x20=300 blocks
		api.setBlockRect([d.px, d.py, d.pz], [d.px + SW - 1, d.py, d.pz + SD - 1], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 1: build floor interior (y=0, replace interior with red wool)
	if (BS.p === 1) {
		// interior floor: 13x18=234 blocks (15-2)x(20-2)
		api.setBlockRect([d.px + 1, d.py, d.pz + 1], [d.px + SW - 2, d.py, d.pz + SD - 2], SPAWN_FLOOR)
		BS.p++
		return
	}

	// phase 2: build ceiling layer (y=6, entire 15x20)
	if (BS.p === 2) {
		// ceiling: 15x20=300 blocks
		api.setBlockRect([d.px, d.py + 6, d.pz], [d.px + SW - 1, d.py + 6, d.pz + SD - 1], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 3: build walls y=1-5 north (5 layers high)
	if (BS.p === 3) {
		// north wall: 15x5=75 blocks
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + SW - 1, d.py + 5, d.pz], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 4: south wall
	if (BS.p === 4) {
		// south wall: 15x5=75 blocks
		api.setBlockRect([d.px, d.py + 1, d.pz + SD - 1], [d.px + SW - 1, d.py + 5, d.pz + SD - 1], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 5: west wall
	if (BS.p === 5) {
		// west wall: 20x5=100 blocks
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 5, d.pz + SD - 1], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 6: east wall
	if (BS.p === 6) {
		// east wall: 20x5=100 blocks
		api.setBlockRect([d.px + SW - 1, d.py + 1, d.pz], [d.px + SW - 1, d.py + 5, d.pz + SD - 1], SPAWN_WALL)
		BS.p++
		return
	}

	// phase 7: place decorative blocks (batched - slabs, glass, concrete, etc.)
	if (BS.p === 7) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 4
		// the old sample layout is stored as compact encoded entries, so we unpack a few at a time
		for (let i = 0; i < batch && d.decorIdx < spawnDecorData.length; i++, d.decorIdx++) {
			const entry = spawnDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			// skip the door blocks (indices 13, 14, 15) - we will place them correctly later
			if (blockIdx === "13" || blockIdx === "14" || blockIdx === "15") continue
			const blockName = spawnDecorDict[parseInt(blockIdx)]
			// offset coordinates: sample uses x=5-19, y=1-7, z=22-41
			// we need to subtract the base offset (5,1,22) and adjust y by -1
			const worldX = d.px + parseInt(x, 36) - 5
			const worldY = d.py + parseInt(y, 36) - 1
			const worldZ = d.pz + parseInt(z, 36) - 22
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= spawnDecorData.length) BS.p++
		return
	}

	// phase 8: place exit door at south wall (center, facing south)
	if (BS.p === 8) {
		const exitX = d.px + Math.floor(SW / 2)
		const exitZ = d.pz + SD - 1
		// this is the exit players use to leave the spawn room and move into the run
		// door facing south (rot3)
		api.setBlock(exitX, d.py + 1, exitZ, "Cedar Door|meta|rot3|closed")
		api.setBlock(exitX, d.py + 2, exitZ, "_Cedar Door Top|meta|rot3|closed")
		// register auto door
		if (typeof registerAutoDoor === "function") {
			registerAutoDoor(exitX, d.py + 1, exitZ, 3, "Cedar Door")
		}
		BS.p++
		return
	}

	// phase 9: place board above door with "a-001"
	if (BS.p === 9) {
		const exitX = d.px + Math.floor(SW / 2)
		const exitZ = d.pz + SD - 1
		const boardX = exitX
		const boardY = d.py + 3
		const boardZ = exitZ - 1
		// the board label is the visible room marker players see from the front
		// board facing south (rot3)
        // the text is hardcoded here since it doesnt need to change (spawn room?)
		api.setBlock(boardX, boardY, boardZ, "Board|meta|rot3")
		api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: "A-001", textSize: 2 } } })
		BS.p++
		return
	}

	// phase 10: complete
	if (BS.p === 10) {
		BS.a = 0
		// record the spawn room so the entity systems can read the room map later
		if (typeof recordA60Room === "function") recordA60Room("spawn", d.px, d.py, d.pz, false)
		// the lore chest is filled after the room is done so the note is not placed early
		setTickTimeout(() => fillSpawnLoreChest(d.px, d.py, d.pz), 2)
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
        // but good for the devs if they want to see the waypoints in the spawn room while testing new builds
		// setTickTimeout(()=>{
		// const wp=SPAWN_WAYPOINTS.north_south
		// for(const w of wp){
		// api.playParticleEffect({
		// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+2,d.pz+w.z],pos2:[d.px+w.x,d.py+2,d.pz+w.z],
		// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
		// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
		// colorGradients:[{timeFraction:0,minColor:[0,255,255,1],maxColor:[0,255,255,1]}],
		// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
		// })
		// }
		// },5)
		return
	}
}

// spawn room waypoints (straight path through center)
globalThis.SPAWN_WAYPOINTS = {
	north_south: [{ x: 7.5, z: 10.5 }, { x: 7.5, z: 18.5 }],
	south_north: [{ x: 7.5, z: 18.5 }, { x: 7.5, z: 10.5 }]
}

globalThis.getSpawnWaypoint = function (pId) {
	// this is just a debug helper to check the spawn room position and local waypoint math
	if (!lastSpawnRoom) {
		api.sendMessage(pId, "no spawn room spawned yet! Use !spawn first", { color: "#ff0000" })
		return
	}

	const pos = api.getPosition(pId)
	if (!pos) return

	const rx = pos[0] - lastSpawnRoom.px
	const rz = pos[2] - lastSpawnRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	api.sendMessage(pId, "Room: spawn", { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastSpawnRoom.px}, ${lastSpawnRoom.py}, ${lastSpawnRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })
	// api.playParticleEffect({
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastSpawnRoom.px+wx,lastSpawnRoom.py+3,lastSpawnRoom.pz+wz],
	// pos2:[lastSpawnRoom.px+wx,lastSpawnRoom.py+3,lastSpawnRoom.pz+wz],
	// texture:"heart",minLifeTime:10,maxLifeTime:10,minEmitPower:0,maxEmitPower:0,
	// minSize:0.8,maxSize:0.8,manualEmitCount:1,gravity:[0,0,0],
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}
