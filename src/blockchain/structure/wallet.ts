import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { WalletRepository } from '@/repositories/WalletRepository';
import { ITransaction, IUTXO, IUTXOSet, IWallet } from '@/types/blocks';

import { Transaction } from './transaction';
import { UTXOManager } from './utxo';

export class Wallet {

  static async getAllWallets() {
    try {
      const wallets = await prisma.wallet.findMany({
        include: {
          utxos: {
            where: { isSpent: false },
          },
        },
      });

      return NextResponse.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wallets' },
        { status: 500 }
      );
    }
  }

  static async generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      const address = crypto
        .createHash('sha256')
        .update(publicKey)
        .digest('hex');

      return NextResponse.json({
        address,
        privateKey,
        publicKey,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate wallet' },
        { status: 500 }
      );
    }
  }

  static signTransaction(transaction: ITransaction, privateKey: string) {
    
      // Use the same method as verification for consistency
      const transactionData = Transaction.createTransactionHash(transaction);

      const sign = crypto.createSign('SHA256');
      sign.update(transactionData);
      sign.end();

      const signature = sign.sign(privateKey, 'hex');
      transaction.inputs.forEach(input => {
        input.scriptSig = signature;
      });
      return transaction;
  }
}
