import 'colorts/lib/string';
import { SUI_CLOCK_OBJECT_ID, SuiTxBlock } from '@scallop-io/sui-kit';
import { suiKit } from 'utils/connection';
import { publishResult } from 'suiversary';
import { SUI_TYPE_ARG, SuiObjectRef } from '@mysten/sui.js';

type Coin = {
    value: string;
} & SuiObjectRef;

const refetchGas = async (gas: Coin): Promise<Coin> => {
    const resp = await suiKit.provider().getObject({ id: gas.objectId });
    return {
        objectId: resp.data!.objectId,
        version: resp.data!.version,
        digest: resp.data!.digest,
        value: gas.value,
    };
};

const submitProof = async (coin: Coin, gas: Coin) => {
    try {
        const txb = new SuiTxBlock();
        txb.setGasPayment([
            {
                objectId: gas.objectId,
                version: gas.version,
                digest: gas.digest,
            },
        ]);

        const coinValue = parseInt(coin.value);
        if (coinValue < 1e9) {
            const newValue = txb.splitCoins(txb.gas, [1e9 - coinValue])[0];
            txb.mergeCoins(coin.objectId, [newValue]);
        } else if (coinValue > 1e9) {
            const removedValue = txb.splitCoins(coin.objectId, [
                coinValue - 1e9,
            ])[0];
            txb.transferObjects([removedValue], suiKit.currentAddress());
        }

        txb.moveCall(
            `${publishResult.packageId}::suiversary::mint_pow`,
            [
                txb.object(publishResult.registryId),
                txb.object(coin.objectId),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
            []
        );
        return suiKit.signAndSendTxn(txb);
    } catch (e) {
        console.error('Error when submitting proof: ', e);
        process.exit(0);
    }
};

const splitObjects = async () => {
    try {
        do {
            const txb = new SuiTxBlock();
            const array = new Array(500);
            array.fill(1);
            let arr = txb.splitCoins(txb.gas, array);
            txb.transferObjects(arr, suiKit.currentAddress());
            arr = txb.splitCoins(txb.gas, array);
            txb.transferObjects(arr, suiKit.currentAddress());
            txb.setSender(suiKit.currentAddress());

            const txBytes = await txb.build({
                provider: suiKit.provider(),
            });

            const resp = await suiKit.provider().dryRunTransactionBlock({
                transactionBlock: txBytes,
            });

            let ok = false;
            for (const changes of resp.objectChanges) {
                if (changes.type === 'created') {
                    if (changes.objectId.startsWith('0x0000')) {
                        console.log(`Hash Found: ${changes.objectId}`.bgGreen);
                        ok = true;
                    } else if (changes.objectId.startsWith('0x00')) {
                        console.log(`Almost rare: ${changes.objectId}`.gray);
                    }
                }
            }

            if (ok) {
                const resp = await suiKit.signAndSendTxn(txBytes);
                console.log(`Creating hash: ${resp.digest}`.blue);
                break;
            } else {
                console.log('No rare hash found.'.yellow);

                const txb = new SuiTxBlock();
                const resp = await suiKit.signAndSendTxn(txb);
                console.log(`Updating version: ${resp.digest}`.blue);
            }
        } while (true);
    } catch (e) {
        console.error('Error when splitting objects: ', e);
        process.exit(0);
    }
};

const mergeObjects = async (coins: Array<Coin>, gas: Coin) => {
    try {
        while (coins.length > 1) {
            const txb = new SuiTxBlock();
            txb.setGasPayment([
                {
                    objectId: gas.objectId,
                    version: gas.version,
                    digest: gas.digest,
                },
            ]);

            const subarr = coins.splice(1, 500);
            const objectIds = subarr.map((coin) => txb.object(coin.objectId));
            txb.mergeCoins(txb.gas, objectIds);

            if (coins.length > 2) {
                const subarr = coins.splice(1, 500);
                const objectIds = subarr.map((coin) =>
                    txb.object(coin.objectId)
                );
                txb.mergeCoins(txb.gas, objectIds);
            }

            const resp = await suiKit.signAndSendTxn(txb);

            gas = await refetchGas(gas);
            console.log(`Objects merged: ${resp.digest}`.blue);
        }
    } catch (e) {
        console.error('Error when merging objects: ', e);
        process.exit(0);
    }
};

const observeObjects = async () => {
    try {
        const coins = new Array<Coin>();

        let cursor = null;
        do {
            const resp = await suiKit
                .provider()
                .getCoins({
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
                    value: data.balance,
                });
            });
            cursor = resp.nextCursor;
        } while (cursor !== null);

        let gas = coins[0];
        let gasIndex = 0;
        for (let i = 1; i < coins.length; i++) {
            if (parseInt(coins[i].value) > parseInt(gas.value)) {
                gas = coins[i];
                gasIndex = i;
            }
        }

        coins.splice(gasIndex, 1);

        let counter = 0;
        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            if (coin.objectId.startsWith('0x0000')) {
                const resp = await submitProof(coin, gas);
                gas = await refetchGas(gas);
                console.log(`Proof submitted: ${resp.digest}`.green);
                coins.splice(i--, 1);
                counter++;
            }
        }

        if (counter > 0) {
            console.log(`${counter} proofs submitted! NFT minted!`.green);
        } else {
            console.log('No proof submitted'.yellow);
        }

        await mergeObjects(coins, gas);
    } catch (e) {
        console.error('Error when observing objects: ', e);
        process.exit(0);
    }
};

const main = async () => {
    do {
        await observeObjects();
        await splitObjects();
    } while (true);
};

main();
