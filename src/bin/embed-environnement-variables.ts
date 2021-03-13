#!/usr/bin/env node

import "minimal-polyfills/Object.fromEntries";
import { join as pathJoin } from "path";
import { getEnvNames } from "./getEnvNames";
import cheerio from "cheerio";
import * as fs from "fs";
import { nameOfTheGlobal } from "./nameOfTheGlobal";

const targetProjectDirPath = process.cwd();

//const envNames =getEnvNames({ targetProjectDirPath });

const indexHtmlFilePath = pathJoin(targetProjectDirPath, "build", "index.html");

const $ = cheerio.load(fs.readFileSync(indexHtmlFilePath).toString("utf8"));

const domId = "environnement-variables";

$(`head > #${domId}`).remove();

$("head").prepend(
    [
        `<script id="${domId}">`,
        `   window["${nameOfTheGlobal}"]= ${JSON.stringify(
            Object.fromEntries(
                getEnvNames({ targetProjectDirPath })
                    .map(envName => [
                        envName,
                        process.env[envName] || process.env[`REACT_APP_${envName}`] || ""
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
