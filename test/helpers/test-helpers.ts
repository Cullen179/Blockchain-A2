import { IBlockHeader, ITransaction } from '@/types/blocks';

/**
 * Test utilities and mock data generators for blockchain tests
 */
export class TestHelpers {
  /**
   * Creates a mock block header with default values
   */
  static createMockHeader(overrides?: Partial<IBlockHeader>): IBlockHeader {
    return {
      index: 1,
      timestamp: Date.now(),
      previousHash: 'a'.repeat(64),
      merkleRoot: 'b'.repeat(64),
      nonce: 12345,
      difficulty: 4,
      ...overrides
    };
  }

  /**
   * Creates a mock transaction with default values
   */
  static createMockTransaction(overrides?: Partial<ITransaction>): ITransaction {
    const id = overrides?.id || `tx_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      from: 'user1',
      to: 'user2',
      amount: 100,
      fee: 1,
      timestamp: Date.now(),
      signature: `signature_${id}`,
      data: { memo: `Test transaction ${id}` },
      ...overrides
    };
  }

  /**
   * Creates an array of mock transactions
   */
  static createMockTransactions(count: number): ITransaction[] {
    return Array.from({ length: count }, (_, index) => 
      this.createMockTransaction({
        id: `tx_${index + 1}`,
        amount: (index + 1) * 10,
        fee: (index + 1) * 0.1
      })
    );
  }

  /**
   * Creates a genesis block header
   */
  static createGenesisHeader(): IBlockHeader {
    return {
      index: 0,
      timestamp: 1609459200000, // Jan 1, 2021
      previousHash: '0',
      merkleRoot: 'genesis_merkle_root',
      nonce: 0,
      difficulty: 1
    };
  }

  /**
   * Validates if a string is a valid SHA-256 hash
   */
  static isValidSHA256Hash(hash: string): boolean {
    return /^[0-9a-fA-F]{64}$/.test(hash);
  }

  /**
   * Creates a deterministic hash for testing
   */
  static createTestHash(input: string): string {
    // Simple deterministic hash for testing (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  }
}
