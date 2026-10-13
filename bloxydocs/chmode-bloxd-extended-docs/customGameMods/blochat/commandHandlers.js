/**
 * commandHandlers.js - Logic for Player Commands (bloChat System)
 */

function bloChatCmdNew(playerId, args, myData) {
    if (args.length < 2) return error(playerId, "Usage: /chatnew <id>");
    if (myData.channels.length >= (this.blochat.MAX_PRIVATE_CHATS + 1)) return error(playerId, `You are in the max number of chats (${this.blochat.MAX_PRIVATE_CHATS}).`);
    const targetSid = parseInt(args[1], 10);
    if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
    const targetId = getPlayerIdBySessionId(targetSid);
    if (!targetId || targetId === playerId) return error(playerId, `Player with ID ${targetSid} not found or is yourself.`);
    const targetData = this.blochat.players[targetId];
    const newCid = generateChannelId();
    this.blochat.chats[newCid] = { owner: playerId, members: {}, history: [] };
    this.blochat.chats[newCid].members[playerId] = { color: this.blochat.PASTEL_COLORS[Math.floor(Math.random() * this.blochat.PASTEL_COLORS.length)] };
    myData.channels.push(newCid);
    myData.lastPrivateChannel = newCid;
    updatePlayerChannelsUI(playerId);
    updateChannelUiForAllMembers(newCid);
    if (targetData.invitation) tell(targetId, "Your previous invite was replaced.");
    targetData.invitation = { fromId: playerId, channelId: newCid };
    tell(playerId, `You created channel #${newCid} and invited ${getFormattedPlayerName(targetId)}.`);
    tell(targetId, `${getFormattedPlayerName(playerId)} invited you to a chat. Type /chataccept to join.`);
}

function bloChatCmdAdd(playerId, args, myData) {
    if (args.length < 2) return error(playerId, "Usage: /chatadd <id>");
    const cid = myData.lastPrivateChannel;
    if (!cid || !this.blochat.chats[cid] || !this.blochat.chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
    const targetSid = parseInt(args[1], 10);
    if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
    const targetId = getPlayerIdBySessionId(targetSid);
    if (!targetId || targetId === playerId) return error(playerId, `Player with ID ${targetSid} not found or is yourself.`);
    const targetData = this.blochat.players[targetId];
    if (targetData.channels.includes(cid)) return error(playerId, `${targetData.name} is already in that chat.`);
    if (targetData.invitation) tell(targetId, "Your previous invite was replaced.");
    targetData.invitation = { fromId: playerId, channelId: cid };
    const memberCount = Object.keys(this.blochat.chats[cid].members).length;
    tell(playerId, `You invited ${getFormattedPlayerName(targetId)} to #${cid}.`);
    tell(targetId, `${getFormattedPlayerName(playerId)} invited you to their chat (${memberCount} members). Type /chataccept to join.`);
}

function bloChatCmdAccept(playerId, args, myData) {
    if (!myData.invitation) return error(playerId, "You have no pending invitations.");
    if (myData.channels.length >= (this.blochat.MAX_PRIVATE_CHATS + 1)) return error(playerId, `You are in the max number of chats (${this.blochat.MAX_PRIVATE_CHATS}).`);
    const { channelId: cid } = myData.invitation;
    if (!this.blochat.chats[cid]) { myData.invitation = null; return error(playerId, `Chat #${cid} no longer exists.`); }
    const usedColors = Object.values(this.blochat.chats[cid].members).map(m => m.color);
    const availableColors = this.blochat.PASTEL_COLORS.filter(c => !usedColors.includes(c));
    const color = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : this.blochat.PASTEL_COLORS[Math.floor(Math.random() * this.blochat.PASTEL_COLORS.length)];
    this.blochat.chats[cid].members[playerId] = { color };
    myData.channels.push(cid);
    myData.lastPrivateChannel = cid;
    myData.invitation = null;
    updatePlayerChannelsUI(playerId);
    tell(playerId, `You joined #${cid}. Press TAB to switch to the channel chat!`);
    const joinMessage = { timestamp: Date.now(), line: [{ str: `- ${myData.name} joined -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
    this.blochat.chats[cid].history.push(joinMessage);
    if (this.blochat.chats[cid].history.length > this.blochat.MAX_CHAT_HISTORY) this.blochat.chats[cid].history.shift();
    updateChannelUiForAllMembers(cid);
}

function bloChatCmdKick(playerId, args, myData) {
    if (args.length < 2) return error(playerId, "Usage: /chatkick <id>");
    const cid = myData.lastPrivateChannel;
    if (!cid || !this.blochat.chats[cid] || !this.blochat.chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
    if (this.blochat.chats[cid].owner !== playerId) return error(playerId, "You are not the owner of this chat.");
    const targetSid = parseInt(args[1], 10);
    if (isNaN(targetSid)) return error(playerId, "Invalid session ID.");
    const targetId = getPlayerIdBySessionId(targetSid);
    if (!targetId || !this.blochat.chats[cid].members[targetId]) return error(playerId, `Player with ID ${targetSid} is not in this chat.`);
    if (targetId === playerId) return error(playerId, "You cannot kick yourself.");
    const targetData = this.blochat.players[targetId];
    delete this.blochat.chats[cid].members[targetId];
    targetData.channels = targetData.channels.filter(c => c !== cid);
    if (targetData.lastPrivateChannel === cid) targetData.lastPrivateChannel = null;
    updatePlayerChannelsUI(targetId);
    api.setClientOption(targetId, 'middleTextLower', '');
    tell(targetId, `You were kicked from chat #${cid} by the owner.`);
    const kickMessage = { timestamp: Date.now(), line: [{ str: `- ${targetData.name} was kicked -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
    this.blochat.chats[cid].history.push(kickMessage);
    if (this.blochat.chats[cid].history.length > this.blochat.MAX_CHAT_HISTORY) this.blochat.chats[cid].history.shift();
    updateChannelUiForAllMembers(cid);
}

function bloChatCmdLeave(playerId, args, myData) {
    const cid = myData.lastPrivateChannel;
    if (!cid || !this.blochat.chats[cid] || !this.blochat.chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
    const channel = this.blochat.chats[cid];
    const leaveMessage = { timestamp: Date.now(), line: [{ str: `- ${myData.name} left -`, style: { color: "#bbbbbb", fontStyle: "italic", fontSize: "0.8em" } }] };
    delete channel.members[playerId];
    myData.channels = myData.channels.filter(c => c !== cid);
    myData.lastPrivateChannel = null;
    updatePlayerChannelsUI(playerId);
    api.setClientOption(playerId, 'middleTextLower', '');
    tell(playerId, `You left chat #${cid}.`);
    if (Object.keys(channel.members).length === 0) { delete this.blochat.chats[cid]; }
    else { channel.history.push(leaveMessage); if (channel.history.length > this.blochat.MAX_CHAT_HISTORY) channel.history.shift(); updateChannelUiForAllMembers(cid); }
}

function bloChatCmdMembers(playerId, args, myData) {
    const cid = myData.lastPrivateChannel;
    if (!cid || !this.blochat.chats[cid] || !this.blochat.chats[cid].members[playerId]) return error(playerId, "You are not in a private chat.");
    tell(playerId, `--- Members of #${cid} ---`);
    for (const memberId in this.blochat.chats[cid].members) { const memberData = this.blochat.players[memberId]; if (memberData) tell(playerId, ` - [${memberData.session_id}] ${memberData.name}`); }
    tell(playerId, '--------------------');
}

function bloChatCmdInfo(playerId) { /* ... no state access needed ... */ }
function bloChatCmdHelp(playerId) { /* ... no state access needed ... */ }

const bloChatCommandHandlers = { "chatnew": bloChatCmdNew, "chatadd": bloChatCmdAdd, "chataccept": bloChatCmdAccept, "chatkick": bloChatCmdKick, "chatleave": bloChatCmdLeave, "chatmembers": bloChatCmdMembers, "chatinfo": bloChatCmdInfo, "chathelp": bloChatCmdHelp };

function playerCommandBloChatHandler(playerId, command) {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    const myData = this.blochat.players[playerId];
    if (!myData) return false;
    const handler = bloChatCommandHandlers[cmd];
    if (handler) { handler(playerId, args, myData); return true; }
    return false;
}