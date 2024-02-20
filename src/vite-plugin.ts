import {
    join as pathJoin,
    sep as pathSep,
    posix as posixPath,
    resolve as pathResolve,
    basename as pathBasename
} from "path";
import type { Plugin } from "vite";
import { assert } from "tsafe/assert";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as cheerio from "cheerio";
import { exclude } from "tsafe/exclude";
import { nameOfTheGlobal, viteEnvsMetaFileBasename, updateTypingScriptEnvName } from "./constants";
import { injectScriptToDefineGlobal } from "./injectScriptToDefineGlobal";
import { renderHtmlAsEjs } from "./renderHtmlAsEjs";
import type { ViteEnvsMeta } from "./ViteEnvsMeta";
import { replaceAll } from "./tools/String.prototype.replaceAll";
import { transformCodebase } from "./tools/transformCodebase";

export function viteEnvs() {
    let resultOfConfigResolved:
        | {
              appRootDirPath: string;
              baseBuildTimeEnv: Record<string, unknown>;
              env: Record<string, string>;
              envLocal: Record<string, string>;
              buildInfos:
                  | {
                        distDirPath: string;
                        assetsUrlPath: string;
                    }
                  | undefined;
          }
        | undefined = undefined;
    let htmlPre: string | undefined = undefined;

    const plugin = {
        "name": "vite-envs",
        "configResolved": async resolvedConfig => {
            const appRootDirPath = resolvedConfig.root;
            const baseBuildTimeEnv: Record<string, unknown> = resolvedConfig.env;

            const [env, envLocal] = [".env", ".env.local"].map(
                (fileBasename): Record<string, string> => {
                    const filePath = pathJoin(appRootDirPath, fileBasename);

                    if (!fs.existsSync(filePath)) {
                        return {};
                    }

                    const { parsed } = dotenv.config({
                        "path": filePath,
                        "encoding": "utf8"
                    });

                    assert(parsed !== undefined);

                    return parsed;
                }
            );

            resultOfConfigResolved = {
                appRootDirPath,
                baseBuildTimeEnv,
                env,
                envLocal,
                "buildInfos": undefined
            };

            {
                const viteDirPath = (function callee(depth: number): string {
                    const cwd = pathResolve(pathJoin(...[appRootDirPath, ...Array(depth).fill("..")]));

                    const viteDirPath = pathJoin(cwd, "node_modules", "vite");

                    if (!fs.existsSync(pathJoin(viteDirPath, "package.json"))) {
                        if (cwd === pathSep) {
                            throw new Error("Could not find vite directory");
                        }

                        return callee(depth + 1);
                    }

                    return viteDirPath;
                })(0);

                transformCodebase({
                    "srcDirPath": viteDirPath,
                    "destDirPath": getThisCodebaseRootDirPath(),
                    "transformSourceCode": ({ sourceCode, fileRelativePath }) => {
                        if (fileRelativePath === "client.d.ts") {
                            let modifiedSourceCodeStr = sourceCode.toString("utf8");

                            modifiedSourceCodeStr = modifiedSourceCodeStr.replace(
                                /^\s *\/\/\/\s*<reference\s+types=["']\.\/types\/importMeta.d.ts["']\s*\/>/,
                                ""
                            );

                            return { "modifiedSourceCode": Buffer.from(modifiedSourceCodeStr, "utf8") };
                        }

                        if (
                            fileRelativePath.startsWith("types") &&
                            pathBasename(fileRelativePath) !== "importMeta.d.ts"
                        ) {
                            return { "modifiedSourceCode": sourceCode };
                        }

                        return undefined;
                    }
                });

                {
                    const dTsFilePath = pathJoin(appRootDirPath, "src", "vite-env.d.ts");

                    let dTsFileContent = !fs.existsSync(dTsFilePath)
                        ? `/// <reference types="vite/client" />\n`
                        : fs.readFileSync(dTsFilePath).toString("utf8");

                    dTsFileContent = dTsFileContent.replace(
                        /^\s*\/\/\/\s*<reference\s+types=["']vite\/client["']\s*\/>/,
                        ['/// <reference types="vite-envs/client" />'].join("\n")
                    );

                    dTsFileContent = dTsFileContent.replace(
                        /(?:type|interface)\s+ImportMetaEnv\s*=?\s*{[^}]};?/g,
                        [
                            "type ImportMetaEnv = {",
                            "// Auto-generated by `npx vite-envs update-types`",
                            ...Object.entries({
                                ...baseBuildTimeEnv,
                                ...env
                            }).map(([key, value]) => {
                                const valueType = (() => {
                                    if (typeof value === "string") {
                                        return "string";
                                    }

                                    if (typeof value === "boolean") {
                                        return "boolean";
                                    }

                                    if (typeof value === "number") {
                                        return "number";
                                    }

                                    if (Array.isArray(value)) {
                                        return "any[]";
                                    }

                                    return "any";
                                })();

                                return `  ${key}: ${valueType}`;
                            }),
                            "}"
                        ].join("\n")
                    );

                    fs.writeFileSync(dTsFilePath, Buffer.from(dTsFileContent, "utf8"));
                }

                if (updateTypingScriptEnvName in process.env) {
                    process.exit(0);
                }
            }

            define_build_infos: {
                if (resolvedConfig.command !== "build") {
                    break define_build_infos;
                }

                resultOfConfigResolved.buildInfos = {
                    "distDirPath": pathJoin(appRootDirPath, resolvedConfig.build.outDir),
                    "assetsUrlPath": posixPath.join(
                        resolvedConfig.env.BASE_URL,
                        resolvedConfig.build.assetsDir
                    )
                };
            }
        },
        "transform": (code, id) => {
            assert(resultOfConfigResolved !== undefined);

            const { appRootDirPath } = resultOfConfigResolved;

            let transformedCode: string | undefined = undefined;

            replace_import_meta_env_base_url_in_source_code: {
                {
                    const isWithinSourceDirectory = id.startsWith(
                        pathJoin(appRootDirPath, "src") + pathSep
                    );

                    if (!isWithinSourceDirectory) {
                        break replace_import_meta_env_base_url_in_source_code;
                    }
                }

                {
                    const isJavascriptFile = id.endsWith(".js") || id.endsWith(".jsx");
                    const isTypeScriptFile = id.endsWith(".ts") || id.endsWith(".tsx");

                    if (!isTypeScriptFile && !isJavascriptFile) {
                        break replace_import_meta_env_base_url_in_source_code;
                    }
                }

                if (transformedCode === undefined) {
                    transformedCode = code;
                }

                const placeholder = "xLsKJfWsLpSeMfrSbWxL34xLsKJfWsLpSeMfrSbWxL34x";

                transformedCode = replaceAll(transformedCode, "import.meta.env.SSR", placeholder);

                transformedCode = replaceAll(
                    transformedCode,
                    "import.meta.env",
                    `window.${nameOfTheGlobal}`
                );

                transformedCode = replaceAll(transformedCode, placeholder, "import.meta.env.SSR");
            }

            if (transformedCode === undefined) {
                return;
            }

            return {
                "code": transformedCode
            };
        },
        "transformIndexHtml": {
            "order": "pre",
            "handler": html => {
                assert(resultOfConfigResolved !== undefined);

                const { baseBuildTimeEnv, env, envLocal, buildInfos } = resultOfConfigResolved;

                if (buildInfos !== undefined) {
                    htmlPre = html;
                }

                const mergedEnv = {
                    ...baseBuildTimeEnv,
                    ...env,
                    ...Object.fromEntries(
                        Object.entries(envLocal)
                            .filter(([key]) => key in env)
                            .map(([key, value]) =>
                                value === undefined ? undefined : ([key, value] as const)
                            )
                            .filter(exclude(undefined))
                    )
                };

                const renderedHtml = renderHtmlAsEjs({
                    html,
                    "env": mergedEnv
                });

                const $ = cheerio.load(renderedHtml);

                injectScriptToDefineGlobal({
                    $,
                    "env": mergedEnv
                });

                return $.html();
            }
        },
        "closeBundle": async () => {
            assert(resultOfConfigResolved !== undefined);

            const { baseBuildTimeEnv, env, buildInfos } = resultOfConfigResolved;

            if (buildInfos === undefined) {
                return;
            }

            assert(htmlPre !== undefined);

            const { assetsUrlPath, distDirPath } = buildInfos;

            const viteEnvsMeta: ViteEnvsMeta = {
                "version": JSON.parse(
                    fs
                        .readFileSync(pathJoin(getThisCodebaseRootDirPath(), "package.json"))
                        .toString("utf8")
                ).version,
                assetsUrlPath,
                env,
                baseBuildTimeEnv,
                htmlPre
            };

            if (!fs.existsSync(distDirPath)) {
                fs.mkdirSync(distDirPath, { "recursive": true });
            }

            console.log(pathJoin(distDirPath, viteEnvsMetaFileBasename));

            fs.writeFileSync(
                pathJoin(distDirPath, viteEnvsMetaFileBasename),
                Buffer.from(JSON.stringify(viteEnvsMeta, null, 4), "utf8")
            );
        }
    } satisfies Plugin;

    return plugin as any;
}
