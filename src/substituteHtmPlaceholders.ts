import { multiReplace } from "./tools/multiReplace";

export function substituteHtmPlaceholders(params: {
    html: string;
    env: Record<string, unknown>;
}): string {
    const { html, env } = params;

    return multiReplace({
        "input": html,
        "keyValues": Object.fromEntries(
            Object.entries(env).map(([key, value]) => [`%${key}%`, `${value}`])
        )
    });
}
