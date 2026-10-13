this.w = {};
// Constant coordinates for the chest containing the modules.
// Slot 0 is reserved for the ModuleLoader.
this.w.MODULE_CHEST_COORDS = [118, 0, -87];


// This function is called for a player only after all modules are fully initialized.
onPlayerJoinReady = (playerId) => {
    // You can use modules here.

};


tick = (ms) => {
    // The initialization sequence runs every tick until the world is fully initialized.
    if (!this.w.f) return i();

    // Can safely use all modules here after initialization is complete.
};


onPlayerJoin = (playerId) => {
    // If all modules are ready, process the player join immediately.
    if (this.m?.a) {
        return onPlayerJoinReady(playerId);
    }

    /* Otherwise, Queue the player until all modules are initialized.
       Since more players may join before initialization
       completes (e.g. right after a restart), we keep them
       in the queue to ensure onPlayerJoinReady() runs later. */
    (this.w.q ??= new Set()).add(playerId);

    // Flag that the ModuleLoader itself needs to be initialized from the chest.
    this.w.p ??= true;

    /* Try to get the module chest block.
       This call won't return a block yet since the
       chunk is usually still unloaded, but it may
       become accessible on the very next tick. */
    api.getBlock(...this.w.MODULE_CHEST_COORDS);
};


i = () => {
    /* Step 1: Initialize all modules from the chest. */
    if (!this.m?.a) {
        /* Tick 1: Ensure the module chest block is loaded. */
        if (!this.w.c || this.w.c === "Unloaded") {
            this.w.c = api.getBlock(...this.w.MODULE_CHEST_COORDS);
            return;
        }

        /* Tick 2: Initialize the ModuleLoader class itself from slot 0. */
        if (this.w.p) {
            eval(api.getStandardChestItemSlot(this.w.MODULE_CHEST_COORDS, 0).attributes.customDisplayName);
            delete this.w.p;
            return;
        }

        /* Tick 3 ... : Sequentially initialize modules one by one per tick */
        this.m?.n();
        return;
    }

    /* Step 2: Process all queued players who joined during or before module initialization. 
       1 queued player per tick. */
    if (this.m?.a && this.w.q?.size) {
        const playerId = this.w.q.values().next().value;

        /* Ensure the player is still in the game before processing. */
        if (api.playerIsInGame(playerId)) {
            onPlayerJoinReady(playerId);
        }
        /* Player is initialised, removing from the queue */
        this.w.q.delete(playerId);

        /* If the queue is empty, the world is fully initialized.
           We delete the queue object since we won't need it anymore */
        if (!this.w.q.size) {
            delete this.w.q;
            this.w.f = true;
        }
    }
};