class Loader {
    constructor() {
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        }
        globalThis[Class.name] = this;

        this.masterChestCoords = [-52, 1, -64];
        this.chunkSize = 1976;
        this.counter = 0;

        this.authorizedUsers = [
            "AdminPlayer1",
            "ServerOperator",
            "YourPlayerID"
        ];
    }

    // playerCommand = (playerId, command) => {
    //     if (!this.authorizedUsers.includes(playerId)) {
    //         return true;
    //     }

    //     const args = command.split(' ');
    //     const cmd = args[0].toLowerCase();

    //     switch (cmd) {
    //         case 'save':
    //             let sourceCoords;

    //             if (args.length === 1) {
    //                 const targetInfo = api.getPlayerTargetInfo(playerId);
    //                 if (!targetInfo || !targetInfo.position) {
    //                     api.log("❌ ERROR: You are not looking at a code block. Usage: /save [or] /save x,y,z");
    //                     return true;
    //                 }
    //                 sourceCoords = targetInfo.position;

    //             } else if (args.length === 2) {
    //                 const coordsArr = args[1].split(',').map(n => parseInt(n, 10));
    //                 if (coordsArr.length !== 3 || coordsArr.some(isNaN)) {
    //                     api.log("Invalid coordinates. Usage: /save [or] /save x,y,z");
    //                     return true;
    //                 }
    //                 sourceCoords = coordsArr;
    //             } else {
    //                 api.log("Invalid usage. Usage: /save [or] /save x,y,z");
    //                 return true;
    //             }

    //             api.log(`Attempting to save code from source block at [${sourceCoords.join(', ')}]...`);
    //             const codeToSave = api.getBlockData(...sourceCoords).persisted.shared.text;

    //             if (typeof codeToSave !== 'string' || codeToSave.length === 0) {
    //                 api.log(`❌ ERROR: No code found at source block [${sourceCoords.join(', ')}].`);
    //                 return true;
    //             }

    //             this.saveCodeToChest(codeToSave, this.masterChestCoords, playerId);
    //             return true;

    //         case 'load':
    //             this.loadAndExecuteCodeFromChest(this.masterChestCoords);
    //             return true;
    //     }

    //     return false;
    // }

    saveCodeToChest = (rawCodeString, position, playerId) => {
        this.counter = 0;
        api.log(`Total code length to save: ${rawCodeString.length}`);

        const finalChunks = [];
        let cursor = 0;

        while (cursor < rawCodeString.length) {
            const searchSpace = rawCodeString.substring(cursor, cursor + this.chunkSize);
            let low = 0;
            let high = searchSpace.length;
            let bestLength = 0;

            while (low <= high) {
                this.counter++;
                const mid = Math.floor((low + high) / 2);
                if (mid === 0) {
                    low = mid + 1;
                    continue;
                }
                const potentialChunk = searchSpace.substring(0, mid);
                const attributesToTest = { customDescription: potentialChunk };
                const finalPayloadString = JSON.stringify(attributesToTest);

                if (finalPayloadString.length <= this.chunkSize) {
                    bestLength = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            if (bestLength === 0) {
                api.log("❌ CRITICAL ERROR: Could not fit even a single character into a chunk. Aborting.");
                return;
            }

            const finalChunk = searchSpace.substring(0, bestLength);
            finalChunks.push(finalChunk);
            cursor += finalChunk.length;
        }

        const totalChunks = finalChunks.length;
        api.log(`Code was dynamically split into ${totalChunks} compliant chunks.`);
        api.log(`Binary search performance: ${this.counter} total checks.`);

        for (let slotIndex = 0; slotIndex < totalChunks; slotIndex++) {
            const chunkToSave = finalChunks[slotIndex];
            const attributes = { customDescription: chunkToSave };
            const remainingChunks = totalChunks - slotIndex;
            const itemName = (slotIndex === totalChunks - 1) ? "Ice" : "Net";
            api.setStandardChestItemSlot(position, slotIndex, itemName, remainingChunks, playerId, attributes);
        }

        api.log(`✅ Saved ${totalChunks} chunks of code to the chest at [${position.join(', ')}].`);
    }

    loadAndExecuteCodeFromChest = (position) => {
        api.log(`--- Starting Load & Execute Process from [${position.join(', ')}] ---`);
        const firstSlotItem = api.getStandardChestItemSlot(position, 0);

        if (!firstSlotItem || firstSlotItem.amount < 1) {
            api.log('❌ CRITICAL ERROR: Chest is empty or slot 0 metadata is invalid. Cannot load code.');
            return;
        }
        const totalChunksToRead = firstSlotItem.amount;
        api.log(`Metadata found: Expecting to read ${totalChunksToRead} total chunks.`);

        const rawCodeChunks = [];
        for (let i = 0; i < totalChunksToRead; i++) {
            const item = api.getStandardChestItemSlot(position, i);
            if (!item || !item.attributes || typeof item.attributes.customDescription !== 'string') {
                api.log(`❌ CRITICAL ERROR: Missing or corrupted data in slot ${i}. Aborting.`);
                return;
            }
            rawCodeChunks.push(item.attributes.customDescription);
        }

        if (rawCodeChunks.length !== totalChunksToRead) {
            api.log('❌ CRITICAL ERROR: Data integrity check FAILED. The number of loaded chunks does not match metadata.');
            return;
        }
        api.log(`✅ Data integrity check passed: Successfully loaded all ${totalChunksToRead} chunks.`);

        const reconstructedRawCode = rawCodeChunks.join('');

        try {
            api.log('--- Executing Final Code ---');
            const result = eval(reconstructedRawCode);
            console.log("Execution successful!", result);
            api.log(`Execution successful! Result type: ${typeof result}`);
        } catch (error) {
            console.error("Execution failed:", error);
            api.log(`Execution failed: ${error.toString()}`);
        }
    }

    /* Don't delete this static block. It automatically initializes your module
       when the script is loaded. */
    static {
        new this();
    }
}