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
  try {
    const body = await request.json();
    
    // Validate required fields
    const { transactionId, outputIndex, address, amount, scriptPubKey } = body;
    
    if (!transactionId || outputIndex === undefined || !address || !amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'transactionId, outputIndex, address, and amount are required'
        },
        { status: 400 }
      );
    }

    // Create the UTXO
    const utxoData = {
      transactionId,
      outputIndex: parseInt(outputIndex),
      address,
      amount: parseInt(amount),
      scriptPubKey: scriptPubKey || `OP_DUP OP_HASH160 ${address} OP_EQUALVERIFY OP_CHECKSIG`,
      isSpent: false
    };

    const createdUTXO = await UTXORepository.create(utxoData);

    return NextResponse.json({
      success: true,
      utxo: createdUTXO,
      message: 'UTXO created successfully'
    });

  } catch (error) {
    console.error('Error creating UTXO:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create UTXO',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
