import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    const utxoRepository = RepositoryFactory.getUTXORepository();
    
    if (address) {
      // Get UTXOs for a specific address
      const utxos = await utxoRepository.findByAddress(address);
      const unspentUtxos = await utxoRepository.findUnspentByAddress(address);
      const balance = await utxoRepository.getTotalValueByAddress(address);

      return NextResponse.json({
        success: true,
        data: {
          address,
          balance,
          totalUtxos: utxos.length,
          unspentUtxos: unspentUtxos.length,
          allUtxos: utxos,
          activeUtxos: unspentUtxos
        }
      });
    } else {
      // Get all UTXOs grouped by address
      const allUtxos = await utxoRepository.findAll();
      const addressBalances = new Map<string, { balance: number; utxoCount: number; unspentCount: number }>();

      for (const utxo of allUtxos) {
        if (!addressBalances.has(utxo.address)) {
          addressBalances.set(utxo.address, { balance: 0, utxoCount: 0, unspentCount: 0 });
        }
        
        const addressData = addressBalances.get(utxo.address)!;
        addressData.utxoCount++;
        
        if (!utxo.isSpent) {
          addressData.balance += utxo.amount;
          addressData.unspentCount++;
        }
      }

      const addressSummary = Array.from(addressBalances.entries()).map(([address, data]) => ({
        address,
        ...data
      }));

      return NextResponse.json({
        success: true,
        data: {
          totalAddresses: addressSummary.length,
          totalUtxos: allUtxos.length,
          addressSummary
        }
      });
    }
  } catch (error) {
    console.error('Error fetching address data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch address data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
