import { HASH_ALGORITHMS } from '@/constants';
import { IHashVerificationResult } from '@/types';
import { IBlock, IBlockHeader, ITransaction } from '@/types/blocks';
import crypto from 'crypto';

export class Block implements IBlock {
  public header: IBlockHeader;
  public hash: string;
  public transactions: ITransaction[];
  public validator?: string;
  public validatorSignature?: string;
  public size: number;
  public transactionCount: number;
  public nonce: number;
  public timestamp: number;
  public merkleRoot: string;

  constructor(
    header: IBlockHeader,
    transactions: ITransaction[],
    validator?: string,
    validatorSignature?: string,
  ) {
    this.header = header;
    this.transactions = transactions;
    this.validator = validator;
    this.validatorSignature = validatorSignature;
    this.hash = this.calculateHash();
    this.size = this.calculateSize();
    this.transactionCount = transactions.length;
    this.merkleRoot = this.calculateMerkleRoot();
    this.timestamp = Date.now();
  }

  /**
   * Calculate the cryptographic hash of the block
   * Uses SHA-256 and includes all critical block contents
   */
  public calculateHash(): string {
    // Create deterministic string from all critical block data
    const blockString = this.createHashableString();
    
    // Generate SHA-256 hash
    return crypto
      .createHash(HASH_ALGORITHMS.SHA256)
      .update(blockString)
      .digest('hex');
  }

  /**
   * Calculate the size of the block in bytes
   */
  private calculateSize(): number {

    const blockString = JSON.stringify(this);
    return Buffer.byteLength(blockString, 'utf8');
  }

  /**
   * Create a deterministic string representation for hashing
   * Order matters for consistent hash calculation
   */
  private createHashableString(): string {
    const hashData = {
      index: this.header.index,
      timestamp: this.header.timestamp,
      previousHash: this.header.previousHash,
      merkleRoot: this.header.merkleRoot,
      nonce: this.header.nonce,
      difficulty: this.header.difficulty,
      transactions: this.transactions.map(tx => ({
        id: tx.id,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        fee: tx.fee,
        timestamp: tx.timestamp,
        signature: tx.signature,
        data: tx.data
      })),
      validator: this.validator || '',
      validatorSignature: this.validatorSignature || ''
    };

    return JSON.stringify(hashData, Object.keys(hashData).sort());
  }

  /**
   * Verify if the block's hash is valid
   * Recalculates hash and compares with stored hash
   */
  public verifyHash(): IHashVerificationResult {
    const calculatedHash = this.calculateHash();
    const isValid = calculatedHash === this.hash;
    const errors: string[] = [];

    if (!isValid) {
      errors.push('Block hash mismatch');
      errors.push(`Expected: ${this.hash}`);
      errors.push(`Calculated: ${calculatedHash}`);
    }

    // Additional validations
    if (!this.hash || this.hash.length !== 64) {
      errors.push('Invalid hash format (must be 64-character hex string)');
    }

    if (!this.isValidHexString(this.hash)) {
      errors.push('Hash contains invalid hexadecimal characters');
    }

    console.log(`Block hash verification: ${isValid ? 'valid' : 'invalid'}`);
    // Log errors if any
    if (errors.length > 0) {
      console.error('Hash verification errors:', errors);
    }
    
    return {
      isValid: isValid,
      expectedHash: this.hash,
      actualHash: calculatedHash,
      errors
    };
  }

  /**
   * Check if a string is a valid hexadecimal representation
   */
  private isValidHexString(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str);
  }

  /**
     * Validates a new block before adding it to the chain
     * @return True if the block is valid, false otherwise
     * */

  public isValid(previousBlock: Block): boolean {
    // Check index
    if (this.header.index !== previousBlock.header.index + 1) {
      console.error(`Invalid block index: expected ${previousBlock.header.index + 1}, got ${this.header.index}`);
      return false;
    }
    
    // Check previous hash
    if (this.header.previousHash !== previousBlock.hash) {
      console.error(`Invalid previous hash: expected ${previousBlock.hash}, got ${this.header.previousHash}`);
      return false;
    }

    // Check hash
    const hashResult = this.verifyHash();
    if (!hashResult.isValid) {
      console.error(`Invalid block hash: ${hashResult.errors.join(', ')}`);
      return false;
    }
    
    // Check difficulty
    if (!this.isValidDifficulty(this.header.difficulty)) {
      console.error(`Invalid block difficulty: ${this.header.difficulty}`);
      return false;
    }
    
    // Check transactions
    if (!this.areTransactionsValid(this.transactions)) {
      console.error('Invalid transactions in block');
      return false;
    }
    
    return true;
  }

  /**
   * Validates the difficulty of a block
   * @param difficulty The difficulty to validate
   * @return True if valid, false otherwise
   */

  private isValidDifficulty(difficulty: number): boolean {
    // assume difficulty is always a positive integer
    return Number.isInteger(difficulty) && difficulty > 0;
  }

  /**
   * Validates the transactions in a block
   * @param transactions The transactions to validate
   * @return True if all transactions are valid, false otherwise
   */
  private areTransactionsValid(transactions: ITransaction[]): boolean {
    for (const tx of transactions) {
      if (!tx.id || !tx.from || !tx.to || tx.amount <= 0 || tx.fee < 0) {
        console.error(`Invalid transaction: ${JSON.stringify(tx)}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate the Merkle root of the block's transactions
   * @return The Merkle root as a hex string
   * */
  public calculateMerkleRoot(): string {
    if (this.transactions.length === 0) {
      return '0'.repeat(64); // Return a zero hash if no transactions
    }

    let transactionHashes = this.transactions.map(tx => {
      return crypto.createHash(HASH_ALGORITHMS.SHA256).update(JSON.stringify(tx)).digest('hex');
    });

    while (transactionHashes.length > 1) {
      const newLevel: string[] = [];
      for (let i = 0; i < transactionHashes.length; i += 2) {
        if (i + 1 < transactionHashes.length) {
          const combinedHash = transactionHashes[i] + transactionHashes[i + 1];
          newLevel.push(crypto.createHash(HASH_ALGORITHMS.SHA256).update(combinedHash).digest('hex'));
        } else {
          newLevel.push(transactionHashes[i]); // Odd count, carry last hash
        }
      }
      transactionHashes = newLevel;
    }

    this.merkleRoot = transactionHashes[0];
    return this.merkleRoot;
  }

}
