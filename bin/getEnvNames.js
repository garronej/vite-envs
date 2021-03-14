"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvNames = void 0;
var dotenv = __importStar(require("dotenv"));
var path_1 = require("path");
function getEnvNames(params) {
    var targetProjectDirPath = params.targetProjectDirPath;
    return Object.keys(dotenv.config({
        "path": path_1.join(targetProjectDirPath, ".env"),
        "encoding": "utf8"
    }).parsed)
        .map(function (prefixedEnvName) {
        var envName = prefixedEnvName.replace(/^REACT_APP_/, "");
        return envName === prefixedEnvName ? "" : envName;
    })
        .filter(function (envName) { return envName !== ""; });
}
exports.getEnvNames = getEnvNames;
//# sourceMappingURL=getEnvNames.js.map