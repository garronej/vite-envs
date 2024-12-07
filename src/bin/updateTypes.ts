import * as child_process from "child_process";
import { updateTypingScriptEnvName } from "../constants";

export function updateTypes() {
    child_process.execSync("npx vite", {
        "env": {
            ...process.env,
            [updateTypingScriptEnvName]: ""
        },
        "stdio": "inherit"
    });
}
