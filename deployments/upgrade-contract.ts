import * as path from "path";
import { RawSigner } from "@mysten/sui.js";
import { PackageBatch } from "@scallop-io/sui-package-kit";
import { packagePublisher, suiKit } from "utils/connection";
import { publishResult } from "suiversary";

const suiversaryPkgPath = path.join(__dirname, "../suiversary");

const packageList: PackageBatch = [];

export const upgradeSuiversary = async (
    signer: RawSigner
) => {    
    return await packagePublisher.upgradePackageWithDependencies(
        suiversaryPkgPath,
        publishResult.packageId,
        publishResult.upgradeCapId,
        packageList,
        signer,
    );
}

upgradeSuiversary(suiKit.getSigner()).then(console.log).catch(console.error).finally(() => process.exit(0));