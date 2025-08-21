import crypto from 'crypto';



import { NextRequest, NextResponse } from "next/server";



import { prisma } from "@/lib/prisma";
import { WalletRepository } from "@/repositories/WalletRepository";
import { ITransaction, IUTXO, IUTXOSet, IWallet } from "@/types/blocks";



import { Transaction } from "./transaction";
import { UTXOManager } from "./utxo";





export class Wallet {
  // public address: string;
  // public privateKey: string;
  // public publicKey: string;
  // public balance: number;
  // public utxos: IUTXO[];

  // constructor(address: string, privateKey: string, publicKey: string, initialBalance: number = 0) {
  //   this.address = address;
  //   this.privateKey = privateKey;
  //   this.publicKey = publicKey;
  //   this.balance = initialBalance;
  //   this.utxos = [];
  // }

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

  static async signTransaction(request: NextRequest) {
    try {
      // Parse and validate request body
      const body: {
          transaction: ITransaction;
          privateKey?: string;
          walletAddress?: string;
      } = await request.json();
      const { transaction, privateKey, walletAddress } = body;

      const transactionData = {
          id: '',
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          fee: transaction.fee,
          inputs: transaction.inputs.map(input => ({
              previousTransactionId: input.previousTransactionId,
              outputIndex: input.outputIndex,
              scriptSig: '',
          })),
      };
      
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
      const txHash = UTXOManager.createTransactionHash(transaction);
      
      const sign = crypto.createSign('SHA256');
      sign.update(txHash);
      sign.end();
      
            
      const signature = sign.sign(privateKey, 'hex');
      transaction.inputs.forEach((input) => {
        input.scriptSig = signature;
      });
  
      return NextResponse.json({
        success: true,
        signedTransaction: transaction,
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
}