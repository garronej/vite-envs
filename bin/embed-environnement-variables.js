#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("minimal-polyfills/Object.fromEntries");
var path_1 = require("path");
var getEnvNames_1 = require("./getEnvNames");
var cheerio_1 = __importDefault(require("cheerio"));
var fs = __importStar(require("fs"));
var nameOfTheGlobal_1 = require("./nameOfTheGlobal");
var targetProjectDirPath = process.cwd();
//const envNames =getEnvNames({ targetProjectDirPath });
var indexHtmlFilePath = path_1.join(targetProjectDirPath, "build", "index.html");
var $ = cheerio_1.default.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));
var domId = "environnement-variables";
$("head > #" + domId).remove();
$("head").prepend([
    "<script id=\"" + domId + "\">",
    "   window[\"" + nameOfTheGlobal_1.nameOfTheGlobal + "\"]= " + JSON.stringify(Object.fromEntries(getEnvNames_1.getEnvNames({ targetProjectDirPath: targetProjectDirPath })
        .map(function (envName) { return [
        envName,
        process.env[envName] || process.env["REACT_APP_" + envName] || ""
    ]; }))) + ";",
    "</script>"
].join("\n"));
fs.writeFileSync(indexHtmlFilePath, Buffer.from($.html(), "utf8"));
//# sourceMappingURL=embed-environnement-variables.js.map