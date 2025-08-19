import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const blockId = searchParams.get('blockId');

    const transactionRepository = RepositoryFactory.getTransactionRepository();
    
    let transactions;
    let context = '';

    if (address) {
      transactions = await transactionRepository.findByAddress(address);
      context = `for address: ${address}`;
    } else if (blockId) {
      transactions = await transactionRepository.findByBlockId(blockId);
      context = `for block: ${blockId}`;
    } else {
      transactions = await transactionRepository.findAll();
      context = 'all transactions';
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      context
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
