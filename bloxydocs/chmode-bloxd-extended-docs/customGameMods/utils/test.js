const chestPosition = [-52, 1, -64];
const sourceCodeBlockPosition = [-54, 1, -66];
const chunkSize = 1976;
this.counter = 0;
function saveCodeToChest(rawCodeString, position) {
    api.log(`--- Starting High-Performance Save Process ---`);
    api.log(`Total code length to save: ${rawCodeString.length}`);
    const finalChunks = [];
    let cursor = 0;
    while (cursor < rawCodeString.length) {
        const searchSpace = rawCodeString.substring(cursor, cursor + chunkSize);
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
            if (finalPayloadString.length <= chunkSize) {
                bestLength = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        if (bestLength === 0) {
            api.log("❌ CRITICAL ERROR: Could not fit even a single character into a chunk. The chunkSize limit may be too small. Aborting.");
            return;
        }
        const finalChunk = searchSpace.substring(0, bestLength);
        finalChunks.push(finalChunk);
        cursor += finalChunk.length;
    }
    const totalChunks = finalChunks.length;
    api.log(`Code was dynamically split into ${totalChunks} compliant chunks.`);
    for (let slotIndex = 0; slotIndex < totalChunks; slotIndex++) {
        const chunkToSave = finalChunks[slotIndex];
        const attributes = { customDescription: chunkToSave };
        const remainingChunks = totalChunks - slotIndex;
        api.setStandardChestItemSlot(position, slotIndex, "Net", remainingChunks, myId, attributes);
    }
    api.log(`✅ Saved ${totalChunks} chunks of code to the chest at [${position.join(', ')}].`);
}
function loadAndExecuteCodeFromChest(position) {
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
    if (rawCodeChunks.length === totalChunksToRead) {
        api.log(`✅ Data integrity check passed: Successfully loaded all ${totalChunksToRead} chunks.`);
    } else {
        api.log('❌ CRITICAL ERROR: Data integrity check FAILED. The number of loaded chunks does not match metadata.');
        api.log(`Expected: ${totalChunksToRead}, Loaded: ${rawCodeChunks.length}`);
        api.log('Aborting execution.');
        return;
    }
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

let codeToSave = api.getBlockData(...sourceCodeBlockPosition).persisted.shared.text;
saveCodeToChest(codeToSave, chestPosition);
// loadAndExecuteCodeFromChest(chestPosition);