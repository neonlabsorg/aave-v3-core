import rawBRE from 'hardhat';
import { initializeMakeSuite } from './helpers/make-suite';
import { ethers, network } from 'hardhat';
import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider/src.ts';

async function waitTransactionWithTimeout(
  tx: TransactionResponse,
  timeoutMs: number = 120000
): Promise<TransactionReceipt> {
  const receipt: TransactionReceipt = (await Promise.race([
    tx.wait(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Transaction wait timed out after ${timeoutMs} ms`)),
        timeoutMs
      )
    ),
  ])) as TransactionReceipt;
  return receipt;
}

// Patch Signer.sendTransaction to always wait for the tx
const patchSigners = () => {
  const originalGetSigners = ethers.getSigners;
  ethers.getSigners = async function () {
    const signers = await originalGetSigners.call(this);
    for (const s of signers) {
      const originalSend = s.sendTransaction.bind(s);
      s.sendTransaction = async (...args) => {
        const tx = await originalSend(...args);
        await waitTransactionWithTimeout(tx);
        return tx;
      };
    }
    return signers;
  };
};

before(async () => {
  patchSigners();

  await rawBRE.deployments.fixture(['market']);
  console.log('-> Deployed market');

  console.log('-> Initializing test environment');
  await initializeMakeSuite();
  console.log('\n***************');
  console.log('Setup and snapshot finished');
  console.log('***************\n');
});
