import { prisma } from '../src/lib/prisma';
import { BlockRepository } from '../src/repositories/BlockRepository';
import { UTXORepository } from '../src/repositories/UTXORepository';

async function prismaOrmDemo() {
  console.log('🚀 Prisma ORM Demo');
  console.log('=================');

  try {
    // Direct Prisma client usage
    console.log('\n1. Direct Prisma Client Usage:');
    console.log('------------------------------');
    
    const transactionCount = await prisma.transaction.count();
    console.log(`📝 Total transactions: ${transactionCount}`);

    const unspentUTXOs = await prisma.uTXO.findMany({
      where: { isSpent: false },
      include: { transaction: true }
    });
    console.log(`💰 Unspent UTXOs: ${unspentUTXOs.length}`);

    // Repository pattern usage
    console.log('\n2. Repository Pattern Usage:');
    console.log('----------------------------');
    
    const utxoRepo = new UTXORepository();
    const blockRepo = new BlockRepository();

    // Get Alice's balance
    const aliceUTXOs = await utxoRepo.findUnspentByAddress('alice-wallet-123');
    const aliceBalance = await utxoRepo.getTotalValueByAddress('alice-wallet-123');
    console.log(`👩 Alice has ${aliceUTXOs.length} UTXOs worth ${aliceBalance} coins`);

    // Get Bob's balance
    const bobUTXOs = await utxoRepo.findUnspentByAddress('bob-wallet-456');
    const bobBalance = await utxoRepo.getTotalValueByAddress('bob-wallet-456');
    console.log(`👨 Bob has ${bobUTXOs.length} UTXOs worth ${bobBalance} coins`);

    // Create a new transaction and UTXO (example)
    console.log('\n3. Creating New Transaction and UTXO:');
    console.log('-------------------------------------');
    
    // First create a transaction
    const newTransaction = await prisma.transaction.create({
      data: {
        id: 'tx-003-example',
        fromAddress: 'alice-wallet-123',
        toAddress: 'charlie-wallet-789',
        amount: 100,
        fee: 5,
        timestamp: Math.floor(Date.now() / 1000),
        size: 200
      }
    });
    console.log(`✅ Created new transaction: ${newTransaction.id}`);

    // Then create the UTXO
    const newUTXO = await utxoRepo.create({
      transactionId: 'tx-003-example',
      outputIndex: 0,
      address: 'charlie-wallet-789',
      amount: 100,
      scriptPubKey: 'charlie-public-key-script',
      isSpent: false
    });
    console.log(`✅ Created new UTXO for Charlie: ${newUTXO.amount} coins`);

    // Advanced queries with Prisma
    console.log('\n4. Advanced Prisma Queries:');
    console.log('----------------------------');
    
    // Get all transactions with their UTXOs
    const transactionsWithUTXOs = await prisma.transaction.findMany({
      include: {
        utxos: {
          where: { isSpent: false }
        },
        inputs: true,
        outputs: true
      },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`📊 Found ${transactionsWithUTXOs.length} transactions:`);
    transactionsWithUTXOs.forEach(tx => {
      console.log(`  - ${tx.id}: ${tx.fromAddress} → ${tx.toAddress} (${tx.amount} coins)`);
      console.log(`    Unspent UTXOs: ${tx.utxos.length}`);
    });

    // Aggregation example - total value in circulation
    const totalCirculation = await prisma.uTXO.aggregate({
      where: { isSpent: false },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true }
    });

    console.log('\n5. Blockchain Statistics:');
    console.log('-------------------------');
    console.log(`💰 Total coins in circulation: ${totalCirculation._sum.amount || 0}`);
    console.log(`📊 Total UTXOs: ${totalCirculation._count}`);
    console.log(`📈 Average UTXO value: ${totalCirculation._avg.amount?.toFixed(2) || 0}`);

    // Complex query - Find all addresses with their balances
    const addressBalances = await prisma.$queryRaw<Array<{address: string, balance: number, utxo_count: number}>>`
      SELECT 
        address,
        SUM(amount) as balance,
        COUNT(*) as utxo_count
      FROM utxos 
      WHERE is_spent = 0 
      GROUP BY address 
      ORDER BY balance DESC
    `;

    console.log('\n6. Address Balances (Raw SQL via Prisma):');
    console.log('----------------------------------------');
    addressBalances.forEach(addr => {
      console.log(`  ${addr.address}: ${addr.balance} coins (${addr.utxo_count} UTXOs)`);
    });

    console.log('\n✅ Prisma ORM Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  prismaOrmDemo();
}

export { prismaOrmDemo };
