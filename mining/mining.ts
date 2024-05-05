import "colorts/lib/string";
import { SUI_TYPE_ARG, SuiTxBlock } from "@scallop-io/sui-kit";
import { suiKit } from "./util";
import { ProtocolConfig, SuiObjectRef } from "@mysten/sui.js/src/client";
import { SuiversaryTxBuilder } from "./txBuilder";

type Coin = {
  balance: string;
} & SuiObjectRef;

let protocolConfig: ProtocolConfig | undefined;

const getProtocolConfig = async () => {
  const resp = await suiKit.client().getProtocolConfig();
  protocolConfig = resp;
};

const refetchGas = async (gas: Coin): Promise<Coin> => {
  const resp = await suiKit.client().getObject({ id: gas.objectId });
  return {
    objectId: resp.data!.objectId,
    version: resp.data!.version,
    digest: resp.data!.digest,
    balance: gas.balance,
  };
};

const submitProof = async (coin: Coin, gas: Coin) => {
  try {
    const txb = new SuiTxBlock();
    txb.setGasPayment([gas]);

    const coinValue = parseInt(coin.balance);
    if (coinValue < 1e9) {
      const newValue = txb.splitCoins(txb.gas, [1e9 - coinValue])[0];
      txb.mergeCoins(coin, [newValue]);
    } else if (coinValue > 1e9) {
      const removedValue = txb.splitCoins(coin, [coinValue - 1e9])[0];
      txb.transferObjects([removedValue], suiKit.currentAddress());
    }

    SuiversaryTxBuilder.mint_pow(txb, coin);
    return suiKit.signAndSendTxn(txb);
  } catch (e) {
    console.error("Error when submitting proof: ", e);
    process.exit(0);
  }
};

const splitObjects = async () => {
  try {
    do {
      const txb = new SuiTxBlock();
      txb.setSender(suiKit.currentAddress());

      const array = new Array(500).fill(1);

      for (let i = 0; i < 3; i++) {
        const arr = txb.splitCoins(txb.gas, array);
        txb.transferObjects(arr, suiKit.currentAddress());
      }

      const txBytes = await txb.txBlock.build({
        client: suiKit.client(),
        protocolConfig,
      });

      const resp = await suiKit.client().dryRunTransactionBlock({
        transactionBlock: txBytes,
      });

      let ok = false;
      for (const changes of resp.objectChanges) {
        if (changes.type === "created") {
          if (changes.objectId.startsWith("0x0000")) {
            console.log(`Hash Found: ${changes.objectId}`.bgGreen);
            ok = true;
          }
          //  else if (changes.objectId.startsWith("0x00")) {
          //   console.log(`Almost rare: ${changes.objectId}`.gray);
          // }
        }
      }

      if (ok) {
        const resp = await suiKit.signAndSendTxn(txBytes);
        console.log(`Creating hash: ${resp.digest}`.blue);
        break;
      } else {
        console.log("No rare hash found.".yellow);

        const txb = new SuiTxBlock();
        const resp = await suiKit.signAndSendTxn(txb);
        console.log(`Updating version: ${resp.digest}`.blue);
      }
    } while (true);
  } catch (e) {
    console.error("Error when splitting objects: ", e);
    process.exit(0);
  }
};

const mergeObjects = async (coins: Array<Coin>, gas: Coin) => {
  try {
    const txb = new SuiTxBlock();
    txb.setGasPayment([gas]);
    let mergeCmdCount = Math.min(Math.ceil(coins.length / 500), 3);

    for (let i = 0; i < mergeCmdCount; i++) {
      const subarr = coins.slice(i * 500, (i + 1) * 500);
      txb.mergeCoins(txb.gas, subarr);
    }
    const resp = await suiKit.signAndSendTxn(txb);

    gas = await refetchGas(gas);
    console.log(`Objects merged: ${resp.digest}`.blue);
    // while (coins.length > 1) {
    //   const txb = new SuiTxBlock();
    //   txb.setGasPayment([gas]);

    //   const subarr = coins.splice(1, 500);
    //   // const objectIds = subarr.map((coin) => txb.object(coin.objectId));
    //   txb.mergeCoins(txb.gas, subarr);

    //   if (coins.length > 2) {
    //     const subarr = coins.splice(1, 500);
    //     // const objectIds = subarr.map((coin) => txb.object(coin.objectId));
    //     txb.mergeCoins(txb.gas, subarr);
    //   }

    //   const resp = await suiKit.signAndSendTxn(txb);

    //   gas = await refetchGas(gas);
    //   console.log(`Objects merged: ${resp.digest}`.blue);
    // }
  } catch (e) {
    console.error("Error when merging objects: ", e);
    process.exit(0);
  }
};

const observeObjects = async () => {
  try {
    const coins = new Array<Coin>();

    let cursor = null;
    do {
      const resp = await suiKit.client().getCoins({
        owner: suiKit.currentAddress(),
        coinType: SUI_TYPE_ARG,
        cursor: cursor,
        limit: 100,
      });
      resp.data.map((data) => {
        coins.push({
          objectId: data.coinObjectId,
          version: data.version,
          digest: data.digest,
          balance: data.balance,
        });
      });
      cursor = resp.nextCursor;
    } while (cursor !== null);

    let gasIndex = coins.findIndex((coin) => !coin.objectId.startsWith("0x0000"));
    let gas = coins.splice(gasIndex, 1)[0];
    for (let i = 0; i < coins.length; i++) {
      if (parseInt(coins[i].balance) > parseInt(gas.balance) && !coins[i].objectId.startsWith("0x0000")) {
        gas = coins[i];
        gasIndex = i;
      }
    }

    coins.splice(gasIndex, 1);

    let counter = 0;
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      if (coin.objectId.startsWith("0x0000")) {
        const resp = await submitProof(coin, gas);
        gas = await refetchGas(gas);
        console.log(`Proof submitted: ${resp.digest}`.green);
        coins.splice(i--, 1);
        counter++;
      }
    }

    if (counter > 0) {
      console.log(`${counter} proofs submitted! NFT minted!`.green);
      await getProtocolConfig();
    } else {
      console.log("No proof submitted".yellow);
    }

    await mergeObjects(coins, gas);
  } catch (e) {
    console.error("Error when observing objects: ", e);
    process.exit(0);
  }
};

const main = async () => {
  await getProtocolConfig();
  do {
    await observeObjects();
    await splitObjects();
  } while (true);
};

main();
