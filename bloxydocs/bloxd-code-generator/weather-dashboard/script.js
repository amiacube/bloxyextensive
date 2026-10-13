// Tab Switching
function switchTab(tabName) {
  // Hide all panels
  document.querySelectorAll('[id^="panel-"]').forEach(panel => {
    panel.classList.add('hidden');
  });

  // Remove active class from all tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected panel
  document.getElementById(`panel-${tabName}`).classList.remove('hidden');

  // Add active class to clicked tab
  event.target.closest('.tab-btn').classList.add('active');
}

// CODE GENERATION FUNCTIONS
function generatePlayerCode(type) {
  let code = '';

  switch (type) {
    case 'jump':
      const jumpForce = document.getElementById('jumpForce').value;
      code = `/* Make player jump with custom force */
api.setVelocity(myId, 0, ${jumpForce}, 0)`;
      break;

    case 'speed':
      const speedMult = document.getElementById('speedMultiplier').value;
      code = `/* Apply speed boost */
api.setPlayerSpeedMultiplier(myId, ${speedMult})`;
      break;

    case 'pose':
      const pose = document.getElementById('playerPose').value;
      code = `/* Set player pose */
api.setPlayerPose(myId, "${pose}")`;
      break;

    case 'impulse':
      const impulseX = document.getElementById('impulseX').value;
      const impulseY = document.getElementById('impulseY').value;
      const impulseZ = document.getElementById('impulseZ').value;
      code = `/* Apply impulse force (velocity change) */
api.applyImpulse(myId, ${impulseX}, ${impulseY}, ${impulseZ})`;
      break;

    case 'zombie':
      code = `/* Transform player into zombie */
api.setPlayerPose(myId, "zombie")
api.changePlayerIntoSkin(myId, "head", "zombie")`;
      break;

    case 'health':
      const health = document.getElementById('healthValue').value;
      code = `/* Set player health */
api.setHealth(myId, ${health})`;
      break;
  }

  displayCode(code);
}

function generateWorldCode(type) {
  let code = '';

  switch (type) {
    case 'allPlayers':
      code = `/* Get all player IDs */
const playerIds = api.getPlayerIds()
api.log("Active players:", playerIds)

/* Loop through all players */
for (const playerId of playerIds) {
  api.log("Player ID:", playerId)
}`;
      break;

    case 'globalEffect':
      const globalEffect = document.getElementById('globalEffect').value;
      if (globalEffect === 'jump') {
        code = `/* Make all players jump */
const playerIds = api.getPlayerIds()
for (const playerId of playerIds) {
  api.setVelocity(playerId, 0, 15, 0)
}`;
      } else if (globalEffect === 'zombie') {
        code = `/* Turn all players into zombies */
const playerIds = api.getPlayerIds()
for (const playerId of playerIds) {
  api.setPlayerPose(playerId, "zombie")
  api.changePlayerIntoSkin(playerId, "head", "zombie")
}`;
      } else if (globalEffect === 'speed') {
        code = `/* Give all players speed boost */
const playerIds = api.getPlayerIds()
for (const playerId of playerIds) {
  api.setPlayerSpeedMultiplier(playerId, 2.0)
}`;
      } else if (globalEffect === 'damage') {
        code = `/* Damage all players */
const playerIds = api.getPlayerIds()
for (const playerId of playerIds) {
  const currentHealth = api.getHealth(playerId)
  api.setHealth(playerId, currentHealth - 10)
}`;
      }
      break;

    case 'otherPlayers':
      code = `/* Get all OTHER player IDs (excluding yourself) */
const getOtherIds = () => {
  const ids = api.getPlayerIds()
  const otherIds = []
  for (const id of ids) {
    if (id !== myId) {
      otherIds.push(id)
    }
  }
  return otherIds
}

const otherPlayers = getOtherIds()
api.log("Other players:", otherPlayers)`;
      break;

    case 'particles':
      const particleType = document.getElementById('particleType').value;
      let particleConfig = '';
      
      if (particleType === 'fire') {
        particleConfig = `{
  texture: "Lava",
  minLifeTime: 0.5,
  maxLifeTime: 2,
  minEmitPower: 5,
  maxEmitPower: 10,
  minSize: 0.3,
  maxSize: 0.8,
  gravity: [0, -5, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 1, factor: 0}],
  colorGradients: [{timeFraction: 0, minColor: [1, 0.5, 0, 1]}, {timeFraction: 1, minColor: [1, 0, 0, 0]}],
  blendMode: 1,
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  pos1: thisPos,
  pos2: thisPos,
  manualEmitCount: 50,
  hideDist: 100
}`;
      } else if (particleType === 'smoke') {
        particleConfig = `{
  texture: "Pixel",
  minLifeTime: 1,
  maxLifeTime: 3,
  minEmitPower: 3,
  maxEmitPower: 8,
  minSize: 0.5,
  maxSize: 1.5,
  gravity: [0, 0.5, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 1, factor: 0}],
  colorGradients: [{timeFraction: 0, minColor: [0.5, 0.5, 0.5, 1]}, {timeFraction: 1, minColor: [1, 1, 1, 0]}],
  blendMode: 1,
  dir1: [-1, 0, -1],
  dir2: [1, 0, 1],
  pos1: thisPos,
  pos2: thisPos,
  manualEmitCount: 30,
  hideDist: 100
}`;
      } else if (particleType === 'stars') {
        particleConfig = `{
  texture: "Pixel",
  minLifeTime: 1,
  maxLifeTime: 2,
  minEmitPower: 5,
  maxEmitPower: 15,
  minSize: 0.1,
  maxSize: 0.3,
  gravity: [0, -2, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 1, factor: 0.5}],
  colorGradients: [{timeFraction: 0, minColor: [1, 1, 1, 1]}, {timeFraction: 1, minColor: [1, 1, 0, 0]}],
  blendMode: 0,
  dir1: [-2, 2, -2],
  dir2: [2, 2, 2],
  pos1: thisPos,
  pos2: thisPos,
  manualEmitCount: 40,
  hideDist: 150
}`;
      } else if (particleType === 'rain') {
        particleConfig = `{
  texture: "Pixel",
  minLifeTime: 0.5,
  maxLifeTime: 1,
  minEmitPower: 20,
  maxEmitPower: 30,
  minSize: 0.05,
  maxSize: 0.1,
  gravity: [0, -30, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}],
  colorGradients: [{timeFraction: 0, minColor: [0.3, 0.7, 1, 0.8]}, {timeFraction: 1, minColor: [0.3, 0.7, 1, 0]}],
  blendMode: 1,
  dir1: [0, -1, 0],
  dir2: [0, -1, 0],
  pos1: [thisPos[0] - 5, thisPos[1] + 10, thisPos[2] - 5],
  pos2: [thisPos[0] + 5, thisPos[1] + 10, thisPos[2] + 5],
  manualEmitCount: 100,
  hideDist: 100
}`;
      }

      code = `/* Create particle system effect */
const particleOpts = ${particleConfig}

api.createTempParticleSystem(particleOpts)`;
      break;

    case 'blockChange':
      code = `/* Detect when blocks are changed */
onPlayerChangeBlock = (playerId, oldBlockName, newBlockName, pos) => {
  api.log(\`Player \${playerId} changed block at \${pos.x}, \${pos.y}, \${pos.z}\`)
  api.log(\`From: \${oldBlockName} -> To: \${newBlockName}\`)
}`;
      break;

    case 'spawnMob':
      const mobType = document.getElementById('mobType').value;
      code = `/* Spawn mob at code block location */
api.spawnMob("${mobType}", thisPos, {
  name: "${mobType.charAt(0).toUpperCase() + mobType.slice(1)} #1",
  playSoundOnSpawn: true
})`;
      break;
  }

  displayCode(code);
}

function generateWeatherCode(type) {
  let code = '';

  switch (type) {
    case 'rain':
      code = `/* Activate rain weather */
const playerIds = api.getPlayerIds()

/* Create rain particles */
const rainOpts = {
  texture: "Pixel",
  minLifeTime: 0.5,
  maxLifeTime: 1,
  minEmitPower: 20,
  maxEmitPower: 30,
  minSize: 0.05,
  maxSize: 0.1,
  gravity: [0, -30, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}],
  colorGradients: [{timeFraction: 0, minColor: [0.3, 0.7, 1, 0.8]}, {timeFraction: 1, minColor: [0.3, 0.7, 1, 0]}],
  blendMode: 1,
  dir1: [0, -1, 0],
  dir2: [0, -1, 0],
  pos1: [thisPos[0] - 5, thisPos[1] + 10, thisPos[2] - 5],
  pos2: [thisPos[0] + 5, thisPos[1] + 10, thisPos[2] + 5],
  manualEmitCount: 100,
  hideDist: 100
}

api.createTempParticleSystem(rainOpts)

/* Send message to all players */
api.broadcastMessage("announcement", { color: "blue" })`;
      break;

    case 'thunder':
      code = `/* Activate thunder - stun and damage all players */
const playerIds = api.getPlayerIds()

for (const playerId of playerIds) {
  /* Deal damage */
  const currentHealth = api.getHealth(playerId)
  api.setHealth(playerId, currentHealth - 15)
  
  /* Stun effect (can't move) */
  api.applyImpulse(playerId, 0, 3, 0)
}

/* Create lightning particle effect */
const lightningOpts = {
  texture: "Pixel",
  minLifeTime: 0.1,
  maxLifeTime: 0.3,
  minEmitPower: 10,
  maxEmitPower: 20,
  minSize: 0.2,
  maxSize: 0.5,
  gravity: [0, -10, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}],
  colorGradients: [{timeFraction: 0, minColor: [1, 1, 0, 1]}, {timeFraction: 1, minColor: [0.5, 0.5, 1, 0]}],
  blendMode: 0,
  dir1: [-1, 0, -1],
  dir2: [1, 0, 1],
  pos1: thisPos,
  pos2: thisPos,
  manualEmitCount: 80,
  hideDist: 100
}

api.createTempParticleSystem(lightningOpts)
api.broadcastMessage("announcement", { color: "yellow" })`;
      break;

    case 'snow':
      code = `/* Activate snow weather */
const snowOpts = {
  texture: "Snow",
  minLifeTime: 2,
  maxLifeTime: 4,
  minEmitPower: 5,
  maxEmitPower: 10,
  minSize: 0.2,
  maxSize: 0.5,
  gravity: [0, -2, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 1, factor: 0.3}],
  colorGradients: [{timeFraction: 0, minColor: [1, 1, 1, 0.9]}, {timeFraction: 1, minColor: [1, 1, 1, 0]}],
  blendMode: 1,
  dir1: [-2, 0, -2],
  dir2: [2, 0, 2],
  pos1: [thisPos[0] - 10, thisPos[1] + 20, thisPos[2] - 10],
  pos2: [thisPos[0] + 10, thisPos[1] + 20, thisPos[2] + 10],
  manualEmitCount: 50,
  hideDist: 150
}

api.createTempParticleSystem(snowOpts)
api.broadcastMessage("announcement", { color: "blue" })`;
      break;

    case 'sandstorm':
      code = `/* Activate sandstorm - slow all players */
const playerIds = api.getPlayerIds()

for (const playerId of playerIds) {
  api.setPlayerSpeedMultiplier(playerId, 0.5)
}

/* Create sand particles */
const sandOpts = {
  texture: "Sand",
  minLifeTime: 1,
  maxLifeTime: 3,
  minEmitPower: 8,
  maxEmitPower: 15,
  minSize: 0.3,
  maxSize: 0.8,
  gravity: [0, -5, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 1, factor: 0.2}],
  colorGradients: [{timeFraction: 0, minColor: [1, 0.8, 0.4, 0.8]}, {timeFraction: 1, minColor: [1, 0.8, 0.4, 0]}],
  blendMode: 2,
  dir1: [-3, 0, -3],
  dir2: [3, 1, 3],
  pos1: [thisPos[0] - 8, thisPos[1], thisPos[2] - 8],
  pos2: [thisPos[0] + 8, thisPos[1] + 5, thisPos[2] + 8],
  manualEmitCount: 80,
  hideDist: 100
}

api.createTempParticleSystem(sandOpts)
api.broadcastMessage("announcement", { color: "orange" })`;
      break;

    case 'aurora':
      code = `/* Activate aurora - magical effect */
const auroraOpts = {
  texture: "Pixel",
  minLifeTime: 1,
  maxLifeTime: 3,
  minEmitPower: 3,
  maxEmitPower: 8,
  minSize: 0.3,
  maxSize: 1,
  gravity: [0, 0, 0],
  velocityGradients: [{timeFraction: 0, factor: 1}, {timeFraction: 0.5, factor: 0.5}, {timeFraction: 1, factor: 0}],
  colorGradients: [
    {timeFraction: 0, minColor: [0, 1, 0.5, 0.8]},
    {timeFraction: 0.5, minColor: [0.5, 0.8, 1, 0.8]},
    {timeFraction: 1, minColor: [1, 0.5, 1, 0]}
  ],
  blendMode: 1,
  dir1: [-2, 1, -2],
  dir2: [2, 3, 2],
  pos1: [thisPos[0] - 5, thisPos[1], thisPos[2] - 5],
  pos2: [thisPos[0] + 5, thisPos[1] + 8, thisPos[2] + 5],
  manualEmitCount: 60,
  hideDist: 150
}

api.createTempParticleSystem(auroraOpts)`;
      break;

    case 'clear':
      code = `/* Clear weather - broadcast sunny message */
api.broadcastMessage("announcement", { color: "yellow" })`;
      break;
  }

  displayCode(code);
}

function generateMessageCode(type) {
  let code = '';

  switch (type) {
    case 'personal':
      const personalMsg = document.getElementById('personalMsg').value || 'Hello!';
      const msgColor = document.getElementById('msgColor').value;
      code = `/* Send message to yourself */
api.sendMessage(myId, "text", { 
  color: "${msgColor}" 
})`;
      break;

    case 'broadcast':
      const broadcastMsg = document.getElementById('broadcastMsg').value || 'Announcement!';
      const broadcastColor = document.getElementById('broadcastColor').value;
      code = `/* Send message to all players */
api.broadcastMessage("announcement", { 
  color: "${broadcastColor}" 
})`;
      break;

    case 'flying':
      const flyingMsg = document.getElementById('flyingMsg').value || 'Flying text!';
      const flyingSpeed = document.getElementById('flyingSpeed').value;
      code = `/* Send flying message to yourself */
const speed = ${flyingSpeed}
api.sendFlyingMiddleMessage(myId, ["${flyingMsg}"], speed)`;
      break;

    case 'action':
      const actionMsg = document.getElementById('actionMsg').value || 'Action bar text';
      code = `/* Send action bar message */
api.sendMessage(myId, "actionbar", {})`;
      break;
  }

  displayCode(code);
}

function generateCallbackCode(type) {
  let code = '';

  switch (type) {
    case 'onPlayerJoin':
      code = `/* Called when a player joins the world */
onPlayerJoin = (playerId) => {
  api.log(\`Player \${playerId} joined the world\`)
  
  /* Optional: Send welcome message to all players */
  api.broadcastMessage("announcement", { color: "green" })
}`;
      break;

    case 'onPlayerLeave':
      code = `/* Called when a player leaves the world */
onPlayerLeave = (playerId) => {
  api.log(\`Player \${playerId} left the world\`)
  
  /* Optional: Announce departure */
  api.broadcastMessage("announcement", { color: "red" })
}`;
      break;

    case 'onPlayerJump':
      code = `/* Called when a player jumps */
onPlayerJump = (playerId) => {
  api.log(\`Player \${playerId} jumped\`)
  
  /* Optional: Give them a boost */
  api.applyImpulse(playerId, 0, 2, 0)
}`;
      break;

    case 'onPlayerAttack':
      code = `/* Called when a player attacks */
onPlayerAttack = (playerId) => {
  api.log(\`Player \${playerId} attacked\`)
  
  /* Optional: Create particle effect at player */
  const pos = api.getEntityPosition(playerId)
  api.log("Attack position:", pos)
}`;
      break;

    case 'onPlayerChat':
      code = `/* Called when a player sends a chat message */
onPlayerChat = (playerId, message) => {
  api.log(\`Player \${playerId} said: \${message}\`)
  
  /* Optional: Check for commands */
  if (message === "jump") {
    api.setVelocity(playerId, 0, 15, 0)
  }
}`;
      break;

    case 'onPlayerChangeBlock':
      code = `/* Called when a player changes a block */
onPlayerChangeBlock = (playerId, oldBlockName, newBlockName, pos) => {
  api.log(\`Player \${playerId} changed block\`)
  api.log(\`From: \${oldBlockName} -> To: \${newBlockName}\`)
  api.log(\`Position: \${pos.x}, \${pos.y}, \${pos.z}\`)
}`;
      break;

    case 'tick':
      code = `/* Called every game tick (~50ms) */
let tickCount = 0

tick = () => {
  tickCount++
  
  /* Example: Do something every 20 ticks (1 second) */
  if (tickCount % 20 === 0) {
    api.log("One second has passed")
  }
}`;
      break;
  }

  displayCode(code);
}

function displayCode(code) {
  document.getElementById('codeOutput').textContent = code;
}

function copyCode() {
  const codeText = document.getElementById('codeOutput').textContent;
  navigator.clipboard.writeText(codeText).then(() => {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  });
}