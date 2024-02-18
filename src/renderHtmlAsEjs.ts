import ejs from "ejs";
import { multiReplace } from "./tools/multiReplace";
import JSON5 from "json5";

export function renderHtmlAsEjs(params: { html: string; env: Record<string, string> }): string {
    const { html, env } = params;

    let renderedHtml = ejs.render(
        html,
        {
            env,
            JSON5
        },
        { "escape": str => str }
    );

    renderedHtml = multiReplace({
        "input": renderedHtml,
        "keyValues": Object.fromEntries(Object.entries(env).map(([key, value]) => [`%${key}%`, value]))
    });

    return renderedHtml;
}
