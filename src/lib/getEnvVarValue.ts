import { nameOfTheGlobal } from "../bin/nameOfTheGlobal";

const errorMessage = [
    "The environnement variable should have been embedded in the script at build time.",
    "Check the documentation react-envs"
].join(" ");

export function getEnvVarValue(envVarName: string): string {

    const objectDefinedByThisModule: Record<string, string> = (window as any)[nameOfTheGlobal] ?? {};

    let value: string | undefined = objectDefinedByThisModule[envVarName];

    if (value !== undefined) {
        return value;
    }

    if (process.env["NODE_ENV"] === "production") {
        throw new Error(errorMessage);
    }

    value = process.env[`REACT_APP_${envVarName}`];

    if (value === undefined) {
        throw new Error(errorMessage);
    }

    return value;

}
