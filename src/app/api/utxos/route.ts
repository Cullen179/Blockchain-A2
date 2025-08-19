import { UTXOManager } from '@/blockchain/structure/utxo';
import { UTXORepository } from '@/repositories';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const utxos = await UTXORepository.findAll();

    return NextResponse.json({
      success: true,
      data: utxos,
      count: utxos.length
    });
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch UTXOs',
        message: error instanceof Error ? error.message : 'Unknown error',
        utxos: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return UTXOManager.createUTXO(request);
}
