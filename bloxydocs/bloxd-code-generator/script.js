let currentMode = 'worldbuilder';

function switchTab(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + mode).classList.add('active');

  document.getElementById('panel-worldbuilder').classList.toggle('hidden', mode !== 'worldbuilder');
  document.getElementById('panel-codeblock').classList.toggle('hidden', mode !== 'codeblock');

  if (mode === 'worldbuilder') renderWBFields();
  else renderCBFields();
}

// --- WORLDBUILDER LOGIC ---
function renderWBFields() {
  const action = document.getElementById('wb-action').value;
  const container = document.getElementById('wb-fields');
  container.innerHTML = '';

  if (action === 'set') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Block Name</label>
        <input type="text" id="wb-block" value="dirt" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  } else if (action === 'replace') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Target Block (To Replace)</label>
        <input type="text" id="wb-from" value="ice" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1">New Block</label>
        <input type="text" id="wb-to" value="stone" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  } else if (action === 'stack') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Count</label>
        <input type="number" id="wb-count" value="5" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  } else if (action === 'rotate') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Degrees (90, 180, 270)</label>
        <input type="number" id="wb-deg" value="90" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  } else if (action === 'schematic') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Sub-Command</label>
        <select id="wb-schem-op" onchange="generateCode()" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200">
          <option value="save">save</option>
          <option value="load">load</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1">Schematic Name</label>
        <input type="text" id="wb-schem-name" value="my_house" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  }
  generateCode();
}

// --- CODE BLOCK LOGIC ---
function renderCBFields() {
  const template = document.getElementById('cb-template').value;
  const container = document.getElementById('cb-fields');
  container.innerHTML = '';

  if (template === 'jump') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Upward Force (Y Power)</label>
        <input type="number" id="cb-force" value="12" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  } else if (template === 'tp') {
    container.innerHTML = `
      <div>
        <label class="block text-xs text-slate-400 mb-1">Target X Coordinate</label>
        <input type="number" id="cb-x" value="0" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1">Target Y Coordinate</label>
        <input type="number" id="cb-y" value="10" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1">Target Z Coordinate</label>
        <input type="number" id="cb-z" value="0" class="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200" oninput="generateCode()">
      </div>`;
  }
  generateCode();
}

// --- GENERATE OUTPUT ---
function generateCode() {
  const out = document.getElementById('output-box');

  if (currentMode === 'worldbuilder') {
    const action = document.getElementById('wb-action').value;
    if (action === 'set') {
      const block = document.getElementById('wb-block')?.value || 'dirt';
      out.value = `//set ${block}`;
    } else if (action === 'replace') {
      const from = document.getElementById('wb-from')?.value || 'ice';
      const to = document.getElementById('wb-to')?.value || 'dirt';
      out.value = `//replace ${from} ${to}`;
    } else if (action === 'stack') {
      const count = document.getElementById('wb-count')?.value || '1';
      out.value = `//stack ${count}`;
    } else if (action === 'rotate') {
      const deg = document.getElementById('wb-deg')?.value || '90';
      out.value = `//rotate ${deg}`;
    } else if (action === 'schematic') {
      const op = document.getElementById('wb-schem-op')?.value || 'save';
      const name = document.getElementById('wb-schem-name')?.value || 'build';
      out.value = `//schematic ${op} ${name}`;
    }
  } else {
    const template = document.getElementById('cb-template').value;
    if (template === 'jump') {
      const force = document.getElementById('cb-force')?.value || '10';
      out.value = `/* Run inside Code Block API */\napi.setVelocity(myId, 0, ${force}, 0);`;
    } else if (template === 'zombie') {
      out.value = `/* Turn other players into zombies */\nconst ids = api.getPlayerIds();\nfor (const id of ids) {\n  if (id !== myId) {\n    api.setPlayerPose(id, "zombie");\n    api.changePlayerIntoSkin(id, "head", "zombie");\n  }\n}`;
    } else if (template === 'speed') {
      out.value = `/* Boost player speed */\napi.setPlayerSpeedMultiplier(myId, 2.0);`;
    } else if (template === 'tp') {
      const x = document.getElementById('cb-x')?.value || '0';
      const y = document.getElementById('cb-y')?.value || '10';
      const z = document.getElementById('cb-z')?.value || '0';
      out.value = `/* Teleport player on interaction */\napi.teleportPlayer(myId, ${x}, ${y}, ${z});`;
    }
  }
}

function copyOutput() {
  const box = document.getElementById('output-box');
  box.select();
  navigator.clipboard.writeText(box.value);
  const btn = document.getElementById('copy-btn');
  btn.textContent = '✅ Copied!';
  setTimeout(() => btn.textContent = '📋 Copy to Clipboard', 2000);
}

// Initialize
renderWBFields();