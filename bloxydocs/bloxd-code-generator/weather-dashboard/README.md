# 🎮 Bloxd.io Code Generator

A comprehensive JavaScript code generator for Bloxd.io worlds. Generate ready-to-use code snippets for player effects, world mechanics, weather systems, and callbacks.

## ✨ Features

### 👤 Player Effects
- **Make Players Jump** - Custom jump force control
- **Speed Boost** - Apply speed multiplier (0.5x - 5x)
- **Set Player Pose** - Change pose (default, zombie, driving, swimming, falling)
- **Apply Impulse** - Push players with custom velocity (X, Y, Z)
- **Transform to Zombie** - Convert player into zombie skin
- **Set Health** - Adjust player health (1-100)

### 🌍 World Effects
- **Get All Players** - Retrieve all active player IDs
- **Global Effects** - Apply effects to all players at once
  - Make everyone jump
  - Turn everyone into zombies
  - Give everyone speed boost
  - Damage all players
- **Get Other Players** - Get player list excluding yourself
- **Particle Systems** - Create visual effects
  - Fire
  - Smoke
  - Stars
  - Rain
- **Block Change Detection** - Detect when players modify blocks
- **Spawn Mobs** - Spawn creatures (zombie, skeleton, creeper, piglin)

### ⛅ Weather System
Complete weather simulation systems:
- **🌧️ Rain** - Rain particles + atmospheric message
- **⚡ Thunder** - Lightning effect, damage, and knockback
- **❄️ Snow** - Snowing particle effect
- **🌪️ Sandstorm** - Sand particles + movement slowdown
- **🌌 Aurora** - Magical gradient particle effect
- **☀️ Clear Weather** - Clear sky announcement

### 💬 Message System
- **Personal Messages** - Send colored messages to yourself
- **Broadcast Messages** - Send announcements to all players
- **Flying Messages** - Animated text that flies across screen
- **Action Bar Messages** - Display on action bar

### 🔔 Callback Templates
Game event handlers:
- **onPlayerJoin** - When player joins world
- **onPlayerLeave** - When player leaves world
- **onPlayerJump** - When player jumps
- **onPlayerAttack** - When player attacks
- **onPlayerChat** - When player sends message
- **onPlayerChangeBlock** - When player modifies blocks
- **tick** - Game loop (runs every ~50ms)

## 🚀 Usage

### Step 1: Open the Generator
Open `index.html` in your web browser

### Step 2: Select Category & Generate Code
1. Click on desired category (Player Effects, World Effects, etc.)
2. Configure parameters
3. Click "Generate Code"
4. Click "Copy to Clipboard"

### Step 3: Use in Bloxd.io

**For Code Blocks:**
1. Right-click a Code Block in your world
2. Click to open code editor
3. Paste the generated code
4. Save

**For Press to Code Boards:**
1. Place a board with text starting with "press to code"
2. Right-click the adjacent Code Block/Board
3. Paste code into editor

**For World Code:**
1. Press `F8` in your world to open World Code editor
2. Paste callback code
3. Save

## 📚 API Reference

### Global Variables
```javascript
myId          // Your player ID
playerId      // Current player ID
thisPos       // Position of code block/board [x, y, z]
ownerDbId     // Owner's database ID
```

### Key API Methods

#### Player Control
```javascript
api.setVelocity(playerId, x, y, z)           // Set velocity
api.applyImpulse(playerId, x, y, z)          // Apply impulse
api.setPlayerPose(playerId, pose)            // Change pose
api.changePlayerIntoSkin(playerId, part, skin)
api.setHealth(playerId, health)              // Set health (1-100)
api.getHealth(playerId)                      // Get current health
api.setPlayerSpeedMultiplier(playerId, mult) // Speed boost
```

#### Messages
```javascript
api.sendMessage(playerId, type, config)      // Send personal message
api.broadcastMessage(type, config)           // Message all players
api.sendFlyingMiddleMessage(playerId, text, speed) // Flying text
api.log(message)                             // Console log
```

#### World & Entities
```javascript
api.getPlayerIds()                           // Get all player IDs
api.getEntityPosition(entityId)              // Get entity position
api.spawnMob(mobType, pos, opts)            // Spawn mob
api.createTempParticleSystem(opts)          // Create particles
```

#### Callbacks (World Code)
```javascript
tick = () => {}                              // Game loop
onPlayerJoin = (playerId) => {}             // Player join
onPlayerLeave = (playerId) => {}            // Player leave
onPlayerAttack = (playerId) => {}           // Player attack
onPlayerChat = (playerId, message) => {}    // Player chat
onPlayerChangeBlock = (playerId, oldBlock, newBlock, pos) => {}
onPlayerJump = (playerId) => {}             // Player jump
onBlockStand = (playerId, pos) => {}        // Player stands on block
onBlockStandStart = (playerId, pos) => {}   // Player steps on block
onBlockStandStop = (playerId, pos) => {}    // Player leaves block
```

## 🎨 Particle System Configuration

### Basic Structure
```javascript
{
  texture: "BlockName",              // Block texture to use
  minLifeTime: 0.5,                  // Min lifetime in seconds
  maxLifeTime: 2,                    // Max lifetime in seconds
  minEmitPower: 5,                   // Min emission speed
  maxEmitPower: 10,                  // Max emission speed
  minSize: 0.3,                      // Min particle size
  maxSize: 0.8,                      // Max particle size
  gravity: [0, -5, 0],              // Gravity vector
  velocityGradients: [...],          // Velocity over time
  colorGradients: [...],             // Color over time
  blendMode: 1,                      // 0=AddOne, 1=Standard, 2=Add, 3=Multiply, 4=MultiplyAdd
  dir1: [x, y, z],                   // Min direction
  dir2: [x, y, z],                   // Max direction
  pos1: [x, y, z],                   // Min spawn position
  pos2: [x, y, z],                   // Max spawn position
  manualEmitCount: 50,               // Number of particles
  hideDist: 100                      // Hide distance
}
```

## 📝 Examples

### Example 1: Simple Jump Effect
```javascript
/* Right-click Press to Code board to execute */
api.setVelocity(myId, 0, 15, 0)
```

### Example 2: Zombie Apocalypse
```javascript
/* In World Code (F8) or Code Block */
const playerIds = api.getPlayerIds()
for (const playerId of playerIds) {
  api.setPlayerPose(playerId, "zombie")
  api.changePlayerIntoSkin(playerId, "head", "zombie")
}
```

### Example 3: Welcome System (World Code)
```javascript
onPlayerJoin = (playerId) => {
  api.sendMessage(playerId, "text", { color: "green" })
  api.broadcastMessage("announcement", { color: "yellow" })
}
```

### Example 4: Chat Commands (World Code)
```javascript
onPlayerChat = (playerId, message) => {
  if (message === "jump") {
    api.setVelocity(playerId, 0, 20, 0)
  }
  if (message === "speed") {
    api.setPlayerSpeedMultiplier(playerId, 3)
  }
}
```

## 🔗 Important Links

- **Bloxd.io Official**: https://bloxd.io
- **Code API Docs**: https://bloxd.io/docs
- **Discord Community**: Join Bloxd.io Discord for support

## ⚠️ Notes

### Code Block Limitations
- JavaScript comments must use `/* */` (not `//`)
- Global variables: `myId`, `playerId`, `thisPos`, `ownerDbId` are pre-defined
- No need to add "press to code" text - it's removed automatically

### World Code (F8)
- Use for callbacks and global game logic
- Functions defined here run for entire world
- Supports tick loop for continuous updates

### Performance Tips
- Limit particle count in `manualEmitCount`
- Use reasonable `hideDist` values
- Cache player ID lists when looping frequently
- Avoid heavy operations in `tick` callback

## 🐛 Troubleshooting

**Code not executing:**
- Ensure you're right-clicking a Press to Code board/Code Block
- Check that comment syntax uses `/* */` not `//`
- Verify variables like `myId` and `thisPos` are available

**Particles not showing:**
- Check texture name is valid (block names work)
- Increase `manualEmitCount` for visibility
- Reduce `hideDist` if players are too far

**Performance issues:**
- Reduce particle count
- Remove or simplify color/velocity gradients
- Limit players affected by loops

## 📋 License

Open source - feel free to use and modify!

---

**Happy coding in Bloxd.io! 🎮**