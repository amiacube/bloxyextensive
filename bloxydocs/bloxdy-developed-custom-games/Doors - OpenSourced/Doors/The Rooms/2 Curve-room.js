// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// curve room builder
api.broadcastMessage("Room type 2 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const CURVE_WALL = "Light Gray Chalk Bricks"
const CURVE_FLOOR = "Gray Planks"
const CRW = 18, CRH = 7, CRD = 16

// decorative blocks from the sample room
const curveDecorData = [
	"4,a,y,0","4,b,y,1","4,c,y,1","c,a,r,2","c,b,r,3","g,a,16,4","g,b,16,5","g,c,15,6"
]
const curveDecorDict = [
	"Coconut Block",
	"Fruity Maple Leaves",
	"Cedar Door|meta|rot3|closed",
	"_Cedar Door Top|meta|rot3|closed",
	"Cedar Door|meta|rot3|closed",
	"_Cedar Door Top|meta|rot3|closed",
	"Board|meta|rot3"
]

// interior wall blocks from the sample room
const interiorWallData = [
	"4,a,z,1","4,a,10,1","4,a,11,1","4,a,12,1","4,a,13,1","4,a,14,1","4,a,15,1",
	"4,b,z,1","4,b,10,1","4,b,11,1","4,b,12,1","4,b,13,1","4,b,14,1","4,b,15,1",
	"4,c,z,1","4,c,10,1","4,c,11,1","4,c,12,1","4,c,13,1","4,c,14,1","4,c,15,1",
	"4,d,z,1","4,d,10,1","4,d,11,1","4,d,12,1","4,d,13,1","4,d,14,1","4,d,15,1",
	"4,e,z,1","4,e,10,1","4,e,11,1","4,e,12,1","4,e,13,1","4,e,14,1","4,e,15,1",
	"5,a,z,1","5,a,10,1","5,a,11,1","5,a,12,1","5,a,13,1","5,a,14,1","5,a,15,1",
	"5,b,z,1","5,b,10,1","5,b,11,1","5,b,12,1","5,b,13,1","5,b,14,1","5,b,15,1",
	"5,c,z,1","5,c,10,1","5,c,11,1","5,c,12,1","5,c,13,1","5,c,14,1","5,c,15,1",
	"5,d,z,1","5,d,10,1","5,d,11,1","5,d,12,1","5,d,13,1","5,d,14,1","5,d,15,1",
	"5,e,z,1","5,e,10,1","5,e,11,1","5,e,12,1","5,e,13,1","5,e,14,1","5,e,15,1",
	"6,a,z,1","6,a,10,1","6,a,11,1","6,a,12,1","6,a,13,1","6,a,14,1","6,a,15,1",
	"6,b,z,1","6,b,10,1","6,b,11,1","6,b,12,1","6,b,13,1","6,b,14,1","6,b,15,1",
	"6,c,z,1","6,c,10,1","6,c,11,1","6,c,12,1","6,c,13,1","6,c,14,1","6,c,15,1",
	"6,d,z,1","6,d,10,1","6,d,11,1","6,d,12,1","6,d,13,1","6,d,14,1","6,d,15,1",
	"6,e,z,1","6,e,10,1","6,e,11,1","6,e,12,1","6,e,13,1","6,e,14,1","6,e,15,1",
	"7,a,z,1","7,a,10,1","7,a,11,1","7,a,12,1","7,a,13,1","7,a,14,1","7,a,15,1",
	"7,b,z,1","7,b,10,1","7,b,11,1","7,b,12,1","7,b,13,1","7,b,14,1","7,b,15,1",
	"7,c,z,1","7,c,10,1","7,c,11,1","7,c,12,1","7,c,13,1","7,c,14,1","7,c,15,1",
	"7,d,z,1","7,d,10,1","7,d,11,1","7,d,12,1","7,d,13,1","7,d,14,1","7,d,15,1",
	"7,e,z,1","7,e,10,1","7,e,11,1","7,e,12,1","7,e,13,1","7,e,14,1","7,e,15,1",
	"8,a,z,1","8,a,10,1","8,a,11,1","8,a,12,1","8,a,13,1","8,a,14,1","8,a,15,1",
	"8,b,z,1","8,b,10,1","8,b,11,1","8,b,12,1","8,b,13,1","8,b,14,1","8,b,15,1",
	"8,c,z,1","8,c,10,1","8,c,11,1","8,c,12,1","8,c,13,1","8,c,14,1","8,c,15,1",
	"8,d,z,1","8,d,10,1","8,d,11,1","8,d,12,1","8,d,13,1","8,d,14,1","8,d,15,1",
	"8,e,z,1","8,e,10,1","8,e,11,1","8,e,12,1","8,e,13,1","8,e,14,1","8,e,15,1",
	"9,a,z,1","9,a,10,1","9,a,11,1","9,a,12,1","9,a,13,1","9,a,14,1","9,a,15,1",
	"9,b,z,1","9,b,10,1","9,b,11,1","9,b,12,1","9,b,13,1","9,b,14,1","9,b,15,1",
	"9,c,z,1","9,c,10,1","9,c,11,1","9,c,12,1","9,c,13,1","9,c,14,1","9,c,15,1",
	"9,d,z,1","9,d,10,1","9,d,11,1","9,d,12,1","9,d,13,1","9,d,14,1","9,d,15,1",
	"9,e,z,1","9,e,10,1","9,e,11,1","9,e,12,1","9,e,13,1","9,e,14,1","9,e,15,1",
	"a,a,z,1","a,a,10,1","a,a,11,1","a,a,12,1","a,a,13,1","a,a,14,1","a,a,15,1",
	"a,b,z,1","a,b,10,1","a,b,11,1","a,b,12,1","a,b,13,1","a,b,14,1","a,b,15,1",
	"a,c,z,1","a,c,10,1","a,c,11,1","a,c,12,1","a,c,13,1","a,c,14,1","a,c,15,1",
	"a,d,z,1","a,d,10,1","a,d,11,1","a,d,12,1","a,d,13,1","a,d,14,1","a,d,15,1",
	"a,e,z,1","a,e,10,1","a,e,11,1","a,e,12,1","a,e,13,1","a,e,14,1","a,e,15,1",
	"b,a,z,1","b,a,10,1","b,a,11,1","b,a,12,1","b,a,13,1","b,a,14,1","b,a,15,1",
	"b,b,z,1","b,b,10,1","b,b,11,1","b,b,12,1","b,b,13,1","b,b,14,1","b,b,15,1",
	"b,c,z,1","b,c,10,1","b,c,11,1","b,c,12,1","b,c,13,1","b,c,14,1","b,c,15,1",
	"b,d,z,1","b,d,10,1","b,d,11,1","b,d,12,1","b,d,13,1","b,d,14,1","b,d,15,1",
	"b,e,z,1","b,e,10,1","b,e,11,1","b,e,12,1","b,e,13,1","b,e,14,1","b,e,15,1",
	"c,a,z,1","c,a,10,1","c,a,11,1","c,a,12,1","c,a,13,1","c,a,14,1","c,a,15,1",
	"c,b,z,1","c,b,10,1","c,b,11,1","c,b,12,1","c,b,13,1","c,b,14,1","c,b,15,1",
	"c,c,z,1","c,c,10,1","c,c,11,1","c,c,12,1","c,c,13,1","c,c,14,1","c,c,15,1",
	"c,d,z,1","c,d,10,1","c,d,11,1","c,d,12,1","c,d,13,1","c,d,14,1","c,d,15,1",
	"c,e,z,1","c,e,10,1","c,e,11,1","c,e,12,1","c,e,13,1","c,e,14,1","c,e,15,1"
]

globalThis.buildCurveRoom = function (px, py, pz, mirrored, roomNum) {
	// this stores the room origin and whether this version is mirrored
	BS.a = 1
	BS.t = "curve"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, mirrored: mirrored === true || mirrored === 1, roomNum: roomNum || 0 }
	globalThis.lastCurveRoom = { px, py, pz, mirrored: mirrored === true || mirrored === 1 }
}

globalThis.cCurve = function () {
	const d = BS.d

	// the curve room is also built in phases so the server gets a breather between big placement steps

	// phase 0: build floor (y=0)
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CRW - 1, d.py, d.pz + CRD - 1], CURVE_FLOOR)
		BS.p++
		return
	}

	// phase 1: replace entrance floor row
	if (BS.p === 1) {
		// entrance at z=0, door position shifts a bit when mirrored
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CRW - 1, d.py, d.pz], CURVE_WALL)
		const doorX = d.mirrored ? 8 : 9
		api.setBlock(d.px + doorX, d.py, d.pz, CURVE_FLOOR)
		BS.p++
		return
	}

	// phase 2: build ceiling (y=6)
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + 6, d.pz], [d.px + CRW - 1, d.py + 6, d.pz + CRD - 1], CURVE_WALL)
		BS.p++
		return
	}

	// phase 3: north wall
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + CRW - 1, d.py + 5, d.pz], CURVE_WALL)
		BS.p++
		return
	}

	// phase 4: south wall
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 1, d.pz + CRD - 1], [d.px + CRW - 1, d.py + 5, d.pz + CRD - 1], CURVE_WALL)
		BS.p++
		return
	}

	// phase 5: west wall
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 5, d.pz + CRD - 1], CURVE_WALL)
		BS.p++
		return
	}

	// phase 6: east wall
	if (BS.p === 6) {
		api.setBlockRect([d.px + CRW - 1, d.py + 1, d.pz], [d.px + CRW - 1, d.py + 5, d.pz + CRD - 1], CURVE_WALL)
		BS.p++
		return
	}

	// phase 7: place interior walls in batches
	if (BS.p === 7) {
		if (!d.wallIdx) d.wallIdx = 0
		const batch = 6
		for (let i = 0; i < batch && d.wallIdx < interiorWallData.length; i++, d.wallIdx++) {
			const entry = interiorWallData[d.wallIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			let worldX = d.px + parseInt(x, 36) - 3
			const worldY = d.py + parseInt(y, 36) - 9
			const worldZ = d.pz + parseInt(z, 36) - 27
			// flip along x axis for mirrored version
			if (d.mirrored) {
				worldX = d.px + (CRW - 1) - (parseInt(x, 36) - 3)
			}
			api.setBlock(worldX, worldY, worldZ, CURVE_WALL)
		}
		if (d.wallIdx >= interiorWallData.length) BS.p++
		return
	}

	// phase 8: place decorative blocks in batches
	if (BS.p === 8) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 2
		for (let i = 0; i < batch && d.decorIdx < curveDecorData.length; i++, d.decorIdx++) {
			const entry = curveDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			const blockName = curveDecorDict[parseInt(blockIdx)]
			let worldX = d.px + parseInt(x, 36) - 3
			const worldY = d.py + parseInt(y, 36) - 9
			const worldZ = d.pz + parseInt(z, 36) - 27
			// flip along x axis for mirrored version
			if (d.mirrored) {
				worldX = d.px + (CRW - 1) - (parseInt(x, 36) - 3)
			}
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= curveDecorData.length) BS.p++
		return
	}

	// phase 9: register the doors
	if (BS.p === 9) {
		if (d.mirrored) {
			// mirrored version flips the exit side
			const door1X = d.px + 9
			const door1Z = d.pz + 0
			const door2X = d.px + 5
			const door2Z = d.pz + 15
			if (typeof registerAutoDoor === "function") {
				registerAutoDoor(door1X, d.py + 1, door1Z, 3, "Cedar Door")
				registerAutoDoor(door2X, d.py + 1, door2Z, 3, "Cedar Door")
			}
		} else {
			const door1X = d.px + 9
			const door1Z = d.pz + 0
			const door2X = d.px + 13
			const door2Z = d.pz + 15
			if (typeof registerAutoDoor === "function") {
				registerAutoDoor(door1X, d.py + 1, door1Z, 3, "Cedar Door")
				registerAutoDoor(door2X, d.py + 1, door2Z, 3, "Cedar Door")
			}
		}
		BS.p++
		return
	}

	// phase 10: set board text with room number
	if (BS.p === 10) {
		// the board is already placed in the room, this just sets the visible room number
		const exitX = d.mirrored ? d.px + 4 : d.px + 13
		const exitZ = d.pz + 15
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
		if (typeof recordA60Room === "function") recordA60Room("curve", d.px, d.py, d.pz, d.mirrored)
		const roomType = d.mirrored ? "mirrored" : "normal"
		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		// setTickTimeout(()=>{
		// const wp=CURVE_WAYPOINTS[roomType].north_south
		// for(const w of wp){
		// api.playParticleEffect({
		// dir1:[0,0,0],dir2:[0,0,0],pos1:[d.px+w.x,d.py+2,d.pz+w.z],pos2:[d.px+w.x,d.py+2,d.pz+w.z],
		// texture:"heart",minLifeTime:30,maxLifeTime:30,minEmitPower:0,maxEmitPower:0,
		// minSize:0.5,maxSize:0.5,manualEmitCount:1,gravity:[0,0,0],
		// colorGradients:[{timeFraction:0,minColor:[255,255,0,1],maxColor:[255,255,0,1]}],
		// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
		// })
		// }
		// },5)
		return
	}
}

// curve room waypoints for the entites
// entry door is at x=9 z=0, exit door is at x=13 or x=5 depending on mirror
globalThis.CURVE_WAYPOINTS = {
	normal: {
		north_south: [{ x: 9.5, z: 3.5 }, { x: 13.5, z: 3.5 }, { x: 13.5, z: 12.5 }],
		south_north: [{ x: 13.5, z: 12.5 }, { x: 13.5, z: 3.5 }, { x: 9.5, z: 3.5 }]
	},
	mirrored: {
		north_south: [{ x: 9.5, z: 3.5 }, { x: 5.5, z: 3.5 }, { x: 5.5, z: 12.5 }],
		south_north: [{ x: 5.5, z: 12.5 }, { x: 5.5, z: 3.5 }, { x: 9.5, z: 3.5 }]
	}
}

globalThis.showCurveWaypoints = function (pId, pathName) {
	// this is only a visual test for the entity path
	// it helps check if the waypoint route looks good
	// not needed and does not show in prod, which is why it stays commented out
	// this helper lets us inspect the route the entity would take through the room
	const version = lastCurveRoom && lastCurveRoom.mirrored ? "mirrored" : "normal"
	const wp = CURVE_WAYPOINTS[version][pathName] || CURVE_WAYPOINTS[version].north_south
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
		// colorGradients:[{timeFraction:0,minColor:[255,255,0,1],maxColor:[255,255,0,1]}],
		// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
		// })
		i++
		setTickTimeout(spawn, 2)
	}
	spawn()
}

globalThis.getCurveWaypoint = function (pId) {
	// this is just for checking the room origin and waypoint math while testing
	if (!lastCurveRoom) {
		api.sendMessage(pId, "No curve room spawned yet! Use !curve or !curve1 first", { color: "#ff0000" })
		return
	}
	const pos = api.getPosition(pId)
	if (!pos) return
	const rx = pos[0] - lastCurveRoom.px
	const rz = pos[2] - lastCurveRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	const roomType = lastCurveRoom.mirrored ? "mirrored" : "normal"
	api.sendMessage(pId, `Room: curve (${roomType})`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastCurveRoom.px}, ${lastCurveRoom.py}, ${lastCurveRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })
	// api.playParticleEffect({
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastCurveRoom.px+wx,lastCurveRoom.py+12,lastCurveRoom.pz+wz],
	// pos2:[lastCurveRoom.px+wx,lastCurveRoom.py+12,lastCurveRoom.pz+wz],
	// texture:"heart",minLifeTime:10,maxLifeTime:10,minEmitPower:0,maxEmitPower:0,
	// minSize:0.8,maxSize:0.8,manualEmitCount:1,gravity:[0,0,0],
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}
