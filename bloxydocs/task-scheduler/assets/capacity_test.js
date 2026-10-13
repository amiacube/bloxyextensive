
// all tasks in the same tick
{
  const N = 13;
  
  globalThis.counter_0 = 0;
  let counter_1 = 0;
  TS.run(function () {
    while (counter_1 < N) {
      let counter_2 = 0;
      TS.run(() => {
        while (counter_2 < 500) {
          TS.run(() => {}, 1000000, "id_" + counter_0);
          counter_0++;
          counter_2++;
        }
      }, 150);
      counter_1++;
    };
  }, 50);
}

// all tasks in different ticks
{
  const N = 8;
  
  globalThis.counter_0 = 0;
  let counter_1 = 0;
  TS.run(function () {
    while (counter_1 < N) {
      let counter_2 = 0;
      TS.run(() => {
        while (counter_2 < 500) {
          TS.run(() => {}, (counter_0 + 20000) * 50, "id_" + counter_0);
          counter_0++;
          counter_2++;
        }
      }, 150);
      counter_1++;
    };
  }, 50);
}

// amount of scheduled (active) tasks
{
  console.log(counter_0);
}

