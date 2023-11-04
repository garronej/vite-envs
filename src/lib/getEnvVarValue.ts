import { nameOfTheGlobal } from "../bin/nameOfTheGlobal";

export function getEnvVarValue(envVarName: string): string {

    const objectDefinedByThisModule: Record<string, string> = (window as any)[nameOfTheGlobal] ?? {};

    let value: string | undefined = objectDefinedByThisModule[envVarName];

    if (value !== undefined) {
        return value;
    }

    value = process.env[`REACT_APP_${envVarName}`];

    if (value === undefined) {
        throw new Error(`${envVarName} is not defined in the .env file`);
    }

    return value;

}
