import dotenv from "dotenv";
import { NetworkType, SuiKit } from "@scallop-io/sui-kit";
import { SuiAdvancePackagePublisher } from "@scallop-io/sui-package-kit";

dotenv.config();

export const mnemonics = process.env.MNEMONICS || '';
export const networkType = (process.env.SUI_NETWORK_TYPE || 'mainnet') as NetworkType;

export const suiKit = new SuiKit({ mnemonics, networkType });

console.log(suiKit.currentAddress());

export const packagePublisher = new SuiAdvancePackagePublisher({ networkType });
