import * as cheerio from "cheerio";
import { assert } from "tsafe/assert";

export function injectInHeadBeforeFirstScriptTag(params: {
    html: string;
    htmlToInject: string;
}): string {
    const { html, htmlToInject } = params;

    const delimiterStart = "<!-- vite-envs-inject xMd34xLmEkCvV4 -->";
    const delimiterEnd = "<!-- vite-envs-inject xSP2sKxMtxFtM -->";

    const clearedHtml = (() => {
        const [before, after] = html.split(delimiterStart);

        if (after === undefined) {
            return html;
        }

        const [, after2] = after.split(delimiterEnd);

        assert(after2 !== undefined);

        return before + after2;
    })();

    const htmlToInjectWithDelimiters = [delimiterStart, htmlToInject, delimiterEnd].join("\n");

    const $ = cheerio.load(clearedHtml);

    {
        const firstScriptTag = $("head script").first();

        if (firstScriptTag.length !== 0) {
            firstScriptTag.before(htmlToInjectWithDelimiters);
        } else {
            $("head").append(htmlToInjectWithDelimiters);
        }
    }

    return $.html();
}
