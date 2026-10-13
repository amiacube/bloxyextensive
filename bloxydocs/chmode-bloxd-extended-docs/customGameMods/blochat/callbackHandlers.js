/**
 * callbackHandlers.js - Logic for Game Events (bloChat System)
 */

function tick_blochat() {
    this.blochat.tickCounter++;
    if (this.blochat.tickCounter >= this.blochat.TIMESTAMP_UPDATE_INTERVAL_TICKS) {
        this.blochat.tickCounter = 0;
        for (const channelId in this.blochat.chats) {
            if (channelId !== "Global") {
                updateChannelUiForAllMembers(channelId);
            }
        }
    }
}

function onPlayerJoin_blochat(playerId) {
    if (this.blochat.usedSessionIds.size >= this.blochat.MAX_SESSION_IDS) { api.kickPlayer(playerId, "Lobby is full."); return; }
    while (this.blochat.usedSessionIds.has(this.blochat.nextAvailableId)) { this.blochat.nextAvailableId++; }
    const sessionId = this.blochat.nextAvailableId;
    this.blochat.usedSessionIds.add(sessionId);
    this.blochat.players[playerId] = { session_id: sessionId, channels: ["Global"], invitation: null, lastPrivateChannel: null, name: api.getEntityName(playerId) };
    this.blochat.chats["Global"].members.push(playerId);
    updatePlayerChannelsUI(playerId);
    api.setClientOption(playerId, "lobbyLeaderboardInfo", this.blochat.leaderboardColumns);
    api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", { sessionId }, true);
    const nameTagInfo = { content: [{ str: `[${sessionId}] `, style: { color: "#aaaaaa" } }, { str: this.blochat.players[playerId].name }] };
    api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", nameTagInfo, true);
    for (const existingId in this.blochat.players) {
        if (existingId === playerId) continue;
        const p = this.blochat.players[existingId];
        const existingTag = { content: [{ str: `[${p.session_id}] `, style: { color: "#aaaaaa" } }, { str: p.name }] };
        api.setOtherEntitySetting(playerId, existingId, "nameTagInfo", existingTag);
    }
    tell(playerId, `Welcome! Your ID is ${sessionId}. Use /chathelp for a list of commands.`);
}

function onPlayerLeave_blochat(playerId) {
    const p = this.blochat.players[playerId];
    if (!p) return;
    p.channels.forEach(cid => {
        if (!this.blochat.chats[cid]) return;
        if (cid === "Global") { this.blochat.chats[cid].members = this.blochat.chats[cid].members.filter(id => id !== playerId); }
        else {
            delete this.blochat.chats[cid].members[playerId];
            if (Object.keys(this.blochat.chats[cid].members).length === 0) { delete this.blochat.chats[cid]; }
            else { updateChannelUiForAllMembers(cid); }
        }
    });
    const releasedId = p.session_id;
    this.blochat.usedSessionIds.delete(releasedId);
    if (releasedId < this.blochat.nextAvailableId) { this.blochat.nextAvailableId = releasedId; }
    delete this.blochat.players[playerId];
}

function onPlayerChat_blochat(playerId, chatMessage, channelName) {
    const channel = this.blochat.chats[channelName];
    if (!channel || (channelName !== "Global" && !channel.members[playerId])) {
        if (channelName === "Global" && !channel.members.includes(playerId)) { }
        else { error(playerId, `You are not in channel #${channelName}.`); return true; }
    }
    const senderData = this.blochat.players[playerId];
    if (!senderData) return true;

    if (channelName === "Global") {
        const styledMessage = [{ str: `[Global] `, style: { color: "#cccccc" } }, { str: `[${senderData.session_id}] `, style: { color: "#aaaaaa" } }, { str: `${senderData.name}: `, style: { color: "#ffffff" } }, { str: chatMessage }];
        for (const memberId of channel.members) { api.sendMessage(memberId, styledMessage); }
    } else {
        const senderColor = channel.members[playerId].color || '#FFFFFF';
        const messageLine = {
            timestamp: Date.now(),
            line: [{ str: `[${senderData.session_id}] `, style: { color: senderColor, fontSize: "0.8em" } }, { str: `${senderData.name}: `, style: { color: senderColor, fontWeight: "bold", fontSize: "0.8em" } }, { str: chatMessage, style: { color: "#FFFFFF", fontSize: "0.8em" } }]
        };
        channel.history.push(messageLine);
        if (channel.history.length > this.blochat.MAX_CHAT_HISTORY) channel.history.shift();
        updateChannelUiForAllMembers(channelName);
    }
    return false;
}