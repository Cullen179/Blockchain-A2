import crypto from 'crypto';
import { Transaction } from '@/blockchain/structure/transaction';
import { ITransaction } from '@/types/blocks';

/**
 * Simple Transaction Signing and Verification Demo
 *
 * This demonstrates the core cryptographic concepts:
 * 1. Generate RSA key pairs
 * 2. Create transaction data
 * 3. Sign transaction with private key
 * 4. Verify signature with public key
 * 5. Show tampering detection
 */

// Step 1: Generate RSA key pair for the sender
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Create sender address from public key
const senderAddress = crypto
  .createHash('sha256')
  .update(publicKey)
  .digest('hex');

// Generate recipient address
const { publicKey: recipientPublic } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const recipientAddress = crypto
  .createHash('sha256')
  .update(recipientPublic)
  .digest('hex');

// Step 2: Create a transaction
const transaction: ITransaction = {
  id: '',
  from: senderAddress,
  to: recipientAddress,
  amount: 100,
  fee: 5,
  timestamp: Date.now(),
  inputs: [
    {
      previousTransactionId: 'genesis-block-reward-123',
      outputIndex: 0,
      scriptSig: '', // Will be filled with signature
    },
  ],
  outputs: [],
  size: 0,
};

// Step 3: Create transaction hash (deterministic data to sign)
const transactionHash = Transaction.createTransactionHash(transaction);

// Step 4: Sign the transaction hash with private key
const sign = crypto.createSign('SHA256');
sign.update(transactionHash);
sign.end();
const signature = sign.sign(privateKey, 'hex');

// Apply signature to transaction
transaction.inputs[0].scriptSig = signature;

console.log('=== Transaction Signing Demo ===');
console.log(`Sender Address: ${senderAddress.substring(0, 20)}...`);
console.log(`Recipient Address: ${recipientAddress.substring(0, 20)}...`);
console.log(`Transaction Amount: ${transaction.amount}`);
console.log(`Signature: ${signature.substring(0, 50)}...`);
console.log(`Signature Length: ${signature.length} characters`);

// Step 5: Verify the signature with public key
const verify = crypto.createVerify('SHA256');
verify.update(transactionHash);
verify.end();
const isValid = verify.verify(publicKey, signature, 'hex');

console.log(`\n✓ Signature is valid: ${isValid}`);

// Step 6: Demonstrate tampering detection
const tamperedTransaction = { ...transaction, amount: 1000 };
const tamperedHash = Transaction.createTransactionHash(tamperedTransaction);

const verifyTampered = crypto.createVerify('SHA256');
verifyTampered.update(tamperedHash);
verifyTampered.end();
const tamperedValid = verifyTampered.verify(publicKey, signature, 'hex');

console.log(
  `✗ Tampered transaction valid: ${tamperedValid} (amount changed from ${transaction.amount} to ${tamperedTransaction.amount})`
);

// Step 7: Test wrong private key
const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const wrongSign = crypto.createSign('SHA256');
wrongSign.update(transactionHash);
wrongSign.end();
const wrongSignature = wrongSign.sign(wrongPrivateKey, 'hex');

const verifyWrong = crypto.createVerify('SHA256');
verifyWrong.update(transactionHash);
verifyWrong.end();
const wrongValid = verifyWrong.verify(publicKey, wrongSignature, 'hex');

console.log(`✗ Wrong private key signature valid: ${wrongValid}`);

console.log('\n=== Summary ===');
console.log('✓ Correct private key creates valid signatures');
console.log('✗ Tampered transactions are rejected');
console.log('✗ Wrong private keys are rejected');
console.log(
  '\nThis demonstrates the security of digital signatures in blockchain transactions!'
);
