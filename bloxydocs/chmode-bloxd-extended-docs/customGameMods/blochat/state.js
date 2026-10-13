/**
 * state.js - State Management & Constants for bloChat
 *
 * This file populates the `this.game.blochat` object with all necessary state
 * variables and constants.
 */

this.game.blochat.players = {};
this.game.blochat.chats = { "Global": { members: [] } };
this.game.blochat.usedSessionIds = new Set();
this.game.blochat.nextAvailableId = 0;
this.game.blochat.tickCounter = 0;
this.game.blochat.MAX_SESSION_IDS = 101;
this.game.blochat.MAX_PRIVATE_CHATS = 1; // Total channels = 4 (3 private + Global)
this.game.blochat.MAX_CHAT_HISTORY = 6;
this.game.blochat.PASTEL_COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFC8A2', '#D4A5A5', '#A2D4A5', '#A5A2D4'];
this.game.blochat.leaderboardColumns = {
    sessionId: { displayName: "ID", sortPriority: 2 },
    name: { displayName: "Name", sortPriority: 1 },
    pfp: { sortPriority: 0 }
};
this.game.blochat.TIMESTAMP_UPDATE_INTERVAL_TICKS = 100; // 20 ticks/sec * 5 seconds = 100