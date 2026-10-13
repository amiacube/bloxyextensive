
var playerClickData = {}

function tick() {
    var now = api.now();
    for (var playerId in playerClickData) {
        let data = playerClickData[playerId];

        if (!data.inactiveTime) data.inactiveTime = 0;

        if (!data.isClickHeld) {
            data.inactiveTime += 1;
        } else {
            data.inactiveTime = 0;
        }

        if (data.inactiveTime >= 60) {
            api.setClientOption(playerId, "middleTextLower", "");
            data.cpsCheckStart = 0;
            data.clicks = 0;
            data.lastClickTime = 0;
            data.inactiveTime = 0;
        }

        if (data.cpsCheckStart) {
            const elapsed = (api.now() - data.cpsCheckStart) / 1000;
            const cps = elapsed > 0 ? data.clicks / elapsed : 0;
            api.setClientOption(playerId, "middleTextLower", [{
                str: "CPS: " + cps.toFixed(1),
                style: { color: "white", fontSize: "20px", fontWeight: "bold" }
            }]);
        }
    }
}

function onPlayerClick(playerId, wasAltClick) {
    if (wasAltClick) return;

    if (!playerClickData[playerId]) {
        playerClickData[playerId] = { clicksTimestamps: [] };
    }

    const data = playerClickData[playerId];
    const now = api.now();

    data.clicksTimestamps.push(now);

    const threeSecondsAgo = now - 3000;
    data.clicksTimestamps = data.clicksTimestamps.filter(ts => ts > threeSecondsAgo);

    const cps = data.clicksTimestamps.length / 3;

    api.setClientOption(playerId, "middleTextLower", [{
        str: "CPS: " + cps.toFixed(1),
        style: { color: "white", fontSize: "20px", fontWeight: "bold" }
    }]);
}

