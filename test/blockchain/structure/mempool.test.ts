import { Mempool } from '@/blockchain/structure/mempool';
import { ITransaction } from '@/types/blocks';

describe('Mempool', () => {
  let mempool: Mempool;
  let mockTransaction: ITransaction;
  let mockTransactions: ITransaction[];

  beforeEach(() => {
    // Initialize mempool with test configuration
    mempool = new Mempool(10, 50, 'POW', 4);

    // Create mock transaction
    mockTransaction = {
      id: 'tx1',
      from: 'user1',
      to: 'user2',
      amount: 100,
      fee: 1,
      timestamp: Date.now(),
      signature: 'signature1',
      data: { memo: 'Test transaction' }
    };

    // Create multiple mock transactions
    mockTransactions = [
      {
        id: 'tx1',
        from: 'user1',
        to: 'user2',
        amount: 100,
        fee: 2,
        timestamp: Date.now(),
        signature: 'signature1',
        data: { memo: 'Transaction 1' }
      },
      {
        id: 'tx2',
        from: 'user2',
        to: 'user3',
        amount: 50,
        fee: 1.5,
        timestamp: Date.now() + 1000,
        signature: 'signature2',
        data: { memo: 'Transaction 2' }
      },
      {
        id: 'tx3',
        from: 'user3',
        to: 'user1',
        amount: 75,
        fee: 0.5,
        timestamp: Date.now() + 2000,
        signature: 'signature3',
        data: { memo: 'Transaction 3' }
      }
    ];
  });

  describe('constructor', () => {
    it('should initialize mempool with correct properties', () => {
      expect(mempool.maxSize).toBe(10);
      expect(mempool.miningReward).toBe(50);
      expect(mempool.consensusType).toBe('POW');
      expect(mempool.difficulty).toBe(4);
      expect(mempool.currentSize).toBe(0);
      expect(mempool.transactions).toEqual([]);
    });
  });

  describe('addTransaction', () => {
    it('should add transaction successfully when mempool has space', () => {
      const result = mempool.addTransaction(mockTransaction);
      
      expect(result).toBe(true);
      expect(mempool.transactions).toHaveLength(1);
      expect(mempool.currentSize).toBe(1);
      expect(mempool.transactions[0]).toEqual(mockTransaction);
    });

    it('should add multiple transactions successfully', () => {
      mockTransactions.forEach(tx => {
        const result = mempool.addTransaction(tx);
        expect(result).toBe(true);
      });

      expect(mempool.transactions).toHaveLength(3);
      expect(mempool.currentSize).toBe(3);
      expect(mempool.transactions).toEqual(mockTransactions);
    });

    it('should reject transaction when mempool is full', () => {
      // Fill the mempool to capacity
      for (let i = 0; i < mempool.maxSize; i++) {
        const tx: ITransaction = {
          ...mockTransaction,
          id: `tx${i}`,
          from: `user${i}`,
          to: `user${i + 1}`
        };
        expect(mempool.addTransaction(tx)).toBe(true);
      }

      expect(mempool.currentSize).toBe(mempool.maxSize);

      // Try to add one more transaction (should fail)
      const extraTransaction: ITransaction = {
        ...mockTransaction,
        id: 'extra_tx',
        from: 'extra_user'
      };

      const result = mempool.addTransaction(extraTransaction);
      expect(result).toBe(false);
      expect(mempool.currentSize).toBe(mempool.maxSize);
      expect(mempool.transactions).toHaveLength(mempool.maxSize);
    });

    it('should handle duplicate transaction IDs', () => {
      // Add first transaction
      expect(mempool.addTransaction(mockTransaction)).toBe(true);
      
      // Add same transaction again (should still succeed as no validation is implemented)
      const duplicateTransaction = { ...mockTransaction };
      expect(mempool.addTransaction(duplicateTransaction)).toBe(true);
      
      expect(mempool.transactions).toHaveLength(2);
      expect(mempool.currentSize).toBe(2);
    });

  describe('removeTransaction', () => {
    beforeEach(() => {
      // Add some transactions to the mempool
      mockTransactions.forEach(tx => mempool.addTransaction(tx));
    });

    it('should remove existing transaction successfully', () => {
      const result = mempool.removeTransaction('tx2');
      
      expect(result).toBe(true);
      expect(mempool.transactions).toHaveLength(2);
      expect(mempool.currentSize).toBe(2);
      expect(mempool.transactions.find(tx => tx.id === 'tx2')).toBeUndefined();
    });

    it('should return false when transaction does not exist', () => {
      const result = mempool.removeTransaction('non_existent_tx');
      
      expect(result).toBe(false);
      expect(mempool.transactions).toHaveLength(3);
      expect(mempool.currentSize).toBe(3);
    });

    it('should remove middle transaction correctly', () => {
      const result = mempool.removeTransaction('tx2');
      
      expect(result).toBe(true);
      expect(mempool.transactions).toHaveLength(2);
      expect(mempool.transactions[0].id).toBe('tx1');
      expect(mempool.transactions[1].id).toBe('tx3');
      expect(mempool.currentSize).toBe(2);
    });

    it('should handle removing all transactions one by one', () => {
      const transactionIds = ['tx1', 'tx2', 'tx3'];
      
      transactionIds.forEach((id, index) => {
        const result = mempool.removeTransaction(id);
        expect(result).toBe(true);
        expect(mempool.currentSize).toBe(transactionIds.length - index - 1);
      });

      expect(mempool.transactions).toHaveLength(0);
      expect(mempool.currentSize).toBe(0);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      // Add transactions to the mempool
      mockTransactions.forEach(tx => mempool.addTransaction(tx));
    });

    it('should clear all transactions from mempool', () => {
      expect(mempool.transactions).toHaveLength(3);
      expect(mempool.currentSize).toBe(3);

      mempool.clear();

      expect(mempool.transactions).toHaveLength(0);
      expect(mempool.currentSize).toBe(0);
      expect(mempool.transactions).toEqual([]);
    });

    it('should handle clearing empty mempool', () => {
      mempool.clear();
      
      // Clear again (should not cause errors)
      mempool.clear();
      
      expect(mempool.transactions).toHaveLength(0);
      expect(mempool.currentSize).toBe(0);
    });

    it('should not affect mempool configuration after clearing', () => {
      mempool.clear();
      
      expect(mempool.maxSize).toBe(10);
      expect(mempool.miningReward).toBe(50);
      expect(mempool.consensusType).toBe('POW');
      expect(mempool.difficulty).toBe(4);
    });
  });

  describe('edge cases and stress tests', () => {

    it('should maintain consistency between currentSize and transactions array', () => {
      // Add transactions
      mockTransactions.forEach(tx => mempool.addTransaction(tx));
      expect(mempool.currentSize).toBe(mempool.transactions.length);

      // Remove transactions
      mempool.removeTransaction('tx1');
      expect(mempool.currentSize).toBe(mempool.transactions.length);

      mempool.removeTransaction('tx3');
      expect(mempool.currentSize).toBe(mempool.transactions.length);

      // Clear
      mempool.clear();
      expect(mempool.currentSize).toBe(mempool.transactions.length);
      expect(mempool.currentSize).toBe(0);
    });

    it('should handle transactions with very large data', () => {
      const largeDataTransaction: ITransaction = {
        ...mockTransaction,
        id: 'large_data_tx',
        data: {
          memo: 'x'.repeat(10000), // Very large memo
          metadata: { info: 'y'.repeat(5000) }
        }
      };

      const result = mempool.addTransaction(largeDataTransaction);
      expect(result).toBe(true);
      expect(mempool.transactions[0].data.memo).toHaveLength(10000);
    });

    it('should handle maximum capacity scenarios', () => {
      // Fill mempool to exactly max capacity
      for (let i = 0; i < mempool.maxSize; i++) {
        const tx: ITransaction = {
          ...mockTransaction,
          id: `max_tx_${i}`
        };
        expect(mempool.addTransaction(tx)).toBe(true);
      }

      expect(mempool.currentSize).toBe(mempool.maxSize);
      expect(mempool.transactions).toHaveLength(mempool.maxSize);

      // Remove one and add one
      expect(mempool.removeTransaction('max_tx_0')).toBe(true);
      expect(mempool.currentSize).toBe(mempool.maxSize - 1);

      const newTx: ITransaction = {
        ...mockTransaction,
        id: 'replacement_tx'
      };
      expect(mempool.addTransaction(newTx)).toBe(true);
      expect(mempool.currentSize).toBe(mempool.maxSize);
    });
  });
});
});