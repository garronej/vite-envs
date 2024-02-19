import type { ViteEnvsMeta } from "../ViteEnvsMeta";
import { viteEnvsMetaFileBasename } from "../constants";
import { injectScriptToDefineGlobal } from "../injectScriptToDefineGlobal";
import { renderHtmlAsEjs } from "../renderHtmlAsEjs";
import * as cheerio from "cheerio";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { exclude } from "tsafe/exclude";

export function postBuildInjectionScript() {
    const { assetsUrlPath, baseBuildTimeEnv, env, htmlPre }: ViteEnvsMeta = JSON.parse(
        fs.readFileSync(pathJoin(process.cwd(), viteEnvsMetaFileBasename)).toString("utf8")
    );

    const mergedEnv = ((): Record<string, string> => {
        const acceptedEnvVarNames = new Set([...Object.keys(baseBuildTimeEnv), ...Object.keys(env)]);

        return {
            ...baseBuildTimeEnv,
            ...env,
            ...Object.fromEntries(
                Object.entries(process.env)
                    .filter(([key]) => acceptedEnvVarNames.has(key))
                    .map(([key, value]) => (value === undefined ? undefined : ([key, value] as const)))
                    .filter(exclude(undefined))
            )
        };
    })();

    const $pre_head = cheerio.load(
        renderHtmlAsEjs({
            "html": htmlPre,
            "env": mergedEnv
        })
    )("head");

    const indexHtmlFilePath = pathJoin(process.cwd(), "index.html");

    const $post = cheerio.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));

    $pre_head.append($post(`head script[src*='${assetsUrlPath}']`));
    $pre_head.append($post(`head link[href*='${assetsUrlPath}']`));

    $post("head").replaceWith($pre_head);

    injectScriptToDefineGlobal({
        "$": $post,
        "env": mergedEnv
    });

    fs.writeFileSync(indexHtmlFilePath, Buffer.from($post.html(), "utf8"));
}
