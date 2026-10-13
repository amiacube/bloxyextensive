class ModuleLoader {
    constructor() {
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        }
        globalThis[Class.name] = this;

        this.masterChestCoords = [-52, 1, -64]
        this.masterChestData = api.getStandardChestItems(this.masterChestCoords)
        this.currentModuleSlotIndex = 1;
    }

    loadLoader() {
        try {
            if (!this.masterChestData) this.masterChestData = api.getStandardChestItems(this.masterChestCoords)
            const chestItem = this.masterChestData[this.currentModuleSlotIndex]
            if (!chestItem) return; // meaning that all slots were filled
            if (chestItem.name === "Ice") {
                // it's the first element in the list
            } else if (chestItem.name === "Net") {
                // it's a middle elemnt or finished
            }
            eval(chestItem.attributes.customDescription);
            console.log("ModuleLoader: Successfully loaded module from slot " + this.currentModuleSlotIndex + ".");

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