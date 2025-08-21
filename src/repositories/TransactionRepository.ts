import { prisma } from '@/lib/prisma';
import { ITransaction } from '@/types/blocks';
import { NextResponse } from 'next/server';

export class TransactionRepository {
  static async getAllTransactions() {
    try {
      const transactions = await prisma.transaction.findMany({
        include: {
          inputs: true,
          outputs: true,
        },
        orderBy: {
          timestamp: 'desc', // 'desc' for newest first, 'asc' for oldest first
        },
      });
      return NextResponse.json(
        transactions.map(transaction => ({
          ...transaction,
          timestamp: Number(transaction.timestamp),
        }))
      );
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
  }
  static async createTransaction(transaction: ITransaction): Promise<void> {
    try {
      await prisma.transaction.create({
        data: {
          id: transaction.id,
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          fee: transaction.fee,
          timestamp: transaction.timestamp,
          size: transaction.size,

          // Create related inputs
          inputs: {
            create: transaction.inputs.map(input => ({
              previousTransactionId: input.previousTransactionId,
              outputIndex: input.outputIndex,
              scriptSig: input.scriptSig,
            })),
          },
          // Create related outputs
          outputs: {
            create: transaction.outputs.map(output => ({
              address: output.address,
              amount: output.amount,
              scriptPubKey: output.scriptPubKey,
            })),
          },
        },
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }
}
