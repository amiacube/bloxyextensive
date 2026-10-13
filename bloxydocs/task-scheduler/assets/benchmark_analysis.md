
---

# Benchmark Analysis

---

## object creation

```js
let _obj = {};
RT.func_A = () => {
  _obj={};
  // ...
};
```
```
TU_1 = (143.223 - 4) / 100 = 1.3922
TU_2 = (112.9249 - 4) / 80 = 1.3616
TU_mean = (1.3922 + 1.3616) / 2 = 1.3769
TU ≈ 1.375
```

---

## `TS.run(...)` (worst case)

```js
let counter = 50;
RT.func_A = () => {
  counter += 50;
  TS.run(() => {}, counter, "id_" + counter);
  // counter += 50;
  // TS.run(() => {}, counter, "id_" + counter);
};
```
```txt
TU_1 = (56.6851 - 4) / 1 = 52.6851
TU_2 = (106.7775 - 4) / 2 = 51.3888
TU_mean = (52.6851 + 51.3888) / 2 = 52.0370
TU ≈ 52.04 - (1.375 * 3) ≈ 47.92
```

---
