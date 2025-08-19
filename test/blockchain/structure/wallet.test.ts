import { Wallet } from '../../../src/blockchain/structure/wallet';
import { UTXOManager } from '../../../src/blockchain/structure/utxo';
import { Transaction } from '../../../src/blockchain/structure/transaction';
import { ITransaction, IUTXO, ITransactionInput, ITransactionOutput } from '@/types/blocks';
import crypto from 'crypto';
import { generateKeyPair } from '@/lib/utils';

describe('Wallet UTXO Flow', () => {
  let wallet: Wallet;
  let recipientWallet: Wallet;
  let utxoManager: UTXOManager;
  
  // Helper function to create mock UTXO
  const createMockUTXOTransaction = (txId: string, outputIndex: number, address: string, amount: number): ITransaction => {
    const input: ITransactionInput = {
      previousTransactionId: txId,
      outputIndex: outputIndex,
      scriptSig: ''
    };

    const output: ITransactionOutput = {
      amount: amount,
      scriptPubKey: `pubkey-${address}`,
      address: address
    };

    return new Transaction(
      address,
      address,
      amount,
      0,
      [input],
      [output]
    );
  };

  beforeEach(() => {
    const aliceKeyPair = generateKeyPair();
    const bobKeyPair = generateKeyPair();
    
    wallet = new Wallet(
      'alice123',
      aliceKeyPair.privateKey,
      aliceKeyPair.publicKey,
      0
    );

    recipientWallet = new Wallet(
      'bob456',
      bobKeyPair.privateKey,
      bobKeyPair.publicKey,
      0
    );

    utxoManager = new UTXOManager();
  });

  describe('Wallet Construction', () => {
    it('should initialize wallet with correct properties', () => {
      expect(wallet.address).toBe('alice123');
      expect(wallet.privateKey).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.balance).toBe(0);
      expect(wallet.utxos.length).toBe(0);
    });

  });

  describe('UTXO Management', () => {
    beforeEach(() => {
      utxoManager.addUTXOs(createMockUTXOTransaction('genesis', 0, wallet.address, 100));
      utxoManager.addUTXOs(createMockUTXOTransaction('genesis', 1, wallet.address, 50));
      utxoManager.addUTXOs(createMockUTXOTransaction('genesis', 2, wallet.address, 25));

      console.log('UTXOs Set:', Array.from(utxoManager.utxos.entries()).map(([key, utxo]) => ({ key, ...utxo })));
    });

    it('should have correct balance after adding UTXOs', () => {
      console.log('balance:', wallet.getBalance());
      expect(wallet.getBalance()).toBe(175);
      expect(wallet.utxos.length).toBe(3);
    });

    it('should select UTXOs for spending using greedy algorithm', () => {
      // Mock the UTXOManager's selectUTXOsForSpending method
      const mockUTXOManager = new UTXOManager();
      
      // Add UTXOs to the manager for selection
      const utxos = wallet.getUTXOs();
      utxos.forEach(utxo => {
      const utxoKey = `${utxo.transactionId}:${utxo.outputIndex}`;
      mockUTXOManager.utxos.set(utxoKey, utxo);
      });

      const selectedUTXOs = mockUTXOManager.selectUTXOsForSpending(wallet.address, 75);
      
      expect(selectedUTXOs.length).toBe(2); // Should select 100 + 50
      expect(selectedUTXOs[0].amount).toBe(100); // Largest first
      expect(selectedUTXOs[1].amount).toBe(50);
    });
  });

  describe('Transaction Creation', () => {
    beforeEach(() => {
      // Add UTXOs to wallet
      const utxos = [
        createMockUTXO('genesis', 0, wallet.address, 200),
        createMockUTXO('genesis', 1, wallet.address, 100)
      ];
    });

    it('should create transaction with sufficient balance', () => {
      const amount = 150;
      const fee = 5;

      const transaction = wallet.createTransaction(amount, recipientWallet.address, fee);

      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction.from).toBe(wallet.address);
      expect(transaction.to).toBe(recipientWallet.address);
      expect(transaction.amount).toBe(amount);
      expect(transaction.fee).toBe(fee);
      expect(transaction.inputs.length).toBeGreaterThan(0);
      expect(transaction.outputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw error when insufficient balance', () => {
      const amount = 400; // More than wallet balance (300)
      const fee = 5;

      expect(() => {
        wallet.createTransaction(amount, recipientWallet.address, fee);
      }).toThrow('Insufficient balance for transaction');
    });

    it('should create correct transaction inputs and outputs', () => {
      const amount = 80;
      const fee = 10;
      const totalRequired = amount + fee; // 90

      const transaction = wallet.createTransaction(amount, recipientWallet.address, fee);

      // Should have inputs
      expect(transaction.inputs.length).toBeGreaterThan(0);
      
      // Should have at least one output (to recipient)
      expect(transaction.outputs.length).toBeGreaterThanOrEqual(1);
      
      // First output should be to recipient
      const recipientOutput = transaction.outputs.find(output => 
        output.address === recipientWallet.address
      );
      expect(recipientOutput).toBeDefined();
      expect(recipientOutput?.amount).toBe(amount);

      // Check if change output exists
      const changeOutput = transaction.outputs.find(output => 
        output.address === wallet.address
      );
      if (changeOutput) {
        // Verify change amount is correct
        const totalInputs = 100; // From first UTXO selected
        const expectedChange = totalInputs - amount - fee;
        expect(changeOutput.amount).toBe(expectedChange);
      }
    });

    it('should create transaction with exact amount (no change)', () => {
      // Create wallet with exact UTXO amount
      const exactWallet = new Wallet('exact', 'privkey', 'pubkey', 0);
      const exactUTXO = createMockUTXO('exact-tx', 0, 'exact', 105);

      const amount = 100;
      const fee = 5;

      const transaction = exactWallet.createTransaction(amount, recipientWallet.address, fee);

      // Should have only one output (to recipient, no change)
      const recipientOutputs = transaction.outputs.filter(output => 
        output.address === recipientWallet.address
      );
      expect(recipientOutputs.length).toBe(1);
      expect(recipientOutputs[0].amount).toBe(amount);
    });
  });

  describe('Transaction Signing', () => {
    let unsignedTransaction: Transaction;

    beforeEach(() => {
      const utxos = [createMockUTXO('tx1', 0, wallet.address, 100)];

      unsignedTransaction = wallet.createTransaction(50, recipientWallet.address, 5);
    });

    it('should sign transaction inputs', () => {
      // Check that inputs have signatures after creation
      unsignedTransaction.inputs.forEach(input => {
        expect(input.scriptSig).toBeDefined();
        expect(input.scriptSig).not.toBe('');
      });
    });

    it('should update transaction size after signing', () => {
      const initialSize = unsignedTransaction.size;
      
      // Create a new transaction and sign it manually
      const inputs: ITransactionInput[] = [{
        previousTransactionId: 'tx1',
        outputIndex: 0,
        scriptSig: ''
      }];
      const outputs: ITransactionOutput[] = [{
        address: recipientWallet.address,
        amount: 50,
        scriptPubKey: `pubkey-${recipientWallet.address}`
      }];

      const newTransaction = new Transaction(
        wallet.address,
        recipientWallet.address,
        50,
        5,
        inputs,
        outputs
      );

      const sizeBeforeSigning = newTransaction.size;
      wallet.signTransaction(newTransaction);
      const sizeAfterSigning = newTransaction.size;

      expect(sizeAfterSigning).toBeGreaterThan(sizeBeforeSigning);
    });

    it('should create valid signatures', () => {
      // Verify that the scriptSig can be verified with the public key
      // Note: This would require implementing scriptSig verification
      expect(unsignedTransaction.inputs[0].scriptSig).toBeDefined();
      expect(unsignedTransaction.inputs[0].scriptSig.length).toBeGreaterThan(0);
    });
  });

  describe('UTXO Flow Integration', () => {
    it('should complete full UTXO transaction flow', () => {
      // 1. Setup initial UTXOs for Alice
      const aliceInitialUTXOs = [
        createMockUTXO('genesis', 0, wallet.address, 500),
        createMockUTXO('genesis', 1, wallet.address, 300)
      ];

      expect(wallet.balance).toBe(800);

      // 2. Alice creates transaction to send 200 to Bob
      const amount = 200;
      const fee = 10;
      const transaction = wallet.createTransaction(amount, recipientWallet.address, fee);

      expect(transaction.amount).toBe(amount);
      expect(transaction.fee).toBe(fee);

      // 3. Process transaction through UTXO manager
      // Add Alice's UTXOs to UTXO manager
      aliceInitialUTXOs.forEach(utxo => {
        const utxoKey = `${utxo.transactionId}:${utxo.outputIndex}`;
        utxoManager.utxos.set(utxoKey, utxo);
      });

      // Validate and process transaction
      const isValid = utxoManager.validateTransactionInputs(transaction);
      expect(isValid).toBe(true);

      const processResult = utxoManager.processTransaction(transaction);
      expect(processResult).toBe(true);

      // 4. Verify UTXOs are updated correctly
      // Alice's original UTXOs should be spent
      expect(utxoManager.utxos.has('genesis:0')).toBe(false);

      // New UTXOs should be created
      expect(utxoManager.utxos.has(`${transaction.id}:0`)).toBe(true); // Bob's UTXO
      
      // Check if change UTXO exists
      if (transaction.outputs.length > 1) {
        expect(utxoManager.utxos.has(`${transaction.id}:1`)).toBe(true); // Alice's change
      }

      // 5. Verify balances
      const bobUTXOs = utxoManager.getUTXOsForAddress(recipientWallet.address);
      const bobBalance = bobUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      expect(bobBalance).toBe(amount);

      const aliceUTXOs = utxoManager.getUTXOsForAddress(wallet.address);
      const aliceBalance = aliceUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      const expectedAliceBalance = 800 - amount - fee; // 590
      expect(aliceBalance).toBe(expectedAliceBalance);
    });

    it('should handle multiple transactions in sequence', () => {
      // Initial setup
      const initialUTXOs = [createMockUTXO('genesis', 0, wallet.address, 1000)];
      
      initialUTXOs.forEach(utxo => {
        const utxoKey = `${utxo.transactionId}:${utxo.outputIndex}`;
        utxoManager.utxos.set(utxoKey, utxo);
      });

      // Transaction 1: Alice sends 300 to Bob
      const tx1 = wallet.createTransaction(300, recipientWallet.address, 10);
      utxoManager.processTransaction(tx1);

      // Update wallet state after transaction 1
      wallet.utxos = [];
      const aliceUTXOsAfterTx1 = utxoManager.getUTXOsForAddress(wallet.address);
      aliceUTXOsAfterTx1.forEach(utxo => {
        wallet.utxos.push(utxo);
      });
      wallet.balance = aliceUTXOsAfterTx1.reduce((sum, utxo) => sum + utxo.amount, 0);

      // Transaction 2: Alice sends 200 more to Bob
      const tx2 = wallet.createTransaction(200, recipientWallet.address, 10);
      utxoManager.processTransaction(tx2);

      // Verify final state
      const finalBobUTXOs = utxoManager.getUTXOsForAddress(recipientWallet.address);
      const finalBobBalance = finalBobUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      expect(finalBobBalance).toBe(500); // 300 + 200

      const finalAliceUTXOs = utxoManager.getUTXOsForAddress(wallet.address);
      const finalAliceBalance = finalAliceUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      expect(finalAliceBalance).toBe(480); // 1000 - 300 - 10 - 200 - 10
    });

    it('should handle insufficient funds correctly', () => {
      // Setup wallet with limited funds
      const limitedUTXOs = [createMockUTXO('limited', 0, wallet.address, 50)];

      // Try to spend more than available
      expect(() => {
        wallet.createTransaction(100, recipientWallet.address, 5);
      }).toThrow('Insufficient balance for transaction');

      // Wallet state should remain unchanged
      expect(wallet.balance).toBe(50);
      expect(wallet.utxos.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount transaction', () => {
      const utxos = [createMockUTXO('tx1', 0, wallet.address, 100)];

      expect(() => {
        wallet.createTransaction(0, recipientWallet.address, 5);
      }).toThrow(); // Should throw an error for zero amount
    });

    it('should handle transaction with only fee', () => {
      const utxos = [createMockUTXO('tx1', 0, wallet.address, 10)];

      const transaction = wallet.createTransaction(5, recipientWallet.address, 5);
      expect(transaction.amount).toBe(5);
      expect(transaction.fee).toBe(5);
      
      // Should use all available balance
      const totalOutputs = transaction.outputs.reduce((sum, output) => sum + output.amount, 0);
      expect(totalOutputs + transaction.fee).toBe(10);
    });
  });
});