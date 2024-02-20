export type ViteEnvsMeta = {
    version: string;
    assetsUrlPath: string;
    htmlPre: string;
    env: Record<string, string>;
    computedEnv: Record<string, unknown>;
    baseBuildTimeEnv: Record<string, unknown>;
};
