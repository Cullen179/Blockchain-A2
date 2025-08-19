import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const wallets = await prisma.wallet.findMany({
      include: {
        utxos: {
          where: { isSpent: false }
        }
      }
    });

    // Transform to match IWallet interface
    const transformedWallets = wallets.map(wallet => ({
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      balance: wallet.balance,
      utxos: wallet.utxos.map(utxo => ({
        transactionId: utxo.transactionId,
        outputIndex: utxo.outputIndex,
        address: utxo.address,
        amount: utxo.amount,
        scriptPubKey: utxo.scriptPubKey,
        isSpent: utxo.isSpent
      }))
    }));

    return NextResponse.json(transformedWallets);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
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

    const transformedWallet = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      balance: wallet.balance,
      utxos: wallet.utxos.map(utxo => ({
        transactionId: utxo.transactionId,
        outputIndex: utxo.outputIndex,
        address: utxo.address,
        amount: utxo.amount,
        scriptPubKey: utxo.scriptPubKey,
        isSpent: utxo.isSpent
      }))
    };

    return NextResponse.json(transformedWallet, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}