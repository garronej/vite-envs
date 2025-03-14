export function getScriptThatDefinesTheGlobal(params: {
    env: Record<string, unknown>;
    nameOfTheGlobal: string;
}): string {
    const { env, nameOfTheGlobal } = params;

    const scriptPropertyKey = "data-script-description";
    const scriptPropertyValue = "Environment variables injected by vite-envs";

    const envWithValuesInBase64 = Object.fromEntries(
        Object.entries(env).map(([key, value]) => [
            key,
            Buffer.from(JSON.stringify(value), "utf8").toString("base64")
        ])
    );

    const scriptThatDefinesTheGlobal = [
        `<script ${scriptPropertyKey}="${scriptPropertyValue}">`,
        `  var envWithValuesInBase64 = ${JSON.stringify(envWithValuesInBase64, null, 2)
            .replace(/^"/, "")
            .replace(/"$/, "")};`,
        `  var env = {};`,
        `  Object.keys(envWithValuesInBase64).forEach(function (name) {`,
        `    env[name] = JSON.parse(`,
        `      new TextDecoder().decode(`,
        `        Uint8Array.from(`,
        `          atob(envWithValuesInBase64[name]),`,
        `          c => c.charCodeAt(0)`,
        `        )`,
        `      )`,
        `    );`,
        `  });`,
        `  window.${nameOfTheGlobal} = env;`,
        `</script>`
    ].join("\n");

    return scriptThatDefinesTheGlobal;
}
