import * as path from "path";
import { networkType } from "utils/connection";

export const publishResult = require(path.join(__dirname, `./publish-result.${networkType}.json`));