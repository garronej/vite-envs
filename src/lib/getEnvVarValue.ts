import type { nameOfTheGlobal as ofTypenameOfTheGlobal } from "../bin/nameOfTheGlobal";


let objectDefinedByThisModule: Record<string, string> | undefined = undefined;

export function getEnvVarValue(envVarName: string): string {

    read_from_cra_envs: {

        const objectDefinedByThisModuleJson: string | undefined = (window as any)["__cra-envs-json__" satisfies typeof ofTypenameOfTheGlobal] ?? undefined;

        if (objectDefinedByThisModuleJson === undefined) {
            break read_from_cra_envs;
        }

        if( objectDefinedByThisModule === undefined ) {
            objectDefinedByThisModule = JSON.parse(objectDefinedByThisModuleJson) as Record<string, string>;
        }

        const value= objectDefinedByThisModule[envVarName];

        if( value === undefined ) {
            throw new Error(`Wrong assertion, __cra-envs-json__ wasn't properly defined`);
        }

        return value;

    }

    const value = process.env[`REACT_APP_${envVarName}`];

    if (value === undefined) {
        throw new Error(`${envVarName} is not defined in the .env file`);
    }

    return value;






}
