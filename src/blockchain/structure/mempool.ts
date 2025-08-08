import { IMempool } from "@/types";
import { ITransaction } from "@/types/blocks";

export class Mempool implements IMempool {
  transactions: ITransaction[] = [];
  maxSize: number;
  currentSize: number = 0;
  miningReward: number;
  consensusType: string;
  difficulty: number;

  constructor(maxSize: number, miningReward: number, consensusType: string, difficulty: number) {
    this.maxSize = maxSize;
    this.miningReward = miningReward;
    this.consensusType = consensusType;
    this.difficulty = difficulty;
  }

  addTransaction(transaction: ITransaction): boolean {
    if (this.currentSize >= this.maxSize) {
      return false; // Mempool is full
    }
    this.transactions.push(transaction);
    this.currentSize++;
    return true;
  }

  removeTransaction(transactionId: string): boolean {
    const index = this.transactions.findIndex(tx => tx.id === transactionId);
    if (index !== -1) {
      this.transactions.splice(index, 1);
      this.currentSize--;
      return true; // Transaction removed
    }
    return false; // Transaction not found
  }

  clear(): void {
    this.transactions = [];
    this.currentSize = 0;
  }
}