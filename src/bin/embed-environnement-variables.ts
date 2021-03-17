#!/usr/bin/env node

import "minimal-polyfills/Object.fromEntries";
import { join as pathJoin } from "path";
import { readEnvFromFile } from "./readEnvFromFile";
import cheerio from "cheerio";
import * as fs from "fs";
import { nameOfTheGlobal } from "./nameOfTheGlobal";

const targetProjectDirPath = process.cwd();

const includesEnvLocal = ["--includes-.env.local", "-i"].includes(process.argv[2] ?? "");

const candidateIndexHtmlFilePaths =
    ["build", "html"]
        .map(name => pathJoin(targetProjectDirPath, name, "index.html"));

const indexHtmlFilePath = candidateIndexHtmlFilePaths.find(fs.existsSync);

if (indexHtmlFilePath === undefined) {
    throw new Error([
        "Can't find the index.html to inject var env in. ",
        `Tried: ${candidateIndexHtmlFilePaths.join("nor")}`
    ].join(" "));
}

const $ = cheerio.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));

const domId = "environnement-variables";

$(`head > #${domId}`).remove();

const envLocal = includesEnvLocal ? 
    readEnvFromFile({ targetProjectDirPath, "target": ".env.local" }) : 
    {};

$("head").prepend(
    [
        `<script id="${domId}">`,
        `   window["${nameOfTheGlobal}"]= ${JSON.stringify(
            Object.fromEntries(
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
            )
        )};`,
        `</script>`
    ].join("\n")
);

fs.writeFileSync(
    indexHtmlFilePath,
    Buffer.from($.html(), "utf8")
);
