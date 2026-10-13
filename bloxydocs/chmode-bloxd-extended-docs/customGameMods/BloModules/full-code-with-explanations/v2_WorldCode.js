this.WorldState = {};
this.WorldState.MASTER_CHEST_COORDS = [-52, 1, -64];
this.WorldState.CODE_COORDS = [-54, 1, -66];

// This function is called for a player only after all modules are fully initialized.
onPlayerJoinReady = (playerId) => {
    // You can use modules here.

};


tick = (ms) => {
    // The initialization sequence runs every tick until the world is fully initialized.
    if (!this.WorldState.isFullyInitialized) return initializeWorld();

    // Can safely use all modules here after initialization is complete.
    // this.Chat.sayHi()
};

onPlayerLeave = (playerId) => {
    // Handle player leave events.
};


onPlayerJoin = (playerId) => {
    // If all modules are ready, process the player join immediately.
    if (this.ModuleLoader?.areAllModulesInitialized) {
        return onPlayerJoinReady(playerId);
    }

    /* Otherwise, Queue the player until all modules are initialized.
       Since more players may join before initialization
       completes (e.g. right after a restart), we keep them
       in the queue to ensure onPlayerJoinReady() runs later. */
    (this.WorldState.playerJoinQueue ??= new Set()).add(playerId);

    // Flag that the ModuleLoader itself needs to be initialized from the chest.
    this.WorldState.isModuleLoaderInitPending ??= true;

    /* Try to get the module chest block.
       This call won't return a block yet since the
       chunk is usually still unloaded, but it may
       become accessible on the very next tick. */
    api.getBlock(...this.WorldState.MASTER_CHEST_COORDS);
};


initializeWorld = () => {
    /* Step 1: Initialize all modules from the chest. */
    if (!this.ModuleLoader?.areAllModulesInitialized) {
        /* Tick 1: Ensure the module chest block is loaded. */
        if (!this.WorldState.modulesChestBlock || this.WorldState.modulesChestBlock === "Unloaded") {
            this.WorldState.modulesChestBlock = api.getBlock(...this.WorldState.MASTER_CHEST_COORDS);
            return;
        }

        /* Tick 2: Initialize the ModuleLoader class itself from slot 0. */
        if (this.WorldState.isModuleLoaderInitPending) {
            this.WorldState.masterChestData = api.getStandardChestItems(this.WorldState.MASTER_CHEST_COORDS)
            eval(this.WorldState.masterChestData[0].attributes.customDisplayName);
            delete this.WorldState.isModuleLoaderInitPending;
            return;
        }

        /* Tick 3 ... : Sequentially initialize modules one by one per tick */
        this.ModuleLoader?.loadLoader();
        return;
    }

    /* Step 2: Process all queued players who joined during or before module initialization. 
       1 queued player per tick. */
    if (this.ModuleLoader?.areAllModulesInitialized && this.WorldState.playerJoinQueue?.size) {
        const playerId = this.WorldState.playerJoinQueue.values().next().value;

        /* Ensure the player is still in the game before processing. */
        if (api.playerIsInGame(playerId)) {
            onPlayerJoinReady(playerId);
        }
        /* Player is initialised, removing from the queue */
        this.WorldState.playerJoinQueue.delete(playerId);

        /* If the queue is empty, the world is fully initialized.
           We delete the queue object since we won't need it anymore */
        if (!this.WorldState.playerJoinQueue.size) {
            delete this.WorldState.playerJoinQueue;
            this.WorldState.isFullyInitialized = true;
        }
    }
};