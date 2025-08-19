import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';

export async function GET() {
  try {
    const utxoRepository = RepositoryFactory.getUTXORepository();
    const transactionRepository = RepositoryFactory.getTransactionRepository();
    const blockRepository = RepositoryFactory.getBlockRepository();

    // Get summary statistics
    const totalUtxos = await utxoRepository.count();
    const unspentUtxos = await utxoRepository.count({ isSpent: false });
    const totalTransactions = await transactionRepository.count();
    const totalBlocks = await blockRepository.count();
    const blockHeight = await blockRepository.getBlockHeight();
    const latestBlock = await blockRepository.getLatestBlock();

    // Get address balances
    const allUtxos = await utxoRepository.getAllUnspent();
    const addressBalances = new Map<string, number>();

    for (const utxo of allUtxos) {
      addressBalances.set(
        utxo.address, 
        (addressBalances.get(utxo.address) || 0) + utxo.amount
      );
    }

    const topAddresses = Array.from(addressBalances.entries())
      .map(([address, balance]) => ({ address, balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    // Calculate total value in circulation
    const totalValueInCirculation = Array.from(addressBalances.values())
      .reduce((sum, balance) => sum + balance, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBlocks,
          blockHeight,
          totalTransactions,
          totalUtxos,
          unspentUtxos,
          spentUtxos: totalUtxos - unspentUtxos,
          totalValueInCirculation,
          uniqueAddresses: addressBalances.size,
          latestBlock: latestBlock ? {
            index: latestBlock.header.index,
            hash: latestBlock.hash,
            timestamp: latestBlock.timestamp,
            transactionCount: latestBlock.transactionCount
          } : null
        },
        topAddresses
      }
    });
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch blockchain statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
