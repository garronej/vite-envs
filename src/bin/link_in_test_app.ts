import { execSync } from "child_process";
import { join as pathJoin, relative as pathRelative } from "path";
import * as fs from "fs";
import { getProjectRoot } from "./tools/getProjectRoot";

const projectDirPath = getProjectRoot();

fs.writeFileSync(
    pathJoin(projectDirPath, "dist", "package.json"),
    Buffer.from(
        JSON.stringify(
            (() => {
                const packageJsonParsed = JSON.parse(fs.readFileSync(pathJoin(projectDirPath, "package.json")).toString("utf8"));

                return {
                    ...packageJsonParsed,
                    "main": packageJsonParsed["main"].replace(/^dist\//, ""),
                    "types": packageJsonParsed["types"].replace(/^dist\//, ""),
                };
            })(),
            null,
            2,
        ),
        "utf8",
    ),
);

const commonThirdPartyDeps = (() => {
    const namespaceModuleNames: string[] = [];
	const standaloneModuleNames: string[] = [];

    return [
        ...namespaceModuleNames
            .map(namespaceModuleName =>
                fs
                    .readdirSync(pathJoin(projectDirPath, "node_modules", namespaceModuleName))
                    .map(submoduleName => `${namespaceModuleName}/${submoduleName}`),
            )
            .reduce((prev, curr) => [...prev, ...curr], []),
        ...standaloneModuleNames,
    ];
})();

const yarnHomeDirPath = pathJoin(projectDirPath, ".yarn_home");

execSync(["rm -rf", "mkdir"].map(cmd => `${cmd} ${yarnHomeDirPath}`).join(" && "));

const execYarnLink = (params: { targetModuleName?: string; cwd: string }) => {
    const { targetModuleName, cwd } = params;

    const cmd = ["yarn", "link", ...(targetModuleName !== undefined ? [targetModuleName] : [])].join(" ");

    console.log(`$ cd ${pathRelative(projectDirPath, cwd) || "."} && ${cmd}`);

    execSync(cmd, {
        cwd,
        "env": {
            ...process.env,
            "HOME": yarnHomeDirPath,
        },
    });
};

const testAppNames = ["cra-envs-demo-app"] as const;

const getTestAppPath = (testAppName: typeof testAppNames[number]) => pathJoin(projectDirPath, "..", testAppName);

testAppNames.forEach(testAppName => execSync("rm -rf node_modules && yarn install", { "cwd": getTestAppPath(testAppName) }));

console.log("=== Linking common dependencies ===");

const total = commonThirdPartyDeps.length;
let current = 0;

commonThirdPartyDeps.forEach(commonThirdPartyDep => {
    current++;

    console.log(`${current}/${total} ${commonThirdPartyDep}`);

    const localInstallPath = pathJoin(
        ...[projectDirPath, "node_modules", ...(commonThirdPartyDep.startsWith("@") ? commonThirdPartyDep.split("/") : [commonThirdPartyDep])],
    );

    execYarnLink({ "cwd": localInstallPath });

    testAppNames.forEach(testAppName =>
        execYarnLink({
            "cwd": getTestAppPath(testAppName),
            "targetModuleName": commonThirdPartyDep,
        }),
    );
});

console.log("=== Linking in house dependencies ===");

execYarnLink({ "cwd": pathJoin(projectDirPath, "dist") });

testAppNames.forEach(testAppName =>
    execYarnLink({
        "cwd": getTestAppPath(testAppName),
        "targetModuleName": "cra-envs",
    }),
);
