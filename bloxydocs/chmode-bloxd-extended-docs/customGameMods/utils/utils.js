/**
 * utils.js - Utility Functions for bloChat
 */

// --- Messaging ---
function tell(playerId, message) { api.sendMessage(playerId, message, { color: "#a0a0a0" }); }
function error(playerId, message) { api.sendMessage(playerId, `[Error] ${message}`, { color: "#ff5555" }); }

// --- Player & Channel Lookups ---
function getFormattedPlayerName(playerId) { const p = this.blochat.players[playerId]; return p ? `${p.name}(${p.session_id})` : "Unknown"; }
function getPlayerIdBySessionId(sessionId) { for (const [pid, pdata] of Object.entries(this.blochat.players)) { if (pdata.session_id === sessionId) return pid; } return null; }

function generateChannelId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result;
    do {
        result = '';
        for (let i = 0; i < 2; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (this.blochat.chats[result]);
    return result;
}

// --- UI Management ---
function updatePlayerChannelsUI(playerId) {
    const p = this.blochat.players[playerId];
    if (!p) return;
    const channelOptions = p.channels.map(cid => ({
        channelName: cid,
        elementContent: [{ str: `#${cid}` }],
        elementBgColor: cid === "Global" ? "#333333" : "#4a4a4a"
    }));
    api.setClientOption(playerId, "chatChannels", channelOptions);
}

function formatRelativeTime(timestamp) {
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 10) return "<10 sec ago";
    if (diffSeconds < 30) return "<30 sec ago";
    if (diffSeconds < 60) return " <1 min ago";
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 10) return ` ~${minutes} min ago`;
    return `~${minutes} min ago`;
}

function updateChannelUiForAllMembers(channelId) {
    const channel = this.blochat.chats[channelId];
    if (!channel || channelId === "Global") return;
    const header = { str: `#${channelId} | ${Object.keys(channel.members).length} members. Type /chathelp for help.\n`, style: { color: "#999999", fontSize: "0.8em" } };
    let fullUiContent = [header];
    channel.history.forEach(msg => {
        const timestampText = formatRelativeTime(msg.timestamp);
        fullUiContent.push(...msg.line, { str: ` (${timestampText})`, style: { color: "#888888", fontSize: "0.7em" } }, { str: '\n' });
    });
    for (const memberId in channel.members) {
        api.setClientOption(memberId, 'middleTextLower', fullUiContent);
    }
}