import * as cheerio from "cheerio";

export function injectInHeadBeforeFirstScriptTag(params: {
    html: string;
    htmlToInject: string;
}): string {
    const { html, htmlToInject } = params;

    const $ = cheerio.load(html);

    {
        const firstScriptTag = $("head script").first();

        if (firstScriptTag.length !== 0) {
            firstScriptTag.before(htmlToInject);
        } else {
            $("head").append(htmlToInject);
        }
    }

    return $.html();
}
