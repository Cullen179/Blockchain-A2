import { prisma } from "@/lib/prisma";
import { IMempool, ITransaction } from "@/types/blocks";
import { NextResponse } from "next/server";
import { fa } from "zod/v4/locales";

export class MempoolRepository {
  /**
   * Get all mempools with their transactions
   */
  static async getDefaultMempool(): Promise<IMempool | null> {
    try {
      const mempool = await prisma.mempool.findFirst({
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
          },
        },
      });

      if (!mempool) {
        return null;
      }
      // Transform to IMempool interface
      return {
        ...mempool,
        transactions: mempool.transactions.map(transaction => ({
          ...transaction,
          timestamp: Number(transaction.timestamp),
        })),
      };
    } catch (error) {
      console.error('Error fetching mempool:', error);
      throw new Error('Failed to fetch mempool');
    }
  }

  /**
   * Create a new mempool
   */
  static async createMempool(maxSize: number = 1000): Promise<IMempool> {
    try {
      const mempool = await prisma.mempool.create({
        data: {
          maxSize,
          currentSize: 0,
        },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            }
          }
        }
      });

      // Transform to IMempool interface
      return {
        id: mempool.id,
        maxSize: mempool.maxSize,
        currentSize: mempool.currentSize,
        transactions: []
      };
    } catch (error) {
      console.error('Error creating mempool:', error);
      throw new Error('Failed to create mempool');
    }
  }

  /**
   * Add a transaction to the mempool
   */
  static async addTransaction(transaction: ITransaction): Promise<void> {
    try {
      // Check if mempool exists and has capacity
      const mempool = await this.getDefaultMempool();

      if (!mempool) {
        throw new Error('Mempool not found');
      }

      // if (mempool.transactions.length >= mempool.maxSize) {
      //   throw new Error('Mempool is full');
      // }

      // Check if transaction exists and is not already in a block
      const findTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id }
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

      if (await this.verifyTransactionInputsExist(transaction)) {
        throw new Error('Transaction inputs exist in the mempool');
      }

      // Add transaction to mempool
      await prisma.$transaction(async (tx) => {
        // Update transaction to reference mempool
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { mempoolId: mempool.id }
        });

        // Update mempool current size by incrementing transaction size
        await tx.mempool.update({
          where: { id: mempool.id },
          data: { currentSize: { increment: transaction.size } }
        });
      });
    } catch (error) {
      console.error('Error adding transaction to mempool:', error);
      throw error;
    }
  }

  // Verify transaction inputs exist in the mempool
  static async verifyTransactionInputsExist(transaction: ITransaction): Promise<boolean> {
    try {
      const mempool = await this.getDefaultMempool();
      if (!mempool) {
        throw new Error('Mempool not found');
      }

      console.log('mempool transactions:', mempool.transactions);
      mempool.transactions.forEach(memTx => {
        memTx.inputs.forEach(memInput => {
          if (memInput.previousTransactionId === transaction.id) {
            throw new Error('Transaction inputs already exist in the mempool');
          }
          // check if memInputs is the same as transaction inputs
          transaction.inputs.forEach(input => {
            if (input.previousTransactionId === memInput.previousTransactionId && input.outputIndex === memInput.outputIndex) {
              throw new Error('Transaction inputs already exist in the mempool');
            }
          });
        });
      });
      return false; // If no inputs match, return false
    } catch (error) {
      console.error('Error verifying transaction inputs:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to verify transaction inputs');
    }
  }

  /**
   * Remove a transaction from the mempool
   */
  static async removeTransaction(mempoolId: string, transactionId: string): Promise<void> {
    try {
      // Verify transaction is in this mempool
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction || transaction.mempoolId !== mempoolId) {
        throw new Error('Transaction not found in this mempool');
      }

      // Remove transaction from mempool
      await prisma.$transaction(async (tx) => {
        // Update transaction to remove mempool reference
        await tx.transaction.update({
          where: { id: transactionId },
          data: { mempoolId: null }
        });

        // Update mempool current size
        await tx.mempool.update({
          where: { id: mempoolId },
          data: { currentSize: { decrement: 1 } }
        });
      });
    } catch (error) {
      console.error('Error removing transaction from mempool:', error);
      throw error;
    }
  }

  /**
   * Get transactions from mempool sorted by priority (fee descending, timestamp ascending)
   */
  static async getTransactionsByPriority(mempoolId: string, limit?: number): Promise<ITransaction[]> {
    try {
      const mempool = await prisma.mempool.findUnique({
        where: { id: mempoolId },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
            orderBy: [
              { fee: 'desc' },
              { timestamp: 'asc' }
            ],
            ...(limit && { take: limit })
          }
        }
      });

      if (!mempool) {
        throw new Error('Mempool not found');
      }

      return mempool.transactions.map(transaction => ({
        id: transaction.id,
        from: transaction.from,
        to: transaction.to,
        amount: Number(transaction.amount),
        fee: Number(transaction.fee),
        timestamp: Number(transaction.timestamp),
        size: Number(transaction.size),
        blockHash: transaction.blockHash,
        inputs: transaction.inputs.map(input => ({
          previousTransactionId: input.previousTransactionId,
          outputIndex: Number(input.outputIndex),
          scriptSig: input.scriptSig,
        })),
        outputs: transaction.outputs.map(output => ({
          amount: Number(output.amount),
          address: output.address,
          scriptPubKey: output.scriptPubKey,
        }))
      }));
    } catch (error) {
      console.error('Error getting transactions by priority:', error);
      throw error;
    }
  }

  /**
   * Clear all transactions from a mempool
   */
  static async clearMempool(mempoolId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Remove mempool reference from all transactions
        await tx.transaction.updateMany({
          where: { mempoolId: mempoolId },
          data: { mempoolId: null }
        });

        // Reset current size
        await tx.mempool.update({
          where: { id: mempoolId },
          data: { currentSize: 0 }
        });
      });
    } catch (error) {
      console.error('Error clearing mempool:', error);
      throw error;
    }
  }

  /**
   * Get mempool statistics
   */
  static async getMempoolStats(mempoolId: string) {
    try {
      const mempool = await prisma.mempool.findUnique({
        where: { id: mempoolId },
        include: {
          _count: { select: { transactions: true } },
          transactions: {
            select: {
              fee: true,
              size: true,
            }
          }
        }
      });

      if (!mempool) {
        throw new Error('Mempool not found');
      }

      const totalFees = mempool.transactions.reduce((sum, tx) => sum + Number(tx.fee), 0);
      const totalSize = mempool.transactions.reduce((sum, tx) => sum + Number(tx.size), 0);
      const avgFee = mempool.transactions.length > 0 ? totalFees / mempool.transactions.length : 0;
      const avgSize = mempool.transactions.length > 0 ? totalSize / mempool.transactions.length : 0;
      const utilizationRate = (mempool.currentSize / mempool.maxSize) * 100;

      return {
        id: mempool.id,
        maxSize: mempool.maxSize,
        currentSize: mempool.currentSize,
        actualTransactionCount: mempool._count.transactions,
        totalFees,
        totalSize,
        avgFee,
        avgSize,
        utilizationRate: Math.round(utilizationRate * 100) / 100, // Round to 2 decimal places
        isEmpty: mempool.currentSize === 0,
        isFull: mempool.currentSize >= mempool.maxSize,
      };
    } catch (error) {
      console.error('Error getting mempool stats:', error);
      throw error;
    }
  }

  /**
   * Delete a mempool (only if empty)
   */
  static async deleteMempool(mempoolId: string): Promise<void> {
    try {
      const mempool = await prisma.mempool.findUnique({
        where: { id: mempoolId },
        include: { _count: { select: { transactions: true } } }
      });

      if (!mempool) {
        throw new Error('Mempool not found');
      }

      if (mempool._count.transactions > 0) {
        throw new Error('Cannot delete mempool with transactions. Clear it first.');
      }

      await prisma.mempool.delete({
        where: { id: mempoolId }
      });
    } catch (error) {
      console.error('Error deleting mempool:', error);
      throw error;
    }
  }
}
