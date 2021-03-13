export declare function getEnvFactory<Name extends string = string>(): {
    getEnv: <K extends Name>(key: K) => string;
};
