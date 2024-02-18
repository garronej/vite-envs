import { getThisCodebaseRootDirPath } from "./getThisCodebaseRootDirPath";
import { join as pathJoin } from "path";
import child_process from "child_process";

const projectRootDirPath = getThisCodebaseRootDirPath();

Object.entries<string>(require(pathJoin(projectRootDirPath, "package.json"))["bin"]).forEach(
    ([, scriptPath]) =>
        child_process.execSync(`chmod +x ${scriptPath}`, {
            "cwd": projectRootDirPath
        })
);
