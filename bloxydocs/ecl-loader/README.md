# ECL Loader

This module loader hides your world code from other people, allows you to create modular codes that can be used by other modules and gives you infinite space in your world code.

## Installation
Copy all following code into world code. We advise you not to have any other codes in world code when doing this. You can put your other codes in world code instead, since this code has about 5000 characters and can use many callbacks, depending on what you load with it.

```js


// =====================
// CONFIG
// =====================
ECL_POSITIONS = [[-2, 1, 0], [0, 1, 0]]
ACTIVE_ECL_CALLBACKS = ["onPlayerJump", "onPlayerAltAction"]


// =====================
// ECL CORE
// =====================

function require(e){if("loaded"===ECL.moduleStates.get(e))return ECL.moduleRegistry.get(e);if(!ECL.requireStack.includes(e))throw ECL.requireStack.push(e),ECL.positions.push(ECL.currentModule.pos),ECL.innerI=0,ECL.loadI++,{__ECL_DEFER__:!0};ECL.loadErrors.push({pos:ECL.currentModule.pos,msg:`Circular dependency detected: ${ECL.requireStack.join(" -> ")} -> ${e}`})}function expose(...e){return new Export(...e)}ECL={positions:ECL_POSITIONS,callbacks:{},priority:{tick:[],onClose:[],onPlayerJoin:[],onPlayerLeave:[],onPlayerJump:[],onRespawnRequest:[Array,!0],playerCommand:[!0,!1,void 0],onPlayerChat:[!1,null,Object],onPlayerChangeBlock:["preventChange","preventDrop",Array],onPlayerDropItem:["preventDrop","allowButNoDroppedItemCreated"],onPlayerPickedUpItem:[],onPlayerSelectInventorySlot:[],onBlockStand:[],onPlayerAttemptCraft:["preventCraft"],onPlayerCraft:[],onPlayerAttemptOpenChest:["preventOpen"],onPlayerOpenedChest:[],onPlayerMoveItemOutOfInventory:["preventChange"],onPlayerMoveInvenItem:["preventChange"],onPlayerMoveItemIntoIdxs:["preventChange"],onPlayerSwapInvenSlots:["preventChange"],onPlayerMoveInvenItemWithAmt:["preventChange"],onPlayerAttemptAltAction:["preventAction"],onPlayerAltAction:[],onPlayerClick:[],onClientOptionUpdated:[],onMobSettingUpdated:[],onInventoryUpdated:[],onChestUpdated:[],onWorldChangeBlock:["preventChange","preventDrop"],onCreateBloxdMeshEntity:[],onEntityCollision:[],onPlayerAttemptSpawnMob:["preventSpawn"],onWorldAttemptSpawnMob:["preventSpawn"],onPlayerSpawnMob:[],onWorldSpawnMob:[],onWorldAttemptDespawnMob:["preventDespawn"],onMobDespawned:[],onPlayerAttack:[],onPlayerDamagingOtherPlayer:["preventDamage",Number],onPlayerDamagingMob:["preventDamage",Number],onMobDamagingPlayer:["preventDamage",Number],onMobDamagingOtherMob:["preventDamage",Number],onAttemptKillPlayer:["preventDeath"],onPlayerKilledOtherPlayer:["keepInventory"],onMobKilledPlayer:["keepInventory"],onPlayerKilledMob:["preventDrop"],onMobKilledOtherMob:["preventDrop"],onPlayerPotionEffect:[],onPlayerDamagingMeshEntity:[],onPlayerBreakMeshEntity:[],onPlayerUsedThrowable:[],onPlayerThrowableHitTerrain:[],onTouchscreenActionButton:[],onTaskClaimed:[],onChunkLoaded:[],onPlayerRequestChunk:[],onItemDropCreated:[],onPlayerStartChargingItem:[],onPlayerFinishChargingItem:[],doPeriodicSave:[]},done:!1,loadI:0,innerI:0,currentModule:{str:null,dat:null,pos:null},moduleRegistry:new Map,moduleStates:new Map,modulePositions:new Map,requireStack:[],loadErrors:[],tick1:()=>{if(0===ECL.innerI){const e=ECL.positions[ECL.loadI];if(!e){const e=ECL.loadErrors.map((e=>`  (${e.pos.join(", ")}): ${e.msg}`)).join("\n");return api.broadcastMessage([{str:"ECL Loader Feedback\n",style:{color:"lightgray",fontSize:"30px",fontWeight:"bold"}},{str:e.length?e:"  No errors occurred",style:{color:e.length?"red":"lime"}}]),void(ECL.tick=null)}if("Unloaded"===api.getBlock(e))return;ECL.currentModule.pos=e,ECL.currentModule.str=api.getBlockData(...e)?.persisted?.shared?.text??'throw new Error("Not a Code Block")',ECL.innerI=1}if(1===ECL.innerI)try{ECL.requireStack.length=0,ECL.currentModule.dat=eval(ECL.currentModule.str),ECL.innerI=2}catch(e){if(e?.__ECL_DEFER__)return;ECL.loadErrors.push({pos:ECL.currentModule.pos,msg:String(e)}),ECL.innerI=0,ECL.loadI++}if(2===ECL.innerI){if(ECL.currentModule.dat instanceof Export)for(const e of ECL.currentModule.dat.modules){const o=e?.PACKAGE_NAME;if(o)if(ECL.moduleRegistry.has(o))ECL.loadErrors.push({pos:ECL.currentModule.pos,msg:`Duplicate PACKAGE_NAME '${o}'`});else if(e?.mod){ECL.moduleRegistry.set(o,e),ECL.moduleStates.set(o,"loaded"),ECL.modulePositions.set(o,ECL.currentModule.pos);for(const o of Object.keys(ECL.priority).filter((o=>void 0!==e.mod[o])))ECL.callbacks[o]||(ECL.callbacks[o]=new Set),ECL.callbacks[o].add(e.mod[o])}else ECL.loadErrors.push({pos:ECL.currentModule.pos,msg:`Invalid Package Format '${o}'`})}ECL.innerI=0,ECL.loadI++}return!0}},ECL.tick=ECL.tick1;class Export{modules=[];constructor(...e){this.modules.push(...e)}}function resolveHighestPriorityReturn(e,o,r){const n=r[e];if(!n||!o.length)return;const t=new Map;for(const e of o)null===e||"object"!=typeof e?t.set(e,e):Array.isArray(e)?t.set(Array,e):t.set(e.constructor,e);for(const e of n){if(t.has(e))return t.get(e);if("function"==typeof e)for(const o of t.values())if(o instanceof e)return o}}for(const e of ACTIVE_ECL_CALLBACKS.filter((e=>"tick"!==e&&"onPlayerJoin"!==e)))globalThis[e]=(...o)=>{const r=[];if(ECL.callbacks[e])for(const n of ECL.callbacks[e])r.push(n(...o));return resolveHighestPriorityReturn(e,r,ECL.priority)};function tick(){if(!ECL.tick?.()){if(!ECL.done){for(const e of api.getPlayerIds())ECL.callbacks.onPlayerJoin?.forEach?.((o=>o(e)));ECL.done=!0}if(ECL.callbacks.tick)for(const e of ECL.callbacks.tick)e()}}
```

## How to use
The first important thing to do is specifying the positions of the code blocks to load. To do this, simply change `ECL_POSITIONS` to the coordinates you need. 
**Remember to round coordinates down.**
You also have to specify all callbacks your modules use in `ACTIVE_ECL_CALLBACKS` (aside from `tick` and `onPlayerJoin`) because callbacks have to exist on world code init.
The loader runs all matching callbacks from the modules when a callback is called. It will return the action with the highest priority:

```
Module 1
  - onPlayerDamagingOtherPlayer -> 15
Module 2
  - onPlayerDamagingOtherPlayer -> "preventDamage"

--> returns "preventDamage"
```

## Module Format
If you just want to run a code on load, you can just put it in the code block and it will be called. If you want to use callbacks, you have to create a module.

```js
const JumpForCoins = {
  onPlayerJump: (p) => {
    JumpForCoins.giveCoin(p)
    JumpForCoins.counter++
  },
  giveCoin: (p) => {
    api.giveItem(p, "Gold Coin")
  },
  counter: 0
}
```
This is an example for the correct format of a module:
- Define callbacks with their name in the first layer of the object
- Define the modules variables in the first layer of the object
- Access the modules variables or methods using the modules defined name

To finally activate the module, the only thing left to do is calling the `expose` operator to send the module to the loader. This has to be the last step in the code block so the code block would return the value of the operator as result when clicked.

```js
const JumpForCoins = {
  onPlayerJump: (p) => {
    JumpForCoins.giveCoin(p)
    JumpForCoins.counter++
  },
  giveCoin: (p) => {
    api.giveItem(p, "Gold Coin")
  },
  counter: 0
}

expose(
  {
    PACKAGE_NAME: "jump_for_coins",
    mod: JumpForCoins
  }
)
```

This sends your module to the loader and activates it's callbacks. You can also input 2 or more modules to `expose`:
```js
expose(
  {
    PACKAGE_NAME: "package_1",
    mod: Package1
  },
  {
    PACKAGE_NAME: "package_2",
    mod: Package2
  }
)
```

## The `require` operator
If you need a specific module for your module to work, you can use the `require` operator. Since you don't know
- whether the module is even existing in the players world
- whether the module is loaded before your module (if you need it on init)
- if the module will be accessable for your module depending on how it was defined (`const`)
you can't use the modules name to access it:

```js
const ClickForCoins = {
  onPlayerAltAction: (p) => {
    JumpForCoins.giveCoin(p) // --> JumpForCoins isn't accessable
  }
}
```

Instead, you have to use the `require` operator:

```js
const ClickForCoins = {
  jumpModule: require('jump_for_coins'),
  onPlayerAltAction: (p) => {
    ClickForCoins.jumpModule.giveCoin(p) // --> gives coin
  }
}
```

This will requeue the module if the target module wasn't defined. If the target module is never defined, the system automatically detects this and stops retrying. It will also detect recursive modules.

## Problems
### A callback isn't called
- You didn't add it to `ACTIVE_ECL_CALLBACKS`
- You didn't register the code in `ECL_POSITIONS`
- You didn't export the module with `expose`
- Your module is not in a correct format
