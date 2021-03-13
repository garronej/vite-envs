import { nameOfTheGlobal } from "../bin/nameOfTheGlobal";

const errorMessage = [
    "The environnement variable should have been embedded in the script at build time.",
    "Check the documentation embed-react-app-envs"
].join(" ");

export function getEnvFactory<Name extends string = string>() {

    function getEnv<K extends Name>(key: K): string {

        const objectDefinedByThisModule: Record<string, string> = (window as any)[nameOfTheGlobal] ?? {};

        let value: string | undefined = objectDefinedByThisModule[key];

        if (value !== undefined) {
            return value;
        }

        if (process.env["NODE_ENV"] === "production") {
            throw new Error(errorMessage);
        }

        value = process.env[`REACT_APP_${key}`];

        if (value === undefined) {
            throw new Error(errorMessage);
        }

        return value;

    }


    return { getEnv };

}