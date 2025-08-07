import { Block } from '@/blockchain/structure/block';
import { IBlockHeader, ITransaction } from '@/types/blocks';
import { HASH_ALGORITHMS } from '@/constants';
import crypto from 'crypto';

describe('Block', () => {
  let mockHeader: IBlockHeader;
  let mockTransactions: ITransaction[];
  let mockValidator: string;
  let mockValidatorSignature: string;

  beforeEach(() => {
    // Setup mock data for each test
    mockHeader = {
      index: 1,
      timestamp: 1672531200000, // Jan 1, 2023
      previousHash: 'a'.repeat(64), // 64-character hex string
      merkleRoot: 'b'.repeat(64),
      nonce: 12345,
      difficulty: 4
    };

    mockTransactions = [
      {
        id: 'tx1',
        from: 'user1',
        to: 'user2',
        amount: 100,
        fee: 1,
        timestamp: 1672531200000,
        signature: 'signature1',
        data: { memo: 'Test transaction 1' }
      },
      {
        id: 'tx2',
        from: 'user2',
        to: 'user3',
        amount: 50,
        fee: 0.5,
        timestamp: 1672531201000,
        signature: 'signature2',
        data: { memo: 'Test transaction 2' }
      }
    ];

    mockValidator = 'validator1';
    mockValidatorSignature = 'validatorSig123';
  });

  describe('constructor', () => {
    it('should create a block with all required properties', () => {
      const block = new Block(mockHeader, mockTransactions, mockValidator, mockValidatorSignature);

      expect(block.header).toEqual(mockHeader);
      expect(block.transactions).toEqual(mockTransactions);
      expect(block.validator).toBe(mockValidator);
      expect(block.validatorSignature).toBe(mockValidatorSignature);
      expect(block.transactionCount).toBe(mockTransactions.length);
      expect(typeof block.hash).toBe('string');
      expect(block.hash.length).toBe(64); // SHA-256 produces 64-character hex string
      expect(typeof block.size).toBe('number');
      expect(block.size).toBeGreaterThan(0);
    });
  });

  describe('calculateHash', () => {
    it('should generate a consistent hash for the same block data', () => {
      const block1 = new Block(mockHeader, mockTransactions, mockValidator, mockValidatorSignature);
      const block2 = new Block(mockHeader, mockTransactions, mockValidator, mockValidatorSignature);

      expect(block1.hash).toBe(block2.hash);
    });

    it('should generate different hashes for different block data', () => {
      const block1 = new Block(mockHeader, mockTransactions);
      
      const differentHeader = { ...mockHeader, index: 2 };
      const block2 = new Block(differentHeader, mockTransactions);

      expect(block1.hash).not.toBe(block2.hash);
    });

    it('should generate a valid SHA-256 hash', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      // Check if hash is valid hexadecimal
      expect(/^[0-9a-fA-F]{64}$/.test(block.hash)).toBe(true);
    });

    it('should include all block properties in hash calculation', () => {
      const block1 = new Block(mockHeader, mockTransactions, mockValidator, mockValidatorSignature);
      
      // Change validator signature
      const block2 = new Block(mockHeader, mockTransactions, mockValidator, 'differentSignature');

      expect(block1.hash).not.toBe(block2.hash);
    });
  });

  describe('verifyHash', () => {
    it('should return valid result for a properly constructed block', () => {
      const block = new Block(mockHeader, mockTransactions);
      const result = block.verifyHash();

      expect(result.isValid).toBe(true);
      expect(result.expectedHash).toBe(block.hash);
      expect(result.actualHash).toBe(block.hash);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect hash mismatch when hash is manually changed', () => {
      const block = new Block(mockHeader, mockTransactions);
      const originalHash = block.hash;
      
      // Manually change the hash to simulate corruption
      block.hash = 'invalid_hash_that_does_not_match';
      
      const result = block.verifyHash();

      expect(result.isValid).toBe(false);
      expect(result.expectedHash).toBe('invalid_hash_that_does_not_match');
      expect(result.actualHash).toBe(originalHash);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Block hash mismatch');
    });

    it('should detect invalid hash format', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      // Set invalid hash format
      block.hash = 'too_short';
      
      const result = block.verifyHash();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid hash format (must be 64-character hex string)');
    });

    it('should detect non-hexadecimal characters in hash', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      // Set hash with invalid characters
      block.hash = 'g'.repeat(64); // 'g' is not a valid hex character
      
      const result = block.verifyHash();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hash contains invalid hexadecimal characters');
    });

    it('should detect empty hash', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      block.hash = '';
      
      const result = block.verifyHash();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid hash format (must be 64-character hex string)');
    });
  });

  describe('size calculation', () => {
    it('should calculate block size correctly', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      // Size should be positive and reasonable
      expect(block.size).toBeGreaterThan(0);
      expect(typeof block.size).toBe('number');
    });

    it('should have larger size with more transactions', () => {
      const blockWithFewTx = new Block(mockHeader, [mockTransactions[0]]);
      const blockWithMoreTx = new Block(mockHeader, mockTransactions);

      expect(blockWithMoreTx.size).toBeGreaterThan(blockWithFewTx.size);
    });

    it('should have smallest size with no transactions', () => {
      const blockWithNoTx = new Block(mockHeader, []);
      const blockWithTx = new Block(mockHeader, mockTransactions);

      expect(blockWithTx.size).toBeGreaterThan(blockWithNoTx.size);
    });
  });

  describe('transaction count', () => {
    it('should correctly count transactions', () => {
      const block = new Block(mockHeader, mockTransactions);
      
      expect(block.transactionCount).toBe(mockTransactions.length);
      expect(block.transactionCount).toBe(2);
    });

    it('should return zero for empty transaction list', () => {
      const block = new Block(mockHeader, []);
      
      expect(block.transactionCount).toBe(0);
    });

    it('should handle single transaction', () => {
      const block = new Block(mockHeader, [mockTransactions[0]]);
      
      expect(block.transactionCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle block with very large transaction data', () => {
      const largeTransaction: ITransaction = {
        id: 'large_tx',
        from: 'user1',
        to: 'user2',
        amount: 1000000,
        fee: 100,
        timestamp: Date.now(),
        signature: 'large_signature'.repeat(100),
        data: { largeData: 'x'.repeat(10000) }
      };

      const block = new Block(mockHeader, [largeTransaction]);

      expect(block.transactionCount).toBe(1);
      expect(block.size).toBeGreaterThan(10000);
      expect(block.hash).toMatch(/^[0-9a-fA-F]{64}$/);
    });

    it('should handle block with special characters in transaction data', () => {
      const specialTransaction: ITransaction = {
        id: 'special_tx_üñîçødé',
        from: 'user@example.com',
        to: 'recipient@test.org',
        amount: 99.99,
        fee: 0.01,
        timestamp: Date.now(),
        signature: 'signature_with_émojis_🚀',
        data: { description: 'Transaction with special chars: ñáéíóú €$¥' }
      };

      const block = new Block(mockHeader, [specialTransaction]);

      expect(block.transactionCount).toBe(1);
      expect(typeof block.hash).toBe('string');
      expect(block.hash.length).toBe(64);
      
      const verification = block.verifyHash();
      expect(verification.isValid).toBe(true);
    });

    it('should maintain hash consistency across multiple calculations', () => {
      const block = new Block(mockHeader, mockTransactions);
      const originalHash = block.hash;

      // Calculate hash multiple times
      const hash1 = block.calculateHash();
      const hash2 = block.calculateHash();
      const hash3 = block.calculateHash();

      expect(hash1).toBe(originalHash);
      expect(hash2).toBe(originalHash);
      expect(hash3).toBe(originalHash);
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });

  describe('genesis block scenario', () => {
    it('should handle genesis block creation', () => {
      const genesisHeader: IBlockHeader = {
        index: 0,
        timestamp: 1609459200000, // Jan 1, 2021
        previousHash: '0',
        merkleRoot: 'genesis_merkle_root',
        nonce: 0,
        difficulty: 1
      };

      const genesisBlock = new Block(genesisHeader, []);

      expect(genesisBlock.header.index).toBe(0);
      expect(genesisBlock.header.previousHash).toBe('0');
      expect(genesisBlock.transactionCount).toBe(0);
      expect(genesisBlock.transactions).toEqual([]);
      expect(typeof genesisBlock.hash).toBe('string');
      expect(genesisBlock.hash.length).toBe(64);
      
      const verification = genesisBlock.verifyHash();
      expect(verification.isValid).toBe(true);
    });
  });
});
