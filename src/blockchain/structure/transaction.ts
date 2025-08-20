import { ITransaction, ITransactionInput, ITransactionOutput } from "@/types/blocks";
import crypto from 'crypto';

export class Transaction {
   public id: string;
  public from: string;
  public to: string;
  public amount: number;
  public fee: number;
  public timestamp: number;
  public inputs: ITransactionInput[];
  public outputs: ITransactionOutput[];
  public size: number;

  constructor(
    from: string,
    to: string,
    amount: number,
    fee: number = 1,
    inputs: ITransactionInput[] = [],
    outputs: ITransactionOutput[] = []
  ) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.fee = fee;
    this.timestamp = Date.now();
    this.inputs = inputs;
    this.outputs = outputs;
    this.id = this.generateTransactionId();
    this.size = this.calculateSize();
  }

  /**
   * Generate a unique transaction ID based on transaction contents
   */
  private generateTransactionId(): string {
    const transactionData = JSON.stringify({
      from: this.from,
      to: this.to,
      amount: this.amount,
      fee: this.fee,
      timestamp: this.timestamp,
      inputs: this.inputs.map(input => ({
        previousTransactionId: input.previousTransactionId,
        outputIndex: input.outputIndex
      })),
      outputs: this.outputs
    });

    return crypto.createHash('sha256').update(transactionData).digest('hex');
  }

  /**
   * Calculate the size of the transaction in bytes
   */
  public calculateSize(): number {
    const transactionString = JSON.stringify(this);
    return Buffer.byteLength(transactionString, 'utf8');
  }
}