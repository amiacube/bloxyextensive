class Chat {
    constructor() {
        const Class = this.constructor;
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        } globalThis[Class.name] = this;
    }
    onPlayerJoin = (playerId) => {
        api.log("Successfully called Chat's onplayerjoin")
    };

    sayHi = () => {
        api.log("Hi from Chat");
    }

    static {
        new this();
    }
}