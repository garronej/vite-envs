import ejs from "ejs";
import { replaceAll } from "./tools/String.prototype.replaceAll";

export async function renderHtmlAsEjs(params: {
    html: string;
    env: Record<string, unknown>;
}): Promise<string> {
    const { html, env } = params;

    const placeholder = "__xLd9dwJsZz32s__";

    let renderedHtml = replaceAll(html, "import.meta.env", placeholder);

    const JSON5 = await import("json5").then(
        m => m.default,
        () => undefined
    );
    const YAML = await import("yaml").then(
        m => m.default,
        () => undefined
    );

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
