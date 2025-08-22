import { BLOCKCHAIN_CONFIG, HASH_ALGORITHMS } from '@/constants';
import { BlockRepository } from '@/repositories';
import { IBlockchain, IHashVerificationResult } from '@/types';
import { IBlock, IBlockHeader, ITransaction } from '@/types/blocks';
import crypto, { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { UTXOManager } from './utxo';
import { WalletRepository } from '@/repositories/WalletRepository';
import { MempoolRepository } from '@/repositories/MempoolRepository';
import { prisma } from '@/lib/prisma';
import { Blockchain } from '@/generated/prisma';

export class Block {
  static createBlockHash(
    block: Omit<IBlock, 'transactions' | 'hash' | 'size'>
  ): string {
    const hashData = {
      index: block.index,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      nonce: block.nonce,
      difficulty: block.difficulty,
    };

    return createHash('sha256')
      .update(JSON.stringify(hashData, Object.keys(hashData).sort()))
      .digest('hex');
  }

  // /**
  //  * Verify if the block's hash is valid
  //  * Recalculates hash and compares with stored hash
  //  */
  static verifyHash(block: IBlock): IHashVerificationResult {
    const calculatedHash = Block.createBlockHash({
      ...block,
      merkleRoot: this.calculateMerkleRoot(block.transactions),
    });
    const isValid = calculatedHash === block.hash;
    const errors: string[] = [];

    if (!isValid) {
      errors.push('Block hash mismatch');
      errors.push(`Expected: ${block.hash}`);
      errors.push(`Calculated: ${calculatedHash}`);
    }

    // Additional validations
    if (!block.hash || block.hash.length !== 64) {
      errors.push('Invalid hash format (must be 64-character hex string)');
    }

    if (!Block.isValidHexString(block.hash)) {
      errors.push('Hash contains invalid hexadecimal characters');
    }

    // Log errors if any
    if (errors.length > 0) {
      console.error('Hash verification errors:', errors);
    }

    return {
      isValid: isValid,
      expectedHash: block.hash,
      actualHash: calculatedHash,
      errors,
    };
  }

  /**
   * Check if a string is a valid hexadecimal representation
   */
  static isValidHexString(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str);
  }

  static async validateBlockchain() {
    const blockchain = await BlockRepository.getDefaultBlockchain();
    if (!blockchain) {
      throw new Error('Blockchain is not found');
    }

    if (!blockchain?.blocks || blockchain.blocks.length === 0) {
      return; // No blocks to validate
    }

    try {
      let prev: IBlock | null = null;
      for (const block of blockchain.blocks) {
        const hashResult = Block.verifyHash(block);
        const chainValid = !prev || block.previousHash === prev.hash;

        if (!hashResult.isValid || !chainValid) {
          await BlockRepository.invalidateSubsequentBlocks(block.hash);
          throw new Error(`Block validation failed at index ${block.index}`);
        }
        prev = block;
      }
    } catch (error) {
      console.error('Blockchain validation error:', error);

      throw new Error(
        `Blockchain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // /**
  //    * Validates a new block before adding it to the chain
  //    * @return True if the block is valid, false otherwise
  //    * */

  // public isValid(previousBlock: Block): boolean {
  //   // Check index
  //   if (this.header.index !== previousBlock.header.index + 1) {
  //     console.error(`Invalid block index: expected ${previousBlock.header.index + 1}, got ${this.header.index}`);
  //     return false;
  //   }

  //   // Check previous hash
  //   if (this.header.previousHash !== previousBlock.hash) {
  //     console.error(`Invalid previous hash: expected ${previousBlock.hash}, got ${this.header.previousHash}`);
  //     return false;
  //   }

  //   // Check hash
  //   const hashResult = this.verifyHash();
  //   if (!hashResult.isValid) {
  //     console.error(`Invalid block hash: ${hashResult.errors.join(', ')}`);
  //     return false;
  //   }

  //   // Check difficulty
  //   if (!this.isValidDifficulty(this.header.difficulty)) {
  //     console.error(`Invalid block difficulty: ${this.header.difficulty}`);
  //     return false;
  //   }

  //   // Check transactions
  //   if (!this.areTransactionsValid(this.transactions)) {
  //     console.error('Invalid transactions in block');
  //     return false;
  //   }

  //   return true;
  // }

  // /**
  //  * Validates the difficulty of a block
  //  * @param difficulty The difficulty to validate
  //  * @return True if valid, false otherwise
  //  */

  // private isValidDifficulty(difficulty: number): boolean {
  //   // assume difficulty is always a positive integer
  //   return Number.isInteger(difficulty) && difficulty > 0;
  // }

  // /**
  //  * Validates the transactions in a block
  //  * @param transactions The transactions to validate
  //  * @return True if all transactions are valid, false otherwise
  //  */
  // private areTransactionsValid(transactions: ITransaction[]): boolean {
  //   for (const tx of transactions) {
  //     if (!tx.id || !tx.from || !tx.to || tx.amount <= 0 || tx.fee < 0) {
  //       console.error(`Invalid transaction: ${JSON.stringify(tx)}`);
  //       return false;
  //     }
  //   }

  //   return true;
  // }

  static async mineBlock() {
    const startTime = Date.now();

    try {
      const maxIterations = 1000000; // Default 1M iterations max

      // Get blockchain and mempool data
      const [blockchain, mempool] = await Promise.all([
        BlockRepository.getDefaultBlockchain(),
        MempoolRepository.getDefaultMempool(),
      ]);

      if (!blockchain) {
        throw new Error('Blockchain not found');
      }

      if (!mempool || mempool.transactions.length === 0) {
        throw new Error('No transactions in mempool to mine');
      }

      // Validate blockchain before mining
      await Block.validateBlockchain();

      // Get the latest block to determine next index and previous hash
      const latestBlock =
        blockchain.blocks && blockchain.blocks.length > 0
          ? blockchain.blocks.reduce((latest, block) =>
              block.index > latest.index ? block : latest
            )
          : null;

      const nextIndex = latestBlock ? latestBlock.index + 1 : 0;
      const previousHash = latestBlock ? latestBlock.hash : '0';
      const timestamp = Math.floor(Date.now() / 1000);

      // Calculate merkle root from mempool transactions
      const merkleRoot = this.calculateMerkleRoot(mempool.transactions);
      const difficulty = blockchain.difficulty;

      // Calculate mempool info
      const totalFees = mempool.transactions.reduce(
        (sum, tx) => sum + tx.fee,
        0
      );
      const mempoolInfo = {
        transactionCount: mempool.transactions.length,
        totalFees,
      };

      // Mining process: find nonce that creates hash with required difficulty
      let nonce = 0;
      let hash = '';
      let iterations = 0;

      console.log(`Starting mining with difficulty ${difficulty}...`);

      while (iterations < maxIterations) {
        hash = this.createBlockHash({
          index: nextIndex,
          previousHash,
          merkleRoot,
          timestamp,
          nonce,
          difficulty,
        });
        iterations++;

        if (this.meetsTargetDifficulty(hash, difficulty)) {
          const elapsedTime = Date.now() - startTime;

          console.log(
            `Block mined! Nonce: ${nonce}, Hash: ${hash}, Time: ${elapsedTime}ms`
          );

          // Add the mined block to the blockchain
          const blockSize = JSON.stringify({
            index: nextIndex,
            previousHash,
            merkleRoot,
            timestamp,
            nonce,
            transactions: mempool.transactions,
          }).length;

          // Add transaction to mempool
          await prisma.$transaction(
            async tx => {
              // Update transaction to reference mempool
              await Promise.all(
                mempool.transactions.map(transaction =>
                  MempoolRepository.removeTransaction(
                    mempool.id,
                    transaction.id,
                    tx
                  )
                )
              );
              await BlockRepository.addBlockToBlockchain(
                mempool.transactions,
                {
                  hash,
                  index: nextIndex,
                  previousHash,
                  merkleRoot,
                  timestamp,
                  nonce,
                  size: blockSize,
                },
                tx
              );

              await Promise.all(
                mempool.transactions.map(async transaction => {
                  await UTXOManager.processTransaction(transaction, tx);
                  await WalletRepository.syncBalance(transaction.from, tx);
                  await WalletRepository.syncBalance(transaction.to, tx);
                })
              );

              // if the elapsed time and the expected block mine time, adjust the difficulty
              if (
                Math.abs(
                  elapsedTime - BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET
                ) >
                BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2
              ) {
                await BlockRepository.adjustDifficulty(
                  elapsedTime > BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET
                    ? false
                    : true,
                  tx
                );
              }
            },
            {
              timeout: 20000, // 20 seconds timeout
            }
          );

          const result = {
            success: true,
            block: {
              hash,
              nonce,
              timestamp,
              elapsedTime,
              iterations,
              difficulty,
            },
            mempoolInfo,
          };

          console.log('Mining successful:', result);

          return NextResponse.json(result);
        }

        nonce++;
      }

      // Mining failed - reached max iterations
      const elapsedTime = Date.now() - startTime;
      await BlockRepository.adjustDifficulty(
        false // Decrease difficulty if we couldn't find a valid nonce
      );
      const result = {
        success: false,
        error: `Mining failed: Could not find valid nonce within ${maxIterations} iterations (${elapsedTime}ms)`,
        mempoolInfo,
      };

      return NextResponse.json(result, { status: 408 }); // Request Timeout
    } catch (error) {
      console.error('Mining API Error:', error);

      const result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown mining error',
        mempoolInfo: { transactionCount: 0, totalFees: 0 },
      };

      return NextResponse.json(result, { status: 500 });
    }
  }

  /**
   * Calculate the Merkle root of the block's transactions
   * @return The Merkle root as a hex string
   * */
  static calculateMerkleRoot(transactions: ITransaction[]): string {
    if (transactions.length === 0) {
      return '0'.repeat(64); // Return a zero hash if no transactions
    }

    let transactionHashes = transactions.map(tx => {
      return crypto
        .createHash('sha256')
        .update(JSON.stringify(tx, Object.keys(tx).sort()))
        .digest('hex');
    });

    while (transactionHashes.length > 1) {
      const newLevel: string[] = [];
      for (let i = 0; i < transactionHashes.length; i += 2) {
        if (i + 1 < transactionHashes.length) {
          const combinedHash = transactionHashes[i] + transactionHashes[i + 1];
          newLevel.push(
            crypto
              .createHash(HASH_ALGORITHMS.SHA256)
              .update(combinedHash)
              .digest('hex')
          );
        } else {
          newLevel.push(transactionHashes[i]); // Odd count, carry last hash
        }
      }
      transactionHashes = newLevel;
    }

    const merkleRoot = transactionHashes[0];
    return merkleRoot;
  }

  static meetsTargetDifficulty(hash: string, difficulty: number): boolean {
    const target = '0'.repeat(difficulty);
    return hash.startsWith(target);
  }
}
