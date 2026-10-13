// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// closet room builder
api.broadcastMessage("Room type 7 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const CLOSET_WALL = "Light Gray Chalk Bricks"
const CLOSET_FLOOR = "Gray Planks"
const CLW = 15, CLH = 6, CLD = 19

const closetBlockDict = [
  "Light Gray Chalk Bricks",
  "Gray Planks",
  "Jungle Wood Planks",
  "Cobweb",
  "Jungle Door|meta|rot4|closed",
  "Pine Door|meta|rot4|closed",
  "_Jungle Door Top|meta|rot4|closed",
  "_Pine Door Top|meta|rot4|closed",
  "Jungle Door|meta|rot3|closed",
  "Jungle Door",
  "_Jungle Door Top|meta|rot3|closed",
  "_Jungle Door Top",
  "Cedar Door|meta|rot3|closed",
  "_Cedar Door Top|meta|rot3|closed",
  "Pine Door",
  "_Pine Door Top",
  "Pine Door|meta|rot2|closed",
  "Jungle Door|meta|rot2|closed",
  "_Pine Door Top|meta|rot2|closed",
  "_Jungle Door Top|meta|rot2|closed",
  "Board|meta|rot3"
]

// the shell gets built with setBlockRect first, then we add the packed decor data
// that keeps the room definition easier to read and cheaper to build
// format: x|y|z|blockIdx using room-relative decimal coordinates
const closetDecorData = (
"1|1|1|2,1|1|2|2,1|1|4|2,1|1|5|2,1|1|6|3,1|1|7|2,1|1|8|2,1|1|10|2,1|1|11|2,1|1|12|3,1|1|13|2,1|1|14|2,1|1|15|3,1|1|16|2,1|1|17|2,1|2|1|2,1|2|2|2,1|2|4|2,"+
"1|2|5|2,1|2|6|3,1|2|7|2,1|2|8|2,1|2|10|2,1|2|11|2,1|2|12|3,1|2|13|2,1|2|14|2,1|2|15|3,1|2|16|2,1|2|17|2,1|3|1|2,1|3|2|2,1|3|3|2,1|3|4|2,1|3|5|2,1|3|6|2,"+
"1|3|7|2,1|3|8|2,1|3|9|2,1|3|10|2,1|3|11|2,1|3|12|2,1|3|13|2,1|3|14|2,1|3|15|2,1|3|16|2,1|3|17|2,1|4|1|2,1|4|2|2,1|4|3|2,1|4|4|2,1|4|5|2,1|4|6|2,1|4|7|2,"+
"1|4|8|2,1|4|9|2,1|4|10|2,1|4|11|2,1|4|12|2,1|4|13|2,1|4|14|2,1|4|15|2,1|4|16|2,1|4|17|0,2|1|1|2,2|1|3|4,2|1|6|5,2|1|9|4,2|1|12|5,2|1|15|5,2|1|17|2,2|2|1|2,"+
"2|2|3|6,2|2|6|7,2|2|9|6,2|2|12|7,2|2|15|7,2|2|17|2,2|3|1|2,2|3|17|2,2|4|1|2,2|4|17|2,3|1|1|2,3|1|17|2,3|2|1|2,3|2|17|2,3|3|1|2,3|3|17|2,3|4|1|2,3|4|17|2,"+
"4|1|2|8,4|1|16|9,4|2|2|10,4|2|16|11,4|3|1|2,4|3|17|2,4|4|1|2,4|4|17|2,5|1|1|2,5|1|17|2,5|2|1|2,5|2|17|2,5|3|1|2,5|3|17|2,5|4|1|2,5|4|17|2,6|1|1|2,6|1|17|2,"+
"6|2|1|2,6|2|17|2,6|3|1|2,6|3|17|2,6|4|1|2,6|4|17|2,7|1|0|12,7|1|18|12,7|2|0|13,7|2|18|13,7|3|1|2,7|3|17|2,7|4|1|2,7|4|17|2,8|1|1|2,8|1|17|2,8|2|1|2,8|2|17|2,"+
"8|3|1|2,8|3|17|2,8|4|1|2,8|4|17|2,9|1|1|2,9|1|17|2,9|2|1|2,9|2|17|2,9|3|1|2,9|3|17|2,9|4|1|2,9|4|17|2,10|1|2|8,10|1|16|14,10|1|17|3,10|2|2|10,10|2|16|15,10|2|17|3,"+
"10|3|1|2,10|3|17|2,10|4|1|2,10|4|17|2,11|1|1|2,11|1|17|2,11|2|1|2,11|2|17|2,11|3|1|2,11|3|17|2,11|4|1|2,11|4|17|2,12|1|1|2,12|1|4|16,12|1|6|17,12|1|9|17,12|1|12|16,12|1|15|17,"+
"12|1|17|2,12|2|1|2,12|2|4|18,12|2|6|19,12|2|9|19,12|2|12|18,12|2|15|19,12|2|17|2,12|3|1|2,12|3|17|2,12|4|1|2,12|4|17|2,13|1|1|2,13|1|2|2,13|1|3|2,13|1|4|3,13|1|5|2,13|1|7|2,"+
"13|1|8|2,13|1|10|2,13|1|11|2,13|1|12|3,13|1|13|2,13|1|14|2,13|1|16|2,13|1|17|2,13|2|1|2,13|2|2|2,13|2|3|2,13|2|4|3,13|2|5|2,13|2|7|2,13|2|8|2,13|2|10|2,13|2|11|2,13|2|12|3,"+
"13|2|13|2,13|2|14|2,13|2|16|2,13|2|17|2,13|3|1|2,13|3|2|2,13|3|3|2,13|3|4|2,13|3|5|2,13|3|6|2,13|3|7|2,13|3|8|2,13|3|9|2,13|3|10|2,13|3|11|2,13|3|12|2,13|3|13|2,13|3|14|2,"+
"13|3|15|2,13|3|16|2,13|3|17|2,13|4|1|2,13|4|2|2,13|4|3|2,13|4|4|2,13|4|5|2,13|4|6|2,13|4|7|2,13|4|8|2,13|4|9|2,13|4|10|2,13|4|11|2,13|4|12|2,13|4|13|2,13|4|14|2,13|4|15|2,"+
"13|4|16|2,13|4|17|2,7|3|16|20"
).split(",")

globalThis.buildClosetRoom = function (px, py, pz, roomNum) {
	BS.a = 1
	BS.t = "closet"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: roomNum || 0 }
	globalThis.lastClosetRoom = { px, py, pz }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cCloset = function () {
	const d = BS.d

	// phase 0: lay the floor first
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + CLW - 1, d.py, d.pz + CLD - 1], CLOSET_FLOOR)
		BS.p++
		return
	}

	// phase 1: build the open front and back wall sections
	if (BS.p === 1) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + 6, d.py, d.pz], CLOSET_WALL)
		api.setBlockRect([d.px + 8, d.py, d.pz], [d.px + CLW - 1, d.py, d.pz], CLOSET_WALL)
		api.setBlockRect([d.px, d.py, d.pz + CLD - 1], [d.px + 6, d.py, d.pz + CLD - 1], CLOSET_WALL)
		api.setBlockRect([d.px + 8, d.py, d.pz + CLD - 1], [d.px + CLW - 1, d.py, d.pz + CLD - 1], CLOSET_WALL)
		BS.p++
		return
	}

	// phase 2: cap the room with the ceiling
	if (BS.p === 2) {
		api.setBlockRect([d.px, d.py + CLH - 1, d.pz], [d.px + CLW - 1, d.py + CLH - 1, d.pz + CLD - 1], CLOSET_WALL)
		BS.p++
		return
	}

	// phase 3: add the lower wall trim
	if (BS.p === 3) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + 6, d.py + 2, d.pz], CLOSET_WALL)
		api.setBlockRect([d.px + 8, d.py + 1, d.pz], [d.px + CLW - 1, d.py + 2, d.pz], CLOSET_WALL)
		api.setBlockRect([d.px, d.py + 1, d.pz + CLD - 1], [d.px + 6, d.py + 2, d.pz + CLD - 1], CLOSET_WALL)
		api.setBlockRect([d.px + 8, d.py + 1, d.pz + CLD - 1], [d.px + CLW - 1, d.py + 2, d.pz + CLD - 1], CLOSET_WALL)
		BS.p++
		return
	}

	// phase 4: finish the full wall frame
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 3, d.pz], [d.px + CLW - 1, d.py + 4, d.pz], CLOSET_WALL)
		api.setBlockRect([d.px, d.py + 3, d.pz + CLD - 1], [d.px + CLW - 1, d.py + 4, d.pz + CLD - 1], CLOSET_WALL)
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 4, d.pz + CLD - 1], CLOSET_WALL)
		api.setBlockRect([d.px + CLW - 1, d.py + 1, d.pz], [d.px + CLW - 1, d.py + 4, d.pz + CLD - 1], CLOSET_WALL)
		BS.p++
		return
	}

	// phase 5: place the packed decor data in small batches
	if (BS.p === 5) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 5
		for (let i = 0; i < batch && d.decorIdx < closetDecorData.length; i++, d.decorIdx++) {
			const [x, y, z, blockIdx] = closetDecorData[d.decorIdx].split("|")
			api.setBlock(
				d.px + parseInt(x),
				d.py + parseInt(y),
				d.pz + parseInt(z),
				closetBlockDict[parseInt(blockIdx)]
			)
		}
		if (d.decorIdx >= closetDecorData.length) BS.p++
		return
	}

	// phase 6: write the room number onto the sign board
	if (BS.p === 6) {
		const roomText = `A-${String(d.roomNum + 1).padStart(3, "0")}`
		api.setBlockData(d.px + 7, d.py + 3, d.pz + 16, { persisted: { shared: { text: roomText, textSize: 2 } } })
		BS.p++
		return
	}

	// phase 7: finish the room and store the waypoint marker
	if (BS.p === 7) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("closet", d.px, d.py, d.pz, false)

		// this is only a visual test for the entity path
		// it helps check if the waypoint route looks good
		// not needed and does not show in prod, which is why it stays commented out
		setTickTimeout(() => {
			const wp = CLOSET_WAYPOINTS.north_south
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

globalThis.CLOSET_WAYPOINTS = {
	north_south: [{ x: 7.5, z: 5.5 }, { x: 7.5, z: 13.5 }],
	south_north: [{ x: 7.5, z: 13.5 }, { x: 7.5, z: 5.5 }]
}

globalThis.getClosetWaypoint = function (pId) {
	if (!lastClosetRoom) {
		api.sendMessage(pId, "No closet room spawned yet!", { color: "#ff0000" })
		return
	}

	const pos = api.getPosition(pId)
	if (!pos) return

	const rx = pos[0] - lastClosetRoom.px
	const rz = pos[2] - lastClosetRoom.pz
	const wx = Math.floor(rx) + 0.5
	const wz = Math.floor(rz) + 0.5

	api.sendMessage(pId, "Room: closet", { color: "#ffff00" })
	api.sendMessage(pId, `Origin: (${lastClosetRoom.px}, ${lastClosetRoom.py}, ${lastClosetRoom.pz})`, { color: "#888888" })
	api.sendMessage(pId, `Waypoint: {x:${wx},z:${wz}}`, { color: "#00ff00" })

	// this is only a visual test for the entity path
	// dir1:[0,0,0],dir2:[0,0,0],pos1:[lastClosetRoom.px+wx,lastClosetRoom.py+3,lastClosetRoom.pz+wz],
	// pos2:[lastClosetRoom.px+wx,lastClosetRoom.py+3,lastClosetRoom.pz+wz],
	// it helps check if the waypoint route looks good
	// not needed and does not show in prod, which is why it stays commented out
	// colorGradients:[{timeFraction:0,minColor:[0,255,0,1],maxColor:[0,255,0,1]}],
	// velocityGradients:[{timeFraction:0,factor:0,factor2:0}],blendMode:1
	// })
}


