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
import { getScriptThatDefinesTheGlobal } from "./getScriptThatDefinesTheGlobal";
import { injectInHeadBeforeFirstScriptTag } from "./injectInHeadBeforeFirstScriptTag";
import { renderHtmlAsEjs } from "./renderHtmlAsEjs";
import { substituteHtmPlaceholders } from "./substituteHtmPlaceholders";
import type { ViteEnvsMeta } from "./ViteEnvsMeta";
import { transformCodebase } from "./tools/transformCodebase";
import { exclude } from "tsafe/exclude";
import { getAbsoluteAndInOsFormatPath } from "./tools/getAbsoluteAndInOsFormatPath";
import MagicString from "magic-string";
import { replaceAllShDeclaration } from "./tools/replaceAll.sh";

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
    /** Default: false */
    doRenderHtmlAsEjs?: boolean;
}) {
    const {
        computedEnv: computedEnv_params,
        declarationFile = ".env",
        doRenderHtmlAsEjs = false
    } = params ?? {};

    const getComputedEnv =
        typeof computedEnv_params === "function" ? computedEnv_params : () => computedEnv_params ?? {};

    let resultOfConfigResolved:
        | {
              appRootDirPath: string;
              baseBuildTimeEnv: Record<string, unknown>;
              declaredEnv: Record<string, string>;
              computedEnv: Record<string, unknown>;
              localEnv: Record<string, string>;
              shouldGenerateSourcemap: boolean;
              buildInfos:
                  | {
                        distDirPath: string;
                        assetsUrlPath: string;
                    }
                  | undefined;
          }
        | undefined = undefined;
    let htmlPre: string | undefined = undefined;

    const tmpRefString = "VITE_ENVS_TMP_REF_XS3SLW";

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
                "shouldGenerateSourcemap": resolvedConfig.build.sourcemap !== false,
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

            const {
                appRootDirPath,
                baseBuildTimeEnv,
                computedEnv,
                declaredEnv,
                shouldGenerateSourcemap
            } = resultOfConfigResolved;

            {
                const isWithinSourceDirectory = id.startsWith(pathJoin(appRootDirPath, "src") + pathSep);

                if (!isWithinSourceDirectory) {
                    return;
                }
            }

            {
                const isJavascriptFile = id.endsWith(".js") || id.endsWith(".jsx");
                const isTypeScriptFile = id.endsWith(".ts") || id.endsWith(".tsx");

                if (!isTypeScriptFile && !isJavascriptFile) {
                    return;
                }
            }

            if (!code.includes("import.meta.env")) {
                return;
            }

            const transformedCode = new MagicString(code);

            transformedCode.replace(
                /import\.meta\.env(?:\.([A-Za-z0-9$_]+)|\["([^"]+)"\]|(.?))/g,
                (match, p1, p2, p3) => {
                    const out = (() => {
                        const globalRef = `window.${nameOfTheGlobal}`;

                        if (p3 !== undefined) {
                            return `${globalRef}${p3}`;
                        }

                        const varName = p1 || p2;

                        assert(typeof varName === "string");

                        const isUnknownVar =
                            !(varName in declaredEnv) &&
                            !(varName in baseBuildTimeEnv) &&
                            !(varName in computedEnv);

                        if (isUnknownVar) {
                            // NOTE: We don't modify the code if the variable is unknown.
                            return match;
                        }

                        return `${globalRef}${p1 !== undefined ? `.${p1}` : `["${p2}"]`}`;
                    })();

                    return out;
                }
            );

            if (!transformedCode.hasChanged()) {
                return;
            }

            if (!shouldGenerateSourcemap) {
                return transformedCode.toString();
            }

            const map = transformedCode.generateMap({
                "source": id,
                "includeContent": true,
                "hires": true
            });

            return {
                "code": transformedCode.toString(),
                "map": map.toString()
            };
        },
        "transformIndexHtml": {
            "order": "pre",
            "handler": (() => {
                const getMergedEnv = () => {
                    assert(resultOfConfigResolved !== undefined);

                    const { baseBuildTimeEnv, declaredEnv, localEnv, computedEnv } =
                        resultOfConfigResolved;

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
                        ...Object.fromEntries(
                            Object.entries(process.env)
                                .map(([key, value]) =>
                                    value === undefined ? undefined : ([key, value] as const)
                                )
                                .filter(exclude(undefined))
                                .filter(([, value]) => value !== "")
                                .filter(
                                    ([key, value]) => key in declaredEnv && value !== declaredEnv[key]
                                )
                        ),
                        ...localEnv
                    };

                    return { mergedEnv };
                };

                const handler_ejs = async (html: string) => {
                    assert(resultOfConfigResolved !== undefined);

                    const { buildInfos } = resultOfConfigResolved;

                    if (buildInfos !== undefined) {
                        htmlPre = html;
                    }

                    const { mergedEnv } = getMergedEnv();

                    let processedHtml = await renderHtmlAsEjs({
                        html,
                        "env": mergedEnv
                    });

                    processedHtml = substituteHtmPlaceholders({
                        "html": processedHtml,
                        "env": mergedEnv
                    });

                    processedHtml = injectInHeadBeforeFirstScriptTag({
                        "html": processedHtml,
                        "htmlToInject": getScriptThatDefinesTheGlobal({ "env": mergedEnv })
                    });

                    return processedHtml;
                };

                const handler_noEjs = (html: string) => {
                    assert(resultOfConfigResolved !== undefined);

                    const { buildInfos } = resultOfConfigResolved;

                    const { mergedEnv } = getMergedEnv();

                    const action_buildMode = () => {
                        const htmlPostSubstitution = substituteHtmPlaceholders({
                            html,
                            "env": Object.fromEntries(
                                Object.keys(mergedEnv).map(key => [key, `${tmpRefString}(${key})`])
                            )
                        });

                        return htmlPostSubstitution;
                    };

                    const action_devMode = () => {
                        let processedHtml = substituteHtmPlaceholders({
                            html,
                            "env": mergedEnv
                        });

                        processedHtml = injectInHeadBeforeFirstScriptTag({
                            "html": processedHtml,
                            "htmlToInject": getScriptThatDefinesTheGlobal({ "env": mergedEnv })
                        });

                        return processedHtml;
                    };

                    return buildInfos === undefined ? action_devMode() : action_buildMode();
                };

                return doRenderHtmlAsEjs ? handler_ejs : handler_noEjs;
            })()
        },
        "closeBundle": (() => {
            const closeBundle_ejs = () => {
                assert(resultOfConfigResolved !== undefined);

                const { baseBuildTimeEnv, declaredEnv, computedEnv, buildInfos } =
                    resultOfConfigResolved;

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

                fs.writeFileSync(
                    pathJoin(distDirPath, viteEnvsMetaFileBasename),
                    Buffer.from(JSON.stringify(viteEnvsMeta, null, 4), "utf8")
                );
            };
            const closeBundle_noEjs = () => {
                assert(resultOfConfigResolved !== undefined);

                const { buildInfos, baseBuildTimeEnv, computedEnv, declaredEnv } =
                    resultOfConfigResolved;

                if (buildInfos === undefined) {
                    return;
                }

                const { distDirPath } = buildInfos;

                const indexHtmlFilePath = pathJoin(distDirPath, "index.html");

                let processedHtml = fs.readFileSync(indexHtmlFilePath).toString("utf8");

                processedHtml = processedHtml.replace(
                    new RegExp(`${tmpRefString}\\(([^)]+)\\)`, "g"),
                    (_, key) => `%${key}%`
                );

                const placeholderForViteEnvsScript = `<!-- vite-envs script placeholder xKsPmLs30swKsdIsVx -->`;

                processedHtml = (function injectScriptPlaceholder() {
                    const $ = cheerio.load(processedHtml);

                    const firstScriptTag = $("head script").first();

                    if (firstScriptTag.length !== 0) {
                        // If a script tag exists, prepend the new script before the first script tag
                        firstScriptTag.before(placeholderForViteEnvsScript);
                    } else {
                        // If no script tag exists, append the new script to the head
                        $("head").append(placeholderForViteEnvsScript);
                    }

                    return $.html();
                })();

                processedHtml = injectInHeadBeforeFirstScriptTag({
                    "html": processedHtml,
                    "htmlToInject": placeholderForViteEnvsScript
                });

                fs.writeFileSync(indexHtmlFilePath, Buffer.from(processedHtml, "utf8"));

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
                    )
                };

                const scriptPath = pathJoin(distDirPath, "vite-envs.sh");

                const singularString = "xPsZs9swrPvxYpC";

                const scriptContent = [
                    `#!/bin/sh`,
                    ``,
                    replaceAllShDeclaration,
                    ``,
                    `html=$(echo "${Buffer.from(processedHtml, "utf8").toString(
                        "base64"
                    )}" | base64 -d)`,
                    ``,
                    ...Object.entries(mergedEnv)
                        .map(([name, value]) => [
                            `${name}=\${${name}:-\$(echo "${Buffer.from(`${value}`, "utf8").toString(
                                "base64"
                            )}" | base64 -d)}`,
                            `${name}_base64=\$(echo "\$${name}" | base64)`
                        ])
                        .flat(),
                    ``,
                    `processedHtml="$html"`,
                    ``,
                    ...Object.keys(mergedEnv).map(
                        name =>
                            `processedHtml=$(replaceAll "$processedHtml" "%${name}%" "${name}${singularString}")`
                    ),
                    ``,
                    ...Object.keys(mergedEnv).map(
                        name =>
                            `processedHtml=$(replaceAll "$processedHtml" "${name}${singularString}" "\$${name}")`
                    ),
                    ``,
                    `json=""`,
                    `json="$json{"`,
                    ...Object.keys(mergedEnv).map(
                        (name, i, names) =>
                            `"$json\\"${name}\\":\\"\$${name}_base64\\"${
                                i === names.length - 1 ? "" : ","
                            }"`
                    ),
                    `json="$json}"`,
                    ``,
                    `script="\n"`,
                    `script="$script    <script data-script-description=\"Environment variables injected by vite-envs\">\n"`,
                    `script="$script      var envWithValuesInBase64 = $json;\n"`,
                    `script="$script      var env = {};\n"`,
                    `script="$script      Object.keys(envWithValuesInBase64).forEach(function (key) {\n"`,
                    `script="$script        env[key] = atob(envWithValuesInBase64[key]);\n"`,
                    `script="$script      });\n"`,
                    `script="$script      window.__VITE_ENVS = env;\n"`,
                    `script="$script    </script>"`,
                    ``,
                    `scriptPlaceholder="${placeholderForViteEnvsScript}"`,
                    ``,
                    `processedHtml=$(replaceAll "$processedHtml" "$scriptPlaceholder" "$script")`,
                    ``,
                    `DIR=$(cd "$(dirname "$0")" && pwd)`,
                    ``,
                    `echo "$processedHtml" > "$DIR/index.html"`,
                    ``
                ].join("\n");

                fs.writeFileSync(scriptPath, Buffer.from(scriptContent, "utf8"));
                fs.chmodSync(scriptPath, "755");
            };

            return doRenderHtmlAsEjs ? closeBundle_ejs : closeBundle_noEjs;
        })()
    } satisfies Plugin;

    return plugin as any;
}
