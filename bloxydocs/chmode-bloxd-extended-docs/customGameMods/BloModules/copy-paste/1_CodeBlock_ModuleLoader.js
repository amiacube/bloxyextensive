let moduleLoaderCode = `class m{constructor(){const t=this.constructor;if(globalThis.m instanceof t)return globalThis.m;globalThis.m=this,this.i=1,this.l=35-api.getStandardChestFreeSlotCount(globalThis.w.MODULE_CHEST_COORDS)}n(){try{const c=api.getStandardChestItemSlot(globalThis.w.MODULE_CHEST_COORDS,this.i).attributes.customDisplayName;if(eval(c),this.i>=this.l)return delete this.i,this.a=!0,void console.log("m: All modules have been initialized successfully");this.i+=1}catch(t){console.log("m: Failed to load module from slot "+this.i+". Error:",t)}}static{new this}}`

/*
 TODO1: Set these coordinates to the chest where you want to load the ModuleLoader
*/

let moduleChestCoords = [118,0,-87]

// There's need to modify anything else in the api call.
api.setStandardChestItemSlot(moduleChestCoords, 0, "temp", 1, myId, {customDisplayName: moduleLoaderCode})
