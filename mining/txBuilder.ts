import { SUI_CLOCK_OBJECT_ID } from "@scallop-io/sui-kit";
import { SuiversaryContract } from "./contract";
import type { SuiTxBlock, SuiObjectArg } from "@scallop-io/sui-kit";

export const SuiversaryTxBuilder = {
  mint_pow: (tx: SuiTxBlock, coin: SuiObjectArg) => {
    return tx.moveCall(
      `${SuiversaryContract.packageId}::suiversary::mint_pow`,
      [SuiversaryContract.registryId, coin, SUI_CLOCK_OBJECT_ID],
      []
    );
  },
} as const;
