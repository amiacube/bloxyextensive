/*
===================================================================
  SIMPLIFIED "STOP-TO-SELECT" GESTURE MENU FRAMEWORK - V5.2 (FULL COVERAGE)
===================================================================
  - The menuTree is now fully populated, with every submenu defining
    all four directional actions for a complete and consistent UI.
  - The 'down' direction is consistently used for 'Back' navigation
    in all submenus.
  - New example items and actions have been added to fill the tree.
*/

// --- Global state for all players using the menu ---
let movementMenuState = {};

/*
============================================================
 STEP 1: DEFINE YOUR MENU WITH FULL 4-DIRECTIONAL COVERAGE
============================================================
- Every 'submenu' object now contains definitions for 'up', 'down',
  'left', and 'right' to ensure a complete UI grid.
*/
const menuTree = {
    submenu: { // ROOT MENU
        'up': {
            label: 'Weapons & Tools', icon: 'hammer', color: [255, 255, 0],
            submenu: { // Weapons & Tools Menu
                'up': {
                    label: 'Melee Weapons', icon: 'swords', color: [200, 200, 200],
                    submenu: { // Melee Weapons Menu
                        'up': { label: 'Diamond Sword', icon: 'sword', color: [0, 255, 255], action: 'giveDiamondSword' },
                        'right': { label: 'Iron Axe', icon: 'axe', color: [210, 210, 210], action: 'giveIronAxe' },
                        'left': { label: 'Trident', icon: 't', color: [0, 200, 150], action: 'giveTrident' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'right': {
                    label: 'Ranged Weapons', icon: 'bow-arrow', color: [150, 100, 50],
                    submenu: { // Ranged Weapons Menu
                        'up': { label: 'Bow & Arrows', icon: 'bow-arrow', color: [255, 255, 0], action: 'giveBowAndArrows' },
                        'right': { label: 'Snowballs', icon: 'snowflake', color: [255, 255, 255], action: 'giveSnowballs' },
                        'left': { label: 'Crossbow', icon: 'crosshairs', color: [180, 140, 90], action: 'giveCrossbow' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'left': {
                    label: 'Tools', icon: 'pickaxe', color: [100, 150, 200],
                    submenu: { // Tools Menu
                        'up': { label: 'Diamond Pickaxe', icon: 'pickaxe', color: [0, 255, 255], action: 'giveDiamondPickaxe' },
                        'right': { label: 'Fishing Rod', icon: 'fishing-rod', color: [150, 100, 50], action: 'giveFishingRod' },
                        'left': { label: 'Diamond Shovel', icon: 'shovel', color: [0, 255, 255], action: 'giveDiamondShovel' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
            }
        },
        'right': {
            label: 'Shop & Actions', icon: 'shopping-cart', color: [0, 150, 255],
            submenu: { // Shop & Actions Menu
                'up': {
                    label: 'Special Actions', icon: 'wand-sparkles', color: [255, 0, 255],
                    submenu: { // Special Actions Menu
                        'up': { label: 'High Jump', icon: 'angles-up', color: [0, 255, 0], action: 'actionHighJump' },
                        'right': { label: 'Heal Self', icon: 'heart-plus', color: [255, 100, 100], action: 'actionHeal' },
                        'left': { label: 'Particle Burst', icon: 'sparkles', color: [255, 255, 0], action: 'actionParticleBurst' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'right': {
                    label: 'Sell Items', icon: 'receipt', color: [255, 180, 50],
                    submenu: { // Sell Items Menu
                        'up': { label: 'Sell Ores', icon: 'gem', color: [200, 200, 200], action: 'sellOres' },
                        'right': { label: 'Sell Blocks', icon: 'cubes', color: [139, 69, 19], action: 'sellBlocks' },
                        'left': { label: 'Sell Farmables', icon: 'wheat-awn', color: [245, 222, 179], action: 'sellFarmables' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'left': {
                    label: 'Buy Effects', icon: 'flask-potion', color: [150, 50, 255],
                    submenu: { // Buy Effects Menu
                        'up': { label: 'Speed Boost', icon: 'forward-fast', color: [0, 255, 255], action: 'buySpeedBoost' },
                        'right': { label: 'Jump Boost', icon: 'person-falling-burst', color: [0, 255, 0], action: 'buyJumpBoost' },
                        'left': { label: 'Invisibility', icon: 'user-secret', color: [180, 180, 180], action: 'buyInvisibility' },
                        'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
                    }
                },
                'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
            }
        },
        'left': {
            label: 'Player Interactions', icon: 'user-group', color: [0, 255, 0],
            submenu: { // Player Interactions Menu
                'up': { label: 'Teleport to Player', icon: 'location-crosshairs', color: [0, 200, 255], action: 'interactTeleport' },
                'right': { label: 'Gift Money', icon: 'coins', color: [255, 215, 0], action: 'interactGift' },
                'left': { label: 'View Profile', icon: 'address-card', color: [200, 200, 200], action: 'interactViewProfile' },
                'down': { label: 'Back', icon: 'rotate-left', color: [255, 100, 100], action: 'navigateBack' },
            }
        },
        'down': {
            label: 'Close Menu', icon: 'x', color: [255, 0, 0],
            action: 'closeMenu'
        },
    }
};

/*
============================================================
 STEP 2: MAP ACTION NAMES TO ACTUAL FUNCTIONS (IMPLEMENTATION)
============================================================
*/
const actionHandlers = {
    // --- System Actions ---
    'closeMenu': (pId) => { closeMenu(pId); },
    'navigateBack': (pId) => {
        const state = movementMenuState[pId];
        if (state && state.history.length > 1) {
            state.history.pop();
            const previousMenu = state.history[state.history.length - 1];
            _renderMenuUI(pId, previousMenu);
        } else {
            closeMenu(pId);
        }
    },

    // --- Mocked Game Actions ---
    'giveDiamondSword': (pId) => { logAndClose(pId, 'Gave Player a Diamond Sword'); },
    'giveIronAxe': (pId) => { logAndClose(pId, 'Gave Player an Iron Axe'); },
    'giveTrident': (pId) => { logAndClose(pId, 'Gave Player a Trident'); },
    'giveBowAndArrows': (pId) => { logAndClose(pId, 'Gave Player a Bow and Arrows'); },
    'giveSnowballs': (pId) => { logAndClose(pId, 'Gave Player 16 Snowballs'); },
    'giveCrossbow': (pId) => { logAndClose(pId, 'Gave Player a Crossbow'); },
    'giveDiamondPickaxe': (pId) => { logAndClose(pId, 'Gave Player a Diamond Pickaxe'); },
    'giveFishingRod': (pId) => { logAndClose(pId, 'Gave Player a Fishing Rod'); },
    'giveDiamondShovel': (pId) => { logAndClose(pId, 'Gave Player a Diamond Shovel'); },

    'actionHighJump': (pId) => { logAndClose(pId, 'Player performed High Jump'); },
    'actionHeal': (pId) => { logAndClose(pId, 'Player Healed'); },
    'actionParticleBurst': (pId) => { logAndClose(pId, 'Player created a Particle Burst'); },

    'sellOres': (pId) => { logAndClose(pId, 'Player would sell ores'); },
    'sellBlocks': (pId) => { logAndClose(pId, 'Player would sell blocks'); },
    'sellFarmables': (pId) => { logAndClose(pId, 'Player would sell farmables'); },

    'buySpeedBoost': (pId) => { logAndClose(pId, 'Player bought Speed Boost'); },
    'buyJumpBoost': (pId) => { logAndClose(pId, 'Player bought Jump Boost'); },
    'buyInvisibility': (pId) => { logAndClose(pId, 'Player bought Invisibility'); },

    'interactTeleport': (pId) => { logAndClose(pId, 'Player would teleport to someone'); },
    'interactGift': (pId) => { logAndClose(pId, 'Player would gift money'); },
    'interactViewProfile': (pId) => { logAndClose(pId, 'Player would view a profile'); },
};

function logAndClose(playerId, actionDescription) {
    api.log(`[MENU ACTION] Player ${api.getEntityName(playerId)}: ${actionDescription}`);
    closeMenu(playerId, "Action Performed");
}


/*
============================================================
          STEP 3: CORE FRAMEWORK LOGIC (GENERIC)
============================================================
*/

const dotProduct2D = (v1, v2) => v1[0] * v2[0] + v1[2] * v2[2];
const normalize2D = (v) => {
    const mag = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
    return mag === 0 ? [0, 0, 0] : [v[0] / mag, 0, v[2] / mag];
};

function closeMenu(playerId, message = "Menu Closed") {
    if (movementMenuState[playerId]) {
        api.setClientOptionToDefault(playerId, 'jumpAmount');
        api.setClientOptionToDefault(playerId, 'speedMultiplier');
        api.setClientOption(playerId, 'middleTextLower', '');
        delete movementMenuState[playerId];
        api.sendFlyingMiddleMessage(playerId, [message], 100);
    }
}

function _renderMenuUI(playerId, menuNode) {
    const state = movementMenuState[playerId];
    state.currentMenuNode = menuNode;

    const menuData = menuNode.submenu || {};

    // As per the new design, we expect menuData to have all four directions defined.
    // The code no longer needs to create blank slots, as the data provides them.
    const gestures = {
        up: menuData.up,
        down: menuData.down,
        left: menuData.left,
        right: menuData.right,
    };

    const getStyledButtonBlock = (button) => {
        // This function now assumes 'button' is always a valid object.
        const hexColor = `#${button.color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
        const label = { str: ' ' + button.label, style: { color: hexColor, fontWeight: 'bold' } };
        return button.icon ? [{ icon: button.icon, style: { color: hexColor } }, label] : [label];
    };

    const upContent = getStyledButtonBlock(gestures.up);
    const downContent = getStyledButtonBlock(gestures.down);
    const leftContent = getStyledButtonBlock(gestures.left);
    const rightContent = getStyledButtonBlock(gestures.right);

    const middleContent = [...leftContent, { str: '\u00A0'.repeat(4) }, ...rightContent];

    const finalInstructions = [...upContent, '\n', ...middleContent, '\n', ...downContent];

    api.setClientOption(playerId, 'middleTextLower', finalInstructions);
}


function _executeMenuAction(playerId, menuItem) {
    if (!menuItem) return;

    if (menuItem.submenu) {
        movementMenuState[playerId].history.push(menuItem);
        _renderMenuUI(playerId, menuItem);
        movementMenuState[playerId].ignoreNextStop = true;
    } else if (menuItem.action) {
        const handler = actionHandlers[menuItem.action];
        if (handler) {
            handler(playerId);
        } else {
            api.log(`Error: No action handler found for '${menuItem.action}'`);
            closeMenu(playerId, "Menu Error");
        }
    }
}

/*
============================================================
                 STEP 4: EVENT HANDLERS
============================================================
*/
tick = () => {
    for (const playerId in movementMenuState) {
        const state = movementMenuState[playerId];
        const currentPos = api.getPosition(playerId);
        const isMoving = currentPos[0] !== state.lastPos[0] || currentPos[2] !== state.lastPos[2];

        if (isMoving) {
            const moveVec = [currentPos[0] - state.lastPos[0], 0, currentPos[2] - state.lastPos[2]];
            const forwardVec = normalize2D(api.getPlayerFacingInfo(playerId).dir);
            const rightVec = normalize2D([forwardVec[2], 0, -forwardVec[0]]);
            const normalizedMoveVec = normalize2D(moveVec);
            const forwardAmount = dotProduct2D(normalizedMoveVec, forwardVec);
            const rightAmount = dotProduct2D(normalizedMoveVec, rightVec);
            const DOMINANCE_FACTOR = 1.5;
            let detectedGesture = null;

            if (Math.abs(forwardAmount) > Math.abs(rightAmount) * DOMINANCE_FACTOR) {
                detectedGesture = forwardAmount > 0 ? 'up' : 'down';
            } else if (Math.abs(rightAmount) > Math.abs(forwardAmount) * DOMINANCE_FACTOR) {
                detectedGesture = rightAmount > 0 ? 'right' : 'left';
            }
            if (detectedGesture) { state.pendingGesture = detectedGesture; }

        } else { // Player has stopped
            if (state.ignoreNextStop) {
                state.ignoreNextStop = false;
                state.pendingGesture = null;
            } else if (state.pendingGesture) {
                const gestureToExecute = state.pendingGesture;
                state.pendingGesture = null;
                const menuItem = state.currentMenuNode.submenu[gestureToExecute];
                _executeMenuAction(playerId, menuItem);
            }
        }
        state.lastPos = currentPos;
    }
};

onPlayerClick = (playerId, wasAltClick) => {
    const state = movementMenuState[playerId];
    if (state) {
        if (wasAltClick || state.history.length <= 1) {
            return closeMenu(playerId);
        }
    } else {
        api.setClientOption(playerId, 'jumpAmount', 1);
        api.setClientOption(playerId, 'speedMultiplier', 0.05);
        movementMenuState[playerId] = {
            lastPos: api.getPosition(playerId),
            history: [menuTree],
            currentMenuNode: menuTree,
            pendingGesture: null,
            ignoreNextStop: true,
        };
        _renderMenuUI(playerId, menuTree);
    }
};

onPlayerJump = (playerId) => {
    if (movementMenuState[playerId]) {
        closeMenu(playerId, "Menu Closed");
    }
};

onPlayerLeave = (playerId) => {
    if (movementMenuState[playerId]) {
        delete movementMenuState[playerId];
    }
};