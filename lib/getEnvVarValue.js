"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVarValue = void 0;
var nameOfTheGlobal_1 = require("../bin/nameOfTheGlobal");
var errorMessage = [
    "The environnement variable should have been embedded in the script at build time.",
    "Check the documentation react-envs"
].join(" ");
function getEnvVarValue(envVarName) {
    var _a;
    var objectDefinedByThisModule = (_a = window[nameOfTheGlobal_1.nameOfTheGlobal]) !== null && _a !== void 0 ? _a : {};
    var value = objectDefinedByThisModule[envVarName];
    if (value !== undefined) {
        return value;
    }
    if (process.env["NODE_ENV"] === "production") {
        throw new Error(errorMessage);
    }
    value = process.env["REACT_APP_" + envVarName];
    if (value === undefined) {
        throw new Error(errorMessage);
    }
    return value;
}
exports.getEnvVarValue = getEnvVarValue;
//# sourceMappingURL=getEnvVarValue.js.map