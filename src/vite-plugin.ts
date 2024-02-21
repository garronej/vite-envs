import {
    join as pathJoin,
    sep as pathSep,
    posix as posixPath,
    resolve as pathResolve,
    basename as pathBasename,
    relative as pathRelative
} from "path";
import type { Plugin, ResolvedConfig } from "vite";
import { assert } from "tsafe/assert";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as cheerio from "cheerio";
import { nameOfTheGlobal, viteEnvsMetaFileBasename, updateTypingScriptEnvName } from "./constants";
import { injectScriptToDefineGlobal } from "./injectScriptToDefineGlobal";
import { renderHtmlAsEjs } from "./renderHtmlAsEjs";
import type { ViteEnvsMeta } from "./ViteEnvsMeta";
import { replaceAll } from "./tools/String.prototype.replaceAll";
import { transformCodebase } from "./tools/transformCodebase";
import { exclude } from "tsafe/exclude";
import { getAbsoluteAndInOsFormatPath } from "./tools/getAbsoluteAndInOsFormatPath";

export function viteEnvs(params?: {
    computedEnv?:
        | Record<string, unknown>
        | ((params: {
              resolvedConfig: ResolvedConfig;
              declaredEnv: Record<string, string>;
              localEnv: Record<string, string>;
          }) => Promise<Record<string, unknown>> | Record<string, unknown>);
    /** Default: .env */
    declarationFile?: string;
}) {
    const { computedEnv: computedEnv_params, declarationFile = ".env" } = params ?? {};

    const getComputedEnv =
        typeof computedEnv_params === "function" ? computedEnv_params : () => computedEnv_params ?? {};

    let resultOfConfigResolved:
        | {
              appRootDirPath: string;
              baseBuildTimeEnv: Record<string, unknown>;
              declaredEnv: Record<string, string>;
              computedEnv: Record<string, unknown>;
              localEnv: Record<string, string>;
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

            const declaredEnv = (() => {
                const declarationEnvFilePath = getAbsoluteAndInOsFormatPath({
                    "cwd": appRootDirPath,
                    "pathIsh": declarationFile
                });

                if (!fs.existsSync(declarationEnvFilePath)) {
                    throw new Error(
                        `There is no ${pathRelative(appRootDirPath, declarationEnvFilePath)}`
                    );
                }

                const { parsed } = dotenv.config({
                    "path": declarationEnvFilePath,
                    "encoding": "utf8"
                });

                assert(parsed !== undefined);

                return parsed;
            })();

            const localEnv = (() => {
                let envLocal: Record<string, string> = {};

                [".env", ".env.local"].forEach(fileBasename => {
                    const filePath = pathJoin(appRootDirPath, fileBasename);

                    if (!fs.existsSync(filePath)) {
                        return {};
                    }

                    const { parsed } = dotenv.config({
                        "path": filePath,
                        "encoding": "utf8"
                    });

                    assert(parsed !== undefined);

                    envLocal = {
                        ...envLocal,
                        ...parsed
                    };
                });

                return Object.fromEntries(
                    Object.entries(envLocal).filter(([key]) => key in declaredEnv)
                );
            })();

            const computedEnv = await getComputedEnv({ resolvedConfig, localEnv, declaredEnv });

            resultOfConfigResolved = {
                appRootDirPath,
                baseBuildTimeEnv,
                declaredEnv,
                computedEnv,
                localEnv,
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
                        /^\s*\/\/\/\s*<reference\s+types=["']vite\/client["']\s*\/>\s*\r?\n?/,
                        '/// <reference types="vite-envs/client" />\n'
                    );

                    const userDefinedStartPlaceholder = "// @user-defined-start";
                    const userDefinedEndPlaceholder = "// @user-defined-end";

                    const userDefinedSection = (() => {
                        const defaultUserDefinedSection = [
                            "",
                            "  /*",
                            "   * Here you can define your own special variables",
                            "   * that would be available on `import.meta.env` but",
                            "   * that vite-envs does not know about.",
                            "   * This section will be preserved thanks to the special comments.",
                            "   * Example:",
                            "   */",
                            "  SSR: boolean;",
                            "  "
                        ].join("\n");

                        const userDefinedStartIndex = dTsFileContent.indexOf(
                            userDefinedStartPlaceholder
                        );

                        if (userDefinedStartIndex === -1) {
                            return defaultUserDefinedSection;
                        }

                        const userDefinedEndIndex = dTsFileContent.indexOf(userDefinedEndPlaceholder);

                        if (userDefinedEndIndex === -1) {
                            return defaultUserDefinedSection;
                        }

                        const userDefinedSection = dTsFileContent.slice(
                            userDefinedStartIndex + userDefinedStartPlaceholder.length,
                            userDefinedEndIndex
                        );

                        return userDefinedSection;
                    })();

                    {
                        const generatedContent = [
                            `type ImportMetaEnv = {`,
                            "  // Auto-generated by `npx vite-envs update-types` and hot-reloaded by the `vite-env` plugin",
                            ...Object.entries({
                                ...baseBuildTimeEnv,
                                ...computedEnv,
                                ...declaredEnv
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
                            `  ${userDefinedStartPlaceholder}${userDefinedSection}${userDefinedEndPlaceholder}`,
                            `}`
                        ].join("\n");

                        const dTsFileContent_before = dTsFileContent;

                        const placeholder = "xKdSwPrRw3zAaxBbcPtMmQqLlNnJjKkHhGgFfEeDdCcBbAaDxx77";

                        dTsFileContent = dTsFileContent.replace(
                            /(?:type|interface)\s+ImportMetaEnv\s*=?\s*{[^}]*};?/g,
                            placeholder
                        );

                        if (dTsFileContent === dTsFileContent_before) {
                            dTsFileContent += `\n\n${generatedContent}\n\n`;
                        } else {
                            dTsFileContent = dTsFileContent.replace(placeholder, generatedContent);
                        }
                    }

                    {
                        const generatedContent = [
                            `interface ImportMeta {`,
                            "  // Auto-generated by `npx vite-envs update-types`",
                            ``,
                            `  url: string`,
                            ``,
                            `  readonly hot?: import('vite-envs/types/hot').ViteHotContext`,
                            ``,
                            `  readonly env: ImportMetaEnv`,
                            ``,
                            `  glob: import('vite-envs/types/importGlob').ImportGlobFunction`,
                            `}`
                        ].join("\n");

                        const dTsFileContent_before = dTsFileContent;

                        const placeholder = "ssDdCcBbAaDxx7xKdSwPrRw3zAaxBbcFfEeDdCcBbAaDxx77";

                        dTsFileContent = dTsFileContent.replace(
                            /interface\s+ImportMeta\s*{[^}]*};?/g,
                            placeholder
                        );

                        if (dTsFileContent === dTsFileContent_before) {
                            dTsFileContent += `\n\n${generatedContent}\n\n`;
                        } else {
                            dTsFileContent = dTsFileContent.replace(placeholder, generatedContent);
                        }
                    }

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

            const { appRootDirPath, baseBuildTimeEnv, computedEnv, declaredEnv } =
                resultOfConfigResolved;

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

                const singularString = "-xs3dSdKdSwPrRw3zAaxBbcPtMmQqLlNnJjKkHhGgFfEeDdCcBbAa";

                transformedCode = transformedCode.replace(
                    new RegExp(`import\\.meta\\.env\\.([A-Za-z0-9$_]+)`, "g"),
                    (...[, p1]) => {
                        assert(typeof p1 === "string");

                        const out = `import.meta.env.${p1}`;

                        if (!(p1 in declaredEnv) && !(p1 in baseBuildTimeEnv) && !(p1 in computedEnv)) {
                            return out.replace(/^import/, `import${singularString}`);
                        }

                        return out;
                    }
                );

                transformedCode = transformedCode.replace(
                    new RegExp(`import\\.meta\\.env\\["([^"]+)"\\]`, "g"),
                    (...[, p1]) => {
                        assert(typeof p1 === "string");

                        const out = `import.meta.env["${p1}"]`;

                        if (!(p1 in declaredEnv) && !(p1 in baseBuildTimeEnv) && !(p1 in computedEnv)) {
                            return out.replace(/^import/, `import${singularString}`);
                        }

                        return out;
                    }
                );

                transformedCode = replaceAll(
                    transformedCode,
                    "import.meta.env",
                    `window.${nameOfTheGlobal}`
                );

                transformedCode = replaceAll(transformedCode, singularString, "");
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

                const { baseBuildTimeEnv, declaredEnv, localEnv, buildInfos, computedEnv } =
                    resultOfConfigResolved;

                if (buildInfos !== undefined) {
                    htmlPre = html;
                }

                const mergedEnv = {
                    ...Object.fromEntries(
                        Object.entries({
                            ...baseBuildTimeEnv,
                            ...computedEnv
                        }).map(([key, value]) => [key, key in declaredEnv ? `${value}` : value])
                    ),
                    ...Object.fromEntries(
                        Object.entries(declaredEnv).filter(
                            ([key, value]) => !(key in computedEnv && value === "")
                        )
                    ),
                    ...(() => {
                        if (buildInfos !== undefined) {
                            // If we are building (`npx vite build`) we avoid to include the
                            // dev machine environment variables in the final build.
                            // We also omit the .env.local variables.
                            return {};
                        }

                        return {
                            ...Object.fromEntries(
                                Object.entries(process.env)
                                    .map(([key, value]) =>
                                        value === undefined ? undefined : ([key, value] as const)
                                    )
                                    .filter(exclude(undefined))
                                    .filter(([, value]) => value !== "")
                                    .filter(
                                        ([key, value]) =>
                                            key in declaredEnv && value !== declaredEnv[key]
                                    )
                            ),
                            ...localEnv
                        };
                    })()
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

            const { baseBuildTimeEnv, declaredEnv, computedEnv, buildInfos } = resultOfConfigResolved;

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
                declaredEnv,
                computedEnv,
                baseBuildTimeEnv,
                htmlPre
            };

            if (!fs.existsSync(distDirPath)) {
                fs.mkdirSync(distDirPath, { "recursive": true });
            }

            fs.writeFileSync(
                pathJoin(distDirPath, viteEnvsMetaFileBasename),
                Buffer.from(JSON.stringify(viteEnvsMeta, null, 4), "utf8")
            );
        }
    } satisfies Plugin;

    return plugin as any;
}
