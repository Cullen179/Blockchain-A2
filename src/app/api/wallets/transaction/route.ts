import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/blockchain/structure/transaction';
import { ITransaction } from '@/types/blocks';
import { TransactionBodySchema } from '@/types/api';
import { TransactionRepository } from '@/repositories';
import { Mempool } from '@/blockchain/structure/mempool';

export async function POST(request: NextRequest) {
  try {
    // Parse the signed transaction data from request body
    const body = await request.json();

    // Validate required fields for signed transaction
    const { from, to, inputs, outputs, fee, amount } = body;

    try {
      const validatedBody = TransactionBodySchema.parse(body);
    } catch (error) {
      throw new Error('Invalid transaction data format');
    }

    const transaction: ITransaction = {
      ...body,
      id: '',
      timestamp: Date.now(),
      size: 0,
      outputs: [],
    };

    const createdTransaction = await Transaction.createTransaction(transaction);

    await TransactionRepository.createTransaction(createdTransaction);
    await Mempool.addTransaction(createdTransaction);

    return NextResponse.json(
      {
        success: true,
        transaction: createdTransaction,
        message: 'Transaction created and processed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
