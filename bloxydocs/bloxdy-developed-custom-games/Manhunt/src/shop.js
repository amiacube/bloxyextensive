// Using currManhunt From manhunt.js
// Using colors, helpers From utils.js
// Using playerDataManager From managers.js


/**
 * Handles shop, applies kit changes to players
 */
class ShopManager {
    tierConfig = {
        common: {
            displayName: "Common",
            color: colors.green,
            chance: 0.6,
            order: 3
        },
        rare: {
            displayName: "Rare",
            color: colors.orange,
            chance: 0.3,
            order: 2
        },
        epic: {
            displayName: "Epic",
            color: colors.purple,
            chance: 0.1,
            order: 1
        },
        /*legendary: {
            displayName: "Legendary",
            color: colors.gold,
            chance: 0.05
        }*/
    };

    /**
     * Kit data.
     * Format for `items`:
     *  Array of either: 
     *   - "Item Name"
     *  or
     *   - [ "Item Name", Item Amount = 1, Inventory Slot = (Automatically selected), Item Attributes = {}],
     *   - where only The first element is required
     */
    kits = {
        //COMMON
        default: {
            displayName: "Default",
            icon: "Dirt",
            description: "Get nothing",
            tier: "common",
            items: []
        },
        builder: {
            displayName: "Builder",
            icon: "Messy Stone",
            description: "Get a couple of blocks",
            tier: "common",
            items: [
                ["Messy Stone", 32]
            ]
        },
        miner: {
            displayName: "Miner",
            icon: "Stone Pickaxe",
            description: "Start with everything you need to go mining!",
            tier: "common",
            items: [
                "Stone Pickaxe",
                ["Coal", 3],
                "Furnace"
            ]
        },
        lumberjack: {
            displayName: "Lumberjack",
            icon: "Stone Axe",
            description: "Start chopping down trees in no time!",
            tier: "common",
            items: [
                "Stone Axe",
                "Workbench"
            ]
        },
        archer: {
            displayName: "Archer",
            icon: "Wood Bow",
            description: "Start with a bow and some arrows",
            tier: "common",
            items: [
                "Wood Bow",
                ["Arrow", 10]
            ]
        },
        warrior: {
            displayName: "Warrior",
            icon: "Wood Sword",
            description: "Get basic combat equipment, but you're slower",
            tier: "common",
            items: [
                "Wood Sword",
                ["Wood Helmet", 1, 46],
                ["Wood Chestplate", 1, 47],
                ["Wood Gauntlets", 1, 48],
                ["Wood Leggings", 1, 49],
                ["Wood Boots", 1, 50]
            ],
            effects: [
                "Slowness"
            ]
        },
        //RARE
        kangaroo: {
            displayName: "Kangaroo",
            icon: "Jump Potion",
            description: "Jump higher!",
            tier: "rare",
            clientOptions: {
                maxHealth: 80
            },
            effects: [
                "Jump Boost"
            ]
        },
        knight: {
            displayName: "Knight",
            icon: "Iron Chestplate",
            description: "Get better combat equipment, but you're a lot slower",
            tier: "rare",
            items: [
                "Stone Sword",
                ["Iron Helmet", 1, 46],
                ["Iron Chestplate", 1, 47],
                ["Wood Gauntlets", 1, 48],
                ["Wood Leggings", 1, 49],
                ["Wood Boots", 1, 50]
            ],
            effects: [
                ["Slowness", null, {
                    inbuiltLevel: 2
                }]
            ]
        },
        hare: {
            displayName: "Hare",
            icon: "Speed Potion",
            description: "Run faster!",
            tier: "rare",
            clientOptions: {
                maxHealth: 60
            },
            effects: [
                "Speed"
            ]
        },
        fruity: {
            displayName: "Fruity",
            icon: "Apple",
            description: "Get a bunch of fruits!",
            tier: "rare",
            items: [
                ["Apple", 3],
                "Cracked Coconut",
                "Plum",
                "Banana"
            ]
        },
        stalker: {
            displayName: "Stalker",
            icon: "Carrot",
            description: "Spy on your opponents",
            tier: "rare",
            items: [
                ["Carrot", 5]
            ]
        },
        //EPIC
        trapper: {
            displayName: "Trapper",
            icon: "Moonstone Explosive",
            description: "Trap your opponents and blow them up!",
            tier: "epic",
            items: [
                ["Cobweb", 20],
                ["Moonstone Explosive", 3]
            ]
        },
        clutcher: {
            displayName: "Clutcher",
            icon: "Fat Red Mushroom",
            description: "Survive any situation!",
            tier: "epic",
            items: [
                ["Fat Red Mushroom", 5],
                ["Cobweb", 5],
                "Moonstone Orb",
                ["Ladder", 10]
            ]
        },
        monkey: {
            displayName: "Monkey",
            icon: "Vines",
            description: "Climb up walls!",
            tier: "epic",
            items: [
                ["Porridge", 5]
            ]
        },
        excavator: {
            displayName: "Excavator",
            icon: "Iron Pickaxe",
            description: "Mine faster!",
            tier: "epic",
            items: [
                ["Iron Pickaxe", 1, null, {
                    customAttributes: {
                        enchantments: {
                            "Mining Yield": 1
                        },
                        enchantmentTier: "Tier 1"
                    },
                    customDisplayName: "Miner's Pick"
                }]
            ],
            effects: [
                "Haste"
            ]
        },
        ghost: {
            displayName: "Ghost",
            icon: "Invisibility Potion",
            description: "Temporarily become invisible!",
            tier: "epic",
            items: [
                ["Gold Melon Slice", 5]
            ]
        },
        falcon: {
            displayName: "Falcon",
            icon: "Wood Hang Glider",
            description: "Glide away into the sunset",
            tier: "epic",
            clientOptions: {
                maxHealth: 70
            },
            items: [
                "Wood Hang Glider"
            ]
        },
        //LEGENDARY
        //commented out for now, to keep the balancing
        /*freezer: {
            displayName: "Freezer",
            icon: "Iceball Block",
            description: "Freeze your opponents!",
            tier: "legendary",
            items: [
                ["Iceball", 20]
            ]
        }*/
    };
    kitsByTier = {};
    playerData = { };

    itemFlag = "manhunt-kit-item";

    constructor() {
        CBs.onPlayerBoughtShopItem = (...args) => this.onBought(...args);

        // Initialise shop menu
        api.configureShopCategory("manhunt-kits", {
            customTitle: "Kits",
            sortPriority: 99
        });
        api.createShopItem("manhunt-kits", "mystery-kit", {
            image: "block-question",
            amount: 1,
            canBuy: true,
            buyButtonText: [
                { str: "100 " },
                { icon: "coins", style: { color: "yellow" } }
            ],
            customTitle: "Mystery Kit",
            description: [
                { str: "Get a random kit!" },
                ...Object.values(this.tierConfig).map(tier => {
                    return { str: `\n${tier.displayName}: ${tier.chance * 100 | 0}%`, style: { color: tier.color } };
                })
            ],
            sortPriority: 100
        });

        for(const kitName in this.kits) {
            const kit = this.kits[kitName];
            const tierData = this.tierConfig[kit.tier];

            this.kitsByTier[kit.tier] ??= [];
            this.kitsByTier[kit.tier].push(kitName);

            api.createShopItem("manhunt-kits", kitName, {
                image: kit.icon,
                amount: 1,
                canBuy: false,
                buyButtonText: "Unlock",
                customTitle: kit.displayName,
                description: [
                    { str: `[${tierData.displayName}]\n`, style: { color: tierData.color, fontSize: "1.3rem" } },
                    { str: kit.description }
                ],
                sortPriority: kitName === "default" ? 99 : tierData.order
            });
        }
    }

    /**
     * Init shop for a player
     */
    init(id) {
        let { ownedKits, selectedKit, coins } = playerDataManager.getPlayerData(id);

        // Quick fix for playerdata with kits that no longer exist
        ownedKits = ownedKits.filter(kit => kit in this.kits);
        if(!ownedKits.includes(selectedKit)) selectedKit = "default";

        this.playerData[id] = { ownedKits, selectedKit, coins };
        this.updateCanBuyMystery(id);

        for(const kit of ownedKits) {
            this.showKitOwned(id, kit);
        }

        this.setSelectedKit(id, selectedKit);
    }

    /**
     * Apply kit changes like items or client options to a player
     */
    applyKitChanges(id) {
        const kit = this.kits[this.playerData[id].selectedKit];

        // Items
        kit.items ??= [];
        for(let item of kit.items) {
            if(typeof item === "string") item = [item];

            const [ name, amount = 1, slot = null, attributes = {}] = item;
            attributes.customAttributes ??= {};
            // Every kit item gets a custom flag so that we can prevent it from dropping on death
            attributes.customAttributes[this.itemFlag] = true;

            if(slot !== null) {
                api.setItemSlot(id, slot, name, amount, attributes, true);
            } else {
                api.giveItem(id, name, amount, attributes);
            }
        }

        // Client Options
        kit.clientOptions ??= {};
        api.setClientOptions(id, kit.clientOptions);

        // Effects
        kit.effects ??= [];
        for(let effect of kit.effects) {
            if(typeof effect === "string") effect = [effect, null, {}];
            effect[1] ??= null;
            effect[2] ??= {};

            api.applyEffect(id, ...effect);
        }
    }
    /**
     * Clear kit changes for a player
     */
    removeKitChanges(id) {
        // We only need to clear client options here, as inventory and effects are cleared outside of this
        const kit = this.kits[this.playerData[id].selectedKit];

        kit.clientOptions ??= {};

        for(const opt in kit.clientOptions) {
            api.setClientOptionToDefault(id, opt);
        }
    }

    getPlayerKit(id) {
        return this.playerData[id].selectedKit;
    }

    setSelectedKit(id, kitName) {
        if(currManhunt?.running) {
            api.sendOverShopInfo(id, "Can't select a kit during a match");
            return;
        }

        const kit = this.kits[kitName];
        const prev = this.playerData[id].selectedKit;

        api.updateShopItemForPlayer(id, "manhunt-kits", prev, { isSelected: false, buyButtonText: "Select" });
        api.updateShopItemForPlayer(id, "manhunt-kits", kitName, { isSelected: true, buyButtonText: "Selected" });

        api.sendOverShopInfo(id, [
            { str: kit.displayName, style: { color: this.tierConfig[kit.tier].color } },
            { str: " selected.", style: { color: colors.yellow } }
        ]);

        this.playerData[id].selectedKit = kitName;
        playerDataManager.updatePlayerData(id, { selectedKit: kitName });
    }

    /**
     * Update a player's shop to show that they own a kit
     */
    showKitOwned(id, kit) {
        api.updateShopItemForPlayer(id, "manhunt-kits", kit, { canBuy: true, buyButtonText: "Select" });
    }

    updateCoins(id, amount) {
        this.playerData[id].coins += amount;
        this.updateCanBuyMystery(id);
    }

    /**
     * Update a player's shop to show whether they can buy a Mystery Kit
     */
    updateCanBuyMystery(id) {
        if(this.playerData[id].coins >= 100) {
            api.updateShopItemForPlayer(id, "manhunt-kits", "mystery-kit", { canBuy: true });
        } else {
            api.updateShopItemForPlayer(id, "manhunt-kits", "mystery-kit", { canBuy: false });
        }
    }

    /**
     * Randomly select a kit, based on the rarity of each tier
     */
    pickRandomKit() {
        let kitTier;
        let val = Math.random();
        for(const tier in this.tierConfig) {
            const { chance } = this.tierConfig[tier];
            val -= chance;

            if(val <= 0) {
                kitTier = tier;
                break;
            }
        }

        const kits = this.kitsByTier[kitTier];
        return helpers.randomPick(kits);
    }

    onBought(player, category, itemName) {
        // We only care about our own shop category
        if(category !== "manhunt-kits") return;
        // "Buying" a kit means selecting it
        if(itemName !== "mystery-kit") this.setSelectedKit(player, itemName);

        // Remove the coins for the mystery kit
        helpers.addCoins(player, "mysteryKit");

        const kit = this.pickRandomKit();
        const playerData = this.playerData[player];

        if(playerData.ownedKits.includes(kit)) {
            // Tell the player which kit they got
            const message = [
                { str: "You already own kit ", style: { color: colors.yellow } },
                { str: this.kits[kit].displayName, style: { color: this.tierConfig[this.kits[kit].tier].color } },
                { str: ".", style: { color: colors.yellow } }
            ];

            api.sendMessage(player, message);
            api.sendOverShopInfo(player, message);

            // Give them some coins back as refund
            helpers.addCoins(player, "kitRefund");
        } else {
            // Tell the player which kit they got
            const message = [
                { str: this.kits[kit].displayName, style: { color: this.tierConfig[this.kits[kit].tier].color } },
                { str: " unlocked!", style: { color: colors.yellow } }
            ];

            api.sendMessage(player, message);
            api.sendOverShopInfo(player, message);
            sounds.success(player);

            // Actually update the player's kits
            playerData.ownedKits.push(kit);
            playerDataManager.updatePlayerData(player, { ownedKits: playerData.ownedKits });
            this.showKitOwned(player, kit);
        }
    }

    /**
     * Let the player keep kit items on death
     */
    onPlayerKilled(id) {
        const customItems = {};
        // Store all items that shouldn't be dropped, and remove them from inventory
        for(let i = 0; i < 51; i++) {
            const item = api.getItemSlot(id, i);
            if(!item) continue;

            if(item.attributes.customAttributes?.[this.itemFlag] || item.attributes.customAttributes?.trackingCompass) {
                customItems[i] = item;
                api.setItemSlot(id, i, "Air", 1, {}, true);
            }
        }

        // After the player died, add the custom items back
        helpers.queue(() => {
            for(const idx in customItems) {
                const item = customItems[idx];
                api.setItemSlot(id, parseInt(idx), item.name, item.amount, item.attributes, true);
            }
        });
    }
}


const shopManager = new ShopManager();
globalThis.shopManager = shopManager;