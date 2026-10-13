// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

// chat display system - shows chat messages above players using nametags
var pMsg = {}
var pTmr = {}

// this system turns chat into a short nametag bubble above the player
// it is used so chat still feels visible without needing a big ui panel
handlePlayerChat = (pId, msg) => {
	const ex = pMsg[pId]

	// if the player already has a message on screen, keep the old subtitle and swap the main line
	if (ex) {
		pMsg[pId] = { m: ex.s || ex.m, s: msg, t: api.now() }
	} else {
		pMsg[pId] = { m: msg, s: null, t: api.now() }
	}

	// restart the timer so the message stays up for a short time after the latest chat
	if (pTmr[pId]) {
		clearTickTimeout(pTmr[pId])
	}

	pTmr[pId] = setTickTimeout(() => {
		clearPlayerMessage(pId)
	}, 100)

	updatePlayerNametag(pId)
}

clearPlayerMessage = (pId) => {
	// remove the stored message and clear the player nametag back to normal
	if (pMsg[pId]) {
		delete pMsg[pId]
		updatePlayerNametag(pId)
	}

	if (pTmr[pId]) {
		clearTickTimeout(pTmr[pId])
		delete pTmr[pId]
	}
}

updatePlayerNametag = (pId) => {
	const md = pMsg[pId]

	if (md) {
		let st = md.s || ""
		let mt

		// long chat gets split so the nametag does not become a giant wall of text
		if (!st) {
			const ln = splitMsg(md.m, 40)
			mt = ln[0] || md.m
			st = ln[1] || ""
		} else {
			mt = md.m
		}

		// this builds the nametag card that shows to everyone
		const nti = {
			backgroundColor: "#ffffff",
			content: [
				{
					str: mt,
					style: {
						color: "#000000",
						fontSize: "68px",
						fontWeight: "normal"
					}
				}
			],
			subtitle: st
				? [
					{
						str: st,
						style: {
							color: "#000000",
							fontSize: "56px",
							fontWeight: "normal"
						}
					}
				]
				: [],
			subtitleBackgroundColor: "#ffffff"
		}

		api.setTargetedPlayerSettingForEveryone(pId, "nameTagInfo", nti, true)
	} else {
		// no active message means the normal nametag can come back
		api.setTargetedPlayerSettingForEveryone(pId, "nameTagInfo", null, true)
	}
}

splitMsg = (msg, max) => {
	// split on spaces so the text wraps in a natural way
	const wd = msg.split(" ")
	const ln = []
	let cl = ""

	for (let i = 0; i < wd.length; i++) {
		const w = wd[i]
		if (cl.length + w.length + 1 > max && cl.length > 0) {
			ln.push(cl.trim())
			cl = w
		} else {
			cl += (cl.length > 0 ? " " : "") + w
		}
	}

	if (cl.length > 0) {
		ln.push(cl.trim())
	}

	return ln
}

clearAllMessages = () => {
	// used when the world resets or when we want to wipe every active chat bubble
	const ps = api.getPlayerIds()
	for (let i = 0; i < ps.length; i++) {
		clearPlayerMessage(ps[i])
	}
}
