import { NextRequest } from 'next/server';
import { TransactionRepository } from '@/repositories';

export async function GET(request: NextRequest) {
  const transactions = await TransactionRepository.getAllTransactions();
  return transactions;
}
