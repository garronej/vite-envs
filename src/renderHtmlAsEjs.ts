import ejs from "ejs";
import JSON5 from "json5";
import YAML from "yaml";
import { replaceAll } from "./tools/String.prototype.replaceAll";

export function renderHtmlAsEjs(params: { html: string; env: Record<string, unknown> }): string {
    const { html, env } = params;

    const placeholder = "__xLd9dwJsZz32s__";

    let renderedHtml = replaceAll(html, "import.meta.env", placeholder);

    renderedHtml = ejs.render(
        renderedHtml,
        {
            [placeholder]: env,
            JSON5,
            YAML
        },
        { "escape": str => str }
    );

    renderedHtml = replaceAll(renderedHtml, placeholder, "import.meta.env");

    return renderedHtml;
}
