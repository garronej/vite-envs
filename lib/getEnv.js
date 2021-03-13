"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvFactory = void 0;
var nameOfTheGlobal_1 = require("../bin/nameOfTheGlobal");
var errorMessage = [
    "The environnement variable should have been embedded in the script at build time.",
    "Check the documentation embed-react-app-envs"
].join(" ");
function getEnvFactory() {
    function getEnv(key) {
        var _a;
        var objectDefinedByThisModule = (_a = window[nameOfTheGlobal_1.nameOfTheGlobal]) !== null && _a !== void 0 ? _a : {};
        var value = objectDefinedByThisModule[key];
        if (value !== undefined) {
            return value;
        }
        if (process.env["NODE_ENV"] === "production") {
            throw new Error(errorMessage);
        }
        value = process.env["REACT_APP_" + key];
        if (value === undefined) {
            throw new Error(errorMessage);
        }
        return value;
    }
    return { getEnv: getEnv };
}
exports.getEnvFactory = getEnvFactory;
//# sourceMappingURL=getEnv.js.map