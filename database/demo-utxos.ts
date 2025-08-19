import { UTXORepository } from '../src/repositories/UTXORepository';

async function createDemoUTXOs() {
  console.log('Creating demo UTXOs...');

  // Create some demo UTXOs
  const demoUTXOs = [
    {
      transactionId: 'tx001',
      outputIndex: 0,
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: 5000000000, // 50 BTC in satoshi
      scriptPubKey: 'OP_DUP OP_HASH160 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa OP_EQUALVERIFY OP_CHECKSIG',
      isSpent: false
    },
    {
      transactionId: 'tx001',
      outputIndex: 1,
      address: '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX',
      amount: 2500000000, // 25 BTC in satoshi
      scriptPubKey: 'OP_DUP OP_HASH160 12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX OP_EQUALVERIFY OP_CHECKSIG',
      isSpent: false
    },
    {
      transactionId: 'tx002',
      outputIndex: 0,
      address: '1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1',
      amount: 1000000000, // 10 BTC in satoshi
      scriptPubKey: 'OP_DUP OP_HASH160 1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1 OP_EQUALVERIFY OP_CHECKSIG',
      isSpent: true
    },
    {
      transactionId: 'tx003',
      outputIndex: 0,
      address: '1FvzCLoTPGANNjWoUo6jUGuAG3wg1w4YjR',
      amount: 750000000, // 7.5 BTC in satoshi
      scriptPubKey: 'OP_DUP OP_HASH160 1FvzCLoTPGANNjWoUo6jUGuAG3wg1w4YjR OP_EQUALVERIFY OP_CHECKSIG',
      isSpent: false
    },
    {
      transactionId: 'tx004',
      outputIndex: 0,
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: 300000000, // 3 BTC in satoshi
      scriptPubKey: 'OP_DUP OP_HASH160 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa OP_EQUALVERIFY OP_CHECKSIG',
      isSpent: true
    }
  ];

  // Create UTXOs
  for (const utxoData of demoUTXOs) {
    try {
      await UTXORepository.create(utxoData);
      console.log(`Created UTXO: ${utxoData.transactionId}:${utxoData.outputIndex}`);
    } catch (error) {
      console.log(`UTXO already exists or error: ${utxoData.transactionId}:${utxoData.outputIndex}`);
    }
  }

  // Get statistics
  const allUTXOs = await UTXORepository.findAll();
  const unspentUTXOs = await UTXORepository.getAllUnspent();
  
  console.log(`\nUTXO Statistics:`);
  console.log(`Total UTXOs: ${allUTXOs.length}`);
  console.log(`Unspent UTXOs: ${unspentUTXOs.length}`);
  console.log(`Spent UTXOs: ${allUTXOs.length - unspentUTXOs.length}`);
  
  const totalValue = unspentUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
  console.log(`Total unspent value: ${(totalValue / 100000000).toFixed(8)} BTC`);
}

// Run the demo
createDemoUTXOs()
  .then(() => {
    console.log('\nDemo UTXO creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error creating demo UTXOs:', error);
    process.exit(1);
  });
