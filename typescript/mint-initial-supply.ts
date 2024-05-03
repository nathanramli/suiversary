import { SUI_CLOCK_OBJECT_ID, SuiTxBlock } from "@scallop-io/sui-kit";
import { suiKit } from "utils/connection";
import { publishResult } from "suiversary";

async function mintInitialSupply() {
    const tx = new SuiTxBlock()
    for (let i = 0; i < 10; i++) {
        tx.moveCall(`${publishResult.packageId}::suiversary::mint`,
            [
                tx.object(publishResult.registryId),
                tx.splitCoins(tx.gas, [1e9])[0],
                tx.object(SUI_CLOCK_OBJECT_ID)
            ],
            []
        )
    }
    const resp = await suiKit.signAndSendTxn(tx);
    return resp
}

mintInitialSupply().then(console.log).catch(console.error).finally(() => process.exit(0));