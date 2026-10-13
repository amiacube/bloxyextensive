// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// skinny room builder
api.broadcastMessage("Room type 8 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const SKINNY_WALL = "Light Gray Chalk Bricks"
const SKINNY_FLOOR = "Gray Planks"
const SW = 15, SH = 6, SD = 19

const skinnyBlockDict = [
  "Light Gray Chalk Bricks",
  "Gray Planks",
  "Cedar Door|meta|rot3|closed",
  "_Cedar Door Top|meta|rot3|closed",
  "Board|meta|rot3",
  "Jungle Wood Planks",
  "Jungle Door",
  "_Jungle Door Top"
]

// the shell gets built first, then we place the smaller details on top of it
// the offset exit lane is what makes this room feel different from the normal hallway rooms
// format: x|y|z|blockIdx using room-relative decimal coordinates
const skinnyDecorData="1|1|15|0,1|1|16|0,1|1|17|0,1|2|15|0,1|2|16|0,1|2|17|0,1|3|15|0,1|3|16|0,1|3|17|0,1|4|15|0,1|4|16|0,1|4|17|0,2|1|15|0,2|1|16|0,2|1|17|0,2|2|15|0,2|2|16|0,2|2|17|0,2|3|15|0,2|3|16|0,2|3|17|0,2|4|15|0,2|4|16|0,2|4|17|0,3|1|15|0,3|1|16|0,3|1|17|0,3|2|15|0,3|2|16|0,3|2|17|0,3|3|15|0,3|3|16|0,3|3|17|0,3|4|15|0,3|4|16|0,3|4|17|0,4|1|15|0,4|1|16|0,4|1|17|0,4|2|15|0,4|2|16|0,4|2|17|0,4|3|15|0,4|3|16|0,4|3|17|0,4|4|15|0,4|4|16|0,4|4|17|0,5|1|18|2,5|2|18|3,5|3|15|0,5|3|17|4,5|3|18|0,5|4|15|0,5|4|16|0,5|4|17|0,5|4|18|0,6|1|15|0,6|1|16|0,6|1|17|0,6|2|15|0,6|2|16|0,6|2|17|0,6|3|15|0,6|3|16|0,6|3|17|0,6|4|15|0,6|4|16|0,6|4|17|0,7|1|0|2,7|1|17|5,7|2|0|3,7|2|17|5,7|3|17|5,8|1|16|6,8|2|16|7,8|3|17|5,9|1|17|5,9|2|17|5,9|3|17|5,10|1|16|6,10|2|16|7,10|3|17|5,11|1|17|5,11|2|17|5,11|3|17|5,12|1|16|6,12|2|16|7,12|3|17|5,13|1|17|5,13|2|17|5,13|3|17|5".split(",")

globalThis.buildSkinnyRoom = function (px, py, pz, mirrored, roomNum) {
	BS.a = 1
	BS.t = "skinny"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, mirrored: mirrored === true || mirrored === 1, roomNum: roomNum || 0 }
	globalThis.lastSkinnyRoom = { px, py, pz, mirrored: mirrored === true || mirrored === 1 }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cSkinny = function () {
	const d = BS.d

	// phase 0: lay down the floor
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + SW - 1, d.py, d.pz + SD - 1], SKINNY_FLOOR)
		BS.p++
		return
	}

	// phase 1: build the main shell and leave the exit lane open
	if (BS.p === 1) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + 6, d.py, d.pz], SKINNY_WALL)
		api.setBlockRect([d.px + 8, d.py, d.pz], [d.px + SW - 1, d.py, d.pz], SKINNY_WALL)
		api.setBlockRect([d.px, d.py, d.pz + SD - 1], [d.px + 4, d.py, d.pz + SD - 1], SKINNY_WALL)
		api.setBlockRect([d.px + 6, d.py, d.pz + SD - 1], [d.px + SW - 1, d.py, d.pz + SD - 1], SKINNY_WALL)
		api.setBlock(d.px + 5, d.py, d.pz + SD - 1, SKINNY_FLOOR)
		BS.p++
		return
	}

	// phase 2: cap the room
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + SH - 1, d.pz], [d.px + SW - 1, d.py + SH - 1, d.pz + SD - 1], SKINNY_WALL)
		BS.p++
		return
	}

	// phase 3: add the lower wall trim
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + 6, d.py + 2, d.pz], SKINNY_WALL)
		api.setBlockRect([d.px + 8, d.py + 1, d.pz], [d.px + SW - 1, d.py + 2, d.pz], SKINNY_WALL)
		api.setBlockRect([d.px, d.py + 1, d.pz + SD - 1], [d.px + 4, d.py + 2, d.pz + SD - 1], SKINNY_WALL)
		api.setBlockRect([d.px + 6, d.py + 1, d.pz + SD - 1], [d.px + SW - 1, d.py + 2, d.pz + SD - 1], SKINNY_WALL)
		BS.p++
		return
	}

	// phase 4: finish the full wall frame
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 3, d.pz], [d.px + SW - 1, d.py + 4, d.pz], SKINNY_WALL)
		api.setBlockRect([d.px, d.py + 3, d.pz + SD - 1], [d.px + SW - 1, d.py + 4, d.pz + SD - 1], SKINNY_WALL)
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 4, d.pz + SD - 1], SKINNY_WALL)
		api.setBlockRect([d.px + SW - 1, d.py + 1, d.pz], [d.px + SW - 1, d.py + 4, d.pz + SD - 1], SKINNY_WALL)
		BS.p++
		return
	}

	// phase 5: place the decor in small batches
	if (BS.p === 5) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 3
		for (let i = 0; i < batch && d.decorIdx < skinnyDecorData.length; i++, d.decorIdx++) {
			const [x, y, z, blockIdx] = skinnyDecorData[d.decorIdx].split("|")
			let relX = parseInt(x)
			if (d.mirrored) relX = (SW - 1) - relX
			api.setBlock(d.px + relX, d.py + parseInt(y), d.pz + parseInt(z), skinnyBlockDict[parseInt(blockIdx)])
		}
		if (d.decorIdx >= skinnyDecorData.length) BS.p++
		return
	}

	// phase 6: register both doors for the room
	if (BS.p === 6) {
		if (typeof registerAutoDoor === "function") {
			registerAutoDoor(d.px + 7, d.py + 1, d.pz, 3, "Cedar Door")
			registerAutoDoor(d.px + (d.mirrored ? 9 : 5), d.py + 1, d.pz + 18, 3, "Cedar Door")
		}
		BS.p++
		return
	}

	// phase 7: set the room number board
	if (BS.p === 7) {
		const boardX = d.px + (d.mirrored ? 9 : 5)
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(boardX, d.py + 3, d.pz + 17, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 8: finish and store the waypoint marker
	if (BS.p === 8) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("skinny", d.px, d.py, d.pz, d.mirrored)

		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		setTickTimeout(() => {
			const version = d.mirrored ? "mirrored" : "normal"
			const wp = SKINNY_WAYPOINTS[version].north_south
			for (const w of wp) {
				// this is only a visual test for the entity path
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

globalThis.SKINNY_WAYPOINTS = {
	normal: {
		north_south: [{ x: 7.5, z: 5.5 }, { x: 7.5, z: 10.5 }, { x: 5.5, z: 14.5 }],
		south_north: [{ x: 5.5, z: 14.5 }, { x: 7.5, z: 10.5 }, { x: 7.5, z: 5.5 }]
	},
	mirrored: {
		north_south: [{ x: 7.5, z: 5.5 }, { x: 7.5, z: 10.5 }, { x: 9.5, z: 14.5 }],
		south_north: [{ x: 9.5, z: 14.5 }, { x: 7.5, z: 10.5 }, { x: 7.5, z: 5.5 }]
	}
}

globalThis.getSkinnyWaypoint = function (pId) {
	if (!lastSkinnyRoom) {
		api.sendMessage(pId, "No skinny room spawned yet!", { color: "#ff0000" })
		return
	}

	const pos = api.getPosition(pId)
	if (!pos) return

	const rx = pos[0] - lastSkinnyRoom.px
	const rz = pos[2] - lastSkinnyRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5
	const roomType = lastSkinnyRoom.mirrored ? "mirrored" : "normal"

	api.sendMessage(pId, `Room: skinny (${roomType})`, { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastSkinnyRoom.px}, ${lastSkinnyRoom.py}, ${lastSkinnyRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })

	// this is only a visual test for the entity path
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastSkinnyRoom.px+wx,lastSkinnyRoom.py+3,lastSkinnyRoom.pz+wz],
	// pos2:[lastSkinnyRoom.px+wx,lastSkinnyRoom.py+3,lastSkinnyRoom.pz+wz],
	// it helps check if the waypoint route looks good
	// not needed and does not show in prod, which is why it stays commented out
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}


