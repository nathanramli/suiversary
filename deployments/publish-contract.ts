import * as path from "path";
import { RawSigner } from "@mysten/sui.js";
import { PackageBatch } from "@scallop-io/sui-package-kit";
import { packagePublisher, suiKit } from "utils/connection";

const suiversaryPkgPath = path.join(__dirname, "../suiversary");

const packageList: PackageBatch = [
    { packagePath: suiversaryPkgPath, option: { enforce: true } },
];

export const publishSuiversary = async (
    signer: RawSigner
) => {
    return packagePublisher.publishPackageBatch(packageList, signer);
}

publishSuiversary(suiKit.getSigner()).then(console.log).catch(console.error).finally(() => process.exit(0));