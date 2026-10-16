export function getScriptThatDefinesTheGlobal(base: string): string {
    const scriptPropertyKey = "data-script-description";
    const scriptPropertyValue = "Environment variables injected by vite-envs";

    return `<script ${scriptPropertyKey}="${scriptPropertyValue}" src="${base}swEnv.js"></script>`;
}
