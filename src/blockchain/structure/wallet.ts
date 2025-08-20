import crypto from 'crypto';



import { NextResponse } from "next/server";



import { prisma } from "@/lib/prisma";
import { WalletRepository } from "@/repositories/WalletRepository";
import { IUTXO, IUTXOSet, IWallet } from "@/types/blocks";



import { Transaction } from "./transaction";
import { UTXOManager } from "./utxo";





export class Wallet {
  // public address: string;
  // public privateKey: string;
  // public publicKey: string;
  // public balance: number;
  // public utxos: IUTXO[];

  // constructor(address: string, privateKey: string, publicKey: string, initialBalance: number = 0) {
  //   this.address = address;
  //   this.privateKey = privateKey;
  //   this.publicKey = publicKey;
  //   this.balance = initialBalance;
  //   this.utxos = [];
  // }

  static async getAllWallets() {
    try {
      const wallets = await prisma.wallet.findMany({
        include: {
          utxos: {
            where: { isSpent: false },
          },
        },
      });

      return NextResponse.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wallets' },
        { status: 500 }
      );
    }
  }

  static async generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      const address = crypto
        .createHash('sha256')
        .update(publicKey)
        .digest('hex');

      return NextResponse.json({
        address,
        privateKey,
        publicKey,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate wallet' },
        { status: 500 }
      );
    }
  }

  /**
   * Create a new transaction from the wallet
   * @param amount - Amount to send
   * @param recipientAddress - Address of the recipient
   * @param fee - Transaction fee
   * @returns Transaction object
   */
  public createTransaction(
    amount: number,
    recipientAddress: string,
    fee: number
  ): Transaction {
    const utxoManager = new UTXOManager();
    if (amount + fee > this.balance) {
      throw new Error('Insufficient balance for transaction');
    }

    const selectedUTXOs = utxoManager.selectUTXOsForSpending(
      this.address,
      amount + fee
    );

    if (selectedUTXOs.length === 0) {
      throw new Error('No sufficient UTXOs found for transaction');
    }

    const totalSelected = selectedUTXOs.reduce(
      (sum, utxo) => sum + utxo.amount,
      0
    );

    if (totalSelected < amount + fee) {
      throw new Error(
        'Selected UTXOs do not cover the transaction amount and fee'
      );
    }

    const inputs = selectedUTXOs.map((utxo) => ({
      previousTransactionId: utxo.transactionId,
      outputIndex: utxo.outputIndex,
      scriptSig: '', // This will be filled later with the signature
    }));

    const outputs = [
      {
        amount: amount,
        scriptPubKey: '', // This will be filled with the recipient's address
        address: recipientAddress,
      },
      {
        amount: totalSelected - amount - fee, // Change back to the sender
        scriptPubKey: '', // This will be filled with the sender's address
        address: this.address,
      },
    ];

    const transaction: Transaction = new Transaction(
      this.address,
      recipientAddress,
      amount,
      fee,
      inputs,
      outputs
    );

    // Sign the transaction
    this.signTransaction(transaction);

    return transaction;
  }

  public signTransaction(transaction: Transaction): void {
    const signature = crypto.createSign('SHA256');
    const scriptSig = signature.sign(this.privateKey, 'hex');

    signature.update(JSON.stringify(transaction));
    transaction.inputs.forEach((input) => {
      input.scriptSig = scriptSig;
    });

    // Update transaction size after signing
    transaction.size = transaction.calculateSize();
  }

  public getBalance(): number {
    return this.getUTXOs().reduce((sum, utxo) => sum + utxo.amount, 0);
  }

  public getUTXOs(): IUTXO[] {
    const utxoManager = new UTXOManager();
    return utxoManager.getUTXOsForAddress(this.address);
  }
}