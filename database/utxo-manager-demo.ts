import { UTXORepository } from '@/repositories';
import { UTXOManager } from '../src/blockchain/structure/utxo';
import { prisma } from '../src/lib/prisma';
import { ITransaction } from '../src/types/blocks';

async function demonstrateUTXOManager() {
  console.log('🚀 UTXO Manager with Prisma Demo');
  console.log('================================');

  try {
    // Initialize UTXO Manager
    console.log('✅ UTXO Manager initialized');
    const uxtox = await UTXORepository.findAll();
    console.log(`💰 Total UTXOs: ${uxtox}`);

    

    console.log('\n✅ UTXO Manager demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  demonstrateUTXOManager();
}

export { demonstrateUTXOManager };
