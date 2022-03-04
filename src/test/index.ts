import { downloadAndUnzip } from "../tools/downloadAndUnzip";
import * as st from "scripting-tools";
import { join as pathJoin } from "path";
import { getProjectRoot } from "../tools/getProjectRoot";

const sampleProjectDirPath = pathJoin(getProjectRoot(), "sample_project");

downloadAndUnzip({
    //"url": "https://github.com/garronej/cra-envs/releases/download/ASSETS/sample_project_6.zip",
    "url": "https://github.com/etalab/cra-envs/releases/download/ASSETS/SEP-Pilot-client.zip",
    "destDirPath": sampleProjectDirPath
});

const binDirPath = pathJoin(getProjectRoot(), "dist", "bin");

st.enableCmdTrace();

["", " js"].forEach(arg =>
    st.execSyncTrace(
        `node ${pathJoin(binDirPath, "generate-env-getter.js")}${arg}`,
        { "cwd": sampleProjectDirPath }
    )
);

st.execSyncTrace(
    `node ${pathJoin(binDirPath, "embed-environnement-variables.js")}`,
    {
        "cwd": sampleProjectDirPath,
        "env": {
            "BAZ": "Value of baz on the server",
            "THEME_ID": "france",
            "HEADER_USECASE_DESCRIPTION": "Le banc d'essai du SILL",
            "HEADER_ORGANIZATION": "Etalab",
            "DESCRIPTION": "Une plateforme pour essayer les logiciels du SILL"
        }
    }
);

