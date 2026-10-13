// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// cubby room builder
api.broadcastMessage("Room type 1 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const CUBBY_WALL = "Light Gray Chalk Bricks"
const CUBBY_FLOOR = "Gray Planks"
const CW = 15, CH = 7, CD = 23

// decorative and structural blocks from the sample room
const cubbyBlockData = [
	"o,d,q,0","o,d,s,1","o,e,q,0","o,e,s,1","o,f,r,2","p,d,r,3","p,e,r,4","r,d,12,5","r,e,12,6","r,f,11,7","u,d,g,5","u,e,g,6"
]
const cubbyBlockDict = [
	"Jungle Slab|meta|rot3|side",
	"Jungle Slab|meta|rot1|side",
	"Jungle Slab",
	"Jungle Door|meta|rot4|closed",
	"_Jungle Door Top|meta|rot4|closed",
	"Cedar Door|meta|rot3|closed",
	"_Cedar Door Top|meta|rot3|closed",
	"Board|meta|rot3"
]

// internal wall structure from the sample, used to shape the compartment layout
const internalWallsData = [
	"o,d,m,0","o,d,n,0","o,d,v,0","o,d,w,0","o,e,m,0","o,e,n,0","o,e,v,0","o,e,w,0","o,f,m,0","o,f,n,0","o,f,v,0","o,f,w,0",
	"o,g,m,0","o,g,n,0","o,g,v,0","o,g,w,0","o,h,m,0","o,h,n,0","o,h,v,0","o,h,w,0","p,d,m,0","p,d,n,0","p,d,v,0","p,d,w,0",
	"p,e,m,0","p,e,n,0","p,e,v,0","p,e,w,0","p,f,m,0","p,f,n,0","p,f,v,0","p,f,w,0","p,g,m,0","p,g,n,0","p,g,v,0","p,g,w,0",
	"p,h,m,0","p,h,n,0","p,h,v,0","p,h,w,0","q,d,m,0","q,d,n,0","q,d,v,0","q,d,w,0","q,e,m,0","q,e,n,0","q,e,v,0","q,e,w,0",
	"q,f,m,0","q,f,n,0","q,f,v,0","q,f,w,0","q,g,m,0","q,g,n,0","q,g,v,0","q,g,w,0","q,h,m,0","q,h,n,0","q,h,v,0","q,h,w,0",
	"r,d,m,0","r,d,n,0","r,d,v,0","r,d,w,0","r,e,m,0","r,e,n,0","r,e,v,0","r,e,w,0","r,f,m,0","r,f,n,0","r,f,v,0","r,f,w,0",
	"r,g,m,0","r,g,n,0","r,g,v,0","r,g,w,0","r,h,m,0","r,h,n,0","r,h,v,0","r,h,w,0","s,d,m,0","s,d,n,0","s,d,v,0","s,d,w,0",
	"s,e,m,0","s,e,n,0","s,e,v,0","s,e,w,0","s,f,m,0","s,f,n,0","s,f,v,0","s,f,w,0","s,g,m,0","s,g,n,0","s,g,v,0","s,g,w,0",
	"s,h,m,0","s,h,n,0","s,h,v,0","s,h,w,0","t,d,m,0","t,d,n,0","t,d,v,0","t,d,w,0","t,e,m,0","t,e,n,0","t,e,v,0","t,e,w,0",
	"t,f,m,0","t,f,n,0","t,f,v,0","t,f,w,0","t,g,m,0","t,g,n,0","t,g,v,0","t,g,w,0","t,h,m,0","t,h,n,0","t,h,v,0","t,h,w,0",
	"u,d,m,0","u,d,n,0","u,d,v,0","u,d,w,0","u,e,m,0","u,e,n,0","u,e,v,0","u,e,w,0","u,f,m,0","u,f,n,0","u,f,v,0","u,f,w,0",
	"u,g,m,0","u,g,n,0","u,g,v,0","u,g,w,0","u,h,m,0","u,h,n,0","u,h,v,0","u,h,w,0"
]

globalThis.buildCubbyRoom = function (px, py, pz, rotated, roomNum) {
	// this sets up the cubby room and stores whether it is mirrored
	BS.a = 1
	BS.t = "cubby"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, rotated: rotated === true || rotated === 1, roomNum: roomNum || 0 }
	// store last built room info for waypoint command
	globalThis.lastCubbyRoom = { px, py, pz, rotated: rotated === true || rotated === 1 }
}

globalThis.cCubby = function () {
	const d = BS.d

	// the cubby room is built in chunks so the server does not get hit with one huge block burst
	// each phase handles a different part of the room

	// phase 0: build floor (y=0)
	if (BS.p === 0) {
		// floor: 15x23=345 blocks - split into 15x12 + 15x11
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CW - 1, d.py, d.pz + 11], CUBBY_FLOOR)
		api.setBlockRect([d.px, d.py, d.pz + 12], [d.px + CW - 1, d.py, d.pz + CD - 1], CUBBY_FLOOR)
		BS.p++
		return
	}

	// phase 0.5: replace entrance floor row with light gray chalk bricks (except below door)
	if (BS.p === 1) {
		// entrance is at z=0 (north wall), door is at center x=7
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CW - 1, d.py, d.pz], CUBBY_WALL)
		// put back gray plank below door so it doesnt look weird lol
		api.setBlock(d.px + 7, d.py, d.pz, CUBBY_FLOOR)
		BS.p++
		return
	}

	// phase 2: build ceiling (y=6)
	if (BS.p === 2) {
		// ceiling: 15x23=345 blocks - split into 15x12 + 15x11
		api.setBlockRect([d.px, d.py + 6, d.pz], [d.px + CW - 1, d.py + 6, d.pz + 11], CUBBY_WALL)
		api.setBlockRect([d.px, d.py + 6, d.pz + 12], [d.px + CW - 1, d.py + 6, d.pz + CD - 1], CUBBY_WALL)
		BS.p++
		return
	}

	// phase 3: build outer walls y=1-5 - north wall
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + CW - 1, d.py + 5, d.pz], CUBBY_WALL)
		BS.p++
		return
	}

	// phase 4: south wall
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 1, d.pz + CD - 1], [d.px + CW - 1, d.py + 5, d.pz + CD - 1], CUBBY_WALL)
		BS.p++
		return
	}

	// phase 5: west wall
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 5, d.pz + CD - 1], CUBBY_WALL)
		BS.p++
		return
	}

	// phase 6: east wall
	if (BS.p === 6) {
		api.setBlockRect([d.px + CW - 1, d.py + 1, d.pz], [d.px + CW - 1, d.py + 5, d.pz + CD - 1], CUBBY_WALL)
		BS.p++
		return
	}

	// phase 7: place internal walls (batched) - flip x position for rotated version
	if (BS.p === 7) {
		if (!d.wallIdx) d.wallIdx = 0
		const batch = 5
		// these entries are compressed layout data from the original room sample
		for (let i = 0; i < batch && d.wallIdx < internalWallsData.length; i++, d.wallIdx++) {
			const entry = internalWallsData[d.wallIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			let worldX = d.px + parseInt(x, 36) - 23
			const worldY = d.py + parseInt(y, 36) - 12
			const worldZ = d.pz + parseInt(z, 36) - 16
			// flip the internal walls along x axis for rotated version
			if (d.rotated) {
				worldX = d.px + (CW - 1) - (parseInt(x, 36) - 23)
			}
			api.setBlock(worldX, worldY, worldZ, CUBBY_WALL)
		}
		if (d.wallIdx >= internalWallsData.length) BS.p++
		return
	}

	// phase 8: place decorative blocks (slabs and doors) - flip closet and exit doors for rotated ver.
	if (BS.p === 8) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 3
		// idk but ye. bloxdhub.com
		for (let i = 0; i < batch && d.decorIdx < cubbyBlockData.length; i++, d.decorIdx++) {
			const entry = cubbyBlockData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			let blockName = cubbyBlockDict[parseInt(blockIdx)]
			let worldX = d.px + parseInt(x, 36) - 23
			const worldY = d.py + parseInt(y, 36) - 12
			const worldZ = d.pz + parseInt(z, 36) - 16
			// flip closet (jungle) doors/slabs along x axis and rotate door 180
			if (d.rotated && (blockName.includes("Jungle Door") || blockName.includes("Jungle Slab"))) {
				worldX = d.px + (CW - 1) - (parseInt(x, 36) - 23)
				// rotate jungle door 180: rot4->rot2
				if (blockName.includes("Jungle Door") && blockName.includes("rot4")) {
					blockName = blockName.replace("rot4", "rot2")
				}
			}
			// flip exit (cedar) door and board along x axis but keep rotation
			if (d.rotated && (blockName.includes("Cedar Door") || blockName.includes("Board"))) {
				worldX = d.px + (CW - 1) - (parseInt(x, 36) - 23)
			}
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= cubbyBlockData.length) BS.p++
		return
	}

	// phase 9: register closet doors - flip x positions for rotated version
	if (BS.p === 9) {
		// these closet spots are what the hide system reads later
		if (d.rotated) {
			// flipped x positions (mirror along x axis)
			const door1X = d.px + (CW - 1) - 2
			const door1Z = d.pz + 11
			const door2X = d.px + (CW - 1) - 4
			const door2Z = d.pz + 22
			const door3X = d.px + (CW - 1) - 7
			const door3Z = d.pz + 0
			if (typeof registerCloset === "function") {
				registerCloset(door1X, d.py + 1, door1Z)
				registerCloset(door2X, d.py + 1, door2Z)
				registerCloset(door3X, d.py + 1, door3Z)
			}
		} else {
			// original positions
			const door1X = d.px + 2
			const door1Z = d.pz + 11
			const door2X = d.px + 4
			const door2Z = d.pz + 22
			const door3X = d.px + 7
			const door3Z = d.pz + 0
			if (typeof registerCloset === "function") {
				registerCloset(door1X, d.py + 1, door1Z)
				registerCloset(door2X, d.py + 1, door2Z)
				registerCloset(door3X, d.py + 1, door3Z)
			}
		}
		BS.p++
		return
	}

	// phase 10: set board text with room number
	if (BS.p === 10) {
		// the board is already placed in decorative data, this just sets the visible room number
		const exitX = d.rotated ? d.px + 10 : d.px + 4
		const exitZ = d.pz + 22
		const boardX = exitX
		const boardY = d.py + 3
		const boardZ = exitZ - 1
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(boardX, boardY, boardZ, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 11: complete
	if (BS.p === 11) {
		BS.a = 0
		// record the room so the later chase systems can rebuild the path through it
		if (typeof recordA60Room === "function") recordA60Room("cubby", d.px, d.py, d.pz, d.rotated)
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		// setTickTimeout(()=>{
		// const version=d.rotated?'mirrored':'normal'
		// const wp=CUBBY_WAYPOINTS[version].north_south
		// for(const w of wp){
		// api.playParticleEffect({
		// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+2,d.pz+w.z],pos2:[d.px+w.x,d.py+2,d.pz+w.z],
		// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
		// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
		// colorGradients:[{timeFraction:0,minColor:[255,0,255,1],maxColor:[255,0,255,1]}],
		// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
		// })
		// }
		// },5)
		return
	}
}

// cubby waypoints for the 3 entites.
globalThis.CUBBY_WAYPOINTS = {
	normal: {
		north_south: [{ x: 7.5, z: 3.5 }, { x: 11.5, z: 3.5 }, { x: 11.5, z: 19.5 }, { x: 4.5, z: 19.5 }],
		south_north: [{ x: 4.5, z: 19.5 }, { x: 11.5, z: 19.5 }, { x: 11.5, z: 3.5 }, { x: 7.5, z: 3.5 }]
	},
	mirrored: {
		north_south: [{ x: 7.5, z: 3.5 }, { x: 3.5, z: 3.5 }, { x: 3.5, z: 19.5 }, { x: 10.5, z: 19.5 }],
		south_north: [{ x: 10.5, z: 19.5 }, { x: 3.5, z: 19.5 }, { x: 3.5, z: 3.5 }, { x: 7.5, z: 3.5 }]
	}
}

globalThis.showCubbyWaypoints = function (pId, pathName) {
	// this is just a visual test for the entity path
	// it helps check if the waypoint route looks good
	// not needed and does not show in prod, which is why it stays commented out
	// this helper lets us see the route the entity would take through the room
	const version = lastCubbyRoom && lastCubbyRoom.rotated ? "mirrored" : "normal"
	const wp = CUBBY_WAYPOINTS[version][pathName] || CUBBY_WAYPOINTS[version].north_south
	const p = api.getPosition(pId)
	if (!p) return
	const bx = Math.floor(p[0]), by = Math.floor(p[1]), bz = Math.floor(p[2])
	let i = 0
	const spawn = () => {
		if (i >= wp.length) {
			api.sendMessage(pId, `Spawned ${wp.length} waypoints for ${version} ${pathName}!`, { color: "#00ff00" })
			return
		}
		const w = wp[i]
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		// api.playParticleEffect({
		// dir1:[0,0,0],dir2:[0,0,0],pos1:[bx+w.x,by+2,bz+w.z],pos2:[bx+w.x,by+2,bz+w.z],
		// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
		// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
		// colorGradients:[{timeFraction:0,minColor:[255,0,255,1],maxColor:[255,0,255,1]}],
		// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
		// })
		i++
		setTickTimeout(spawn, 2)
	}
	spawn()
}

globalThis.getCubbyWaypoint = function (pId) {
	// this is just for checking the room origin and waypoint math while testing
	if (!lastCubbyRoom) {
		api.sendMessage(pId, "No cubby room spawned yet! Use !cubby first", { color: "#ff0000" })
		return
	}
	const pos = api.getPosition(pId)
	if (!pos) return
	const rx = pos[0] - lastCubbyRoom.px
	const rz = pos[2] - lastCubbyRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	const roomType = lastCubbyRoom.rotated ? "mirrored" : "normal"
	api.sendMessage(pId, `Room: cubby (${roomType})`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastCubbyRoom.px}, ${lastCubbyRoom.py}, ${lastCubbyRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })
	// api.playParticleEffect({
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastCubbyRoom.px+wx,lastCubbyRoom.py+14,lastCubbyRoom.pz+wz],
	// pos2:[lastCubbyRoom.px+wx,lastCubbyRoom.py+14,lastCubbyRoom.pz+wz],
	// texture:"heart",minLifeTime:10,maxLifeTime:10,minEmitPower:0,maxEmitPower:0,
	// minSize:0.8,maxSize:0.8,manualEmitCount:1,gravity:[0,0,0],
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}
