
---

<div align="center">
  <h1>Task Scheduler</h1>
  <p>
    High-performance implementation of JavaScript <a href="https://javascript.info/settimeout-setinterval"><code>setTimeout</code></a>.<br>
    Interruption-safe, low-level foundation for complex game logic:<br>
    delay execution, build staged loops and sequences, group tasks,<br>
    control large systems with minimal overhead and <code>O(1)</code> management APIs.
  </p>
  <p>
    <a href="#installation"><kbd>Installation</kbd></a> &nbsp;•&nbsp;
    <a href="#api-methods"><kbd>API Methods</kbd></a> &nbsp;•&nbsp;
    <a href="#core-concepts"><kbd>Core Concepts</kbd></a> &nbsp;•&nbsp;
    <a href="#usage-patterns"><kbd>Usage Patterns</kbd></a> &nbsp;•&nbsp;
    <a href="#troubleshooting"><kbd>Troubleshooting</kbd></a> &nbsp;•&nbsp;
    <a href="#license-and-credits"><kbd>License & Credits</kbd></a>
  </p>
</div>

---

<a id="installation"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>📥 Installation 📥</b></code> ❯</h2>
    </div>
  </summary>

  <ol>
    <li>
      Copy the scheduler source into your <code>World Code</code>:
      <h3>
        <a href="./src/task_scheduler_minified.js"><code><b>minified</b></code></a>
        &nbsp;OR&nbsp;
        <a href="./src/task_scheduler_original.js"><code><b>original</b></code></a>
      </h3>
      <blockquote>
        <p>
          If you use <a href="https://github.com/delfineonx/code-loader"><code>Code Loader</code></a>,
          you can keep the scheduler source in a code block and load it from there.
        </p>
      </blockquote>
    </li>
    <li>
      Call the scheduler runner at the top of your <code>tick</code> callback:
    </li>
  </ol>

```js
tick = () => {
  TS.tick();
  // ...your other logic
};
```

</details>

---

<a id="api-methods"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>📚 API Methods 📚</b></code> ❯</h2>
    </div>
  </summary>

  <p><code>globalThis.TS</code> / <code>TS</code> exposes:</p>

```js
/**
 * Current scheduler tick (internal counter).
 * 
 * Notes:
 * - Increments at the start of each `TS.tick()` call.
 * - Useful for remaining-time calculations:
 *   `timeLeftMs = (taskId[0] - TS.currentTick) * 50`
 * 
 * @type {number}
 */
currentTick
```

```js
/**
 * Shared no-op function.
 * 
 * Notes:
 * - Useful when you intentionally need a no-op task
 *   without creating a new empty function each time.
 * 
 * @type {() => void}
 */
noTask
```

```js
/**
 * Schedule a task.
 * 
 * Notes:
 * - `delay` is quantized to 50 ms ticks (floored).
 * - Returned `taskId` is `[targetTick, queueIndex]`:
 *   - `targetTick` -> tick whose queue contains this task
 *   - `queueIndex` -> index of the task's operationId inside that queue
 * - For `0 <= delay <= 49`, the scheduler queues the task first and then
 *   immediately attempts to execute it. If completed, the queued entry is
 *   auto-invalidated; if interrupted, it remains for later retry.
 * 
 * @param {function} task - Function to execute.
 * @param {number} [delay = 0] - Delay in milliseconds.
 * @param {string} [groupId = "default"] - Associate with that group / tag name.
 * 
 * @returns {[number, number]} taskId
 */
run(task, delay, groupId)
```

```js
/**
 * Stop a group.
 * 
 * Notes:
 * - Invalidates all tasks scheduled so far for that group.
 * - Does NOT scan queues; invalidation is done through a per-group operation id.
 * - Tasks scheduled later with the same `groupId` execute normally (treated as new and make the group active again).
 * 
 * @param {string} [groupId = "default"]
 * @returns {boolean} - `true` if the group was active and is now stopped, else `false`.
 */
stop(groupId)
```

```js
/**
 * Check whether a group is currently active.
 * 
 * Notes:
 * - "Active" means the group has not been stopped.
 * - A group becomes inactive only after `TS.stop(groupId)`.
 * - The group remains in memory until all its queued tasks are processed.
 * - Canceling individual tasks does not make the group inactive.
 * 
 * @param {string} [groupId = "default"]
 * @returns {boolean}
 */
isGroupActive(groupId)
```

```js
/**
 * Cancel one task by its `taskId`.
 * 
 * Notes:
 * - This invalidates the queued task entry.
 * - Memory is released later, when that queue is eventually processed.
 * 
 * @param {[number, number]} taskId
 * @returns {boolean} - `true` if the task was found and canceled, else `false`.
 */
cancel(taskId)
```

```js
/**
 * Check whether a task is currently active (not canceled, not invalidated by its group, and still present in the queue).
 * 
 * @param {[number, number]} taskId
 * @returns {boolean}
 */
isTaskActive(taskId)
```

```js
/**
 * Get the `groupId` of a scheduled task.
 * 
 * @param {[number, number]} taskId
 * @returns {string | null} - null` if the queue was already processed or the ID is invalid.
 */
getGroupId(taskId)
```

```js
/**
 * Tick runner.
 * 
 * @returns {void}
 */
tick()
```

</details>

---

<a id="core-concepts"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>💡 Core Concepts 💡</b></code> ❯</h2>
    </div>
  </summary>

---

  <div align="left">
    <h3>〔 <code><b>Task Type</b></code> 〕</h3>
  </div>

  <p>
    Similar to JavaScript <a href="https://javascript.info/settimeout-setinterval"><code>setTimeout</code></a>, the task must always be a <code>Function</code>.<br>
    To pass values into it, use <a href="https://javascript.info/closure"><code>closure</code></a> or <a href="https://javascript.info/call-apply-decorators"><code>wrapper</code></a> instead.<br>
    If you intentionally want a no-op task, use <code>TS.noTask</code>.
  </p>

```js
const value = "myValue";
TS.run(() => {
  // `value` is captured by closure
}, 1000, "example");
```

```js
const value = "myValue";
TS.run(function myTask() {
  // named functions are useful for self-rescheduling inside
}, 1000, "example");
```

```js
TS.run(TS.noTask, 1000, "example");
```

---

  <div align="left">
    <h3>〔 <code><b>Groups / Tags</b></code> 〕</h3>
  </div>

  <p>
    <code>groupId</code> gives you cheap, <code>O(1)</code> bulk invalidation
    and a simple way to organize different timers.
  </p>

  <ul>
    <li>Per-player timers: <code>"player_" + playerId + "_..."</code></li>
    <li>Per-system loops: <code>"autosave"</code>, <code>"storm_cycle"</code>, <code>"stage_67"</code></li>
    <li>Repeating loops (including conditional ones) that you may want to stop at any time</li>
    <li>Single-instance logic via <code>TS.isGroupActive(groupId)</code></li>
  </ul>

  <blockquote>
    <h4><code><b>! IMPORTANT</b></code></h4>
    <ul>
      <li><code>TS.cancel(taskId)</code> invalidates only one task and does not make the group inactive.</li>
      <li><code>TS.stop(groupId)</code> invalidates all tasks scheduled so far for that group.</li>
      <li>Neither operation frees memory instantly; queued entries are released naturally when their tick queue is processed.</li>
    </ul>
  </blockquote>

---

  <div align="left">
    <h3>〔 <code><b>Interruption Safety | "Instant Execution"</b></code> 〕</h3>
  </div>

  <p>
    Bloxd may interrupt code execution in a way that is not catchable with normal <code>try...catch</code>.
    For short delays (<code>0 <= delay <= 49 ms</code>), the scheduler uses an interruption-safe strategy:
  </p>

  <ol>
    <li>The task is queued first.</li>
    <li>The scheduler immediately attempts to execute it.</li>
    <li>If completed, the queued entry is auto-invalidated.</li>
    <li>If interrupted, the queued entry remains for later retry.</li>
  </ol>

  <p>
    This makes a short-delay task behave like “run as soon as possible” while preserving correctness under interruptions.
  </p>

  <blockquote>
    <h4><code><b>! NOTE</b></code></h4>
    <ul>
      <li>Use <code>0 <= delay <= 49</code> for an immediate attempt and interruption-safe fallback.</li>
      <li>Use <code>50 <= delay <= 99</code> if you want execution to happen <ins>exactly on the next</ins> scheduler tick.</li>
    </ul>
  </blockquote>

---

  <div align="left">
    <h3>〔 <code><b>Error Handling</b></code> 〕</h3>
  </div>

  <p>
    Each task runs inside a safety wrapper, so a thrown exception does not break the scheduler.<br>
    Errors are broadcasted to the chat in this format:
  </p>

```diff
- Task Scheduler [groupId]: ErrorName: ErrorMessage.
```

  <p>
    The failing task is skipped and the scheduler continues processing the queue.
  </p>

  <blockquote>
    <h4><code><b>! NOTE</b></code></h4>
    <p>
      Runtime interruption and regular JavaScript exceptions are different things.
      The scheduler is designed to survive both, but it is still best to keep tasks defensive:
      players can leave, entities can despawn, and world state can change unexpectedly.
      Use <code>try...catch...finally</code>, <code>api.checkValid(entityId)</code>, and other guards where needed.
    </p>
  </blockquote>

---

  <div align="left">
    <h3>〔 <code><b>Performance & Memory</b></code> 〕</h3>
  </div>

  <div align="left">
    <h4>⊂ <code><b>Time complexity (amortized)</b></code> ⊃</h4>
  </div>

  <p>
    API operations are designed to be <code>O(1)</code> with respect to the total number of scheduled tasks.
  </p>

  <table>
    <thead>
      <tr>
        <th align="left">Operation</th>
        <th align="left">Cost</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>TS.run(task, delay, groupId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
      <tr>
        <td><code>TS.stop(groupId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
      <tr>
        <td><code>TS.isGroupActive(groupId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
      <tr>
        <td><code>TS.cancel(taskId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
      <tr>
        <td><code>TS.isTaskActive(taskId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
      <tr>
        <td><code>TS.getGroupId(taskId)</code></td>
        <td><b>O(1)</b></td>
      </tr>
    </tbody>
  </table>

  <blockquote>
    <h4><code><b>! NOTE</b></code></h4>
    <p>
      The scheduler does not scan queues when you call <code>stop()</code> — it invalidates via a per-group operation id.<br>
      That is why stopping even a large group remains <code>O(1)</code>.
    </p>
  </blockquote>

  <div align="left">
    <h4>⊂ <code><b>Runtime cost (TU)</b></code> ⊃</h4>
  </div>

  <ul>
    <li>
      <code>Benchmark tool: <a href="https://github.com/delfineonx/runtime-tester">Runtime Tester</a> v2026-02-24-0001.</code>
    </li>
  </ul>

  <h3><code>TS.run(...) worst case is ≈ 50 TU</code></h3>

  <div align="left">
    <h4>⊂ <code><b>Memory Behavior</b></code> ⊃</h4>
  </div>

  <p>
    The scheduler can hold tasks in two states:
  </p>

  <ul>
    <li><b>Active</b> — executes on its <code>targetTick</code> unless it gets canceled or its group is stopped first.</li>
    <li><b>Inactive</b> — canceled or group-invalidated tasks remain stored until their <code>targetTick</code> is processed.</li>
  </ul>

  <p>
    Practical consequences:
  </p>

  <ul>
    <li>Canceling or stopping is cheap, but does not instantly free memory.</li>
    <li>Memory is released naturally as the scheduler advances and processes queues</li>
  </ul>

  <p>
    In practice, the maximum safe number of stored tasks before Bloxd starts throwing <code>Internal Error: out of memory</code>
    often lands around <b>~3000–6000 tasks</b> total.
  </p>

  <p>
    This range is workload-dependent:
  </p>
  <ul>
    <li>More unique group IDs => lower maximum capacity, since each group carries its own metadata overhead.</li>
    <li>Reusing a smaller set of group IDs is usually more efficient in both memory and runtime than creating many one-off groups.</li>
  </ul>

</details>

---

<a id="usage-patterns"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>🧩 Usage Patterns 🧩</b></code> ❯</h2>
    </div>
  </summary>

  <div align="left">
    <h3>〔 <code><b>Pattern 0 | Run important logic interruption-safe</b></code> 〕</h3>
  </div>

  <p>
    Wrap important work in a scheduler task, so it can safely resume next tick if execution gets interrupted.
  </p>

```js
const initPlayer = (playerId) => {
  // important work here
};

onPlayerJoin = (playerId) => {
  const tag = "init_player_" + playerId;

  // optional restart guard
  TS.stop(tag);

  // immediate execution attempt with interruption-safe fallback
  TS.run(() => initPlayer(playerId), 0, tag);
};
```

  <div align="left">
    <h3>〔 <code><b>Pattern 1 | Infinite loop (setInterval equivalent)</b></code> 〕</h3>
  </div>

  <p>
    Repeating behavior that you can stop anytime (announcements, autosave, effect zones).
  </p>

```js
const TIPS = [
  "Tip: You can use /help to see available commands!",
  "Tip: Breaking blocks gives you resources.",
  "Tip: Have fun and be respectful to other players!"
];

const TAG = "server_tip_announcement";
const INTERVAL = 30_000;  // 30 seconds

function broadcastRandomTip() {
  const randomTip = TIPS[(Math.random() * TIPS.length) | 0];
  api.broadcastMessage(randomTip, { color: "yellow" });
}

function setIntervalTips() {
  if (TS.isGroupActive(TAG)) { return; } // guard: don't start twice

  TS.run(function repeat() {
    broadcastRandomTip();
    TS.run(repeat, INTERVAL, TAG);
  }, INTERVAL, TAG);
}

setIntervalTips();

playerCommand = (playerId, command) => {
  if (command === "toggletips") {
    if (TS.isGroupActive(TAG)) {
      TS.stop(TAG);
      api.broadcastMessage("Server tips are disabled.");
    } else {
      setIntervalTips();
      api.broadcastMessage("Server tips are enabled.");
    }
    return true;
  }
};
```

---

  <div align="left">
    <h3>〔 <code><b>Pattern 2 | Self-ending (conditional) loop</b></code> 〕</h3>
  </div>

  <p>Loops that stop naturally (countdowns, staged effects, retries with a limit).</p>

```js
const COUNTDOWN_TIME = 10_000;
const STEP_TIME = 500;
const cachedTimeLeft = {};

function countdownForPlayer(playerId, startTime) {
  const tag = "player_countdown_" + playerId;

  const step = (timeLeft) => {
    cachedTimeLeft[playerId] = timeLeft;

    // defensive: player may leave
    if (!api.checkValid(playerId)) {
      delete cachedTimeLeft[playerId];
      return;
    }

    if (timeLeft > 0) {
      api.setClientOption(playerId, "middleTextLower", (timeLeft / 1000).toFixed(1)); // update remaining time
      TS.run(() => step(timeLeft - STEP_TIME), STEP_TIME, tag); // continue countdown
      return;
    }

    // end countdown and clear UI later
    api.setClientOption(playerId, "middleTextLower", "Carpe Diem UwU");
    TS.run(() => {
      if (api.checkValid(playerId)) {
        api.setClientOptionToDefault(playerId, "middleTextLower");
      }
      delete cachedTimeLeft[playerId];
    }, 2000, tag);
  };

  // reset any previous countdown tasks and start
  TS.stop(tag);
  TS.run(() => step(startTime), 0, tag);
}

playerCommand = (playerId, command) => {
  const countdownTag = "player_countdown_" + playerId;

  if (command === "start") {
    countdownForPlayer(playerId, COUNTDOWN_TIME);
    return true;
  }
  if (command === "pause") {
    TS.stop(countdownTag);
    return true;
  }
  if (command === "continue") {
    if (TS.isGroupActive(countdownTag)) {
      api.sendMessage(playerId, "Countdown is already running.");
      return true;
    }
    const timeLeft = cachedTimeLeft[playerId];
    if (timeLeft == null) {
      api.sendMessage(playerId, "Countdown hasn't been started.");
      return true;
    }
    countdownForPlayer(playerId, timeLeft);
    return true;
  }
  if (command === "clear") {
    TS.stop(countdownTag);
    api.setClientOptionToDefault(playerId, "middleTextLower");
    delete cachedTimeLeft[playerId];
    api.sendMessage(playerId, "Countdown was cleared.");
    return true;
  }
};
```

---

  <div align="left">
    <h3>〔 <code><b>Pattern 3 | Debounce (latest wins)</b></code> 〕</h3>
  </div>

  <p>
    Spam-prone actions where you want only the last scheduled one to run (saving, UI cleanup, expensive updates).
  </p>

```js
const bubbleNametagInfo = {
  subtitle: [{
    str: "",
    style: { color: "#dff8ff", fontWeight: "600", fontSize: "40px" }
  }],
  subtitleBackgroundColor: "rgba(0, 0, 0, 0)"
};

onPlayerChat = (playerId, chatMessage) => {
  const bubbleChatTag = "player_bubble_" + playerId;

  // cancel any previous message clearing for this player
  // (avoid stacking multiple tasks)
  TS.stop(bubbleChatTag);

  // show message
  bubbleNametagInfo.subtitle[0].str = chatMessage;
  api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", bubbleNametagInfo, true);

  // clear in 5 seconds
  TS.run(() => {
    if (!api.checkValid(playerId)) { return; }
    api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", null, true);
  }, 5000, bubbleChatTag);

  return null;
};
```

---

  <div align="left">
    <h3>〔 <code><b>Pattern 4 | Throttle / Cooldown</b></code> 〕</h3>
  </div>

  <p>
    Allow an action at most once per time window (abilities, commands, effects).
  </p>

```js
const nextMinUseTick = {};

function doAbility(playerId, abilityName) {
  if (abilityName === "launch") {
    api.applyImpulse(playerId, 0, 67, 0);
  }
}

function tryUseAbility(playerId, abilityName, cooldownMs) {
  const tag = "cooldown_" + abilityName + "_" + playerId;

  // block if there is a pending cooldown marker
  if (TS.isGroupActive(tag)) {
    const secondsLeft = (nextMinUseTick[tag] - TS.currentTick) * 0.05;
    api.sendMessage(playerId, secondsLeft.toFixed(2) + " seconds of cooldown left.");
    return;
  }

  doAbility(playerId, abilityName);

  // schedule a marker task to keep the group active during cooldown
  nextMinUseTick[tag] = TS.run(() => {
    delete nextMinUseTick[tag];
  }, cooldownMs, tag)[0];
}

playerCommand = (playerId, command) => {
  if (command === "launch") {
    tryUseAbility(playerId, "launch", 5000);
    return true;
  }
};
```

  <div align="left">
    <h3>〔 <code><b>Pattern 5 | Fixed-step sequence</b></code> 〕</h3>
  </div>

  <p>
    Sequences where the delay between steps is always the same (animations, delayed messages, simple cutscene-style flows).
  </p>

```js
function warpPlayer(playerId) {
  const tag = "player_warp_" + playerId;
  const STEP_DELAY = 1_500; // constant pacing between steps

  // optional: stop any previous warp sequence for this player.
  TS.stop(tag);

  const [x, y, z] = api.getPosition(playerId);
  const targetPos = [x, y + 67, z];

  const steps = [
    () => api.sendMessage(playerId, "Charging teleport..."),
    () => api.sendMessage(playerId, "Locking coordinates..."),
    () => {
      api.sendMessage(playerId, "Engage!");
      api.setPosition(playerId, targetPos);
    },
  ];

  const runStep = (index) => {
    // defensive: player may leave
    if (!api.checkValid(playerId)) { return; }

    steps[index]();

    // safely schedule next step
    if (index + 1 < steps.length) {
      TS.run(() => runStep(index + 1), STEP_DELAY, tag);
    }
  };

  TS.run(() => runStep(0), 0, tag);
}

playerCommand = (playerId, command) => {
  if (command === "warp") {
    warpPlayer(playerId);
    return true;
  }
};
```

  <div align="left">
    <h3>〔 <code><b>Pattern 6 | Variable-step sequence</b></code> 〕</h3>
  </div>

  <p>
    Sequences where each step has its own pacing (cinematic countdowns, staged boss spawns, multi-phase events).
  </p>

```js
// each step runs, then schedules the next one after `nextDelay`
const EVENT_STEPS = [
  { handler: () => api.broadcastMessage("Event starting soon..."), nextDelay: 1000 },
  { handler: () => api.broadcastMessage("3"), nextDelay: 700 },
  { handler: () => api.broadcastMessage("2"), nextDelay: 700 },
  { handler: () => api.broadcastMessage("1"), nextDelay: 700 },
  { handler: () => api.broadcastMessage("GO!"), nextDelay: 0 },
];

const EVENT_TAG = "event_67";

function startEventSequence(steps, tag) {
  // restart the sequence cleanly
  TS.stop(tag);

  const runStep = (index) => {
    steps[index].handler();
    if (index + 1 < steps.length) {
      TS.run(() => runStep(index + 1), steps[index].nextDelay, tag);
    }
  };

  TS.run(() => runStep(0), 0, tag);
}

playerCommand = (playerId, command) => {
  if (command === "start") {
    startEventSequence(EVENT_STEPS, EVENT_TAG);
    return true;
  }
  if (command === "cancel") {
    TS.stop(EVENT_TAG);
    api.broadcastMessage("Event was canceled.");
    return true;
  }
};
```

</details>

---

<a id="troubleshooting"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>🧯 Troubleshooting 🧯</b></code> ❯</h2>
    </div>
  </summary>

  <ul>
    <li>
      <code>My delay is not exact.</code><br>
      Delay is quantized to 50 ms ticks (floored). Small delays (<code><= 49 ms</code>) become <code>0</code>.
    </li>
    <li>
      <code>My long delay ran immediately.</code><br>
      Delay is coerced with <code>delay | 0</code> (32-bit signed integer). Values beyond <code>2_147_483_647 ms</code> (<code>42_949_672 ticks</code>) wrap and may become negative (then clamped to 0).
    </li>
    <li>
      <code>Nothing runs.</code><br>
      Make sure <code>TS.tick()</code> is called every game tick, preferably at the top of your <code>tick</code> callback.
    </li>
    <li>
      <code>TypeError: task is not a function.</code><br>
      <code>TS.run()</code> expects a function as its first argument. For intentional no-op tasks, use <code>TS.noTask</code>.
    </li>
    <li>
      <code>stop() did nothing (returned false).</code><br>
      That group is already inactive or no longer exists in memory.
    </li>
    <li>
      <code>cancel() did nothing (returned false).</code><br>
      The task is no longer exists in memory (queue has been already processed), or the <code>taskId</code> is invalid.
    </li>
  </ul>

</details>

---

<a id="license-and-credits"></a>
<details open>
  <summary>
    <div align="center">
      <h2>❮ <code><b>👥 License & Credits 👥</b></code> ❯</h2>
    </div>
  </summary>

```js
// Task Scheduler v2026-03-11-0001
// Copyright (c) 2025-2026 delfineonx, chmod, FrostyCaveman
// SPDX-License-Identifier: Apache-2.0
```

  <ul>
    <li>
      <code>Scheduler design and functionality were developed in collaboration with <i>chmod</i> (<a href="https://github.com/NlGBOB/bloxd-scheduler">Bloxd Task Scheduler</a>) and <i>FrostyCaveman</i> (<a href="https://rentry.co/3o4kgugy">Tick Timers</a>).</code>
    </li>
  </ul>

</details>

---
