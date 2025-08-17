import { UTXOManager } from '@/blockchain/structure/utxo';
import { ITransaction, IUTXO, ITransactionInput, ITransactionOutput } from '@/types/blocks';

describe('UTXOManager', () => {
  let utxoManager: UTXOManager;

  beforeEach(() => {
    utxoManager = new UTXOManager();
  });

  // Helper function to create a mock transaction
  const createMockTransaction = (
    id: string,
    inputs: ITransactionInput[],
    outputs: ITransactionOutput[]
  ): ITransaction => ({
    id,
    from: 'alice',
    to: 'bob',
    amount: 100,
    fee: 1,
    timestamp: Date.now(),
    inputs,
    outputs,
    size: 0 // Size can be calculated later if needed
  });

  // Helper function to create a mock UTXO
  const createMockUTXO = (
    transactionId: string,
    outputIndex: number,
    address: string,
    amount: number
  ): IUTXO => ({
    transactionId,
    outputIndex,
    address,
    amount,
    scriptPubKey: `pubkey-${address}`,
    isSpent: false
  });

  describe('constructor', () => {
    it('should initialize with empty UTXO set', () => {
      expect(utxoManager.utxos.size).toBe(0);
      expect(utxoManager.totalAmount).toBe(0);
    });
  });

  describe('addUTXOs', () => {
    it('should add UTXOs from transaction outputs', () => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' },
        { address: 'bob', amount: 30, scriptPubKey: 'pubkey-bob' }
      ];

      const transaction = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(transaction);

      expect(utxoManager.utxos.size).toBe(2);
      expect(utxoManager.utxos.has('tx1:0')).toBe(true);
      expect(utxoManager.utxos.has('tx1:1')).toBe(true);

      const utxo1 = utxoManager.utxos.get('tx1:0');
      expect(utxo1?.address).toBe('alice');
      expect(utxo1?.amount).toBe(50);
      expect(utxo1?.isSpent).toBe(false);
    });

    it('should handle empty outputs array', () => {
      const transaction = createMockTransaction('tx1', [], []);
      utxoManager.addUTXOs(transaction);

      expect(utxoManager.utxos.size).toBe(0);
    });
  });

  describe('removeUTXOs', () => {
    beforeEach(() => {
      // Set up initial UTXOs
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' }
      ];
      const initialTx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(initialTx);
    });

    it('should remove UTXOs when they are spent', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 99, scriptPubKey: 'pubkey-bob' }
      ];

      const spendingTx = createMockTransaction('tx2', inputs, outputs);
      const spentUTXOs = utxoManager.removeUTXOs(spendingTx);

      expect(spentUTXOs.length).toBe(1);
      expect(spentUTXOs[0].transactionId).toBe('tx1');
      expect(spentUTXOs[0].outputIndex).toBe(0);
      expect(utxoManager.utxos.has('tx1:0')).toBe(false);
      expect(utxoManager.utxos.has('tx1:1')).toBe(true); // Second UTXO should remain
    });

    it('should handle non-existent UTXOs gracefully', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'nonexistent', outputIndex: 0, scriptSig: 'sig1' }
      ];

      const spendingTx = createMockTransaction('tx2', inputs, []);
      const spentUTXOs = utxoManager.removeUTXOs(spendingTx);

      expect(spentUTXOs.length).toBe(0);
    });
  });

  describe('processTransaction', () => {
    beforeEach(() => {
      // Set up initial UTXOs for Alice
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' }
      ];
      const initialTx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(initialTx);
    });

    it('should process valid transaction successfully', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 70, scriptPubKey: 'pubkey-bob' },
        { address: 'alice', amount: 29, scriptPubKey: 'pubkey-alice' } // change
      ];

      const transaction = createMockTransaction('tx2', inputs, outputs);
      const result = utxoManager.processTransaction(transaction);

      expect(result).toBe(true);
      expect(utxoManager.utxos.has('tx1:0')).toBe(false); // Spent
      expect(utxoManager.utxos.has('tx1:1')).toBe(true);  // Unchanged
      expect(utxoManager.utxos.has('tx2:0')).toBe(true);  // New UTXO for Bob
      expect(utxoManager.utxos.has('tx2:1')).toBe(true);  // Change for Alice
    });

    it('should reject transaction with invalid inputs', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'nonexistent', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 50, scriptPubKey: 'pubkey-bob' }
      ];

      const transaction = createMockTransaction('tx2', inputs, outputs);
      const result = utxoManager.processTransaction(transaction);

      expect(result).toBe(false);
      expect(utxoManager.utxos.size).toBe(2); // No changes should be made
    });
  });

  describe('validateTransactionInputs', () => {
    beforeEach(() => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' }
      ];
      const initialTx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(initialTx);
    });

    it('should validate existing UTXOs', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const transaction = createMockTransaction('tx2', inputs, []);

      expect(utxoManager.validateTransactionInputs(transaction)).toBe(true);
    });

    it('should reject non-existent UTXOs', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'nonexistent', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const transaction = createMockTransaction('tx2', inputs, []);

      expect(utxoManager.validateTransactionInputs(transaction)).toBe(false);
    });

    it('should validate multiple inputs', () => {
      // Add another UTXO
      const outputs2: ITransactionOutput[] = [
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' }
      ];
      const tx2 = createMockTransaction('tx2', [], outputs2);
      utxoManager.addUTXOs(tx2);

      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' },
        { previousTransactionId: 'tx2', outputIndex: 0, scriptSig: 'sig2' }
      ];
      const transaction = createMockTransaction('tx3', inputs, []);

      expect(utxoManager.validateTransactionInputs(transaction)).toBe(true);
    });
  });

  describe('getUTXOsForAddress', () => {
    beforeEach(() => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'bob', amount: 50, scriptPubKey: 'pubkey-bob' },
        { address: 'alice', amount: 25, scriptPubKey: 'pubkey-alice' }
      ];
      const tx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(tx);
    });

    it('should return UTXOs for specific address', () => {
      const aliceUTXOs = utxoManager.getUTXOsForAddress('alice');
      const bobUTXOs = utxoManager.getUTXOsForAddress('bob');

      expect(aliceUTXOs.length).toBe(2);
      expect(bobUTXOs.length).toBe(1);
      expect(aliceUTXOs[0].amount + aliceUTXOs[1].amount).toBe(125);
      expect(bobUTXOs[0].amount).toBe(50);
    });

    it('should return empty array for address with no UTXOs', () => {
      const charlieUTXOs = utxoManager.getUTXOsForAddress('charlie');
      expect(charlieUTXOs.length).toBe(0);
    });
  });

  describe('selectUTXOsForSpending', () => {
    beforeEach(() => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' },
        { address: 'alice', amount: 25, scriptPubKey: 'pubkey-alice' },
        { address: 'bob', amount: 200, scriptPubKey: 'pubkey-bob' }
      ];
      const tx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(tx);
    });

    it('should select sufficient UTXOs using greedy algorithm', () => {
      const selectedUTXOs = utxoManager.selectUTXOsForSpending('alice', 125);
      const totalSelected = selectedUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      
      expect(selectedUTXOs.length).toBe(2); // Should select 100 + 50 (largest first)
      expect(selectedUTXOs[0].amount).toBe(100); // Largest first
      expect(selectedUTXOs[1].amount).toBe(50);
      expect(totalSelected).toBeGreaterThanOrEqual(125);
    });

    it('should return empty array when insufficient funds', () => {
      const selectedUTXOs = utxoManager.selectUTXOsForSpending('alice', 200);
      expect(selectedUTXOs.length).toBe(0);
    });

    it('should return empty array for address with no UTXOs', () => {
      const selectedUTXOs = utxoManager.selectUTXOsForSpending('charlie', 50);
      expect(selectedUTXOs.length).toBe(0);
    });

    it('should select exact amount when possible', () => {
      const selectedUTXOs = utxoManager.selectUTXOsForSpending('alice', 100);
      expect(selectedUTXOs.length).toBe(1);
      expect(selectedUTXOs[0].amount).toBe(100);
    });
  });

  describe('getUTXOSetStats', () => {
    it('should return correct statistics for empty set', () => {
      const stats = utxoManager.getUTXOSetStats();
      expect(stats.utxos.size).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });

    it('should return correct statistics with UTXOs', () => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'bob', amount: 50, scriptPubKey: 'pubkey-bob' }
      ];
      const tx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(tx);

      const stats = utxoManager.getUTXOSetStats();
      expect(stats.utxos.size).toBe(2);
      expect(stats.totalAmount).toBe(150);
    });
  });

  describe('calculateTransactionFee', () => {
    beforeEach(() => {
      const outputs: ITransactionOutput[] = [
        { address: 'alice', amount: 100, scriptPubKey: 'pubkey-alice' },
        { address: 'alice', amount: 50, scriptPubKey: 'pubkey-alice' }
      ];
      const tx = createMockTransaction('tx1', [], outputs);
      utxoManager.addUTXOs(tx);
    });

    it('should calculate correct transaction fee', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' }, // 100
        { previousTransactionId: 'tx1', outputIndex: 1, scriptSig: 'sig2' }  // 50
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 70, scriptPubKey: 'pubkey-bob' },
        { address: 'alice', amount: 75, scriptPubKey: 'pubkey-alice' }
      ];

      const transaction = createMockTransaction('tx2', inputs, outputs);
      const fee = utxoManager.calculateTransactionFee(transaction);

      expect(fee).toBe(5); // 150 (inputs) - 145 (outputs) = 5
    });

    it('should return 0 fee when inputs equal outputs', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig1' }  // 100
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 100, scriptPubKey: 'pubkey-bob' }
      ];

      const transaction = createMockTransaction('tx2', inputs, outputs);
      const fee = utxoManager.calculateTransactionFee(transaction);

      expect(fee).toBe(0);
    });

    it('should handle missing input UTXOs', () => {
      const inputs: ITransactionInput[] = [
        { previousTransactionId: 'nonexistent', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 50, scriptPubKey: 'pubkey-bob' }
      ];

      const transaction = createMockTransaction('tx2', inputs, outputs);
      const fee = utxoManager.calculateTransactionFee(transaction);

      expect(fee).toBe(-50); // 0 (inputs) - 50 (outputs) = -50
    });
  });

  describe('integration tests', () => {
    it('should handle complex transaction chain', () => {
      // Genesis transaction - create initial UTXOs
      const genesisOutputs: ITransactionOutput[] = [
        { address: 'alice', amount: 1000, scriptPubKey: 'pubkey-alice' }
      ];
      const genesisTx = createMockTransaction('genesis', [], genesisOutputs);
      utxoManager.addUTXOs(genesisTx);

      // Alice sends 300 to Bob
      const tx1Inputs: ITransactionInput[] = [
        { previousTransactionId: 'genesis', outputIndex: 0, scriptSig: 'sig1' }
      ];
      const tx1Outputs: ITransactionOutput[] = [
        { address: 'bob', amount: 300, scriptPubKey: 'pubkey-bob' },
        { address: 'alice', amount: 695, scriptPubKey: 'pubkey-alice' } // 1000 - 300 - 5 fee
      ];
      const tx1 = createMockTransaction('tx1', tx1Inputs, tx1Outputs);
      
      expect(utxoManager.processTransaction(tx1)).toBe(true);

      // Bob sends 150 to Charlie
      const tx2Inputs: ITransactionInput[] = [
        { previousTransactionId: 'tx1', outputIndex: 0, scriptSig: 'sig2' }
      ];
      const tx2Outputs: ITransactionOutput[] = [
        { address: 'charlie', amount: 150, scriptPubKey: 'pubkey-charlie' },
        { address: 'bob', amount: 148, scriptPubKey: 'pubkey-bob' } // 300 - 150 - 2 fee
      ];
      const tx2 = createMockTransaction('tx2', tx2Inputs, tx2Outputs);
      
      expect(utxoManager.processTransaction(tx2)).toBe(true);

      // Verify final state
      const aliceUTXOs = utxoManager.getUTXOsForAddress('alice');
      const bobUTXOs = utxoManager.getUTXOsForAddress('bob');
      const charlieUTXOs = utxoManager.getUTXOsForAddress('charlie');

      expect(aliceUTXOs.length).toBe(1);
      expect(aliceUTXOs[0].amount).toBe(695);

      expect(bobUTXOs.length).toBe(1);
      expect(bobUTXOs[0].amount).toBe(148);

      expect(charlieUTXOs.length).toBe(1);
      expect(charlieUTXOs[0].amount).toBe(150);

      // Verify total amount conservation
      const stats = utxoManager.getUTXOSetStats();
      expect(stats.totalAmount).toBe(993); // 1000 - 5 - 2 (fees)
    });
  });
});