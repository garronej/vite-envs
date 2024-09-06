import * as dotenv from "dotenv";

export function parseDotEnv(params: { path: string }): Record<string, string> {
    const { path } = params;

    const { parsed } = dotenv.config({
        path,
        "encoding": "utf8",
        "processEnv": {}
    });

    if (parsed === undefined) {
        throw new Error(`Could not parse ${path}`);
    }

    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, parseEnvValue(value)]));
}

export function parseEnvValue(value: string): string {
    decode_base64: {
        const match = value.match(/^vite-envs:b64Decode\(([^)]+)\)$/);
        if (match === null) {
            break decode_base64;
        }

        return Buffer.from(match[1], "base64").toString("utf8");
    }

    return value;
}
