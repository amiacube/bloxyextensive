// Rename ModuleTemplate to the name of the module you want to create
class ModuleTemplate {
    constructor() {
        const Class = this.constructor;

        // Ensure this class is a singleton
        if (globalThis[Class.name] instanceof Class) {
            return globalThis[Class.name];
        }
        globalThis[Class.name] = this;

        /* Define your module variables here.
           Example:
           this.myVariable = "value";
           You can access it later using 
           this.myVariable - from anywhere in this class
           this.ModuleTemplate.myVariable - from world code (ModuleTemplate is the name you gave the Class)*/

        // this.testVariable = 123;
    }

    /* Define your callbacks, functions, or module logic here.
       Examples: */

    //    onPlayerJoin = (playerId) => {
    //        // Called whenever a player joins
    //        api.log("Called onPlayerJoin from ModuleTemplate for player " + playerId);
    //    }


    // Add custom functions like this:
    // myFunction = () => {
    //     api.log("Called myFunction");
    // }

    /* Don't delete this static block. It automatically initializes your module
       when the script is loaded. */
    static {
        new this();
    }
}
