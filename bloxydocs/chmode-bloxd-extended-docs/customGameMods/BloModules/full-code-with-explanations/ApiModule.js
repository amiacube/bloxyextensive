class Api {
    constructor() {
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        }
        globalThis[Class.name] = this;

        this.cache = {};
        this.lastTimestamp = 0;

        const originalApi = globalThis.api;

        for (const propName in originalApi) {
            const originalValue = originalApi[propName];

            if (typeof originalValue === 'function') {
                this[propName] = (...args) => {
                    const currentTimestamp = Date.now();
                    if (currentTimestamp > this.lastTimestamp) {
                        this.cache = {};
                        this.lastTimestamp = currentTimestamp;
                    }
                    
                    const cacheKey = `${propName}_${JSON.stringify(args)}`;

                    if (this.cache.hasOwnProperty(cacheKey)) {
                        return this.cache[cacheKey];
                    }
                    const result = originalValue.apply(originalApi, args);
                    this.cache[cacheKey] = result;
                    return result;
                };
            } else {
                this[propName] = originalValue;
            }
        }

        console.log("Api singleton initialised and ready.");
    }

    static {
        new this();
    }
}