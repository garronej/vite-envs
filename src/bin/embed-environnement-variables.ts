#!/usr/bin/env node

import "minimal-polyfills/Object.fromEntries";
import { join as pathJoin } from "path";
import { readEnvFromFile } from "./readEnvFromFile";
import cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import * as fs from "fs";
import { nameOfTheGlobal } from "./nameOfTheGlobal";
import { multiReplace } from "../tools/multiReplace";
import ejs from "ejs";
import url from "url";

const targetProjectDirPath = process.cwd();

const includesEnvLocal = ["--includes-.env.local", "-i"].includes(process.argv[2] ?? "");

const candidateIndexHtmlFilePaths =
    ["build", "html", "dist"]
        .map(name => pathJoin(targetProjectDirPath, name, "index.html"));

const indexHtmlFilePath = candidateIndexHtmlFilePaths.find(fs.existsSync);

if (indexHtmlFilePath === undefined) {
    throw new Error([
        "Can't find the index.html to inject var env in. ",
        `Tried: ${candidateIndexHtmlFilePaths.join("nor")}`
    ].join(" "));
}


const { resolvedEnvs } = (() => {

    const envLocal = includesEnvLocal ?
        readEnvFromFile({ targetProjectDirPath, "target": ".env.local" }) :
        {};

    const resolvedEnvs = Object.fromEntries(
        Object.keys(readEnvFromFile({ targetProjectDirPath, "target": ".env" }))
            .map(envName => [
                envName,
                (
                    process.env[envName] ||
                    process.env[`REACT_APP_${envName}`] ||
                    envLocal[envName] ||
                    envLocal[`REACT_APP_${envName}`] ||
                    ""
                )
            ])
    );

    return { resolvedEnvs };

})();

let $: CheerioAPI | undefined = cheerio.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));

const indexHtmlPublicFilePath = [pathJoin(targetProjectDirPath, "public", "index.html")].find(fs.existsSync);

if (indexHtmlPublicFilePath !== undefined) {

    let str = fs.readFileSync(indexHtmlPublicFilePath).toString("utf8");

    const resolvedEnvsWithReactAppPrefix = {
        ...Object.fromEntries(
            Object.entries(resolvedEnvs)
                .map(([key, value]) => [`REACT_APP_${key}`, value])
        ),
        "PUBLIC_URL": (() => {

            const packageJsonFilePath = [pathJoin(targetProjectDirPath, "package.json")].find(fs.existsSync);

            if (!packageJsonFilePath) {
                return "";
            }

            const { homepage } = JSON.parse(fs.readFileSync(packageJsonFilePath).toString("utf8"));

            if (homepage === undefined) {
                return "";
            }

            const { pathname } = url.parse(homepage);

            return pathname === "/" ? "" : (pathname ?? "");

        })()
    };

    str = ejs.render(
        str,
        {
            "process": {
                "env": resolvedEnvsWithReactAppPrefix
            },
        },
        {
            "escape": str => str
        }
    );

    str = multiReplace({
        "input": str,
        "keyValues": Object.fromEntries(
            Object.entries(resolvedEnvsWithReactAppPrefix)
                .map(([key, value]) => [`%${key}%`, value])
        )
    });

    const $_public = cheerio.load(str);

    $_public("body").replaceWith($("body"));

    $_public("head").append($("head script[src*='/static/js/']"));
    $_public("head").append($("head link[href*='/static/css/']"));

    $ = $_public;

}


const scriptPropertyKey = "data-script-description";
const scriptPropertyValue = "Env injected by embed-environnement-variables, a script of cra-envs";

$(`script[${scriptPropertyKey}="${scriptPropertyValue}"]`).remove();

const newScript = [
    `<script ${scriptPropertyKey}="${scriptPropertyValue}">`,
    `   window["${nameOfTheGlobal}"]= ${JSON.stringify(resolvedEnvs)};`,
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


fs.writeFileSync(
    indexHtmlFilePath,
    Buffer.from($.html(), "utf8")
);
