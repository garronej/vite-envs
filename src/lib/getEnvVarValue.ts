import { nameOfTheGlobal } from "../bin/nameOfTheGlobal";

const getErrorMessage = (envVarName: string)=>[
    "This project is using react-envs however it seems that",
    "the script 'npx embed-environnement-variables' hasn't been",
    `run. As a result the value of ${envVarName} was not bundle`,
    "in the script. Documentation: https://github.com/garronej/react-envs"
].join(" ");

export function getEnvVarValue(envVarName: string): string {

    const objectDefinedByThisModule: Record<string, string> = (window as any)[nameOfTheGlobal] ?? {};

    let value: string | undefined = objectDefinedByThisModule[envVarName];

    if (value !== undefined) {
        return value;
    }

    if (process.env["NODE_ENV"] === "production") {
        throw new Error(getErrorMessage(envVarName));
    }

    value = process.env[`REACT_APP_${envVarName}`];

    if (value === undefined) {
        throw new Error(getErrorMessage(envVarName));
    }

    return value;

}
