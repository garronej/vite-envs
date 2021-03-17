
import "minimal-polyfills/Object.fromEntries";
import * as dotenv from "dotenv";
import { join as pathJoin } from "path";
import * as fs from "fs";

/** Throws if file doesn't exist */
export function readEnvFromFile(
    params: {
        targetProjectDirPath: string;
        target: ".env" | ".env.local"
    }
): Record<string, string> {

    const { targetProjectDirPath, target } = params;

    const envFilePath = pathJoin(targetProjectDirPath, target);

    if (!fs.existsSync(envFilePath)) {
        throw new Error(`Can't find ${target} file here: ${targetProjectDirPath}`);
    }

    return Object.fromEntries(
        Object.entries(
            dotenv.config({
                "path": envFilePath,
                "encoding": "utf8"
            }).parsed!
        )
            .map(([prefixedEnvName, value]) => {
                const envName = prefixedEnvName.replace(/^REACT_APP_/, "");
                return [envName === prefixedEnvName ? "" : envName, value];
            })
            .filter(([envName]) => envName !== "")
    );

}