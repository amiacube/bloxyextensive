const usedCallbacks = ["tick","onPlayerDamagingOtherPlayer","onPlayerAttemptAltAction","onPlayerDropItem","onPlayerJoin","onPlayerLeave","onRespawnRequest","onPlayerKilledOtherPlayer","onAttemptKillPlayer","onMobKilledPlayer","onPlayerBoughtShopItem"];

const codeblockPositions = [
    //init.js
    [0, -500, 0],
    //utils.js
    [0,-500,1],
    //shop.js
    [0,-500,2],
    //managers.js
    [0,-500,3],
    //manhunt.js
    [0,-500,4]
];

const error = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "red" });
const log = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "yellow" });

// -- Callback system --
globalThis.CBs = { };
const interruptedCbs = [];
const safeCallCb = (cb, ...args) => {
    if(typeof cb === "string") cb = globalThis.CBs[cb];

    interruptedCbs.push([cb, ...args]);
    const ret = cb?.(...args);
    interruptedCbs.pop();

    return ret;
};
// Flag in case onPlayerJoin exists twice in usedCallbacks, so no weirdness happens
let joinRegistered = false;
for(const cb of usedCallbacks) {
    if(cb === "tick") continue;
    if(cb === "onPlayerJoin") {
        if(joinRegistered) continue;
        joinRegistered = true;

        let ids = [];
        let joinCb;
        //dont crucify me for using setters, should only be called once
        Object.defineProperty(globalThis.CBs, cb, {
            set(v) {
                joinCb = v;
                for(const id of ids) safeCallCb(joinCb, id);
            }
        });
        globalThis[cb] = id => {
            if(joinCb)
                return safeCallCb(joinCb, id);
            ids.push(id);
        }
    } else {
        globalThis[cb] = (...args) => safeCallCb(cb, ...args);
    }
}


// -- Code loading --
const codes = new Array(codeblockPositions.length).fill(null);
let loadedC = 0;
let STAGE = 0;
let execI = 0;

tick = () => {
    CBs.tick?.();

    for(let i = 0; i < interruptedCbs.length; i++) safeCallCb(...interruptedCbs.shift());
    if(STAGE === -1) return;
    if(STAGE === 0) {
        for(let i = 0; i < codeblockPositions.length; i++) {
			if(!!codes[i]) continue;

			const pos = codeblockPositions[i];
			const loaded = api.isBlockInLoadedChunk(...pos);
			if(!loaded) {
				//load chunk
				api.getBlock(...pos);
				continue;
			}

            const text = api.getBlockData(...pos)?.persisted?.shared?.text;
			if(!text) {
                error(`No code stored at specified position ${pos.join(",")}.`);
				return STAGE = -1;
			}
            codes[i] = text;
            if(++loadedC >= codes.length) return STAGE = 1;
        }

    } else if(STAGE === 1) {
		log(`Attempt exec at ${codeblockPositions[execI].join(" ")}`);
        const code = codes[execI];
        try {
            eval(code);
        } catch(e) {
            error(`Error evaluating code (stored at ${codeblockPositions[execI].join(" ")}): ${e}, ${e.stack}`);
        }
        codes[execI] = null;
        if(++execI >= codes.length) STAGE = 2;
    } else if(STAGE === 2) {
        log("Successfully loaded code");
        STAGE = -1;
    }
}