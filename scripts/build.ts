import * as child_process from "child_process";
import * as fs from "fs";
import { join } from "path";
import { assert } from "tsafe/assert";
import chalk from "chalk";
import { same } from "evt/tools/inDepth/same";

console.log(chalk.cyan("Building vite-envs..."));

const startTime = Date.now();

if (fs.existsSync(join("dist", "bin", "main.original.js"))) {
    fs.renameSync(join("dist", "bin", "main.original.js"), join("dist", "bin", "main.js"));
}

if (fs.existsSync(join("dist", "index.original.js"))) {
    fs.renameSync(join("dist", "index.original.js"), join("dist", "index.js"));
}

run("npx tsc");

if (!fs.readFileSync(join("dist", "bin", "main.js")).toString("utf8").includes("__nccwpck_require__")) {
    fs.cpSync(join("dist", "bin", "main.js"), join("dist", "bin", "main.original.js"));
}

run(`npx ncc build ${join("dist", "bin", "main.js")} -o ${join("dist", "ncc_out")}`);

assert(same(fs.readdirSync(join("dist", "ncc_out")), ["index.js"]));

fs.cpSync(join("dist", "ncc_out", "index.js"), join("dist", "bin", "main.js"));

fs.rmSync(join("dist", "ncc_out"), { recursive: true });

fs.chmodSync(
    join("dist", "bin", "main.js"),
    fs.statSync(join("dist", "bin", "main.js")).mode |
        fs.constants.S_IXUSR |
        fs.constants.S_IXGRP |
        fs.constants.S_IXOTH
);

if (!fs.readFileSync(join("dist", "index.js")).toString("utf8").includes("__nccwpck_require__")) {
    fs.cpSync(join("dist", "index.js"), join("dist", "index.original.js"));
}

run(`npx ncc build ${join("dist", "index.js")} -o ${join("dist", "ncc_out")}`);

assert(same(fs.readdirSync(join("dist", "ncc_out")), ["index.js"]));

fs.cpSync(join("dist", "ncc_out", "index.js"), join("dist", "index.js"));

fs.rmSync(join("dist", "ncc_out"), { recursive: true });

console.log(chalk.green(`✓ built in ${((Date.now() - startTime) / 1000).toFixed(2)}s`));

function run(command: string) {
    console.log(chalk.grey(`$ ${command}`));

    child_process.execSync(command, { stdio: "inherit" });
}
