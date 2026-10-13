globalThis.tickCount = 0;
tick = (ms) => {
  tickCount++;
};

globalThis.executionChainState = {}; // playerId -> [bitmask0, bitmask1, bitmask2, bitmask3, tickTime, firstX, firstY, firstZ, chainLength, indexCounter]
function isExeState(playerId, blockPosition, chainLength = 128, offsets, isBitmask = false) {
  let state = executionChainState[playerId];
  if (!state) {
    state = executionChainState[playerId] = new Int32Array(10);
  }
  if (state[4] !== tickCount) {
    state[4] = tickCount;
    state[5] = blockPosition[0];
    state[6] = blockPosition[1];
    state[7] = blockPosition[2];
    state[8] = chainLength;
    state[9] = -1;
    if (offsets === null) {
      state[0] = state[1] = state[2] = state[3] = 0xFFFFFFFF;
    } else if (isBitmask) {
      state[0] = offsets?.[0];
      state[1] = offsets?.[1];
      state[2] = offsets?.[2];
      state[3] = offsets?.[3];
    } else {
      state[0] = state[1] = state[2] = state[3] = 0;
      if (offsets?.length | 0) {
        for (let index of offsets) {
          index >>>= 0;
          if (index < 128) {
            state[index >>> 5] |= (1 << (index & 31));
          }
        }
      }
    }
  } else if (state[9] < state[8] &&
             state[5] === (blockPosition[0] | 0) && 
             state[6] === (blockPosition[1] | 0) &&  
             state[7] === (blockPosition[2] | 0)) {
    state[9] = -1;
  }
  const index = ++state[9];
  return (index < 128) && ((state[index >>> 5] & (1 << (index & 31))) !== 0);
}

function getBitmaskOffsets(offsets, showMask = false, displayBase = 10) {
  const masks = new Int32Array(4);
  if (offsets === null) {
    masks[0] = masks[1] = masks[2] = masks[3] = 0xFFFFFFFF;
  } else if (offsets?.length | 0) {
    for (let index of offsets) {
      index >>>= 0;
      if (index < 128) {
        masks[index >>> 5] |= (1 << (index & 31));
      }
    }
  }
  if (showMask) {
    const base = displayBase | 0;
    let result;
    if (base === 10 || base < 2 || base > 36) {
      result = `[${masks[0] >>> 0}, ${masks[1] >>> 0}, ${masks[2] >>> 0}, ${masks[3] >>> 0}]`;
    } else {
      const prefix = (base === 2 ? "0b" : (base === 8 ? "0o" : (base === 16 ? "0x" : "")));
      result = `[${prefix}${(masks[0] >>> 0).toString(base)}, ${prefix}${(masks[1] >>> 0).toString(base)}, ${prefix}${(masks[2] >>> 0).toString(base)}, ${prefix}${(masks[3] >>> 0).toString(base)}]`;
    }
    api.log(result);
  }
  return masks;
}
