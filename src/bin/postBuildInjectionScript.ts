import type { ViteEnvsMeta } from "../ViteEnvsMeta";
import { viteEnvsMetaFileBasename } from "../constants";
import { injectInHeadBeforeFirstScriptTag } from "../injectInHeadBeforeFirstScriptTag";
import { getScriptThatDefinesTheGlobal } from "../getScriptThatDefinesTheGlobal";
import { renderHtmlAsEjs } from "../renderHtmlAsEjs";
import { substituteHtmPlaceholders } from "../substituteHtmPlaceholders";
import * as cheerio from "cheerio";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { exclude } from "tsafe/exclude";
import { createSwEnvJsFile } from "../createSwEnvJsFile";

export async function postBuildInjectionScript() {
    const {
        assetsUrlPath,
        baseBuildTimeEnv,
        declaredEnv,
        computedEnv,
        htmlPre,
        nameOfTheGlobal
    }: ViteEnvsMeta = JSON.parse(
        fs.readFileSync(pathJoin(process.cwd(), viteEnvsMetaFileBasename)).toString("utf8")
    );

    const mergedEnv = {
        ...Object.fromEntries(
            Object.entries({
                ...baseBuildTimeEnv,
                ...computedEnv
            }).map(([key, value]) => [key, key in declaredEnv ? `${value}` : value])
        ),
        ...Object.fromEntries(
            Object.entries(declaredEnv).filter(([key, value]) => !(key in computedEnv && value === ""))
        ),
        ...Object.fromEntries(
            Object.entries(process.env)
                .filter(([key]) => key in declaredEnv)
                .map(([key, value]) => (value === undefined ? undefined : ([key, value] as const)))
                .filter(exclude(undefined))
        )
    };

    let processedHtml = htmlPre;

    processedHtml = await renderHtmlAsEjs({
        "html": processedHtml,
        "env": mergedEnv
    });

    processedHtml = substituteHtmPlaceholders({
        "html": processedHtml,
        "env": mergedEnv
    });

    const $pre_head = cheerio.load(processedHtml)("head");

    const cwd = process.cwd();

    const indexHtmlFilePath = pathJoin(cwd, "index.html");

    const $post = cheerio.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));

    $pre_head.append($post(`head script[src*='${assetsUrlPath}']`));
    $pre_head.append($post(`head link[href*='${assetsUrlPath}']`));

    $post("head").replaceWith($pre_head);

    processedHtml = $post.html();

    processedHtml = injectInHeadBeforeFirstScriptTag({
        "html": processedHtml,
        "htmlToInject": getScriptThatDefinesTheGlobal({ "env": mergedEnv, nameOfTheGlobal })
    });

    fs.writeFileSync(indexHtmlFilePath, Buffer.from(processedHtml, "utf8"));

    createSwEnvJsFile({ "distDirPath": cwd, mergedEnv, nameOfTheGlobal });
}
