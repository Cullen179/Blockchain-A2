import { Blockchain } from '@/blockchain/structure/blockchain';
import { Block } from '@/blockchain/structure/block';
import { ITransaction, IBlockHeader } from '@/types/blocks';

describe('Blockchain', () => {
  let blockchain: Blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('constructor', () => {
    it('should create blockchain with genesis block', () => {
      expect(blockchain.chain).toHaveLength(1);
      expect(blockchain.chain[0].header.index).toBe(0);
      expect(blockchain.chain[0].header.previousHash).toBe('0');
      expect(blockchain.chain[0].validator).toBe('genesis-validator');
    });

    it('should initialize with correct default values', () => {
      expect(blockchain.difficulty).toBe(4);
      expect(blockchain.miningReward).toBe(50);
      expect(blockchain.pendingTransactions).toHaveLength(0);
    });
  });

  describe('addBlock', () => {
    let validBlock: Block;
    let mockTransactions: ITransaction[];

    beforeEach(() => {
      // Create mock transactions
      mockTransactions = [
        {
          id: 'tx1',
          from: 'user1',
          to: 'user2',
          amount: 100,
          fee: 1,
          timestamp: Date.now(),
          signature: 'signature1',
          data: { memo: 'Test transaction 1' }
        },
        {
          id: 'tx2',
          from: 'user2',
          to: 'user3',
          amount: 50,
          fee: 0.5,
          timestamp: Date.now(),
          signature: 'signature2',
          data: { memo: 'Test transaction 2' }
        }
      ];

      // Create a valid block header
      const latestBlock = blockchain.getLatestBlock();
      const validHeader: IBlockHeader = {
        index: latestBlock.header.index + 1,
        timestamp: Date.now(),
        previousHash: latestBlock.hash,
        merkleRoot: 'c'.repeat(64),
        nonce: 12345,
        difficulty: blockchain.difficulty
      };

      validBlock = new Block(validHeader, mockTransactions, 'miner1', 'minerSignature');
    });

    it('should successfully add a valid block', () => {
      const initialLength = blockchain.chain.length;
      const result = blockchain.addBlock(validBlock);

      expect(result).toBe(true);
      expect(blockchain.chain).toHaveLength(initialLength + 1);
      expect(blockchain.chain[blockchain.chain.length - 1]).toBe(validBlock);
      expect(blockchain.pendingTransactions).toHaveLength(0);
    });

    it('should reject block with invalid index', () => {
      const invalidHeader: IBlockHeader = {
        ...validBlock.header,
        index: 99 // Wrong index
      };
      const invalidBlock = new Block(invalidHeader, mockTransactions, 'miner1', 'minerSignature');

      const initialLength = blockchain.chain.length;
      const result = blockchain.addBlock(invalidBlock);

      expect(result).toBe(false);
      expect(blockchain.chain).toHaveLength(initialLength);
    });

    it('should reject block with wrong previous hash', () => {
      const invalidHeader: IBlockHeader = {
        ...validBlock.header,
        previousHash: 'wrong_hash'
      };
      const invalidBlock = new Block(invalidHeader, mockTransactions, 'miner1', 'minerSignature');

      console.log('invalidBlock:', invalidBlock);
      const initialLength = blockchain.chain.length;
      const result = blockchain.addBlock(invalidBlock);

      expect(result).toBe(false);
      expect(blockchain.chain).toHaveLength(initialLength);
    });

    it('should handle block with empty transactions', () => {
      const latestBlock = blockchain.getLatestBlock();
      const header: IBlockHeader = {
        index: latestBlock.header.index + 1,
        timestamp: Date.now(),
        previousHash: latestBlock.hash,
        merkleRoot: '0'.repeat(64),
        nonce: 0,
        difficulty: blockchain.difficulty
      };

      const emptyBlock = new Block(header, [], 'miner1', 'signature');
      const result = blockchain.addBlock(emptyBlock);

      expect(result).toBe(true);
      expect(blockchain.chain[blockchain.chain.length - 1].transactions).toHaveLength(0);
    });

    it('should handle block with many transactions', () => {
      const manyTransactions: ITransaction[] = [];
      
      // Create 100 transactions
      for (let i = 0; i < 100; i++) {
        manyTransactions.push({
          id: `tx_${i}`,
          from: `user_${i}`,
          to: `user_${i + 1}`,
          amount: i + 1,
          fee: 0.1,
          timestamp: Date.now() + i,
          signature: `signature_${i}`,
          data: { memo: `Transaction ${i}` }
        });
      }

      const latestBlock = blockchain.getLatestBlock();
      const header: IBlockHeader = {
        index: latestBlock.header.index + 1,
        timestamp: Date.now(),
        previousHash: latestBlock.hash,
        merkleRoot: 'many_tx_merkle'.padEnd(64, '0'),
        nonce: 54321,
        difficulty: blockchain.difficulty
      };

      const blockWithManyTx = new Block(header, manyTransactions, 'miner1', 'signature');
      const result = blockchain.addBlock(blockWithManyTx);

      expect(result).toBe(true);
      expect(blockchain.chain[blockchain.chain.length - 1].transactions).toHaveLength(100);
    });

    it('should clear pending transactions after adding block', () => {
      // Add some pending transactions
      blockchain.pendingTransactions = [...mockTransactions];
      expect(blockchain.pendingTransactions).toHaveLength(2);

      const result = blockchain.addBlock(validBlock);

      expect(result).toBe(true);
      expect(blockchain.pendingTransactions).toHaveLength(0);
    });

    it('should reject block with invalid difficulty', () => {
      const invalidHeader: IBlockHeader = {
        ...validBlock.header,
        difficulty: -1 // Invalid difficulty
      };
      const invalidBlock = new Block(invalidHeader, mockTransactions, 'miner1', 'signature');

      const result = blockchain.addBlock(invalidBlock);
      expect(result).toBe(false);
    });

    it('should maintain correct chain length after failed additions', () => {
      const initialLength = blockchain.chain.length;
      
      // Try to add multiple invalid blocks
      const invalidBlocks = [
        new Block({ ...validBlock.header, index: 99 }, [], 'miner', 'sig'),
        new Block({ ...validBlock.header, previousHash: 'wrong' }, [], 'miner', 'sig'),
        new Block({ ...validBlock.header, difficulty: -1 }, [], 'miner', 'sig')
      ];

      invalidBlocks.forEach(block => {
        const result = blockchain.addBlock(block);
        expect(result).toBe(false);
      });

      expect(blockchain.chain).toHaveLength(initialLength);
    });
  });

  describe('edge cases and error handling', () => {
    it('should maintain consistency after mixed valid/invalid block additions', () => {
      const latestBlock = blockchain.getLatestBlock();
      
      // Add valid block
      const validHeader: IBlockHeader = {
        index: latestBlock.header.index + 1,
        timestamp: Date.now(),
        previousHash: latestBlock.hash,
        merkleRoot: 'valid'.padEnd(64, '0'),
        nonce: 123,
        difficulty: 4
      };
      const validBlock = new Block(validHeader, [], 'miner1', 'sig1');
      
      expect(blockchain.addBlock(validBlock)).toBe(true);
      expect(blockchain.chain).toHaveLength(2);
      
      // Try to add invalid block
      const invalidBlock = new Block({ ...validHeader, index: 99 }, [], 'miner2', 'sig2');
      expect(blockchain.addBlock(invalidBlock)).toBe(false);
      expect(blockchain.chain).toHaveLength(2);
      
      // Add another valid block
      const currentLatest = blockchain.getLatestBlock();
      const anotherValidHeader: IBlockHeader = {
        index: currentLatest.header.index + 1,
        timestamp: Date.now(),
        previousHash: currentLatest.hash,
        merkleRoot: 'valid2'.padEnd(64, '0'),
        nonce: 456,
        difficulty: 4
      };
      const anotherValidBlock = new Block(anotherValidHeader, [], 'miner3', 'sig3');
      
      expect(blockchain.addBlock(anotherValidBlock)).toBe(true);
      expect(blockchain.chain).toHaveLength(3);
    });
  });
});