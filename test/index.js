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
var downloadAndUnzip_1 = require("../tools/downloadAndUnzip");
var st = __importStar(require("scripting-tools"));
var path_1 = require("path");
var getProjectRoot_1 = require("../tools/getProjectRoot");
var sampleProjectDirPath = path_1.join(getProjectRoot_1.getProjectRoot(), "sample_project");
downloadAndUnzip_1.downloadAndUnzip({
    "url": "https://github.com/garronej/embed-react-app-envs/releases/download/ASSETS/sample_project.zip",
    "destDirPath": sampleProjectDirPath
});
var bin = require(path_1.join(getProjectRoot_1.getProjectRoot(), "package.json"))["bin"];
Object.keys(bin).forEach(function (scriptName) {
    return st.execSyncTrace("node " + path_1.join(getProjectRoot_1.getProjectRoot(), bin[scriptName]), { "cwd": sampleProjectDirPath });
});
//# sourceMappingURL=index.js.map