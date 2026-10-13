Imagine you've built a complex object. When you try to save it to the Moonstone Chest, the game converts it to JSON-stringified string.

*   **Without this tool:** Your data becomes, for example, a **668-character string**. This is **too big for the chest** (668 > 476) and will fail to save, forcing you to use more moonstone chest slots.

*   **With this tool:** The same data is compressed into a, for example, **269-character string**. You just saved almost **60%** of the space. Compression rate varies.

### How to Use It

```javascript
/* [Assume the minified code has been pasted here] */
const someObject = {
    "sessionId": "sess_abc123xyz",
    "userProfile": {
        "userId": 98765,
        "username": "test_user",
        "isActive": true,
        "roles": ["admin", "editor"],
        "preferences": null,
        "listOfNumbers": [1515,858818,919030],
        "statusMessage": "All systems are go!"
    }
}

const compressed = compress(someObject);
api.setMoonstoneChestItemSlot("-1", 1, "temp", 1, {customDisplayName: compressed})

// Getting
const customDisplayName = api.getMoonstoneChestItemSlot("-1", 1).attributes.customDisplayName;
api.log(customDisplayName)
const decompressed = decompress(customDisplayName)

// Accessing values
console.log("Your original Object:", decompressed)
console.log("Decompressed is an object, let's access sessionId ", decompressed.sessionId) 
```

### Pro-Tip for Maximum Savings

For even more compression, use short keys in your data object (e.g., use `'p'` instead of `'position'`). This makes the initial string smaller and easier for the encoder to shrink.

### Important Note

This is a new tool for the community. While it works well, it's always smart to back up important data. Please test it with your setups.