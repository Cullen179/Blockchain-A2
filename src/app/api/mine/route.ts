import { NextRequest, NextResponse } from 'next/server';
import { BlockRepository } from '@/repositories/BlockRepository';
import { MempoolRepository } from '@/repositories/MempoolRepository';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { BLOCKCHAIN_CONFIG } from '@/constants';
import { UTXOManager } from '@/blockchain/structure/utxo';
import { WalletRepository } from '@/repositories/WalletRepository';

interface MiningRequest {
  maxIterations?: number;
}

interface MiningResult {
  success: boolean;
  block?: {
    hash: string;
    nonce: number;
    timestamp: number;
    elapsedTime: number;
    iterations: number;
    difficulty: number;
  };
  error?: string;
  mempoolInfo: {
    transactionCount: number;
    totalFees: number;
  };
}

function calculateMerkleRoot(transactions: any[]): string {
  if (transactions.length === 0) return '0';
  
  // Simple implementation: hash all transaction IDs together
  const txHashes = transactions.map(tx => tx.id).sort();
  return createHash('sha256').update(txHashes.join('')).digest('hex');
}

function calculateBlockHash(
  index: number,
  previousHash: string,
  merkleRoot: string,
  timestamp: number,
  nonce: number,
  difficulty: number
): string {
  const data = `${index}${previousHash}${merkleRoot}${timestamp}${nonce}${difficulty}`;
  return createHash('sha256').update(data).digest('hex');
}

function meetsTargetDifficulty(hash: string, difficulty: number): boolean {
  const target = '0'.repeat(difficulty);
  return hash.startsWith(target);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json() as MiningRequest;
    const maxIterations = body.maxIterations || 10000000000; // Default 10B iterations max

    // Get blockchain and mempool data
    const [blockchain, mempool] = await Promise.all([
      BlockRepository.getDefaultBlockchain(),
      MempoolRepository.getDefaultMempool()
    ]);

    if (!blockchain) {
      return NextResponse.json(
        { error: 'No blockchain found. Please create a blockchain first.' },
        { status: 404 }
      );
    }

    if (!mempool || mempool.transactions.length === 0) {
      return NextResponse.json(
        { 
          error: 'No transactions in mempool to mine.',
          mempoolInfo: { transactionCount: 0, totalFees: 0 }
        },
        { status: 400 }
      );
    }

    // Get the latest block to determine next index and previous hash
    const latestBlock = blockchain.blocks && blockchain.blocks.length > 0 
      ? blockchain.blocks.reduce((latest, block) => 
          block.header.index > latest.header.index ? block : latest
        )
      : null;

    const nextIndex = latestBlock ? latestBlock.header.index + 1 : 0;
    const previousHash = latestBlock ? latestBlock.hash : '0';

    // Calculate merkle root from mempool transactions
    const merkleRoot = calculateMerkleRoot(mempool.transactions);
    const timestamp = Math.floor(Date.now() / 1000);
    const difficulty = blockchain.difficulty;

    // Calculate mempool info
    const totalFees = mempool.transactions.reduce((sum, tx) => sum + tx.fee, 0);
    const mempoolInfo = {
      transactionCount: mempool.transactions.length,
      totalFees
    };

    // Mining process: find nonce that creates hash with required difficulty
    let nonce = 0;
    let hash = '';
    let iterations = 0;

    console.log(`Starting mining with difficulty ${difficulty}...`);

    while (iterations < maxIterations) {
      hash = calculateBlockHash(nextIndex, previousHash, merkleRoot, timestamp, nonce, difficulty);
      iterations++;

      if (meetsTargetDifficulty(hash, difficulty)) {
        const elapsedTime = Date.now() - startTime;
        
        console.log(`Block mined! Nonce: ${nonce}, Hash: ${hash}, Time: ${elapsedTime}ms`);

        // Add the mined block to the blockchain
        const blockSize = JSON.stringify({
          index: nextIndex,
          previousHash,
          merkleRoot,
          timestamp,
          nonce,
          transactions: mempool.transactions
        }).length;

        // Add transaction to mempool
        await prisma.$transaction(async (tx) => {
          // Update transaction to reference mempool
          await Promise.all(
            mempool.transactions.map(transaction => 
              MempoolRepository.removeTransaction(mempool.id, transaction.id, tx)
            )
          );
          await BlockRepository.addBlockToBlockchain(
            mempool.transactions,{
              hash,
              index: nextIndex,
              previousHash,
              merkleRoot,
              timestamp,
              nonce,
              size: blockSize
            }, tx);
            
            await Promise.all(
              mempool.transactions.map(async transaction => {
                await UTXOManager.processTransaction(transaction, tx);
                await WalletRepository.syncBalance(transaction.from, tx);
                await WalletRepository.syncBalance(transaction.to, tx);
              })
          );

          // if the elapsed time and the expected block mine time, adjust the difficulty
          if (Math.abs(elapsedTime - BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET) > BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2) {
            await BlockRepository.adjustDifficulty(elapsedTime > BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET ? false : true, tx);
          }
        }, {
          timeout: 20000 // 20 seconds timeout
        });

        const result: MiningResult = {
          success: true,
          block: {
            hash,
            nonce,
            timestamp,
            elapsedTime,
            iterations,
            difficulty
          },
          mempoolInfo
        };

        console.log('Mining successful:', result);

        return NextResponse.json(result);
      }

      nonce++;
    }

    // Mining failed - reached max iterations
    const elapsedTime = Date.now() - startTime;
    
    const result: MiningResult = {
      success: false,
      error: `Mining failed: Could not find valid nonce within ${maxIterations} iterations (${elapsedTime}ms)`,
      mempoolInfo
    };

    return NextResponse.json(result, { status: 408 }); // Request Timeout

  } catch (error) {
    console.error('Mining API Error:', error);
    
    const result: MiningResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown mining error',
      mempoolInfo: { transactionCount: 0, totalFees: 0 }
    };

    return NextResponse.json(result, { status: 500 });
  }
}
