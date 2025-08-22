import crypto from 'crypto';
import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { WalletRepository } from '@/repositories/WalletRepository';
import { ITransaction, IWallet } from '@/types/blocks';
import { Wallet } from '@/blockchain/structure/wallet';
import { Transaction } from '@/blockchain/structure/transaction';

// Validation schema for the request body
const signTransactionSchema = z.object({
  transaction: z.object({
    id: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    amount: z.number().positive(),
    fee: z.number().min(0),
    timestamp: z.number().optional(),
    inputs: z.array(
      z.object({
        previousTransactionId: z.string(),
        outputIndex: z.number().min(0),
        scriptSig: z.string(),
      })
    ),
    outputs: z
      .array(
        z.object({
          address: z.string(),
          amount: z.number().positive(),
          scriptPubKey: z.string(),
        })
      )
      .optional(),
  }),
  privateKey: z.string().optional(), // Optional if we fetch from wallet
  walletAddress: z.string().optional(), // Alternative: get private key from wallet
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: {
      transaction: ITransaction;
      privateKey?: string;
      walletAddress?: string;
    } = await request.json();
    const { transaction, privateKey, walletAddress } = body;

    let wallet: IWallet | null = null;
    if (walletAddress) {
      // Fetch private key from wallet repository
      wallet = await WalletRepository.findByAddress(walletAddress);
      if (!wallet) {
        return NextResponse.json(
          {
            success: false,
            error: 'Wallet not found',
            message: `No wallet found with address: ${walletAddress}`,
          },
          { status: 404 }
        );
      }
    }

    if (!privateKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing private key',
          message: 'Either privateKey or walletAddress must be provided',
        },
        { status: 400 }
      );
    }

    // Use the same method as verification for consistency
    const signedTransaction = Wallet.signTransaction(transaction, privateKey);

    return NextResponse.json({
      success: true,
      signedTransaction: signedTransaction,
      message: 'Transaction signed successfully',
    });
  } catch (error) {
    console.error('Error signing transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Invalid request data',
      },
      { status: 400 }
    );
  }
}

// Optional: GET method to retrieve signing information
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing wallet address',
        message: 'walletAddress query parameter is required',
      },
      { status: 400 }
    );
  }

  try {
    // Check if wallet exists (without exposing private key)
    const wallet = await WalletRepository.findByAddress(walletAddress);

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found',
          message: `No wallet found with address: ${walletAddress}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        balance: wallet.balance,
        // Never expose private key in GET requests
        canSign: true,
      },
      message: 'Wallet can be used for signing',
    });
  } catch (error) {
    console.error('Error checking wallet for signing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check wallet',
      },
      { status: 500 }
    );
  }
}
