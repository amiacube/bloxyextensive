this.w = {};


/* 
    TODO1: Set these coordinates to the chest where you want to load the Module.
*/
this.w.MODULE_CHEST_COORDS = [8, 0, -18];


onPlayerJoinReady = (playerId) => {
    // this.Chat.onPlayerJoin(playerId)
    // this.OtherModule.onPlayerJoin(playerId)
};


tick = (ms) => {
    if (!this.w.f) return i();
    // Can safely use all modules here after initialization is complete.
};

onPlayerJoin=t=>{if(this.m?.a)return onPlayerJoinReady(t);(this.w.q??=new Set).add(t),this.w.p??=!0,api.getBlock(...this.w.MODULE_CHEST_COORDS)},i=()=>{if(!this.m?.a)return this.w.c&&"Unloaded"!==this.w.c?this.w.p?(eval(api.getStandardChestItemSlot(this.w.MODULE_CHEST_COORDS,0).attributes.customDisplayName),void delete this.w.p):void this.m?.n():void(this.w.c=api.getBlock(...this.w.MODULE_CHEST_COORDS));if(this.m?.a&&this.w.q?.size){const t=this.w.q.values().next().value;api.playerIsInGame(t)&&onPlayerJoinReady(t),this.w.q.delete(t),this.w.q.size||(delete this.w.q,this.w.f=!0)}};