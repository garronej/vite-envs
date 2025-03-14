export type ViteEnvsMeta = {
    version: string;
    assetsUrlPath: string;
    htmlPre: string;
    declaredEnv: Record<string, string>;
    computedEnv: Record<string, unknown>;
    baseBuildTimeEnv: Record<string, unknown>;
    nameOfTheGlobal: string;
};
