/* This module automatically attaches itself to globalThis ("this" in WorldCode) */
class ModuleLoader {
    constructor() {
        /* Implement Singleton to ensure only one instance exists.*/
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        }
        globalThis[Class.name] = this;

        // Skip index 0 (reserved for ModuleLoader) and start processing at index 1.
        this.currentModuleSlotIndex = 1;

        // Calculate the index of the last item in the chest (36 slots, 0-35).
        this.lastModuleSlotIndex = 35 - api.getStandardChestFreeSlotCount(globalThis.WorldState.MODULE_CHEST_COORDS);

        console.log("ModuleLoader successfully initialised.");
    }

    initNextModule() {
        try {
            /* Evaluate the code stored in the item's customDisplayName to load the module.
               Could be attributes.customAttributes - it's entirely up to you. */
            const code = api.getStandardChestItemSlot(globalThis.WorldState.MODULE_CHEST_COORDS, this.currentModuleSlotIndex).attributes.customDisplayName;
            eval(code);
            console.log("ModuleLoader: Successfully loaded module from slot " + this.currentModuleSlotIndex + ".");

            /* If the last module slot has been processed successfully, mark all modules as initialized.
                initNextModule() will no longer be called. */
            if (this.currentModuleSlotIndex >= this.lastModuleSlotIndex) {
                delete this.currentModuleSlotIndex;
                this.areAllModulesInitialized = true;
                console.log("ModuleLoader: All modules have been initialized successfully");
                return;
            }

            /* If eval succeeds, move to the next slot; otherwise, 
                this increment won't run due to catch(e) and it'll try this slot again next tick. */
            this.currentModuleSlotIndex += 1;
        } catch (e) {
            console.log("ModuleLoader: Failed to load module from slot " + this.currentModuleSlotIndex + ". Error:", e);
        }
    }

    // Static block to auto-instantiate the singleton.
    static {
        new this();
    }
}