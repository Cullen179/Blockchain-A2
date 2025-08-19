import { prisma } from '../src/lib/prisma';

async function runPrismaSeed() {
  console.log('🌱 Running Prisma database seed...');

  try {
    console.log('✅ Database connection established');

    // Clear existing data (in reverse order due to foreign keys)
    console.log('🧹 Clearing existing data...');
    await prisma.uTXO.deleteMany();
    await prisma.transactionOutput.deleteMany();
    await prisma.transactionInput.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.block.deleteMany();

    console.log('📝 Inserting sample blockchain data...');

    // Create Genesis Block first
    const genesisBlockHash = 'genesis-block-000';
    const genesisBlock = await prisma.block.create({
      data: {
        hash: genesisBlockHash,
        index: 0,
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        merkleRoot: 'genesis-merkle-root',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 0,
        difficulty: 1,
        size: 1000,
        transactionCount: 1
      }
    });

    // Genesis transaction
    const genesisTransactionId = 'genesis-tx-001';
    const genesisTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    const genesisTransaction = await prisma.transaction.create({
      data: {
        id: genesisTransactionId,
        from: 'coinbase',              // Updated field name
        to: 'alice-wallet-123',        // Updated field name
        amount: 1000,
        fee: 0,
        timestamp: genesisTimestamp,
        size: 250,
        blockHash: genesisBlockHash    // Link to block
      }
    });

    // Genesis UTXO
    await prisma.uTXO.create({
      data: {
        id: `${genesisTransactionId}:0`,
        transactionId: genesisTransactionId,
        outputIndex: 0,
        address: 'alice-wallet-123',
        amount: 1000,
        scriptPubKey: 'alice-public-key-script',
        isSpent: false
      }
    });

    console.log('✅ Genesis block, transaction and UTXO created');

    // Create second block
    const block2Hash = 'block-001-hash';
    const block2 = await prisma.block.create({
      data: {
        hash: block2Hash,
        index: 1,
        previousHash: genesisBlockHash,
        merkleRoot: 'block-2-merkle-root',
        timestamp: genesisTimestamp + 60,
        nonce: 12345,
        difficulty: 1,
        size: 1200,
        transactionCount: 1
      }
    });

    // Second transaction: Alice to Bob
    const tx2Id = 'tx-002-alice-to-bob';
    const tx2 = await prisma.transaction.create({
      data: {
        id: tx2Id,
        from: 'alice-wallet-123',      // Updated field name
        to: 'bob-wallet-456',          // Updated field name
        amount: 500,
        fee: 10,
        timestamp: genesisTimestamp + 60, // 60 seconds later
        size: 280,
        blockHash: block2Hash          // Link to block
      }
    });

    // Mark genesis UTXO as spent
    await prisma.uTXO.update({
      where: { id: `${genesisTransactionId}:0` },
      data: {
        isSpent: true,
        spentAt: new Date()
      }
    });

    // Add new UTXOs from transaction 2
    await prisma.uTXO.createMany({
      data: [
        {
          id: `${tx2Id}:0`,
          transactionId: tx2Id,
          outputIndex: 0,
          address: 'bob-wallet-456',
          amount: 500,
          scriptPubKey: 'bob-public-key-script',
          isSpent: false
        },
        {
          id: `${tx2Id}:1`,
          transactionId: tx2Id,
          outputIndex: 1,
          address: 'alice-wallet-123',
          amount: 490, // 1000 - 500 - 10 (fee)
          scriptPubKey: 'alice-public-key-script',
          isSpent: false
        }
      ]
    });

    console.log('✅ Second block, transaction and UTXOs created');

    // Create transaction inputs and outputs for better structure
    await prisma.transactionOutput.createMany({
      data: [
        {
          transactionId: genesisTransactionId,
          outputIndex: 0,
          address: 'alice-wallet-123',
          amount: 1000,
          scriptPubKey: 'alice-public-key-script'
        },
        {
          transactionId: tx2Id,
          outputIndex: 0,
          address: 'bob-wallet-456',
          amount: 500,
          scriptPubKey: 'bob-public-key-script'
        },
        {
          transactionId: tx2Id,
          outputIndex: 1,
          address: 'alice-wallet-123',
          amount: 490,
          scriptPubKey: 'alice-public-key-script'
        }
      ]
    });

    await prisma.transactionInput.create({
      data: {
        transactionId: tx2Id,
        previousTransactionId: genesisTransactionId,
        outputIndex: 0,
        scriptSig: 'alice-signature-for-spending-genesis-utxo' // Updated field name
      }
    });

    console.log('✅ Transaction inputs and outputs created');

    // Create a third transaction: Bob to Charlie
    const block3Hash = 'block-002-hash';
    const block3 = await prisma.block.create({
      data: {
        hash: block3Hash,
        index: 2,
        previousHash: block2Hash,
        merkleRoot: 'block-3-merkle-root',
        timestamp: genesisTimestamp + 120,
        nonce: 67890,
        difficulty: 1,
        size: 1100,
        transactionCount: 1
      }
    });

    const tx3Id = 'tx-003-bob-to-charlie';
    const tx3 = await prisma.transaction.create({
      data: {
        id: tx3Id,
        from: 'bob-wallet-456',
        to: 'charlie-wallet-789',
        amount: 300,
        fee: 5,
        timestamp: genesisTimestamp + 120,
        size: 290,
        blockHash: block3Hash
      }
    });

    // Mark Bob's UTXO as spent
    await prisma.uTXO.update({
      where: { id: `${tx2Id}:0` },
      data: {
        isSpent: true,
        spentAt: new Date()
      }
    });

    // Add UTXOs from transaction 3
    await prisma.uTXO.createMany({
      data: [
        {
          id: `${tx3Id}:0`,
          transactionId: tx3Id,
          outputIndex: 0,
          address: 'charlie-wallet-789',
          amount: 300,
          scriptPubKey: 'charlie-public-key-script',
          isSpent: false
        },
        {
          id: `${tx3Id}:1`,
          transactionId: tx3Id,
          outputIndex: 1,
          address: 'bob-wallet-456',
          amount: 195, // 500 - 300 - 5 (fee)
          scriptPubKey: 'bob-public-key-script',
          isSpent: false
        }
      ]
    });

    // Add transaction outputs for tx3
    await prisma.transactionOutput.createMany({
      data: [
        {
          transactionId: tx3Id,
          outputIndex: 0,
          address: 'charlie-wallet-789',
          amount: 300,
          scriptPubKey: 'charlie-public-key-script'
        },
        {
          transactionId: tx3Id,
          outputIndex: 1,
          address: 'bob-wallet-456',
          amount: 195,
          scriptPubKey: 'bob-public-key-script'
        }
      ]
    });

    // Add transaction input for tx3
    await prisma.transactionInput.create({
      data: {
        transactionId: tx3Id,
        previousTransactionId: tx2Id,
        outputIndex: 0,
        scriptSig: 'bob-signature-for-spending-utxo'
      }
    });

    console.log('✅ Third block, transaction and UTXOs created');

    // Display summary using Prisma aggregations
    const blockCount = await prisma.block.count();
    const transactionCount = await prisma.transaction.count();
    const utxoCount = await prisma.uTXO.count({ where: { isSpent: false } });
    const totalValueResult = await prisma.uTXO.aggregate({
      where: { isSpent: false },
      _sum: { amount: true }
    });

    console.log('\n📊 Seed Summary:');
    console.log(`   🧱 Total Blocks: ${blockCount}`);
    console.log(`   📝 Total Transactions: ${transactionCount}`);
    console.log(`   💰 Unspent UTXOs: ${utxoCount}`);
    console.log(`   💵 Total Value: ${totalValueResult._sum.amount || 0} coins`);
    console.log(`   📂 Database file: database/blockchain.db`);

    // Test queries using Prisma
    console.log('\n🔍 Sample Queries:');
    const aliceUTXOs = await prisma.uTXO.findMany({
      where: { address: 'alice-wallet-123', isSpent: false }
    });
    const bobUTXOs = await prisma.uTXO.findMany({
      where: { address: 'bob-wallet-456', isSpent: false }
    });
    const charlieUTXOs = await prisma.uTXO.findMany({
      where: { address: 'charlie-wallet-789', isSpent: false }
    });
    
    const aliceTotal = aliceUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
    const bobTotal = bobUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
    const charlieTotal = charlieUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    console.log(`   Alice UTXOs: ${aliceUTXOs.length} (${aliceTotal} coins)`);
    console.log(`   Bob UTXOs: ${bobUTXOs.length} (${bobTotal} coins)`);
    console.log(`   Charlie UTXOs: ${charlieUTXOs.length} (${charlieTotal} coins)`);

    // Display blockchain structure
    console.log('\n⛓️  Blockchain Structure:');
    const blocks = await prisma.block.findMany({
      orderBy: { index: 'asc' },
      include: {
        transactions: {
          select: {
            id: true,
            from: true,
            to: true,
            amount: true,
            fee: true
          }
        }
      }
    });

    blocks.forEach(block => {
      console.log(`   Block ${block.index}: ${block.hash.substring(0, 16)}...`);
      block.transactions.forEach(tx => {
        console.log(`     └─ ${tx.from} → ${tx.to}: ${tx.amount} coins (fee: ${tx.fee})`);
      });
    });

    console.log('\n🎉 Database seed completed successfully with Prisma!');
    console.log('💡 You can now run: pnpm run dev');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPrismaSeed();