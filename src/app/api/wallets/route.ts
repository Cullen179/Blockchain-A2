import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Wallet } from '@/blockchain/structure/wallet';

export async function GET() {
  return await Wallet.getAllWallets();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, privateKey, publicKey, balance = 0 } = body;

    if (!address || !privateKey || !publicKey) {
      return NextResponse.json(
        { error: 'Address, privateKey, and publicKey are required' },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.create({
      data: {
        address,
        privateKey,
        publicKey,
        balance
      },
      include: {
        utxos: {
          where: { isSpent: false }
        }
      }
    });

    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}