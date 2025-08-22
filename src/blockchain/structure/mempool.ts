import { prisma } from '@/lib/prisma';
import { MempoolRepository } from '@/repositories/MempoolRepository';
import { IMempool } from '@/types';
import { ITransaction } from '@/types/blocks';

export class Mempool {
  // transactions: ITransaction[] = [];
  // maxSize: number;
  // currentSize: number = 0;
  // miningReward: number;
  // consensusType: string = 'POW';
  // difficulty: number;

  // constructor(maxSize: number, miningReward: number, consensusType: string, difficulty: number) {
  //   this.maxSize = maxSize;
  //   this.miningReward = miningReward;
  //   this.consensusType = consensusType;
  //   this.difficulty = difficulty;
  // }

  // addTransaction(transaction: ITransaction): boolean {
  //   if (this.currentSize >= this.maxSize) {
  //     return false; // Mempool is full
  //   }
  //   this.transactions.push(transaction);
  //   this.currentSize++;
  //   return true;
  // }

  // removeTransaction(transactionId: string): boolean {
  //   const index = this.transactions.findIndex(tx => tx.id === transactionId);
  //   if (index !== -1) {
  //     this.transactions.splice(index, 1);
  //     this.currentSize--;
  //     return true; // Transaction removed
  //   }
  //   return false; // Transaction not found
  // }

  // clear(): void {
  //   this.transactions = [];
  //   this.currentSize = 0;
  // }

  /**
   * Add a transaction to the mempool
   */
  static async addTransaction(transaction: ITransaction): Promise<void> {
    try {
      // Check if mempool exists and has capacity
      const mempool = await MempoolRepository.getDefaultMempool();

      if (!mempool) {
        throw new Error('Mempool not found');
      }

      // Check if transaction exists and is not already in a block
      const findTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });

      if (!findTransaction) {
        throw new Error('Transaction not found');
      }

      if (findTransaction.blockHash) {
        throw new Error('Transaction is already in a block');
      }

      if (findTransaction.mempoolId) {
        throw new Error('Transaction is already in a mempool');
      }

      if (await MempoolRepository.verifyTransactionInputsExist(transaction)) {
        throw new Error('Transaction inputs exist in the mempool');
      }

      // Add transaction to mempool
      await prisma.$transaction(async tx => {
        if (mempool.currentSize + transaction.size > mempool.maxSize) {
          await this.replaceLowestFeeTransaction(transaction, tx);
        }
        // Update transaction to reference mempool
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { mempoolId: mempool.id },
        });

        // Update mempool current size by incrementing transaction size
        await tx.mempool.update({
          where: { id: mempool.id },
          data: { currentSize: { increment: transaction.size } },
        });
      });
    } catch (error) {
      console.error('Error adding transaction to mempool:', error);
      throw error;
    }
  }

  /**
   * Replace the lowest fee transaction in the mempool if it exceeds max size
   */
  static async replaceLowestFeeTransaction(
    newTransaction: ITransaction,
    tx: any
  ): Promise<void> {
    try {
      // Get the default mempool
      const mempool = await MempoolRepository.getDefaultMempool();
      if (!mempool) {
        throw new Error('Mempool not found');
      }

      // Find the lowest fee transaction in the mempool
      const lowestFeeTransaction = await prisma.transaction.findFirst({
        where: { mempoolId: mempool.id },
        orderBy: { fee: 'asc' },
      });

      if (!lowestFeeTransaction) {
        return; // No transaction to replace
      }

      if (newTransaction.fee <= lowestFeeTransaction.fee) {
        throw new Error(
          'New transaction fee is not higher than the lowest fee transaction'
        );
      }

      // Remove the lowest fee transaction
      await tx.transaction.update({
        where: { id: lowestFeeTransaction.id },
        data: { mempoolId: null }, // Remove from mempool
      });

      // Update mempool current size by decrementing the removed transaction size
      await tx.mempool.update({
        where: { id: mempool.id },
        data: { currentSize: { decrement: lowestFeeTransaction.size } },
      });
    } catch (error) {
      console.error('Error replacing lowest fee transaction:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to replace transaction'
      );
    }
  }
}
