
import * as dotenv from "dotenv";
import { join as pathJoin } from "path";
import * as fs from "fs";

export function getEnvNames(
    params: {
        targetProjectDirPath: string;
    }
): string[] {

    const { targetProjectDirPath } = params;

    const envFilePath= pathJoin(targetProjectDirPath, ".env");

    if( !fs.existsSync(envFilePath ) ){
        throw new Error(`Can't find the .env file here ${envFilePath}`);
    }

    return Object.keys(
        dotenv.config({
            "path": envFilePath,
            "encoding": "utf8"
        }).parsed!
    )
        .map(prefixedEnvName => {
            const envName = prefixedEnvName.replace(/^REACT_APP_/, "");
            return envName === prefixedEnvName ? "" : envName;
        })
        .filter(envName => envName !== "");

}