// open source note:
// this file was cleaned up after launch so it is easier to follow
// sorry about the sections that look minified. they are not.
// i just made a tool that can take a build and turn it into optimized code.
// i might release that tool on bloxdhub soon, not sure yet.
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller

// end room builder
api.broadcastMessage("Room type 5 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const END_WALL = "Black Concrete"
const END_FLOOR = "Black Wool"
const EW = 20, EH = 14, ED = 20

// block dictionary from the sample room
const endBlockDict = [
	"Black Concrete",
	"Black Wool",
	"Pine Slab|meta|rot4|side",
	"Pine Wood Planks",
	"Pine Slab",
	"Pine Slab|meta|rot1|side",
	"Pine Slab|meta|rot3|side",
	"Cedar Door|meta|rot3|closed",
	"Aspen Door|meta|rot3|closed",
	"White Concrete",
	"_Cedar Door Top|meta|rot3|closed",
	"_Aspen Door Top|meta|rot3|closed",
	"Board|meta|rot3",
	"Pine Slab|meta|rot2|side"
]

// decorative blocks from the sample room
// format: x,y,z,blockIdx using base36 coordinates
const endDecorData = [
	"m,h,g,2","m,h,h,2","m,h,t,3","m,h,u,3","m,h,v,3","m,h,w,3","m,h,x,3","m,h,y,3","m,i,g,4","m,i,h,4","m,i,i,3","m,i,j,3",
	"m,i,k,3","m,i,q,3","m,i,r,3","m,i,s,3","m,i,t,3","m,i,u,4","m,i,v,4","m,i,w,4","m,i,x,3","m,i,y,3","m,j,i,4","m,j,j,4",
	"m,j,k,4","m,j,l,3","m,j,m,3","m,j,n,3","m,j,o,3","m,j,p,3","m,j,q,3","m,j,r,4","m,j,s,4","m,j,t,4","m,j,x,3","m,j,y,3",
	"m,k,l,4","m,k,m,4","m,k,n,4","m,k,o,4","m,k,p,4","m,k,q,4","m,k,x,3","m,k,y,3","m,l,y,0","n,h,g,4","n,h,h,4","n,h,i,5",
	"n,h,t,6","n,h,u,4","n,h,v,4","n,h,w,4","n,h,x,3","n,h,y,3","n,i,i,4","n,i,j,4","n,i,k,4","n,i,l,5","n,i,q,6","n,i,r,4",
	"n,i,s,4","n,i,t,4","n,i,x,3","n,i,y,3","n,j,l,4","n,j,m,4","n,j,n,4","n,j,o,4","n,j,p,4","n,j,q,4","n,j,x,3","n,j,y,3",
	"n,k,x,3","n,k,y,3","n,l,y,0","o,h,g,4","o,h,h,4","o,h,i,5","o,h,t,6","o,h,u,4","o,h,v,4","o,h,w,4","o,h,x,3","o,h,y,3",
	"o,i,f,7","o,i,i,4","o,i,j,4","o,i,k,4","o,i,l,5","o,i,q,6","o,i,r,4","o,i,s,4","o,i,t,4","o,i,x,8","o,i,y,9","o,j,f,a",
	"o,j,l,4","o,j,m,4","o,j,n,4","o,j,o,4","o,j,p,4","o,j,q,4","o,j,x,b","o,j,y,9","o,k,w,c","o,k,x,3","o,k,y,3","o,l,y,0",
	"p,h,g,4","p,h,h,4","p,h,i,5","p,h,t,6","p,h,u,4","p,h,v,4","p,h,w,4","p,h,x,3","p,h,y,3","p,i,i,4","p,i,j,4","p,i,k,4",
	"p,i,l,5","p,i,q,6","p,i,r,4","p,i,s,4","p,i,t,4","p,i,x,3","p,i,y,3","p,j,l,4","p,j,m,4","p,j,n,4","p,j,o,4","p,j,p,4",
	"p,j,q,4","p,j,x,3","p,j,y,3","p,k,x,3","p,k,y,3","p,l,y,0","q,h,g,d","q,h,h,d","q,h,t,3","q,h,u,3","q,h,v,3","q,h,w,3",
	"q,h,x,3","q,h,y,3","q,i,g,4","q,i,h,4","q,i,i,3","q,i,j,3","q,i,k,3","q,i,q,3","q,i,r,3","q,i,s,3","q,i,t,3","q,i,u,4",
	"q,i,v,4","q,i,w,4","q,i,x,3","q,i,y,3","q,j,i,4","q,j,j,4","q,j,k,4","q,j,l,3","q,j,m,3","q,j,n,3","q,j,o,3","q,j,p,3",
	"q,j,q,3","q,j,r,4","q,j,s,4","q,j,t,4","q,j,x,3","q,j,y,3","q,k,l,4","q,k,m,4","q,k,n,4","q,k,o,4","q,k,p,4","q,k,q,4",
	"q,k,x,3","q,k,y,3","q,l,y,0"
]

globalThis.buildEndRoom = function (px, py, pz, roomNum) {
	// the end room is the final set piece, so we just set it up and let the phased builder do the rest
	BS.a = 1
	BS.t = "end"
	BS.p = 0
	BS.s = 0
	BS.d = { px, py, pz, roomNum: roomNum || 0 }
	globalThis.lastEndRoom = { px, py, pz }
	if (typeof setCurrentRoomNum === "function") setCurrentRoomNum(roomNum || 0)
}

globalThis.cEnd = function () {
	const d = BS.d

	// the end room uses a lot of phases because it is the biggest room in this folder

	// phase 0: floor part 1
	if (BS.p === 0) {
		api.setBlockRect([d.px, d.py, d.pz], [d.px + EW - 1, d.py, d.pz + 9], END_WALL)
		BS.p++
		return
	}

	// phase 1: floor part 2
	if (BS.p === 1) {
		api.setBlockRect([d.px, d.py, d.pz + 10], [d.px + EW - 1, d.py, d.pz + ED - 1], END_WALL)
		BS.p++
		return
	}

	// phase 2: floor interior part 1
	if (BS.p === 2) {
		api.setBlockRect([d.px + 1, d.py, d.pz + 1], [d.px + EW - 2, d.py, d.pz + 9], END_FLOOR)
		BS.p++
		return
	}

	// phase 3: floor interior part 2
	if (BS.p === 3) {
		api.setBlockRect([d.px + 1, d.py, d.pz + 10], [d.px + EW - 2, d.py, d.pz + ED - 2], END_FLOOR)
		BS.p++
		return
	}

	// phase 4: ceiling part 1
	if (BS.p === 4) {
		api.setBlockRect([d.px, d.py + 13, d.pz], [d.px + EW - 1, d.py + 13, d.pz + 9], END_WALL)
		BS.p++
		return
	}

	// phase 5: ceiling part 2
	if (BS.p === 5) {
		api.setBlockRect([d.px, d.py + 13, d.pz + 10], [d.px + EW - 1, d.py + 13, d.pz + ED - 1], END_WALL)
		BS.p++
		return
	}

	// phase 6: north wall
	if (BS.p === 6) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px + EW - 1, d.py + 12, d.pz], END_WALL)
		BS.p++
		return
	}

	// phase 7: south wall
	if (BS.p === 7) {
		api.setBlockRect([d.px, d.py + 1, d.pz + ED - 1], [d.px + EW - 1, d.py + 12, d.pz + ED - 1], END_WALL)
		BS.p++
		return
	}

	// phase 8: west wall
	if (BS.p === 8) {
		api.setBlockRect([d.px, d.py + 1, d.pz], [d.px, d.py + 12, d.pz + ED - 1], END_WALL)
		BS.p++
		return
	}

	// phase 9: east wall
	if (BS.p === 9) {
		api.setBlockRect([d.px + EW - 1, d.py + 1, d.pz], [d.px + EW - 1, d.py + 12, d.pz + ED - 1], END_WALL)
		BS.p++
		return
	}

	// phase 10: decorative blocks
	if (BS.p === 10) {
		if (!d.decorIdx) d.decorIdx = 0
		const batch = 5
		// the end room uses compact encoded sample data, so we unpack a few pieces each tick
		for (let i = 0; i < batch && d.decorIdx < endDecorData.length; i++, d.decorIdx++) {
			const entry = endDecorData[d.decorIdx]
			const [x, y, z, blockIdx] = entry.split(",")
			const blockName = endBlockDict[parseInt(blockIdx, 36)]
			const worldX = d.px + parseInt(x, 36) - 15
			const worldY = d.py + parseInt(y, 36) - 12
			const worldZ = d.pz + parseInt(z, 36) - 15
			api.setBlock(worldX, worldY, worldZ, blockName)
		}
		if (d.decorIdx >= endDecorData.length) BS.p++
		return
	}

	// phase 11: remove the sample board
	if (BS.p === 11) {
		// the end room should not show a room number board, so we clear the sample placement (forgot to remove it from the schematic lol and so it came with this)
		const boardX = d.px + 9
		const boardY = d.py + 8
		const boardZ = d.pz + 17
		api.setBlock(boardX, boardY, boardZ, "Air")
		BS.p++
		return
	}

	// phase 12: complete
	if (BS.p === 12) {
		BS.a = 0
		if (typeof recordA60Room === "function") recordA60Room("end", d.px, d.py, d.pz, false)
		return
	}
}
