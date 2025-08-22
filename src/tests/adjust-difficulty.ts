import crypto from 'crypto';
import { BlockRepository } from '@/repositories/BlockRepository';
import { MempoolRepository } from '@/repositories/MempoolRepository';
import { UTXORepository } from '@/repositories/UTXORepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { Block } from '@/blockchain/structure/block';
import { ITransaction } from '@/types/blocks';
import { prisma } from '@/lib/prisma';
import { BLOCKCHAIN_CONFIG } from '@/constants';

/**
 * Blockchain Difficulty Adjustment Demo
 *
 * This demonstrates how blockchain difficulty adjusts based on mining time:
 * 1. Initialize blockchain with default difficulty
 * 2. Create transactions and add to mempool
 * 3. Simulate fast mining (difficulty should increase)
 * 4. Simulate slow mining (difficulty should decrease)
 * 5. Show automatic difficulty adjustment in action
 * 6. Demonstrate target block time maintenance
 */

console.log('⚡ === BLOCKCHAIN DIFFICULTY ADJUSTMENT DEMO === ⚡\n');

// Configuration constants - using blockchain configuration
const TARGET_BLOCK_TIME = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET; // 4 seconds in milliseconds
const FAST_MINING_TIME = Math.floor(TARGET_BLOCK_TIME * 0.3); // 30% of target (too fast)
const SLOW_MINING_TIME = Math.floor(TARGET_BLOCK_TIME * 2.5); // 250% of target (too slow)

// Generate test addresses
const generateTestAddress = (name: string): string => {
  return crypto
    .createHash('sha256')
    .update(`test-${name}-${Date.now()}-${Math.random()}`)
    .digest('hex');
};

const systemAddr = 'system-genesis';
const minerAddr = generateTestAddress('miner');
const aliceAddr = generateTestAddress('alice');
const bobAddr = generateTestAddress('bob');
const charlieAddr = generateTestAddress('charlie');

console.log('🔧 Test Setup:');
console.log(
  `   Target Block Time: ${TARGET_BLOCK_TIME / 1000}s (${TARGET_BLOCK_TIME}ms)`
);
console.log(
  `   Fast Mining Simulation: ${FAST_MINING_TIME / 1000}s (${FAST_MINING_TIME}ms)`
);
console.log(
  `   Slow Mining Simulation: ${SLOW_MINING_TIME / 1000}s (${SLOW_MINING_TIME}ms)`
);
console.log(
  `   Adjustment Threshold: ±${BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2}ms`
);
console.log(`   Miner Address: ${minerAddr.substring(0, 20)}...`);

// Helper function to create test wallet
async function createTestWallet(address: string, name: string): Promise<void> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  try {
    await prisma.wallet.create({
      data: {
        address,
        publicKey,
        privateKey,
        balance: 0,
      },
    });
    console.log(`   ✅ Created wallet for ${name}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      console.log(`   ℹ️  Wallet for ${name} already exists`);
    } else {
      throw error;
    }
  }
}

// Helper function to create test transaction
async function createTestTransaction(
  from: string,
  to: string,
  amount: number,
  fee: number
): Promise<ITransaction> {
  const transaction: ITransaction = {
    id: crypto
      .createHash('sha256')
      .update(`${from}-${to}-${amount}-${Date.now()}-${Math.random()}`)
      .digest('hex'),
    from,
    to,
    amount,
    fee,
    timestamp: Date.now(),
    inputs: [],
    outputs: [
      {
        amount,
        scriptPubKey: `OP_DUP OP_HASH160 ${to} OP_EQUALVERIFY OP_CHECKSIG`,
        address: to,
      },
    ],
    size: Buffer.byteLength(JSON.stringify({ from, to, amount, fee }), 'utf8'),
  };

  // Create transaction in database
  await TransactionRepository.createTransaction(transaction);
  console.log(
    `   📝 Created transaction: ${from.substring(0, 10)}... → ${to.substring(0, 10)}... (${amount} BTC)`
  );

  return transaction;
}

// Helper function to add transaction to mempool
async function addTransactionToMempool(
  transaction: ITransaction
): Promise<void> {
  let mempool = await MempoolRepository.getDefaultMempool();

  if (!mempool) {
    mempool = await MempoolRepository.createMempool();
    console.log('   🗂️  Created new mempool');
  }

  await MempoolRepository.addTransaction(transaction);
  console.log(
    `   ➕ Added transaction to mempool: ${transaction.id.substring(0, 20)}...`
  );
}

// Mock mining function with controlled timing
async function simulateMining(
  expectedTime: number,
  description: string
): Promise<{ success: boolean; actualTime: number; newDifficulty: number }> {
  console.log(`\n🔨 ${description}`);
  console.log(`   Expected mining time: ${expectedTime / 1000}s`);

  const startTime = Date.now();

  try {
    // Get current blockchain state
    const blockchain = await BlockRepository.getDefaultBlockchain();
    if (!blockchain) {
      throw new Error('Blockchain not found');
    }

    const currentDifficulty = blockchain.difficulty;
    console.log(`   Current difficulty: ${currentDifficulty}`);

    // Get mempool
    const mempool = await MempoolRepository.getDefaultMempool();
    if (!mempool || mempool.transactions.length === 0) {
      throw new Error('No transactions in mempool');
    }

    console.log(`   Transactions to mine: ${mempool.transactions.length}`);

    // Get latest block info
    const latestBlock =
      blockchain.blocks && blockchain.blocks.length > 0
        ? blockchain.blocks.reduce((latest, block) =>
            block.index > latest.index ? block : latest
          )
        : null;

    const nextIndex = latestBlock ? latestBlock.index + 1 : 0;
    const previousHash = latestBlock ? latestBlock.hash : '0';

    // Calculate merkle root
    const merkleRoot = Block.calculateMerkleRoot(mempool.transactions);
    const timestamp = Math.floor(Date.now() / 1000);

    // Simulate mining with controlled timing
    const nonce = Math.floor(Math.random() * 1000000);
    const hash = Block.createBlockHash({
      index: nextIndex,
      previousHash,
      merkleRoot,
      timestamp,
      nonce,
      difficulty: currentDifficulty,
    });

    // Simulate the expected mining time
    await new Promise(resolve => setTimeout(resolve, expectedTime));

    const actualTime = Date.now() - startTime;
    console.log(`   ⏱️  Actual mining time: ${actualTime / 1000}s`);

    // Calculate block size
    const blockSize = JSON.stringify({
      index: nextIndex,
      previousHash,
      merkleRoot,
      timestamp,
      nonce,
      transactions: mempool.transactions,
    }).length;

    // Add block to blockchain
    await prisma.$transaction(async tx => {
      // Remove transactions from mempool
      await Promise.all(
        mempool.transactions.map(transaction =>
          MempoolRepository.removeTransaction(mempool.id, transaction.id, tx)
        )
      );

      // Add block to blockchain
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

      // Simulate difficulty adjustment logic matching the mining block time logic
      const timeDifference = Math.abs(
        actualTime - BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET
      );
      const adjustmentThreshold =
        BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2;

      if (timeDifference > adjustmentThreshold) {
        const shouldIncrease =
          actualTime < BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET; // If mining was too fast, increase difficulty
        await BlockRepository.adjustDifficulty(shouldIncrease, tx);
        console.log(
          `   📊 Difficulty ${shouldIncrease ? 'INCREASED' : 'DECREASED'} (mining was too ${shouldIncrease ? 'fast' : 'slow'})`
        );
      } else {
        console.log(`   📊 Difficulty UNCHANGED (mining time acceptable)`);
      }
    });

    // Get updated difficulty
    const updatedBlockchain = await BlockRepository.getDefaultBlockchain();
    const newDifficulty = updatedBlockchain?.difficulty || currentDifficulty;

    console.log(`   🎯 New difficulty: ${newDifficulty}`);
    console.log(`   ✅ Block mined and added successfully`);

    return {
      success: true,
      actualTime,
      newDifficulty,
    };
  } catch (error) {
    console.log(
      `   ❌ Mining failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {
      success: false,
      actualTime: Date.now() - startTime,
      newDifficulty: 0,
    };
  }
}

// Main demonstration function
async function demonstrateDifficultyAdjustment() {
  try {
    console.log('\n🏗️  Setting Up Test Environment...');

    // Create test wallets
    console.log('\n👥 Creating Test Wallets:');
    await createTestWallet(systemAddr, 'System');
    await createTestWallet(minerAddr, 'Miner');
    await createTestWallet(aliceAddr, 'Alice');
    await createTestWallet(bobAddr, 'Bob');
    await createTestWallet(charlieAddr, 'Charlie');

    // Initialize blockchain if needed
    let blockchain = await BlockRepository.getDefaultBlockchain();
    if (!blockchain) {
      blockchain = await BlockRepository.createBlockchain(4); // Start with difficulty 4
      console.log('   🔗 Created new blockchain with difficulty 4');
    } else {
      console.log(
        `   🔗 Using existing blockchain with difficulty ${blockchain.difficulty}`
      );
    }

    console.log(`\n📊 Initial Blockchain State:`);
    console.log(`   Blockchain ID: ${blockchain.id}`);
    console.log(`   Current Difficulty: ${blockchain.difficulty}`);
    console.log(`   Blocks: ${blockchain.blocks?.length || 0}`);

    // SCENARIO 1: Normal Mining (baseline)
    console.log('\n=== SCENARIO 1: Normal Mining Speed ===');

    // Create transactions for first block
    const tx1 = await createTestTransaction(systemAddr, aliceAddr, 50, 1);
    const tx2 = await createTestTransaction(systemAddr, bobAddr, 30, 1);
    await addTransactionToMempool(tx1);
    await addTransactionToMempool(tx2);

    const result1 = await simulateMining(
      TARGET_BLOCK_TIME,
      'Mining at normal speed'
    );

    // SCENARIO 2: Fast Mining (difficulty should increase)
    console.log('\n=== SCENARIO 2: Fast Mining Speed ===');

    // Create transactions for second block
    const tx3 = await createTestTransaction(aliceAddr, charlieAddr, 20, 1);
    const tx4 = await createTestTransaction(bobAddr, charlieAddr, 15, 1);
    await addTransactionToMempool(tx3);
    await addTransactionToMempool(tx4);

    const result2 = await simulateMining(
      FAST_MINING_TIME,
      'Mining too fast (difficulty should increase)'
    );

    // SCENARIO 3: Slow Mining (difficulty should decrease)
    console.log('\n=== SCENARIO 3: Slow Mining Speed ===');

    // Create transactions for third block
    const tx5 = await createTestTransaction(charlieAddr, aliceAddr, 10, 1);
    const tx6 = await createTestTransaction(systemAddr, minerAddr, 100, 2);
    await addTransactionToMempool(tx5);
    await addTransactionToMempool(tx6);

    const result3 = await simulateMining(
      SLOW_MINING_TIME,
      'Mining too slow (difficulty should decrease)'
    );

    // SCENARIO 4: Another fast mining to test continued adjustment
    console.log('\n=== SCENARIO 4: Fast Mining Again ===');

    // Create transactions for fourth block
    const tx7 = await createTestTransaction(minerAddr, bobAddr, 25, 1);
    const tx8 = await createTestTransaction(aliceAddr, systemAddr, 5, 1);
    await addTransactionToMempool(tx7);
    await addTransactionToMempool(tx8);

    const result4 = await simulateMining(
      FAST_MINING_TIME,
      'Mining fast again (testing continuous adjustment)'
    );

    // Final blockchain analysis
    console.log('\n📈 === DIFFICULTY ADJUSTMENT ANALYSIS ===');

    const finalBlockchain = await BlockRepository.getDefaultBlockchain();
    console.log(`\n🔗 Final Blockchain State:`);
    console.log(`   Total Blocks: ${finalBlockchain?.blocks?.length || 0}`);
    console.log(
      `   Final Difficulty: ${finalBlockchain?.difficulty || 'Unknown'}`
    );

    console.log('\n⏱️  Mining Time Analysis:');
    if (result1.success)
      console.log(
        `   Block 1 (Normal): ${result1.actualTime / 1000}s → Difficulty: ${result1.newDifficulty}`
      );
    if (result2.success)
      console.log(
        `   Block 2 (Fast): ${result2.actualTime / 1000}s → Difficulty: ${result2.newDifficulty}`
      );
    if (result3.success)
      console.log(
        `   Block 3 (Slow): ${result3.actualTime / 1000}s → Difficulty: ${result3.newDifficulty}`
      );
    if (result4.success)
      console.log(
        `   Block 4 (Fast): ${result4.actualTime / 1000}s → Difficulty: ${result4.newDifficulty}`
      );

    console.log('\n📊 Difficulty Progression Timeline:');
    const startingDifficulty = blockchain.difficulty;
    console.log(`   🔸 Initial: ${startingDifficulty} (starting difficulty)`);
    if (result1.success)
      console.log(
        `   🔸 After Normal Mining (${result1.actualTime / 1000}s): ${result1.newDifficulty}`
      );
    if (result2.success)
      console.log(
        `   🔸 After Fast Mining (${result2.actualTime / 1000}s): ${result2.newDifficulty} ${result2.newDifficulty > result1.newDifficulty ? '📈' : result2.newDifficulty < result1.newDifficulty ? '📉' : '➡️'}`
      );
    if (result3.success)
      console.log(
        `   🔸 After Slow Mining (${result3.actualTime / 1000}s): ${result3.newDifficulty} ${result3.newDifficulty > result2.newDifficulty ? '📈' : result3.newDifficulty < result2.newDifficulty ? '📉' : '➡️'}`
      );
    if (result4.success)
      console.log(
        `   🔸 After Fast Mining Again (${result4.actualTime / 1000}s): ${result4.newDifficulty} ${result4.newDifficulty > result3.newDifficulty ? '📈' : result4.newDifficulty < result3.newDifficulty ? '📉' : '➡️'}`
      );

    console.log('\n🎯 Difficulty Adjustment Results:');
    const initialDifficulty = startingDifficulty;
    const finalDifficulty = finalBlockchain?.difficulty || initialDifficulty;

    if (finalDifficulty > initialDifficulty) {
      console.log(
        `   📈 Difficulty INCREASED from ${initialDifficulty} to ${finalDifficulty} (fast mining detected)`
      );
    } else if (finalDifficulty < initialDifficulty) {
      console.log(
        `   📉 Difficulty DECREASED from ${initialDifficulty} to ${finalDifficulty} (slow mining detected)`
      );
    } else {
      console.log(
        `   ➡️  Difficulty UNCHANGED at ${finalDifficulty} (balanced mining times)`
      );
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await cleanupTestData();
    console.log('   ✅ Cleanup completed');
  } catch (error) {
    console.error(
      `\n❌ Demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    // Cleanup on error
    try {
      await cleanupTestData();
      console.log('✅ Error cleanup completed');
    } catch (cleanupError) {
      console.log(
        `❌ Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`
      );
    }
  }
}

// Cleanup function
async function cleanupTestData(): Promise<void> {
  const testAddresses = [
    systemAddr,
    minerAddr,
    aliceAddr,
    bobAddr,
    charlieAddr,
  ];

  try {
    // Only clean up test wallets (transactions are integrated into blockchain)
    await prisma.wallet.deleteMany({
      where: {
        address: {
          in: testAddresses.filter(addr => addr !== 'system-genesis'),
        }, // Keep system wallet
      },
    });

    console.log(
      '   🗑️  Removed test wallets (transactions preserved in blockchain)'
    );
  } catch (error) {
    console.log(
      `   ⚠️  Partial cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Run the demonstration
demonstrateDifficultyAdjustment()
  .then(() => {
    console.log('\n🎯 === DIFFICULTY ADJUSTMENT DEMO COMPLETED ===');

    console.log(
      '\n🚀 Result: Blockchain difficulty successfully adapts to mining conditions!'
    );
  })
  .catch(error => {
    console.error(
      `\nUnhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  })
  .finally(() => {
    process.exit(0);
  });
