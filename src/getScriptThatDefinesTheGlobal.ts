import { nameOfTheGlobal } from "./constants";

export function getScriptThatDefinesTheGlobal(params: { env: Record<string, unknown> }): string {
    const { env } = params;

    const scriptPropertyKey = "data-script-description";
    const scriptPropertyValue = "Environment variables injected by vite-envs";

    const envWithValuesInBase64 = Object.fromEntries(
        Object.entries(env).map(([key, value]) => [
            key,
            Buffer.from(`${value}`, "utf8").toString("base64")
        ])
    );

    const scriptThatDefinesTheGlobal = [
        `<script ${scriptPropertyKey}="${scriptPropertyValue}">`,
        `  var envWithValuesInBase64 = ${JSON.stringify(envWithValuesInBase64, null, 2)
            .replace(/^"/, "")
            .replace(/"$/, "")};`,
        `  var env = {};`,
        `  Object.keys(envWithValuesInBase64).forEach(function (key) {`,
        `    env[key] = atob(envWithValuesInBase64[key]);`,
        `  });`,
        `  window.${nameOfTheGlobal} = env;`,
        `</script>`
    ].join("\n");

    return scriptThatDefinesTheGlobal;
}
