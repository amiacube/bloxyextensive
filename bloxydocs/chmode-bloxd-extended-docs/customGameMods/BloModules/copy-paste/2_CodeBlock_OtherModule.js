let module = 
`

/* Paste your other module here */
/* This is an example with a non-minified Chat module */

class Chat {
    constructor() {
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        } globalThis[Class.name] = this;
    }
    onPlayerJoin = (playerId) => {
        api.log("Successfully called Chat's onplayerjoin")
    };

    sayHi = () => {
        api.log("Hi from Chat");
    }

    static {
        new this();
    }
}
`

/* 
 TODO1: Set these coordinates to the chest where you want to load the Module.
 TODO2: Set the slotIndex to the slot where you want to place the Module. 
 Note: Slot indices must be sequential and start from 0. 
 For example, if you have 5 modules (including the ModuleLoader at slot 0), 
 the slots should be filled one by one: 0 (ModuleLoader), 1, 2, 3, 4.
 Only place modules in the chest; do not put other items in the chest. 
 Non-sequential or extra items in the chest will just break the logic and will cause errors.

 If you get "Argument too large" error - minify your code. ~1976 characters max allowed.
*/

let moduleChestCoords = [118, 0, -87]
let slotIndex = 1;


// There's need to modify anything else in the api call.
api.setStandardChestItemSlot(moduleChestCoords, slotIndex, "temp", 1, myId, {customDisplayName: module})
