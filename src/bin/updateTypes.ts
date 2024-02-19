import * as child_process from "child_process";
import { updateTypingScriptEnvName } from "../constants";

export function updateTypes() {
    child_process.execSync("npx vite", {
        "env": {
            ...process.env,
            [updateTypingScriptEnvName]: ""
        }
    });
    console.log(`src/vite-env.d.ts has been updated`);
}
