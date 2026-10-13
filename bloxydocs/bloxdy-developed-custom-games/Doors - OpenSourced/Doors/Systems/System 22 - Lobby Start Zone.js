// open source note:
// this file was cleaned up after launch so it is easier to follow
// i tried adding as much comments as i can for anyone to understand. tho most of my code is messy and hopefully i might rewrite it to be more otpimized and less messy
// original code was minified and barely had any comments
// if you try to paste the full file into one codeblock, it may go over the 16000 char limit
// i suggest minifying it if you need to ship it somewhere smaller
// some old hotel chapter stuff is still in here too, so do not get confused if you see unused code or unreleased file references

/* system 22 - lobby start zone */
api.broadcastMessage("System 22 loaded", { color: "#FFD700" })
// make sure to join https://bloxdhub.com

const LSZ_MIN = [88.5, 127, 119.5]
const LSZ_MAX = [95.5, 132, 125.5] // these two variables store the corners of the box that makes up the elevator area.
const LSZ_MAX_PLAYERS = globalThis.MAX_PLAYERS || 4
const LSZ_COUNTDOWN_TICKS = 100

// the lobby start state keeps track of who is inside the elevator and who is already committed
globalThis.lobbyStartState = globalThis.lobbyStartState || {
	counting: false,
	startAt: 0,
	started: false,
	roster: {},
	eliminated: {},
	lastDebugTick: {}
}

if (globalThis.lobbyStartInterval) clearTickInterval(globalThis.lobbyStartInterval)

const lszInArea = (pId) => {
	// the start zone is the small box around the elevator
	const pos = api.getPosition(pId)
	if (!pos) return false
	return pos[0] >= LSZ_MIN[0] && pos[0] <= LSZ_MAX[0] && pos[2] >= LSZ_MIN[2] && pos[2] <= LSZ_MAX[2]
}

const lszSetText = (pId, parts) => {
	// do not overwrite the join intro while it is still playing
	if (globalThis.joinIntroState && joinIntroState[pId] && joinIntroState[pId].active) return
	api.setClientOption(pId, "middleTextLower", parts)
}

const lszClearText = () => {
	// clear the lobby text for everyone who is not still in the join intro
	for (const pId of api.getPlayerIds()) {
		if (globalThis.joinIntroState && joinIntroState[pId] && joinIntroState[pId].active) continue
		api.setClientOption(pId, "middleTextLower", "")
	}
}

const lszActiveRunPlayers = () => {
	// eliminated players stay in the roster, so this counts only the ones still alive in the run
	let c = 0
	for (const pId in lobbyStartState.roster) {
		if (!lobbyStartState.eliminated[pId]) c++
	}
	return c
}

const lszStartedCount = () => Object.keys(lobbyStartState.roster).length

const lszShowRunOver = () => {
	// once the run is done, the lobby tells everyone to leave and start fresh (slushie.. pls add chunk reset api ^w^)
	for (const pId of api.getPlayerIds()) {
		api.setClientOption(pId, "middleTextUpper", [
			{ str: "Run over.", style: { color: "#ffcc66", fontSize: "1.6rem" } },
			{ str: "\nLeave this lobby and join a fresh one to begin another descent.", style: { color: "#ffffff", fontSize: "1.15rem" } }
		])
	}
}

globalThis.markRunPlayerEliminated = (pId) => {
	// this is called by the death systems so the lobby can keep the player count honest
	if (!lobbyStartState.started || !lobbyStartState.roster[pId] || lobbyStartState.eliminated[pId]) return
	lobbyStartState.eliminated[pId] = true
	const active = lszActiveRunPlayers()
	if (active > 0) {
		api.setMaxPlayers(active, active)
		return
	}
	lszShowRunOver()
}

globalThis.handleLobbyStartPlayerLeave = (pId) => {
	// leaving the lobby during a run removes that player from the roster
	if (!lobbyStartState.started || !lobbyStartState.roster[pId]) return
	delete lobbyStartState.roster[pId]
	delete lobbyStartState.eliminated[pId]

	const active = lszActiveRunPlayers()
	if (active > 0) {
		api.setMaxPlayers(active, active)
		return
	}
	lszShowRunOver()
}

globalThis.lobbyStartInterval = setTickInterval(() => {
	// once the run has started, the lobby mostly just tracks who is still alive
	if (lobbyStartState.started) {
		const active = lszActiveRunPlayers()
		const totalStarted = lszStartedCount()

		for (const pId of api.getPlayerIds()) {
			if (lobbyStartState.roster[pId] && lobbyStartState.eliminated[pId] && active > 0) {
				lszSetText(pId, [
					{ str: `${active}/${totalStarted} alive`, style: { color: "#ffcc66", fontSize: "1.15rem" } },
					{
						str: "  waiting for finish. This lobby will not start a new run for you. Join a new lobby to play again",
						style: { color: "#ffffff", fontSize: "1.05rem" }
					}
				])
			} else if (!(globalThis.joinIntroState && joinIntroState[pId] && joinIntroState[pId].active)) {
				api.setClientOption(pId, "middleTextLower", "")
			}
		}
		return
	}

	const players = api.getPlayerIds()
	const total = players.length
	if (total === 0) {
		lobbyStartState.counting = false
		return
	}

	// the run only starts when every player is actually inside the elevator area
	let inside = 0
	for (const pId of players) {
		const inArea = lszInArea(pId)
		if (inArea) inside++
	}

	const allInside = inside === total
	const overLimit = total > LSZ_MAX_PLAYERS

	if (overLimit) {
		lobbyStartState.counting = false
		for (const pId of players) {
			lszSetText(pId, [
				{ str: `${inside}/${total}`, style: { color: "#ff5555", fontSize: "1.35rem" } },
				{ str: `  Max ${LSZ_MAX_PLAYERS} players`, style: { color: "#ff5555", fontSize: "1.2rem" } }
			])
		}
		return
	}

	if (!allInside) {
		lobbyStartState.counting = false
		for (const pId of players) {
			lszSetText(pId, [
				{ str: `${inside}/${total}`, style: { color: "#ff5555", fontSize: "1.35rem" } },
				{ str: "  All players must be in the elevator", style: { color: "#ffcc66", fontSize: "1.2rem" } }
			])
		}
		return
	}

	// once everyone is inside, start the countdown only once
	if (!lobbyStartState.counting) {
		lobbyStartState.counting = true
		lobbyStartState.startAt = systemTick + LSZ_COUNTDOWN_TICKS
	}

	const ticksLeft = Math.max(0, lobbyStartState.startAt - systemTick)
	const secsLeft = Math.ceil(ticksLeft / 20)
	for (const pId of players) {
		lszSetText(pId, [
			{ str: `${inside}/${total}`, style: { color: "#55ff88", fontSize: "1.35rem" } },
			{ str: secsLeft > 0 ? `  Starting in ${secsLeft}s` : "  Starting now", style: { color: "#55ff88", fontSize: "1.2rem" } }
		])
	}

	if (ticksLeft > 0) return

	// once the countdown ends, lock the roster and start the run
	lobbyStartState.started = true
	lobbyStartState.counting = false
	lobbyStartState.roster = {}
	lobbyStartState.eliminated = {}
	for (const pId of players) lobbyStartState.roster[pId] = true
	api.setMaxPlayers(total, total)
	lszClearText()
	if (typeof startBuiltRoomsRide === "function") startBuiltRoomsRide()
}, 10)
