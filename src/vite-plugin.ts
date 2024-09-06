import {
    join as pathJoin,
    sep as pathSep,
    posix as posixPath,
    resolve as pathResolve,
    basename as pathBasename,
    relative as pathRelative,
    normalize as pathNormalize
} from "path";
import type { Plugin, ResolvedConfig } from "vite";
import { assert } from "tsafe/assert";
import { getThisCodebaseRootDirPath } from "./tools/getThisCodebaseRootDirPath";
import * as fs from "fs";
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
import { createSwEnvJsFile } from "./createSwEnvJsFile";
import { parseDotEnv, parseEnvValue } from "./parseDotEnv";

export function viteEnvs(params?: {
    computedEnv?:
        | Record<string, unknown>
        | ((params: {
              resolvedConfig: ResolvedConfig;
              declaredEnv: Record<string, string>;
              dotEnvLocal: Record<string, string>;
          }) => Promise<Record<string, unknown>> | Record<string, unknown>);
    /** Default: .env */
    declarationFile?: string;
    /**
     * Default: false
     * Enabling this option requires to have Node available in the container.
     * See documentation for more information.
     */
    indexAsEjs?: boolean;
}) {
    const {
        computedEnv: computedEnv_params,
        declarationFile = ".env",
        indexAsEjs = false
    } = params ?? {};

    const getComputedEnv =
        typeof computedEnv_params === "function" ? computedEnv_params : () => computedEnv_params ?? {};

    let resultOfConfigResolved:
        | {
              appRootDirPath: string;
              baseBuildTimeEnv: Record<string, unknown>;
              declaredEnv: Record<string, string>;
              computedEnv: Record<string, unknown>;
              dotEnv: Record<string, string>;
              dotEnvLocal: Record<string, string>;
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

    const getMergedEnv = () => {
        assert(resultOfConfigResolved !== undefined);

        const { baseBuildTimeEnv, declaredEnv, dotEnv, dotEnvLocal, computedEnv, appRootDirPath } =
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
            ...(getAbsoluteAndInOsFormatPath({
                "cwd": appRootDirPath,
                "pathIsh": declarationFile
            }) ===
            getAbsoluteAndInOsFormatPath({
                "cwd": appRootDirPath,
                "pathIsh": ".env"
            })
                ? undefined
                : dotEnv),
            ...dotEnvLocal,
            ...Object.fromEntries(
                Object.entries(process.env)
                    .map(([key, value]) => (value === undefined ? undefined : ([key, value] as const)))
                    .filter(exclude(undefined))
                    .filter(([key]) => key in declaredEnv)
                    .map(([key, value]) => [key, parseEnvValue(value)])
            )
        };

        return { mergedEnv };
    };

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

                const parsed = parseDotEnv({
                    "path": declarationEnvFilePath
                });

                return parsed;
            })();

            const [dotEnv, dotEnvLocal] = [".env", ".env.local"].map(fileBasename => {
                const filePath = pathJoin(appRootDirPath, fileBasename);

                if (!fs.existsSync(filePath)) {
                    return {};
                }

                const parsed = parseDotEnv({
                    "path": filePath
                });

                return Object.fromEntries(Object.entries(parsed).filter(([key]) => key in declaredEnv));
            });

            const computedEnv = await getComputedEnv({ resolvedConfig, declaredEnv, dotEnvLocal });

            resultOfConfigResolved = {
                appRootDirPath,
                baseBuildTimeEnv,
                declaredEnv,
                computedEnv,
                dotEnv,
                dotEnvLocal,
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
                            "   *  You can use this section to explicitly extend the type definition of `import.meta.env`",
                            "   *  This is useful if you're using Vite plugins that define specific `import.meta.env` properties.",
                            "   *  If you're not using such plugins, this section should remain as is.",
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
                            "  // You probably want to add `/src/vite-env.d.ts` to your .prettierignore",
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
            // Skip special files.
            if (id.startsWith("\x00")) {
                return null;
            }

            assert(resultOfConfigResolved !== undefined);

            const {
                appRootDirPath,
                baseBuildTimeEnv,
                computedEnv,
                declaredEnv,
                shouldGenerateSourcemap
            } = resultOfConfigResolved;

            const filePath = pathNormalize(id);

            {
                const isWithinSourceDirectory = filePath.startsWith(
                    pathNormalize(pathJoin(appRootDirPath, "src") + pathSep)
                );

                if (!isWithinSourceDirectory) {
                    return;
                }
            }

            {
                const isJavascriptFile = filePath.endsWith(".js") || filePath.endsWith(".jsx");
                const isTypeScriptFile = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
                const isVue = filePath.endsWith(".vue");

                if (!isTypeScriptFile && !isJavascriptFile && !isVue) {
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
                        const globalRef = `globalThis.${nameOfTheGlobal}`;

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
                "source": filePath,
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

                return indexAsEjs ? handler_ejs : handler_noEjs;
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

                const { mergedEnv } = getMergedEnv();

                createSwEnvJsFile({ distDirPath, mergedEnv });
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

                // NOTE: Make is so running the ./vite-envs.sh script is optional.
                ((processedHtml: string) => {
                    const { mergedEnv } = getMergedEnv();

                    processedHtml = substituteHtmPlaceholders({
                        "html": processedHtml,
                        "env": mergedEnv
                    });

                    processedHtml = injectInHeadBeforeFirstScriptTag({
                        "html": processedHtml,
                        "htmlToInject": getScriptThatDefinesTheGlobal({
                            "env": mergedEnv
                        })
                    });

                    fs.writeFileSync(indexHtmlFilePath, Buffer.from(processedHtml, "utf8"));

                    createSwEnvJsFile({ distDirPath, mergedEnv });
                })(processedHtml);

                const placeholderForViteEnvsScript = `<!-- vite-envs script placeholder xKsPmLs30swKsdIsVx -->`;

                processedHtml = injectInHeadBeforeFirstScriptTag({
                    "html": processedHtml,
                    "htmlToInject": placeholderForViteEnvsScript
                });

                const scriptPath = pathJoin(distDirPath, "vite-envs.sh");

                const singularString = "xPsZs9swrPvxYpC";
                const singularString2 = "xApWdRrX99kPrVggE";

                const buildTimeMergedEnv = {
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

                const scriptContent = [
                    `#!/bin/sh`,
                    ``,
                    `replaceAll() {`,
                    `    export inputString="$1"`,
                    `    export pattern="$2"`,
                    `    export replacement="$3"`,
                    ``,
                    `    echo "$inputString" | awk '{`,
                    `        gsub(ENVIRON["pattern"], ENVIRON["replacement"])`,
                    `        print`,
                    `    }'`,
                    `}`,
                    ``,
                    `html=$(echo "${Buffer.from(processedHtml, "utf8").toString(
                        "base64"
                    )}" | base64 -d)`,
                    ``,
                    ...Object.entries(buildTimeMergedEnv)
                        .map(([name, value]) => {
                            const [valueB64, valueB64_prefixed] = ([false, true] as const).map(
                                doUsePrefix =>
                                    Buffer.from(
                                        `${
                                            doUsePrefix
                                                ? `${singularString2}${JSON.stringify(value)}`
                                                : `${value}`
                                        }\n`,
                                        "utf8"
                                    ).toString("base64")
                            );

                            if (!(name in declaredEnv)) {
                                return [
                                    `${name}_base64="${valueB64_prefixed}"`,
                                    `${name}=$(echo "${valueB64}" | base64 -d)`
                                ];
                            }

                            return [
                                `if printenv ${name} &> /dev/null; then`,
                                `    ${name}_base64=$(printenv ${name} | base64)`,
                                `else`,
                                `    ${name}_base64="${valueB64_prefixed}"`,
                                `fi`,
                                `${name}=\${${name}:-$(echo "${valueB64}" | base64 -d)}`
                            ];
                        })
                        .flat(),
                    ``,
                    `processedHtml="$html"`,
                    ``,
                    ...Object.keys(buildTimeMergedEnv).map(
                        name =>
                            `processedHtml=$(replaceAll "$processedHtml" "%${name}%" "${name}${singularString}")`
                    ),
                    ``,
                    ...Object.keys(buildTimeMergedEnv).map(
                        name =>
                            `processedHtml=$(replaceAll "$processedHtml" "${name}${singularString}" "\$${name}")`
                    ),
                    ``,
                    `json=""`,
                    `json="$json{"`,
                    ...Object.keys(buildTimeMergedEnv).map(
                        (name, i, names) =>
                            `json="$json\\"${name}\\":\\\`\$${name}_base64\\\`${
                                i === names.length - 1 ? "" : ","
                            }"`
                    ),
                    `json="$json}"`,
                    ``,
                    `script="`,
                    `    <script data-script-description=\\"Environment variables injected by vite-envs\\">`,
                    `      var envWithValuesInBase64 = $json;`,
                    `      var env = {};`,
                    `      Object.keys(envWithValuesInBase64).forEach(function (name) {`,
                    `        const value = new TextDecoder().decode(`,
                    `          Uint8Array.from(`,
                    `            atob(envWithValuesInBase64[name]),`,
                    `            c => c.charCodeAt(0))`,
                    `        ).slice(0,-1);`,
                    `        env[name] = value.startsWith(\\"${singularString2}\\") ? JSON.parse(value.slice(\\"${singularString2}\\".length)) : value;`,
                    `      });`,
                    `      globalThis.${nameOfTheGlobal} = env;`,
                    `    </script>"`,
                    ``,
                    `scriptPlaceholder="${placeholderForViteEnvsScript}"`,
                    ``,
                    `processedHtml=$(replaceAll "$processedHtml" "$scriptPlaceholder" "$script")`,
                    ``,
                    `DIR=$(cd "$(dirname "$0")" && pwd)`,
                    ``,
                    `echo "$processedHtml" > "$DIR/index.html"`,
                    ``,
                    `swEnv_script="`,
                    `const envWithValuesInBase64 = $json;`,
                    `const env = {};`,
                    `Object.keys(envWithValuesInBase64).forEach(function (name) {`,
                    `  const value = new TextDecoder().decode(`,
                    `    Uint8Array.from(`,
                    `      atob(envWithValuesInBase64[name]),`,
                    `      c => c.charCodeAt(0))`,
                    `  ).slice(0,-1);`,
                    `  env[name] = value.startsWith(\\"${singularString2}\\") ? JSON.parse(value.slice(\\"${singularString2}\\".length)) : value;`,
                    `});`,
                    `self.${nameOfTheGlobal} = env;`,
                    `"`,
                    ``,
                    `echo "$swEnv_script" > "$DIR/swEnv.js" || echo "Not enough permissions to write to $DIR/swEnv.js"`,
                    ``
                ].join("\n");

                fs.writeFileSync(scriptPath, Buffer.from(scriptContent, "utf8"));
                fs.chmodSync(scriptPath, "755");
            };

            return indexAsEjs ? closeBundle_ejs : closeBundle_noEjs;
        })()
    } satisfies Plugin;

    return plugin as any;
}
