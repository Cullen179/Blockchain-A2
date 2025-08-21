import { UTXORepository } from '@/repositories';
import { WalletRepository } from '@/repositories/WalletRepository';
import {
    ITransaction,
    ITransactionInput,
    ITransactionOutput,
} from '@/types/blocks';
import crypto from 'crypto';

export class Transaction {
    //  public id: string;
    // public from: string;
    // public to: string;
    // public amount: number;
    // public fee: number;
    // public timestamp: number;
    // public inputs: ITransactionInput[];
    // public outputs: ITransactionOutput[];
    // public size: number;

    // constructor(
    //   from: string,
    //   to: string,
    //   amount: number,
    //   fee: number = 1,
    //   inputs: ITransactionInput[] = [],
    //   outputs: ITransactionOutput[] = []
    // ) {
    //   this.from = from;
    //   this.to = to;
    //   this.amount = amount;
    //   this.fee = fee;
    //   this.timestamp = Date.now();
    //   this.inputs = inputs;
    //   this.outputs = outputs;
    //   this.id = this.generateTransactionId();
    //   this.size = this.calculateSize();
    // }
    static createTransactionHash(transaction: ITransaction): string {
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

        return JSON.stringify(transactionData);
    }

    static async createTransaction(
        transaction: ITransaction
    ): Promise<ITransaction> {
      // verify transaction
        const isValid = await this.verifyTransaction(transaction);
        if (!isValid.success) {
            throw new Error('Transaction verification failed');
        }

      // Create Transaction outputs
      transaction.outputs = [
          {
              amount: transaction.amount,
              scriptPubKey: `OP_DUP OP_HASH160 ${transaction.to} OP_EQUALVERIFY OP_CHECKSIG`,
              address: transaction.to,
        },
      ];

      if (isValid.change > 0) {
          transaction.outputs.push({
              amount: isValid.change,
              scriptPubKey: `OP_DUP OP_HASH160 ${transaction.from} OP_EQUALVERIFY OP_CHECKSIG`,
              address: transaction.from,
          });
      }

      // Create transaction ID and size
      transaction.id = crypto
            .createHash('sha256')
            .update(JSON.stringify(transaction))
            .digest('hex');
        transaction.size = Buffer.byteLength(
            JSON.stringify(transaction),
            'utf8'
        );

        // Set timestamp
      transaction.timestamp = Date.now();
        transaction.size = Buffer.byteLength(JSON.stringify(transaction), 'utf8');

        // Return the created transaction
        return transaction;
    }

    static async verifyTransaction(
        transaction: ITransaction
    ): Promise<{
        success: boolean;
        change: number;
    }> {
        // Verify sender and recipient addresses
        const senderWallet = await WalletRepository.findByAddress(
            transaction.from
        );
        if (!senderWallet) {
            console.error(
                `Sender wallet not found for address: ${transaction.from}`
            );
            throw new Error(
                `Sender wallet not found for address: ${transaction.from}`
            );
        }

        const recipientWallet = await WalletRepository.findByAddress(
            transaction.to
        );
        if (!recipientWallet) {
            console.error(
                `Recipient wallet not found for address: ${transaction.to}`
            );
            throw new Error(
                `Recipient wallet not found for address: ${transaction.to}`
            );
        }

        // Validate transaction inputs
        const areInputsValid =
            await this.validateTransactionInputs(transaction);
        if (!areInputsValid.success) {
            console.error(`Transaction inputs are invalid`);
            throw new Error(`Transaction inputs are invalid`);
        }

      return {
            success: true,
            change: areInputsValid.change,
        };
    }

    /**
     * Validate transaction inputs against UTXO repository
     */
    static async validateTransactionInputs(
        transaction: ITransaction
    ): Promise<{
        success: boolean;
        change: number;
    }> {
        // get sender public key from wallet repository
        const wallet = await WalletRepository.findByAddress(transaction.from);
        if (!wallet) {
            console.error(`Sender wallet not found`);
            throw new Error(`Sender wallet not found`);
        }

        const publicKey = wallet.publicKey;

        let totalInputValue = 0;
        for (const input of transaction.inputs) {
            // Check database using repository
            const dbUTXO = await UTXORepository.getByTransactionAndOutput(
                input.previousTransactionId,
                input.outputIndex
            );

            if (!dbUTXO || dbUTXO.isSpent) {
                console.error(`UTXO not found or already spent`);
                throw new Error(`UTXO not found or already spent`);
            }
            totalInputValue += dbUTXO.amount;

            // Validate UTXO address matches input address
            if (
                this.verifyInputSignature(transaction, input, publicKey) ===
                false
            ) {
                console.error(`Invalid input signature for UTXO`);
                throw new Error(`Invalid input signature for UTXO`);
            }
            // totalInputValue += dbUTXO.amount;
        }

        // Ensure total input value is sufficient
        if (totalInputValue < transaction.amount + transaction.fee) {
            console.error(`Insufficient balance for transaction from`);
            throw new Error(`Insufficient balance for transaction`);
        }

      return {
            success: true,
            change: totalInputValue - transaction.amount - transaction.fee,
        };
    }

    /**
     * Verify the signature of a transaction input
     */
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

        const isValid = verify.verify(publicKey, input.scriptSig, 'hex');

        return isValid;
    }

    // /**
    //  * Generate a unique transaction ID based on transaction contents
    //  */
    // private generateTransactionId(): string {
    //   const transactionData = JSON.stringify({
    //     from: this.from,
    //     to: this.to,
    //     amount: this.amount,
    //     fee: this.fee,
    //     timestamp: this.timestamp,
    //     inputs: this.inputs.map(input => ({
    //       previousTransactionId: input.previousTransactionId,
    //       outputIndex: input.outputIndex
    //     })),
    //     outputs: this.outputs
    //   });

    //   return crypto.createHash('sha256').update(transactionData).digest('hex');
    // }

    // /**
    //  * Calculate the size of the transaction in bytes
    //  */
    // public calculateSize(): number {
    //   const transactionString = JSON.stringify(this);
    //   return Buffer.byteLength(transactionString, 'utf8');
    // }
}
