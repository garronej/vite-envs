import type * as cheerio from "cheerio";
import { nameOfTheGlobal } from "./constants";
import { symToStr } from "tsafe/symToStr";

export function injectScriptToDefineGlobal(params: {
    $: cheerio.CheerioAPI;
    env: Record<string, unknown>;
}): void {
    const { $, env } = params;

    const scriptPropertyKey = "data-script-description";
    const scriptPropertyValue = "Environment variables injected by vite-envs";

    $(`head script[${scriptPropertyKey}="${scriptPropertyValue}"]`).remove();

    const base64EncodedStringifiedEnv = Buffer.from(JSON.stringify(env), "utf8").toString("base64");

    const newScript = [
        `<script ${scriptPropertyKey}="${scriptPropertyValue}">`,
        `   const ${symToStr({ base64EncodedStringifiedEnv })} = "${base64EncodedStringifiedEnv}";`,
        `   window.${nameOfTheGlobal}= JSON.parse(atob(${symToStr({ base64EncodedStringifiedEnv })}));`,
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
