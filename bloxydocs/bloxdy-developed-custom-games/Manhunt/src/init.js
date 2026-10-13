/*
This file is the first to be loaded, and it makes sure all the
"fake exports" are defined before being referenced anywhere.

If in any file, you define a variable to `globalThis` for other files to use,
make sure you also add it here.
*/

globalThis.currManhunt = undefined;
globalThis.LOBBY = undefined;
globalThis.rtpManager = undefined;
globalThis.timeoutManager = undefined;
globalThis.scoreboardManager = undefined;
globalThis.playerDataManager = undefined;
globalThis.queueManager = undefined;
globalThis.shopManager = undefined;
globalThis.MODE = undefined;
globalThis.colors = undefined;
globalThis.sounds = undefined;
globalThis.helpers = undefined;