import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { UTXORepository } from '@/repositories/UTXORepository';
import { WalletRepository } from '@/repositories/WalletRepository';
import { ITransaction, ITransactionInput, IUTXO, IUTXOSet } from '@/types/blocks';
import crypto from 'crypto';

export class UTXOManager {
  /**
   * Add UTXOs from a new transaction's outputs (to both memory and database)
   */
  static async addUTXOs(transaction: ITransaction): Promise<void> {
    // Create UTXOs using repository
    for (let index = 0; index < transaction.outputs.length; index++) {
      const output = transaction.outputs[index];
      const utxo: IUTXO = {
        transactionId: transaction.id,
        outputIndex: index,
        address: output.address,
        amount: output.amount,
        scriptPubKey: output.scriptPubKey,
        isSpent: false,
      };

      // Save to database via repository
      await UTXORepository.create(utxo);
    }
  }

  static async createUTXO(request: NextRequest) {
    try {
      const body = await request.json();

      // Validate required fields
      const { transactionId, outputIndex, address, amount, scriptPubKey } =
        body;

      if (!transactionId || outputIndex === undefined || !address || !amount) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields',
            message:
              'transactionId, outputIndex, address, and amount are required',
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
        scriptPubKey:
          scriptPubKey ||
          `OP_DUP OP_HASH160 ${address} OP_EQUALVERIFY OP_CHECKSIG`,
        isSpent: false,
      };

      let createdUTXO: IUTXO | null = null;

      await prisma.$transaction(async (tx) => {
        try {
          createdUTXO = await UTXORepository.create(utxoData, tx);
        } catch (error) {
          throw new Error('Failed to create UTXO in database');
        }

        // update wallet balance if address exists
        try {
          await WalletRepository.syncBalance(address, tx);
        } catch (error) {
          throw new Error('Failed to update wallet balance');
        }
      }
    );

      return NextResponse.json({
        success: true,
        utxo: createdUTXO,
        message: 'UTXO created successfully',
      });
    } catch (error) {
      console.error('Error creating UTXO:', error);
      return NextResponse.json(
        {
          success: false,
          error:  error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Remove UTXOs that are spent by transaction inputs (from both memory and database)
   */
  static async removeUTXOs(transaction: ITransaction): Promise<IUTXO[]> {
    const spentUTXOs: IUTXO[] = [];

    for (const input of transaction.inputs) {
      // Fetch UTXO from database
      const utxo = await UTXORepository.getByTransactionAndOutput(
        input.previousTransactionId,
        input.outputIndex
      );

      if (utxo && !utxo.isSpent) {
        spentUTXOs.push(utxo);

        // Mark as spent in database using repository
        await UTXORepository.markAsSpent(
          input.previousTransactionId,
          input.outputIndex
        );
      }
    }

    return spentUTXOs;
  }

  /**
   * Process a complete transaction (remove spent UTXOs, add new UTXOs)
   */
  static async processTransaction(transaction: ITransaction): Promise<boolean> {
    // First validate that all inputs exist and can be spent
    if (!(await this.validateTransactionInputs(transaction))) {
      return false;
    }

    // Remove spent UTXOs (from both memory and database)
    await this.removeUTXOs(transaction);

    // Add new UTXOs to recipients and changes to sender (to both memory and database)
    await this.addUTXOs(transaction);

    return true;
  }

  /**
   * Validate that all transaction inputs exist and are unspent
   */
  static async validateTransactionInputs(
    transaction: ITransaction
  ): Promise<boolean> {

    // get sender public key from wallet repository
    const wallet = await WalletRepository.findByAddress(transaction.from);
    if (!wallet) {
      console.error(`Sender wallet not found`);
      throw new Error(`Sender wallet not found`);
    }

    const publicKey = wallet.publicKey;

    for (const input of transaction.inputs) {
      // Check database using repository
      const dbUTXO = await UTXORepository.getByTransactionAndOutput(
        input.previousTransactionId,
        input.outputIndex
      );

      if (!dbUTXO || dbUTXO.isSpent) {
        console.error(
          `UTXO not found or already spent`
        );
        throw new Error(`UTXO not found or already spent`);
      }

      // Validate UTXO address matches input address

      if (this.verifyInputSignature(transaction, input, publicKey) === false) {
        console.error(
          `Invalid input signature for UTXO`
        );
        throw new Error(`Invalid input signature for UTXO`);
      }
      // totalInputValue += dbUTXO.amount;
    }

    return true;
  }

  static verifyInputSignature(
    transaction: ITransaction,
    input: ITransactionInput,
    publicKey: string
  ): boolean {
    
    // Get the same raw serialized data used for signing
    const transactionData = this.createTransactionHash(transaction);
    
    const verify = crypto.createVerify('SHA256');
    verify.update(transactionData); // Use the raw serialized data
    verify.end();

    const isValid = verify.verify(
      publicKey,
      input.scriptSig,
      'hex'
    );
    
    return isValid;
  }

  static createTransactionHash(
    transaction: ITransaction
  ): string {
     const transactionData = {
       id: '',
       from: transaction.from,
       to: transaction.to,
       amount: transaction.amount,
       fee: transaction.fee,
       inputs: transaction.inputs.map((input) => ({
         previousTransactionId: input.previousTransactionId,
         outputIndex: input.outputIndex,
         scriptSig: '',
       })),
     }
     // Return the serialized data directly, not the hash
     // Both signing and verification should use the same raw data
     return JSON.stringify(transactionData);
  }

  /**
   * Get all UTXOs for a specific address (from database for accuracy)
   */
  static async getUTXOsForAddress(address: string): Promise<IUTXO[]> {
    return await UTXORepository.findUnspentByAddress(address);
  }

  /**
   * Select UTXOs for spending (coin selection algorithm)
   */
  static async selectUTXOsForSpending(
    address: string,
    amount: number
  ): Promise<IUTXO[]> {
    const availableUTXOs = await this.getUTXOsForAddress(address);
    const selectedUTXOs: IUTXO[] = [];
    let totalSelected = 0;

    // Simple greedy selection (largest first)
    const sortedUTXOs = availableUTXOs.sort((a, b) => b.amount - a.amount);

    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalSelected += utxo.amount;

      if (totalSelected >= amount) {
        break;
      }
    }

    return totalSelected >= amount ? selectedUTXOs : [];
  }

  /**
   * Get current UTXO set statistics (from database for accuracy)
   */
  static async getUTXOSetStats(): Promise<IUTXOSet> {
    const dbUTXOs = await UTXORepository.getAllUnspent();

    const utxoMap = new Map<string, IUTXO>();
    let totalValue = 0;

    dbUTXOs.forEach((utxo) => {
      const utxoKey = `${utxo.transactionId}:${utxo.outputIndex}`;
      utxoMap.set(utxoKey, utxo);
      totalValue += utxo.amount;
    });

    return {
      utxos: utxoMap,
      totalAmount: totalValue,
    };
  }


  /**
   * Get the total balance for an address (from database)
   */
  static async getBalanceForAddress(address: string): Promise<number> {
    return await UTXORepository.getTotalValueByAddress(address);
  }
}
