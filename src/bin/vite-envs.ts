#!/usr/bin/env node

import { postBuildInjectionScript } from "./postBuildInjectionScript";
import { updateTypes } from "./updateTypes";

const command = process.argv[2];

switch (command) {
    case "update-types":
        updateTypes();
        break;
    case undefined:
        postBuildInjectionScript();
        break;
}
