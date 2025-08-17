import { ITransaction, IUTXOSet, IWallet } from "@/types/blocks";
import { UTXOManager, UTXOManager } from "./utxo";

export class Wallet implements IWallet {
  public address: string;
  public privateKey: string;
  public publicKey: string;
  public balance: number;
  public utxoSet: IUTXOSet;

  constructor(address: string, privateKey: string, publicKey: string, initialBalance: number = 0) {
    this.address = address;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.balance = initialBalance;
    this.utxoSet = { utxos: new Map(), totalAmount: initialBalance };
  }


  public createTransaction(amount: number, recipientAddress: string, fee: number): ITransaction {
    const utxoManager = new UTXOManager();
    if (amount + fee > this.balance) {
      throw new Error("Insufficient balance for transaction");
    }

    const selectedUTXOs = utxoManager.selectUTXOsForSpending(this.address, amount + fee);

    if (selectedUTXOs.length === 0) {
      throw new Error("No sufficient UTXOs found for transaction");
    }

    const totalSelected = selectedUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);

    if (totalSelected < amount + fee) {
      throw new Error("Selected UTXOs do not cover the transaction amount and fee");
    }

    const inputs = selectedUTXOs.map(utxo => ({
      previousTransactionId: utxo.transactionId,
      outputIndex: utxo.outputIndex,
      scriptSig: "", // This will be filled later with the signature
    }));

    const outputs = [
      {
        amount: amount,
        scriptPubKey: "", // This will be filled with the recipient's address
        address: recipientAddress,
      },
      {
        amount: totalSelected - amount - fee, // Change back to the sender
        scriptPubKey: "", // This will be filled with the sender's address
        address: this.address,
      }
    ];


    const transaction: ITransaction = {
      id: this.generateTransactionId(),
      from: this.address,
      to: recipientAddress,
      amount: amount,
      fee: fee,
      inputs: inputs,
      outputs: outputs,
      size: 0, // Size will be calculated later
      timestamp: Date.now(),
    };

  }

  public signTransaction(transaction: ITransaction): void {
  }
}