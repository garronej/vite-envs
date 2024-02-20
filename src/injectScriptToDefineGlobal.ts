import type * as cheerio from "cheerio";
import { nameOfTheGlobal } from "./constants";

export function injectScriptToDefineGlobal(params: {
    $: cheerio.CheerioAPI;
    env: Record<string, unknown>;
}): void {
    const { $, env } = params;

    const scriptPropertyKey = "data-script-description";
    const scriptPropertyValue = "Environment variables injected by vite-envs";

    $(`head script[${scriptPropertyKey}="${scriptPropertyValue}"]`).remove();

    const newScript = [
        `<script ${scriptPropertyKey}="${scriptPropertyValue}">`,
        `   window.${nameOfTheGlobal}= ${JSON.stringify(env)};`,
        `</script>`
    ].join("\n");

    {
        const firstScriptTag = $("head script").first();

        if (firstScriptTag.length !== 0) {
            // If a script tag exists, prepend the new script before the first script tag
            firstScriptTag.before(newScript);
        } else {
            // If no script tag exists, append the new script to the head
            $("head").append(newScript);
        }
    }
}
