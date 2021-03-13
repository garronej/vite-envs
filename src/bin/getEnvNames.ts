
import * as dotenv from "dotenv";
import { join as pathJoin } from "path";

export function getEnvNames(
    params: {
        targetProjectDirPath: string;
    }
): string[] {

    const { targetProjectDirPath } = params;

    return Object.keys(
        dotenv.config({
            "path": pathJoin(targetProjectDirPath, ".env"),
            "encoding": "utf8"
        }).parsed!
    )
        .map(prefixedEnvName => {
            const envName = prefixedEnvName.replace(/^REACT_APP_/, "");
            return envName === prefixedEnvName ? "" : envName;
        })
        .filter(envName => envName !== "");

}