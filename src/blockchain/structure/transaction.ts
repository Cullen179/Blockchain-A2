import { IMempool } from "@/types";
import { ITransaction } from "@/types/blocks";

export class Mempool implements IMempool {
  public transactions: ITransaction[] = [];
  public maxSize: number;
  public currentSize: number = 0;
  public miningReward: number;
  public consensusType: string;
  public difficulty: number;

  constructor(maxSize: number, miningReward: number, consensusType: string, difficulty: number) {
    this.maxSize = maxSize;
    this.miningReward = miningReward;
    this.consensusType = consensusType;
    this.difficulty = difficulty;
  }

  public addTransaction(transaction: ITransaction): boolean {
    if (this.currentSize >= this.maxSize) {
      console.error('Mempool is full');
      return false;
    }

    this.transactions.push(transaction);
    this.currentSize += this.getTransactionSize(transaction);
    return true;
  }

  public getTransactions(): ITransaction[] {
    return this.transactions;
  }

  public clear(): void {
    this.transactions = [];
    this.currentSize = 0;
  }

  private getTransactionSize(transaction: ITransaction): number {
    return Buffer.byteLength(JSON.stringify(transaction), 'utf8');
  }
}
