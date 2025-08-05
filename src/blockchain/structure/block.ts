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

  constructor(
    header: IBlockHeader,
    transactions: ITransaction[],
    validator?: string,
    validatorSignature?: string
  ) {
    this.header = header;
    this.transactions = transactions;
    this.validator = validator;
    this.validatorSignature = validatorSignature;
    this.hash = this.calculateHash();
    this.size = this.calculateSize();
    this.transactionCount = transactions.length;
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

    return JSON.stringify(this, Object.keys(this).sort());
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
}