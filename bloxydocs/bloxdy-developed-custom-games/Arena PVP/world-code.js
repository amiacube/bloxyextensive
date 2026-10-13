// world code - main orchestrator for all codeblocks and game systems
// note: this uses the exe function to load codeblocks from command blocks in the world

// set player limits - soft max is for matchmaking, hard max is absolute limit
api.setMaxPlayers(13, 15)

// exe function - executes code stored in command blocks
exe=(x,y,z)=>eval((api.getBlockData(x,y,z)?.persisted?.shared?.text??""))

// tick timer system - handles all setTickTimeout and setTickInterval calls
// this is a custom implementation bc the default one can be unreliable sometimes. created by @_frostycaveman on discrord (huge shoutout to him)
TTimers={};{const k=c=>api.broadcastMessage(c,{color:"#ff9d87"}),s=TTimers;let m=1,l=0,f=0,T=0,o=1/0,a;setTickTimeout=(c,i=0)=>{const e=m++,t=l+i;if(s[e]=[c,t,T,0],T?s[T][3]=e:f=e,T=e,t<o&&(o=t),a=!0,!i){try{c()}catch(r){k("TTI: "+r)}clearTickTimeout(e)}return e},clearTickInterval=clearTickTimeout=c=>{const i=s[c];if(i){const e=i[2],t=i[3];e?s[e][3]=t:f=t,t?s[t][2]=e:T=e,delete s[c]}},setTickInterval=(c,i)=>{const e=setTickTimeout(c,i||=1);return s[e][4]=i,e},processTickTimers=(_c,i)=>{if(i||++l>=o){a=!1;let e=1/0,t=f;for(;t;){const r=s[t];if(r[1]<=l){try{r[0]()}catch(n){k("TT: "+n)}if(r[4]){const n=l+r[4];r[1]=n,n<e&&(e=n)}else clearTickTimeout(t)}else r[1]<e&&(e=r[1]);t=r[3]}o=e,a&&processTickTimers(1,!0)}}}

// global game state tracker
gameState={initialized:false}

// bloxdhub link helpers - used by codeblock 3 for chat and sidebar
getBloxdhubLink = function() {
return [
{str: "Reminder: Join ", style: {color: "white", fontWeight: "bold", fontSize: "1rem"}},
{str: "https://bloxdhub.com", style: {color: "cyan", fontWeight: "bold", fontSize: "1rem"}},
{str: " — the unofficial social hub for Bloxd players!", style: {color: "white", fontWeight: "bold", fontSize: "1rem"}}
];
};

getBloxdhubSidebarLink = function() {
return "\u{1F310} https://bloxdhub.com";
};

// expose to window if available (for cross-codeblock access)
if (typeof window !== 'undefined') {
window.getBloxdhubLink = getBloxdhubLink;
window.getBloxdhubSidebarLink = getBloxdhubSidebarLink;
}

// handles player joining - loads codeblocks on first join and sets spawn position
onPlayerJoin=(pId)=>{
api.setClientOption(pId,"canSeeNametagsThroughWalls",false)
api.setClientOption(pId,"secsToRespawn",0) // instant respawn - no cooldown
api.setPosition(pId, 92.5, 83, 57.5) // spawn in lobby
api.setCameraDirection(pId, [1, 0, 0]) // face player east
api.setItemSlot(pId, 45, "Arrow", 999) // infinite arrows for bows
if(!gameState.initialized){
// first player - load all codeblocks from command blocks
gameState.initialized=true
api.getBlock(89,79,56) // preload chunk
setTickTimeout(()=>{
exe(89,79,56) // codeblock 1 - zone system and player logic
},5)
api.getBlock(90,79,56)
setTickTimeout(()=>{
exe(90,79,56) // codeblock 2 - practice dummies
},5)
api.getBlock(91,79,56)
setTickTimeout(()=>{
exe(91,79,56) // codeblock 3 - kill tracking and ui
},5)
api.getBlock(92,79,56)
setTickTimeout(()=>{
exe(92,79,56) // codeblock 4 - all floating items
},5)
// initialize ui after codeblocks are loaded
setTickTimeout(()=>{
if(typeof handlePlayerJoinUI==="function"){
handlePlayerJoinUI(pId)
}
},10)
} else {
// game already running - just call ui handler
if(typeof handlePlayerJoinUI==="function"){
handlePlayerJoinUI(pId)
}
}
// call codeblock 1 join handler for zone system
if(typeof handlePlayerJoin==="function"){
handlePlayerJoin(pId)
}
// call codeblock 4 join handler for floating items
if(typeof handlePlayerJoinItems==="function"){
handlePlayerJoinItems(pId)
}
}

// handles respawn - sends player back to lobby
onRespawnRequest=(pId)=>{
if(typeof handleRespawn==="function"){
handleRespawn(pId)
}
api.setCameraDirection(pId, [1, 0, 0])
return [92.5, 83, 57.5]
}

// main tick loop - runs all codeblock tick functions
tick=()=>{
    processTickTimers()
    // only run codeblock ticks if game is initialized
    if(!gameState.initialized) return
    
    if(typeof tickCodeBlock1==="function"){
        tickCodeBlock1() // zone system and player blocks
    }
    if(typeof tickCodeBlock2==="function"){
        tickCodeBlock2() // practice dummies
    }
    if(typeof tickCodeBlock3==="function"){
        tickCodeBlock3() // ui updates
    }
    if(typeof tickCodeBlock4==="function"){
        tickCodeBlock4() // floating items
    }
}

// handles kill events - updates kill tracking
onPlayerKilledOtherPlayer=(attackerId,victimId)=>{
if(typeof handlePlayerKill==="function"){
handlePlayerKill(attackerId,victimId)
}
}

// handles chat - for armor selection system (old design)
onPlayerChat=(pId,msg)=>{
// owner badge hehe
const playerName=api.getEntityName(pId)
if(playerName==="Crownix"&&!msg.startsWith("!")){
for(const id of api.getPlayerIds()){
const messageParts=[
{str:"[",style:{color:"#FFD700",fontWeight:"bold"}},
{str:"Owner",style:{color:"#FFD700",fontWeight:"bold"}},
{str:"] ",style:{color:"#FFD700",fontWeight:"bold"}},
{icon:"crown",style:{color:"#FFD700",fontSize:"0.875rem"}},
{str:" "+playerName+": "+msg,style:{color:"white"}}
]
api.sendMessage(id,messageParts)
}
return false
}
if(typeof handleArmorChat==="function"){
const result=handleArmorChat(pId,msg)
if(result===false)return false
}
}

// handles damage to mobs - tracks attacker for practice dummies
onPlayerDamagingMob=(playerId,mobId)=>{
if(typeof handleDummyDamage==="function"){
handleDummyDamage(playerId,mobId)
}
}

// handles player damaging another player - shows damage numbers
onPlayerDamagingOtherPlayer=(attackerId,victimId,damage)=>{
// show damage number to the attacker
if(api.checkValid(attackerId)){
api.sendFlyingMiddleMessage(attackerId,[
{str:`-${Math.round(damage)}`,style:{color:"#FF0000",fontSize:"2rem",fontWeight:"bold"}}
],100)
}
}

// auto-despawn dropped items to prevent clutter
onPlayerDropItem=(playerId,x,y,z,itemName,itemAmount,fromIdx)=>{
// allow dropping but despawn the item immediately
return "allowButNoDroppedItemCreated"
}

// prevents players from moving arrows out of slot 45 - keeps infinite arrows locked
onPlayerMoveInvenItem=(pId,fromIdx)=>{
if(fromIdx === 45){
return "preventChange"
}
}

// prevent natural mob spawning - but allow our custom wildcat labels and draugr huntress dummies
// using a whitelist approach for performance
const allowedMobTypes = new Set(["Wildcat", "Draugr Huntress"])
onWorldAttemptSpawnMob=(mobType)=>{
    if(allowedMobTypes.has(mobType)) return
    return "preventSpawn"
}
