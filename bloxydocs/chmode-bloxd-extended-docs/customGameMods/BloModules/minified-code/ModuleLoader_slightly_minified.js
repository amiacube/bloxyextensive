/* This module automatically attaches itself to globalThis ("this" in WorldCode) */
class m {
    constructor() {
        /* Implement Singleton to ensure only one instance exists.*/
        const c = this.constructor;
        if (globalThis.m instanceof c) {
            return globalThis.m;
        }
        globalThis.m = this;

        // Skip index 0 (reserved for ModuleLoader) and start processing at index 1.
        this.i = 1;

        // Calculate the index of the last item in the chest (36 slots, 0-35).
        this.l = 35 - api.getStandardChestFreeSlotCount(globalThis.w.MODULE_CHEST_COORDS);
    }

    n() {
        try {
            /* Evaluate the code stored in the item's customDisplayName to load the module.
               Could be attributes.customAttributes - it's entirely up to you. */
            const c = api.getStandardChestItemSlot(globalThis.w.MODULE_CHEST_COORDS, this.i).attributes.customDisplayName;
            eval(c);

            /* If the last module slot has been processed successfully, mark all modules as initialized.
            initNextModule() will no longer be called. Wait 2 more ticks before declaring all modules as initialised*/
            if (this.i >= this.l) {
                delete this.i;
                this.a = true;
                console.log("m: All modules have been initialized successfully");
                return;
            }

            /* If eval succeeds, move to the next slot; otherwise, 
               this increment won't run due to catch(e) and it'll try this slot again next tick. */
            this.i += 1;
        } catch (e) {
            console.log("m: Failed to load module from slot " + this.i + ". Error:", e);
        }
    }

    // Static block to auto-instantiate the singleton.
    static {
        new this();
    }
}