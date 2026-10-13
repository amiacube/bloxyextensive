const fs = require('fs');
const path = require('path');
const axios = require('axios');

const songs = [
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20A%20Place%20To%20Be%20Free.mp3", name: "Adigold - A Place To Be Free.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Butterfly%20Effect.mp3", name: "Adigold - Butterfly Effect.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Dreamless%20Sleep.mp3", name: "Adigold - Dreamless Sleep.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Frozen%20Pulse.mp3", name: "Adigold - Frozen Pulse.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Frozen%20Skies.mp3", name: "Adigold - Frozen Skies.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Healing%20Thoughts.mp3", name: "Adigold - Healing Thoughts.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Here%20Forever.mp3", name: "Adigold - Here Forever.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Just%20a%20Little%20Hope.mp3", name: "Adigold - Just a Little Hope.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Just%20Like%20Heaven.mp3", name: "Adigold - Just Like Heaven.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Memories%20Remain.mp3", name: "Adigold - Memories Remain.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Place%20To%20Be.mp3", name: "Adigold - Place To Be.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20The%20Riverside.mp3", name: "Adigold - The Riverside.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20The%20Wonder.mp3", name: "Adigold - The Wonder.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Adigold%20-%20Vetrar%20(Cut%20B).mp3", name: "Adigold - Vetrar (Cut B).mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Awkward%20Comedy%20Quirky.mp3", name: "Awkward Comedy Quirky.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/battle-ship-111902.mp3", name: "battle-ship-111902.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/cdk-Silence-Await.mp3", name: "cdk-Silence-Await.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/corsairs-studiokolomna-main-version-23542-02-33.mp3", name: "corsairs-studiokolomna-main-version-23542-02-33.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/ghost-Reverie-small-theme.mp3", name: "ghost-Reverie-small-theme.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/happy.mp3", name: "happy.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Heroic-Demise-New.mp3", name: "Heroic-Demise-New.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/I-am-the-Sea-The-Room-4.mp3", name: "I-am-the-Sea-The-Room-4.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Juhani%20Junkala%20%5BRetro%20Game%20Music%20Pack%5D%20Ending.mp3", name: "Juhani Junkala [Retro Game Music Pack] Ending.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Juhani%20Junkala%20%5BRetro%20Game%20Music%20Pack%5D%20Level%201.mp3", name: "Juhani Junkala [Retro Game Music Pack] Level 1.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Juhani%20Junkala%20%5BRetro%20Game%20Music%20Pack%5D%20Level%202.mp3", name: "Juhani Junkala [Retro Game Music Pack] Level 2.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Juhani%20Junkala%20%5BRetro%20Game%20Music%20Pack%5D%20Level%203.mp3", name: "Juhani Junkala [Retro Game Music Pack] Level 3.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Juhani%20Junkala%20%5BRetro%20Game%20Music%20Pack%5D%20Title%20Screen.mp3", name: "Juhani Junkala [Retro Game Music Pack] Title Screen.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/LonePeakMusic-Highway-1.mp3", name: "LonePeakMusic-Highway-1.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Mojo%20Productions%20-%20Pirates.mp3", name: "Mojo Productions - Pirates.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Mojo%20Productions%20-%20Sneaky%20Jazz.mp3", name: "Mojo Productions - Sneaky Jazz.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Mojo%20Productions%20-%20The%20Sneaky.mp3", name: "Mojo Productions - The Sneaky.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Mojo%20Productions%20-%20The%20Sneaky%20Jazz.mp3", name: "Mojo Productions - The Sneaky Jazz.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/progress.mp3", name: "progress.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/raise-the-sails-152124.mp3", name: "raise-the-sails-152124.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/ramblinglibrarian-I-Have-Often-T.mp3", name: "ramblinglibrarian-I-Have-Often-T.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/Slow-Motion-Bensound.mp3", name: "Slow-Motion-Bensound.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/snowflake-Ethereal-Space.mp3", name: "snowflake-Ethereal-Space.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/the-epic-adventure-131399.mp3", name: "the-epic-adventure-131399.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/The%20Suspense%20Ambient.mp3", name: "The Suspense Ambient.mp3" },
    { url: "https://static3.bloxd.io/sounds/music/TownTheme.mp3", name: "TownTheme.mp3" }
];

const folder = path.join(__dirname, 'assets/songs');
if (!fs.existsSync(folder)) fs.mkdirSync(folder);

async function downloadSong(song) {
    const filePath = path.join(folder, song.name);
    if (fs.existsSync(filePath)) {
        console.log(`✅ Already downloaded: ${song.name}`);
        return;
    }

    try {
        const response = await axios({
            url: song.url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`🎵 Downloaded: ${song.name}`);
    } catch (err) {
        console.error(`❌ Failed: ${song.name}`, err.message);
    }
}

(async () => {
    for (const song of songs) {
        await downloadSong(song);
    }
    console.log("✅ All downloads finished!");
})();
