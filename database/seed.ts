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
    await prisma.blockchain.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.mempool.deleteMany();

    console.log('📝 Inserting sample blockchain data...');

    // Create the main blockchain first
    console.log('⛓️  Creating blockchain...');
    const blockchain = await prisma.blockchain.create({
      data: {
        difficulty: 4,
      }
    });
    console.log('✅ Blockchain created:', blockchain.id);

    // Create Wallets first
    console.log('👛 Creating wallets...');
    await prisma.wallet.createMany({
      data: [
        {
          address: 'alice-wallet-123',
          privateKey: 'alice-private-key-secret-123456789abcdef',
          publicKey: 'alice-public-key-04a1b2c3d4e5f6789abc',
          balance: 0 // Will be updated after transactions
        },
        {
          address: 'bob-wallet-456',
          privateKey: 'bob-private-key-secret-987654321fedcba',
          publicKey: 'bob-public-key-048f7e6d5c4b3a2901ef',
          balance: 0
        },
        {
          address: 'charlie-wallet-789',
          privateKey: 'charlie-private-key-secret-abcdef123456789',
          publicKey: 'charlie-public-key-04fedcba987654321012',
          balance: 0
        },
        {
          address: 'coinbase',
          privateKey: 'coinbase-private-key-system-000000000000',
          publicKey: 'coinbase-public-key-system-000000000000',
          balance: 0
        }
      ]
    });

    console.log('✅ Wallets created successfully');

    // Create empty Mempool
    console.log('🔄 Creating mempool...');
    const mempool = await prisma.mempool.create({
      data: {
        maxSize: 1000,
        currentSize: 0,
      }
    });
    
    console.log('✅ Empty mempool created successfully');

    // Create Genesis Block first
    const genesisBlockHash = 'genesis-block-000';
    const genesisTimestamp = Math.floor(Date.now() / 1000);
    
    console.log('🧱 Creating Genesis Block...');
    const genesisBlock = await prisma.block.create({
      data: {
        hash: genesisBlockHash,
        index: 0,
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        merkleRoot: 'genesis-merkle-root',
        timestamp: genesisTimestamp,
        nonce: 0,
        size: 1000,
        blockchainId: blockchain.id  // Associate with the blockchain
      }
    });

    // Genesis transaction
    const genesisTransactionId = 'genesis-tx-001';

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
        size: 1200,
        blockchainId: blockchain.id  // Associate with the blockchain
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
          address: 'alice-wallet-123',
          amount: 1000,
          scriptPubKey: 'alice-public-key-script'
        },
        {
          transactionId: tx2Id,
          address: 'bob-wallet-456',
          amount: 500,
          scriptPubKey: 'bob-public-key-script'
        },
        {
          transactionId: tx2Id,
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
        size: 1100,
        blockchainId: blockchain.id  // Associate with the blockchain
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
          address: 'charlie-wallet-789',
          amount: 300,
          scriptPubKey: 'charlie-public-key-script'
        },
        {
          transactionId: tx3Id,
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

    // Update wallet balances based on unspent UTXOs
    console.log('💰 Updating wallet balances...');
    
    const aliceUTXOs = await prisma.uTXO.findMany({
      where: { address: 'alice-wallet-123', isSpent: false }
    });
    const bobUTXOs = await prisma.uTXO.findMany({
      where: { address: 'bob-wallet-456', isSpent: false }
    });
    const charlieUTXOs = await prisma.uTXO.findMany({
      where: { address: 'charlie-wallet-789', isSpent: false }
    });

    const aliceBalance = aliceUTXOs.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
    const bobBalance = bobUTXOs.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
    const charlieBalance = charlieUTXOs.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);

    // Update wallet balances
    await prisma.wallet.update({
      where: { address: 'alice-wallet-123' },
      data: { balance: aliceBalance }
    });

    await prisma.wallet.update({
      where: { address: 'bob-wallet-456' },
      data: { balance: bobBalance }
    });

    await prisma.wallet.update({
      where: { address: 'charlie-wallet-789' },
      data: { balance: charlieBalance }
    });

    console.log('✅ Wallet balances updated');

    // Display summary using Prisma aggregations
    const blockchainCount = await prisma.blockchain.count();
    const blockCount = await prisma.block.count();
    const transactionCount = await prisma.transaction.count();
    const walletCount = await prisma.wallet.count();
    const utxoCount = await prisma.uTXO.count({ where: { isSpent: false } });
    const totalValueResult = await prisma.uTXO.aggregate({
      where: { isSpent: false },
      _sum: { amount: true }
    });

    // Get mempool count
    const mempoolCount = await prisma.mempool.count();

    console.log('\n📊 Seed Summary:');
    console.log(`   ⛓️  Total Blockchains: ${blockchainCount}`);
    console.log(`   🧱 Total Blocks: ${blockCount}`);
    console.log(`   📝 Total Transactions: ${transactionCount}`);
    console.log(`   👛 Total Wallets: ${walletCount}`);
    console.log(`   🔄 Mempools: ${mempoolCount}`);
    console.log(`   💰 Unspent UTXOs: ${utxoCount}`);
    console.log(`   💵 Total Value: ${totalValueResult._sum.amount || 0} coins`);
    console.log(`   📂 Database file: database/blockchain.db`);
    console.log(`   🆔 Blockchain ID: ${blockchain.id}`);

    // Test queries using Prisma

    const aliceTotal = aliceUTXOs.reduce((sum: any, utxo: { amount: any; }) => sum + utxo.amount, 0);
    const bobTotal = bobUTXOs.reduce((sum: any, utxo: { amount: any; }) => sum + utxo.amount, 0);
    const charlieTotal = charlieUTXOs.reduce((sum: any, utxo: { amount: any; }) => sum + utxo.amount, 0);
    
    console.log(`   Alice UTXOs: ${aliceUTXOs.length} (${aliceTotal} coins)`);
    console.log(`   Bob UTXOs: ${bobUTXOs.length} (${bobTotal} coins)`);
    console.log(`   Charlie UTXOs: ${charlieUTXOs.length} (${charlieTotal} coins)`);

    // Display blockchain structure
    console.log('\n⛓️  Blockchain Structure:');
    const blocks = await prisma.block.findMany({
      where: { blockchainId: blockchain.id },
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

    blocks.forEach((block: any) => {
      console.log(`   Block ${block.index}: ${block.hash.substring(0, 16)}... (blockchain: ${block.blockchainId?.substring(0, 8)}...)`);
      block.transactions.forEach((tx: any) => {
        console.log(`     └─ ${tx.from} → ${tx.to}: ${tx.amount} coins (fee: ${tx.fee})`);
      });
    });

    console.log('\n🎉 Database seed completed successfully with Blockchain and Prisma!');
    console.log('💡 You can now run: npm run dev');
    console.log(`💡 Test the BlockRepository with blockchain ID: ${blockchain.id}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPrismaSeed();