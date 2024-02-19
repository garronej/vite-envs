import ejs from "ejs";
import { multiReplace } from "./tools/multiReplace";
import JSON5 from "json5";
import { replaceAll } from "./tools/String.prototype.replaceAll";
import * as cheerio from "cheerio";

export function renderHtmlAsEjs(params: { html: string; env: Record<string, string> }): string {
    const { html, env } = params;

    const placeholder = "__xLd9dwJsZz32s__";

    let renderedHtml = replaceAll(html, "import.meta.env", placeholder);

    renderedHtml = ejs.render(
        renderedHtml,
        {
            [placeholder]: env,
            JSON5
        },
        { "escape": str => str }
    );

    renderedHtml = replaceAll(renderedHtml, placeholder, "import.meta.env");

    renderedHtml = multiReplace({
        "input": renderedHtml,
        "keyValues": Object.fromEntries(Object.entries(env).map(([key, value]) => [`%${key}%`, value]))
    });

    const $ = cheerio.load(renderedHtml);

    $("*")
        .contents()
        .filter(function () {
            return this.type === "comment";
        })
        .remove();

    renderedHtml = $.html();

    return renderedHtml;
}
