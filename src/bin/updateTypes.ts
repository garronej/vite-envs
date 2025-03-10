import * as child_process from "child_process";
import { updateTypingScriptEnvName } from "../constants";

export async function updateTypes(): Promise<void> {
    const child = child_process.spawn("npx", ["vite", "dev"], {
        env: {
            ...process.env,
            [updateTypingScriptEnvName]: ""
        },
        shell: true
    });

    child.stdout.on("data", data => {
        const dataStr = data.toString("utf8");

        if (dataStr.includes("VITE") && dataStr.includes("ready in")) {
            console.log(
                "vite-envs vite plugin not enabled, skipping update-types (Ok in Docker build stage)"
            );
            process.exit(0);
        }

        process.stdout.write(data);
    });

    child.stderr.on("data", data => process.stderr.write(data));

    await new Promise<void>(resolve => {
        child.on("exit", code => {
            if (code !== 0) {
                process.exit(code ?? -1);
            }
            resolve();
        });
    });
}
