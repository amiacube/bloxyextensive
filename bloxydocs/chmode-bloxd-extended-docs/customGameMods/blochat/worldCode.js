/**
 * betterChat.js - A private, invitation-based chat system for Bloxd.io
 *
 * Features:
 * - Private chats displayed in a custom UI with non-jittery relative timestamps.
 * - Chat members assigned unique pastel colors for their names.
 * - Global chat works as normal in the main chat box.
 * - Chat owners can kick members from their private chat.
 *
 * Commands:
 * - /chatnew <id>        - Create a private chat and invite someone.
 * - /chatadd <id>        - Invite someone to your current private chat.
 * - /chataccept          - Accept a pending chat invitation.
 * - /chatleave           - Leave your current private chat.
 * - /chatkick <id>       - (Owner Only) Kick a member from your chat.
 * - /chatmembers         - List members of your current private chat.
 * - /chatinfo            - Explains how to use the private chat.
 * - /chathelp            - Displays this list of commands.
 */

// --- STATE MANAGEMENT & CONSTANTS ---
const players = {};
const chats = { "Global": { members: [] } };

const MAX_SESSION_IDS = 101;
const usedSessionIds = new Set();
let nextAvailableId = 0;

const PASTEL_COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFC8A2', '#D4A5A5', '#A2D4A5', '#A5A2D4'];
const leaderboardColumns = { sessionId: { displayName: "ID", sortPriority: 2 }, name: { displayName: "Name", sortPriority: 1 }, pfp: { sortPriority: 0 } };

let tickCounter = 0;
const TIMESTAMP_UPDATE_INTERVAL_TICKS = 100; // 20 ticks/sec * 5 seconds = 100

// --- HELPER FUNCTIONS ---

function tell(playerId, message) { api.sendMessage(playerId, message, { color: "#a0a0a0" }); }
function error(playerId, message) { api.sendMessage(playerId, `[Error] ${message}`, { color: "#ff5555" }); }
function getFormattedPlayerName(playerId) { const p = players[playerId]; return p ? `${p.name}(${p.session_id})` : "Unknown"; }
function getPlayerIdBySessionId(sessionId) { for (const [pid, pdata] of Object.entries(players)) { if (pdata.session_id === sessionId) return pid; } return null; }

/**
 * Generates a random, unique 2-uppercase-letter channel ID.
 */
function generateChannelId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result;
    do {
        result = '';
        // Generate a 2-character ID to avoid accidental profanity.
        for (let i = 0; i < 2; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (chats[result]);
    return result;
}

function updatePlayerChannelsUI(playerId) { const p = players[playerId]; if (!p) return; const o = p.channels.map(cid => ({ channelName: cid, elementContent: [{ str: `#${cid}` }], elementBgColor: cid === "Global" ? "#333333" : "#4a4a4a" })); api.setClientOption(playerId, "chatChannels", o); }
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
    const channel = chats[channelId];
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

// --- CALLBACKS ---

tick = () => {
    tickCounter++;
    if (tickCounter >= TIMESTAMP_UPDATE_INTERVAL_TICKS) {
        tickCounter = 0;
        for (const channelId in chats) {
            if (channelId !== "Global") {
                updateChannelUiForAllMembers(channelId);
            }
        }
    }
};

onPlayerJoin = (playerId) => {
    if (usedSessionIds.size >= MAX_SESSION_IDS) { api.kickPlayer(playerId, "Lobby is full."); return; }
    while (usedSessionIds.has(nextAvailableId)) nextAvailableId++;
    const sessionId = nextAvailableId;
    usedSessionIds.add(sessionId);
    players[playerId] = { session_id: sessionId, channels: ["Global"], invitation: null, lastPrivateChannel: null, name: api.getEntityName(playerId) };
    chats["Global"].members.push(playerId);
    updatePlayerChannelsUI(playerId);
    api.setClientOption(playerId, "lobbyLeaderboardInfo", leaderboardColumns);
    api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", { sessionId }, true);
    const nameTagInfo = { content: [{ str: `[${sessionId}] `, style: { color: "#aaaaaa" } }, { str: players[playerId].name }] };
    api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", nameTagInfo, true);
    for (const existingId in players) {
        if (existingId === playerId) continue;
        const p = players[existingId];
        const existingTag = { content: [{ str: `[${p.session_id}] `, style: { color: "#aaaaaa" } }, { str: p.name }] };
        api.setOtherEntitySetting(playerId, existingId, "nameTagInfo", existingTag);
    }
    tell(playerId, `Welcome! Your ID is ${sessionId}. Use /chathelp for a list of commands.`);
};

onPlayerLeave = (playerId) => {
    const p = players[playerId];
    if (!p) return;
    p.channels.forEach(cid => {
        if (!chats[cid]) return;
        if (cid === "Global") { chats[cid].members = chats[cid].members.filter(id => id !== playerId); }
        else {
            delete chats[cid].members[playerId];
            if (Object.keys(chats[cid].members).length === 0) { delete chats[cid]; }
            else { updateChannelUiForAllMembers(cid); }
        }
    });
    const releasedId = p.session_id;
    usedSessionIds.delete(releasedId);
    if (releasedId < nextAvailableId) nextAvailableId = releasedId;
    delete players[playerId];
};

playerCommand = (playerId, command) => {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    const myData = players[playerId];
    if (!myData) return false;

    switch (cmd) {
        case "chatnew": {
            if (args.length < 2) return error(playerId, "Usage: /chatnew <id>");
            if (myData.channels.length >= 4) return error(playerId, "You are in the max number of chats (3).");
            const targetSid = parseInt(args[1], 10);
            if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
            const targetId = getPlayerIdBySessionId(targetSid);
            if (!targetId || targetId === playerId) return error(playerId, `Player with ID ${targetSid} not found or is yourself.`);
            const targetData = players[targetId];
            const newCid = generateChannelId();
            chats[newCid] = { owner: playerId, members: {}, history: [] };
            chats[newCid].members[playerId] = { color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)] };
            myData.channels.push(newCid);
            myData.lastPrivateChannel = newCid;
            updatePlayerChannelsUI(playerId);
            updateChannelUiForAllMembers(newCid);
            if (targetData.invitation) tell(targetId, "Your previous invite was replaced.");
            targetData.invitation = { fromId: playerId, channelId: newCid };
            tell(playerId, `You created channel #${newCid} and invited ${getFormattedPlayerName(targetId)}.`);
            tell(targetId, `${getFormattedPlayerName(playerId)} invited you to a chat. Type /chataccept to join.`);
            break;
        }
        case "chatadd": {
            if (args.length < 2) return error(playerId, "Usage: /chatadd <id>");
            const cid = myData.lastPrivateChannel;
            if (!cid || !chats[cid] || !chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
            const targetSid = parseInt(args[1], 10);
            if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
            const targetId = getPlayerIdBySessionId(targetSid);
            if (!targetId || targetId === playerId) return error(playerId, `Player with ID ${targetSid} not found or is yourself.`);
            const targetData = players[targetId];
            if (targetData.channels.includes(cid)) return error(playerId, `${targetData.name} is already in that chat.`);
            if (targetData.invitation) tell(targetId, "Your previous invite was replaced.");
            targetData.invitation = { fromId: playerId, channelId: cid };
            const memberCount = Object.keys(chats[cid].members).length;
            tell(playerId, `You invited ${getFormattedPlayerName(targetId)} to #${cid}.`);
            tell(targetId, `${getFormattedPlayerName(playerId)} invited you to their chat (${memberCount} members). Type /chataccept to join.`);
            break;
        }
        case "chataccept": {
            if (!myData.invitation) return error(playerId, "You have no pending invitations.");
            if (myData.channels.length >= 4) return error(playerId, "You are in the max number of chats (3).");
            const { channelId: cid } = myData.invitation;
            if (!chats[cid]) { myData.invitation = null; return error(playerId, `Chat #${cid} no longer exists.`); }
            const usedColors = Object.values(chats[cid].members).map(m => m.color);
            const availableColors = PASTEL_COLORS.filter(c => !usedColors.includes(c));
            const color = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
            chats[cid].members[playerId] = { color };
            myData.channels.push(cid);
            myData.lastPrivateChannel = cid;
            myData.invitation = null;
            updatePlayerChannelsUI(playerId);
            tell(playerId, `You joined #${cid}. Press TAB to switch to the channel chat!`);
            const joinMessage = { timestamp: Date.now(), line: [{ str: `- ${myData.name} joined -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
            chats[cid].history.push(joinMessage);
            if (chats[cid].history.length > 6) chats[cid].history.shift();
            updateChannelUiForAllMembers(cid);
            break;
        }
        case "chatkick": {
            if (args.length < 2) return error(playerId, "Usage: /chatkick <id>");
            const cid = myData.lastPrivateChannel;
            if (!cid || !chats[cid] || !chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
            if (chats[cid].owner !== playerId) return error(playerId, "You are not the owner of this chat.");
            const targetSid = parseInt(args[1], 10);
            if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
            const targetId = getPlayerIdBySessionId(targetSid);
            if (!targetId || !chats[cid].members[targetId]) return error(playerId, `Player with ID ${targetSid} is not in this chat.`);
            if (targetId === playerId) return error(playerId, "You cannot kick yourself.");
            const targetData = players[targetId];
            delete chats[cid].members[targetId];
            targetData.channels = targetData.channels.filter(c => c !== cid);
            if (targetData.lastPrivateChannel === cid) targetData.lastPrivateChannel = null;
            updatePlayerChannelsUI(targetId);
            api.setClientOption(targetId, 'middleTextLower', '');
            tell(targetId, `You were kicked from chat #${cid} by the owner.`);
            const kickMessage = { timestamp: Date.now(), line: [{ str: `- ${targetData.name} was kicked -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
            chats[cid].history.push(kickMessage);
            if (chats[cid].history.length > 6) chats[cid].history.shift();
            updateChannelUiForAllMembers(cid);
            break;
        }
        case "chatleave": {
            const cid = myData.lastPrivateChannel;
            if (!cid || !chats[cid] || !chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
            const channel = chats[cid];
            const leaveMessage = { timestamp: Date.now(), line: [{ str: `- ${myData.name} left -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
            delete channel.members[playerId];
            myData.channels = myData.channels.filter(c => c !== cid);
            myData.lastPrivateChannel = null;
            updatePlayerChannelsUI(playerId);
            api.setClientOption(playerId, 'middleTextLower', '');
            tell(playerId, `You left chat #${cid}.`);
            if (Object.keys(channel.members).length === 0) { delete chats[cid]; }
            else {
                channel.history.push(leaveMessage);
                if (channel.history.length > 6) channel.history.shift();
                updateChannelUiForAllMembers(cid);
            }
            break;
        }
        case "chatmembers": {
            const cid = myData.lastPrivateChannel;
            if (!cid || !chats[cid] || !chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
            tell(playerId, `--- Members of #${cid} ---`);
            for (const memberId in chats[cid].members) {
                const memberData = players[memberId];
                if (memberData) tell(playerId, ` - [${memberData.session_id}] ${memberData.name}`);
            }
            tell(playerId, '--------------------');
            break;
        }
        case "chatinfo": {
            tell(playerId, "--- Private Chat Info ---");
            tell(playerId, "To chat in a private channel, open the chat window and press TAB to cycle through your channels until the private one (#AB) is selected.");
            tell(playerId, "Messages sent in a private channel appear in the UI on your screen, not the main chat.");
            tell(playerId, "Timestamps next to messages update automatically every few seconds.");
            tell(playerId, "--------------------");
            break;
        }
        case "chathelp": {
            tell(playerId, "--- Chat Commands ---");
            tell(playerId, "/chatnew <id> - Create a private chat and invite someone.");
            tell(playerId, "/chatadd <id> - Invite someone to your current private chat.");
            tell(playerId, "/chataccept - Accept a pending chat invitation.");
            tell(playerId, "/chatleave - Leave your current private chat.");
            tell(playerId, "/chatkick <id> - (Owner Only) Kick a member from your chat.");
            tell(playerId, "/chatmembers - List members of your current private chat.");
            tell(playerId, "/chatinfo - Shows how to use the private chat system.");
            tell(playerId, "--------------------");
            break;
        }
        default: return false;
    }
    return true;
};

onPlayerChat = (playerId, chatMessage, channelName) => {
    const channel = chats[channelName];
    if (!channel || (channelName !== "Global" && !channel.members[playerId])) {
        if (channelName === "Global" && !channel.members.includes(playerId)) { }
        else { error(playerId, `You are not in channel #${channelName}.`); return false; }
    }
    const senderData = players[playerId];
    if (!senderData) return false;

    if (channelName === "Global") {
        const styledMessage = [{ str: `[Global] `, style: { color: "#cccccc" } }, { str: `[${senderData.session_id}] `, style: { color: "#aaaaaa" } }, { str: `${senderData.name}: `, style: { color: "#ffffff" } }, { str: chatMessage }];
        for (const memberId of channel.members) { api.sendMessage(memberId, styledMessage); }
    } else {
        const senderColor = channel.members[playerId].color || '#FFFFFF';
        const messageLine = {
            timestamp: Date.now(),
            line: [
                { str: `[${senderData.session_id}] `, style: { color: senderColor, fontSize: "0.8em" } },
                { str: `${senderData.name}: `, style: { color: senderColor, fontWeight: "bold", fontSize: "0.8em" } },
                { str: chatMessage, style: { color: "#FFFFFF", fontSize: "0.8em" } }
            ]
        };
        channel.history.push(messageLine);
        if (channel.history.length > 6) channel.history.shift();
        updateChannelUiForAllMembers(channelName);
    }
    return false;
};