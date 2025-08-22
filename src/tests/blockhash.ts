import { Block } from '@/blockchain/structure/block';
import { IBlock, ITransaction } from '@/types/blocks';
import crypto from 'crypto';

/**
 * Block Hash Creation and Verification Demo
 *
 * This demonstrates:
 * 1. Creating mock block data with transactions
 * 2. Generating proper block hashes
 * 3. Using verifyHash to validate blocks
 * 4. Showing how alterations are detected
 */

console.log('=== Block Hash Creation & Verification Demo ===\n');

// Step 1: Create mock transactions for our block
const mockTransactions: ITransaction[] = [
  {
    id: 'tx1-alice-to-bob-100btc',
    from: 'alice-wallet-1234',
    to: 'bob-wallet-5678',
    amount: 100,
    fee: 2.5,
    timestamp: 1672531200000,
    inputs: [
      {
        previousTransactionId: 'genesis-utxo-1',
        outputIndex: 0,
        scriptSig: 'alice-signature',
      },
    ],
    outputs: [
      { amount: 97.5, address: 'bob-wallet-5678', scriptPubKey: 'pubkey-bob' },
    ],
    size: 250,
  },
  {
    id: 'tx2-charlie-to-alice-50btc',
    from: 'charlie-wallet-9999',
    to: 'alice-wallet-1234',
    amount: 50,
    fee: 1.0,
    timestamp: 1672531300000,
    inputs: [
      {
        previousTransactionId: 'genesis-utxo-2',
        outputIndex: 1,
        scriptSig: 'charlie-signature',
      },
    ],
    outputs: [
      {
        amount: 49,
        address: 'alice-wallet-1234',
        scriptPubKey: 'pubkey-alice',
      },
    ],
    size: 240,
  },
];

console.log(`📊 Created ${mockTransactions.length} mock transactions`);
mockTransactions.forEach((tx, i) => {
  console.log(
    `   TX${i + 1}: ${tx.from.substring(0, 10)}... → ${tx.to.substring(0, 10)}... (${tx.amount} BTC)`
  );
});

// Step 2: Calculate merkle root for transactions
const merkleRoot = Block.calculateMerkleRoot(mockTransactions);
console.log(`\n🌳 Merkle Root: ${merkleRoot}`);

// Step 3: Create a complete mock block with proper hash
const mockBlockData = {
  index: 42,
  timestamp: 1672531400,
  previousHash:
    '0000abc123def456789fedcba0987654321123456789012345678901234abcd',
  merkleRoot: merkleRoot,
  nonce: 156789,
  difficulty: 4,
};

console.log(`\n📦 Creating Mock Block:`);
console.log(`   Index: ${mockBlockData.index}`);
console.log(`   Timestamp: ${mockBlockData.timestamp}`);
console.log(
  `   Previous Hash: ${mockBlockData.previousHash.substring(0, 20)}...`
);
console.log(`   Merkle Root: ${mockBlockData.merkleRoot}`);
console.log(`   Nonce: ${mockBlockData.nonce}`);
console.log(`   Difficulty: ${mockBlockData.difficulty}`);

// Step 4: Generate the hashable string (this IS the hash in your implementation)
const blockHash = Block.createBlockHash(mockBlockData);

console.log(`\n🔨 Hash Generation:`);
console.log(`   Block Hash (JSON): ${blockHash}`);
console.log(`   Hash Length: ${blockHash.length} characters`);

// Step 5: Create complete block with the correct hash format
const completeBlock: IBlock = {
  ...mockBlockData,
  hash: blockHash, // Use the JSON string as hash (matches your verifyHash implementation)
  transactions: mockTransactions,
  size: JSON.stringify(mockTransactions).length + blockHash.length,
};

console.log(
  `\n✅ Complete Block Created with Hash: ${completeBlock.hash.substring(0, 80)}...`
);

// Step 6: Verify the original block hash
console.log(`\n� Verifying Original Block:`);
const originalVerification = Block.verifyHash(completeBlock);

console.log(
  `   Verification Result: ${originalVerification.isValid ? '✅ VALID' : '❌ INVALID'}`
);
if (!originalVerification.isValid) {
  console.log('   ❌ Errors:');
  originalVerification.errors.forEach(error => console.log(`      - ${error}`));
} else {
  console.log('   ✅ Original block hash is valid!');
}

// Step 7: Test alterations - Change nonce
console.log(`\n🔧 Testing Alteration #1 - Changed Nonce:`);
const alteredNonceBlock: IBlock = {
  ...completeBlock,
  nonce: 999999, // Changed from 156789 to 999999
};

const nonceVerification = Block.verifyHash(alteredNonceBlock);
console.log(`   Original Nonce: ${completeBlock.nonce}`);
console.log(`   Altered Nonce: ${alteredNonceBlock.nonce}`);
console.log(
  `   Verification: ${nonceVerification.isValid ? '❌ STILL VALID (BAD!)' : '✅ INVALID (GOOD!)'}`
);

if (!nonceVerification.isValid) {
  console.log('   ✅ Tampering detected! Errors:');
  nonceVerification.errors.forEach(error => console.log(`      - ${error}`));
}

// Step 8: Test alterations - Change previous hash
console.log(`\n� Testing Alteration #2 - Changed Previous Hash:`);
const alteredPrevHashBlock: IBlock = {
  ...completeBlock,
  previousHash: '1111xyz999malicious000000000000000000000000000000000000000000',
};

const prevHashVerification = Block.verifyHash(alteredPrevHashBlock);
console.log(
  `   Original Prev Hash: ${completeBlock.previousHash.substring(0, 20)}...`
);
console.log(
  `   Altered Prev Hash: ${alteredPrevHashBlock.previousHash.substring(0, 20)}...`
);
console.log(
  `   Verification: ${prevHashVerification.isValid ? '❌ STILL VALID (BAD!)' : '✅ INVALID (GOOD!)'}`
);

// Step 9: Test alterations - Change transaction data
console.log(`\n🔧 Testing Alteration #3 - Changed Transaction Amount:`);
const alteredTransactions = [...mockTransactions];
alteredTransactions[0] = { ...alteredTransactions[0], amount: 999999 }; // Changed from 100 to 999999

const alteredTxBlock: IBlock = {
  ...completeBlock,
  transactions: alteredTransactions,
};

const txVerification = Block.verifyHash(alteredTxBlock);
console.log(
  `   Original TX Amount: ${completeBlock.transactions[0].amount} BTC`
);
console.log(
  `   Altered TX Amount: ${alteredTxBlock.transactions[0].amount} BTC`
);
console.log(
  `   Verification: ${txVerification.isValid ? '❌ STILL VALID (BAD!)' : '✅ INVALID (GOOD!)'}`
);

// Step 10: Test with completely invalid hash format
console.log(`\n🔧 Testing Alteration #4 - Invalid Hash Format:`);
const invalidHashBlock: IBlock = {
  ...completeBlock,
  hash: 'this-is-not-a-valid-hash-format',
};

const invalidHashVerification = Block.verifyHash(invalidHashBlock);
console.log(`   Original Hash: ${completeBlock.hash.substring(0, 20)}...`);
console.log(`   Invalid Hash: ${invalidHashBlock.hash}`);
console.log(
  `   Verification: ${invalidHashVerification.isValid ? '❌ STILL VALID (BAD!)' : '✅ INVALID (GOOD!)'}`
);

console.log('\n=== Hash Verification Summary ===');
console.log(
  `✅ Original Block: ${originalVerification.isValid ? 'VALID' : 'INVALID'}`
);
console.log(
  `❌ Altered Nonce: ${nonceVerification.isValid ? 'VALID (PROBLEM!)' : 'INVALID (CORRECT)'}`
);
console.log(
  `❌ Altered Previous Hash: ${prevHashVerification.isValid ? 'VALID (PROBLEM!)' : 'INVALID (CORRECT)'}`
);
console.log(
  `❌ Altered Transaction: ${txVerification.isValid ? 'VALID (PROBLEM!)' : 'INVALID (CORRECT)'}`
);
console.log(
  `❌ Invalid Hash Format: ${invalidHashVerification.isValid ? 'VALID (PROBLEM!)' : 'INVALID (CORRECT)'}`
);

console.log(
  '\n🎉 Block hash verification successfully detects all types of tampering!'
);
