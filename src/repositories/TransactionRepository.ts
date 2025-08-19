import { Transaction } from '../blockchain/structure/transaction';
import { ITransaction, ITransactionInput, ITransactionOutput } from '@/types/blocks';
import { ISearchableRepository } from './base/IRepository';
import { openDB } from '../../database/connect';

interface DBTransactionInput {
  previousTransactionId: string;
  previousOutputIndex: number;
  scriptSig: string;
  publicKey: string;
}

interface DBTransactionOutput {
  address: string;
  amount: number;
  scriptPubKey: string;
}

export interface ITransactionRepository extends ISearchableRepository<ITransaction, string> {
  findByBlockId(blockId: string): Promise<ITransaction[]>;
  findByAddress(address: string): Promise<ITransaction[]>;
  findByType(type: 'coinbase' | 'regular'): Promise<ITransaction[]>;
  getTransactionInputs(transactionId: string): Promise<DBTransactionInput[]>;
  getTransactionOutputs(transactionId: string): Promise<DBTransactionOutput[]>;
  createWithInputsOutputs(transaction: ITransaction): Promise<ITransaction>;
}

export class TransactionRepository implements ITransactionRepository {
  private db: any = null;

  private async getDb() {
    if (!this.db) {
      this.db = await openDB();
    }
    return this.db;
  }

  async findById(id: string): Promise<ITransaction | null> {
    const db = await this.getDb();
    const row = await db.get('SELECT * FROM transactions WHERE id = ?', id);
    
    if (!row) return null;

    const inputs = await this.getTransactionInputs(id);
    const outputs = await this.getTransactionOutputs(id);

    return this.mapRowToTransaction(row, inputs, outputs);
  }

  async findAll(): Promise<ITransaction[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT * FROM transactions ORDER BY created_at DESC');
    
    const transactions = [];
    for (const row of rows) {
      const inputs = await this.getTransactionInputs(row.id);
      const outputs = await this.getTransactionOutputs(row.id);
      transactions.push(this.mapRowToTransaction(row, inputs, outputs));
    }
    
    return transactions;
  }

  async create(transaction: ITransaction): Promise<ITransaction> {
    return this.createWithInputsOutputs(transaction);
  }

  async createWithInputsOutputs(transaction: ITransaction): Promise<ITransaction> {
    const db = await this.getDb();

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Insert main transaction record
      await db.run(
        `INSERT INTO transactions 
         (id, block_id, type, fee, signature, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        transaction.id,
        null, // blockId not in current Transaction interface
        'regular', // default type
        transaction.fee,
        null // signature not in current Transaction interface
      );

      // Insert transaction inputs
      for (let i = 0; i < transaction.inputs.length; i++) {
        const input = transaction.inputs[i];
        await db.run(
          `INSERT INTO transaction_inputs 
           (transaction_id, input_index, previous_transaction_id, previous_output_index, script_sig, public_key) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          transaction.id,
          i,
          input.previousTransactionId,
          input.outputIndex,
          input.scriptSig || '',
          '' // publicKey not in current ITransactionInput interface
        );
      }

      // Insert transaction outputs
      for (let i = 0; i < transaction.outputs.length; i++) {
        const output = transaction.outputs[i];
        await db.run(
          `INSERT INTO transaction_outputs 
           (transaction_id, output_index, address, amount, script_pub_key) 
           VALUES (?, ?, ?, ?, ?)`,
          transaction.id,
          i,
          output.address,
          output.amount,
          output.scriptPubKey || ''
        );
      }

      await db.run('COMMIT');
      return transaction;

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  async update(id: string, transaction: Partial<ITransaction>): Promise<ITransaction | null> {
    const db = await this.getDb();
    const existing = await this.findById(id);
    
    if (!existing) return null;

    const updated = { ...existing, ...transaction };
    
    await db.run(
      `UPDATE transactions SET 
       fee = ?
       WHERE id = ?`,
      updated.fee,
      id
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.getDb();

    await db.run('BEGIN TRANSACTION');
    
    try {
      await db.run('DELETE FROM transaction_inputs WHERE transaction_id = ?', id);
      await db.run('DELETE FROM transaction_outputs WHERE transaction_id = ?', id);
      const result = await db.run('DELETE FROM transactions WHERE id = ?', id);
      
      await db.run('COMMIT');
      return result.changes > 0;

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    const db = await this.getDb();
    const row = await db.get('SELECT 1 FROM transactions WHERE id = ? LIMIT 1', id);
    return !!row;
  }

  async findBy(criteria: Partial<ITransaction>): Promise<ITransaction[]> {
    const db = await this.getDb();
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (criteria.from) {
      query += ' AND id IN (SELECT transaction_id FROM transaction_inputs WHERE public_key LIKE ?)';
      params.push(`%${criteria.from}%`);
    }

    if (criteria.to) {
      query += ' AND id IN (SELECT transaction_id FROM transaction_outputs WHERE address = ?)';
      params.push(criteria.to);
    }

    if (criteria.amount !== undefined) {
      query += ' AND id IN (SELECT transaction_id FROM transaction_outputs WHERE amount = ?)';
      params.push(criteria.amount);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await db.all(query, ...params);
    
    const transactions = [];
    for (const row of rows) {
      const inputs = await this.getTransactionInputs(row.id);
      const outputs = await this.getTransactionOutputs(row.id);
      transactions.push(this.mapRowToTransaction(row, inputs, outputs));
    }
    
    return transactions;
  }

  async count(criteria?: Partial<ITransaction>): Promise<number> {
    const db = await this.getDb();
    let query = 'SELECT COUNT(*) as count FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (criteria?.from) {
      query += ' AND id IN (SELECT transaction_id FROM transaction_inputs WHERE public_key LIKE ?)';
      params.push(`%${criteria.from}%`);
    }

    if (criteria?.to) {
      query += ' AND id IN (SELECT transaction_id FROM transaction_outputs WHERE address = ?)';
      params.push(criteria.to);
    }

    const row = await db.get(query, ...params);
    return row.count;
  }

  async findByBlockId(blockId: string): Promise<ITransaction[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT * FROM transactions WHERE block_id = ? ORDER BY created_at DESC', blockId);
    
    const transactions = [];
    for (const row of rows) {
      const inputs = await this.getTransactionInputs(row.id);
      const outputs = await this.getTransactionOutputs(row.id);
      transactions.push(this.mapRowToTransaction(row, inputs, outputs));
    }
    
    return transactions;
  }

  async findByAddress(address: string): Promise<ITransaction[]> {
    const db = await this.getDb();
    
    // Find transactions where the address appears in inputs or outputs
    const query = `
      SELECT DISTINCT t.*
      FROM transactions t
      LEFT JOIN transaction_inputs ti ON t.id = ti.transaction_id
      LEFT JOIN transaction_outputs to ON t.id = to.transaction_id
      WHERE ti.public_key LIKE ? OR to.address = ?
      ORDER BY t.created_at DESC
    `;
    
    const rows = await db.all(query, `%${address}%`, address);
    
    const transactions = [];
    for (const row of rows) {
      const inputs = await this.getTransactionInputs(row.id);
      const outputs = await this.getTransactionOutputs(row.id);
      transactions.push(this.mapRowToTransaction(row, inputs, outputs));
    }
    
    return transactions;
  }

  async findByType(type: 'coinbase' | 'regular'): Promise<ITransaction[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC', type);
    
    const transactions = [];
    for (const row of rows) {
      const inputs = await this.getTransactionInputs(row.id);
      const outputs = await this.getTransactionOutputs(row.id);
      transactions.push(this.mapRowToTransaction(row, inputs, outputs));
    }
    
    return transactions;
  }

  async getTransactionInputs(transactionId: string): Promise<DBTransactionInput[]> {
    const db = await this.getDb();
    const rows = await db.all(
      'SELECT * FROM transaction_inputs WHERE transaction_id = ? ORDER BY input_index',
      transactionId
    );
    
    return rows.map((row: any) => ({
      previousTransactionId: row.previous_transaction_id,
      previousOutputIndex: row.previous_output_index,
      scriptSig: row.script_sig,
      publicKey: row.public_key
    }));
  }

  async getTransactionOutputs(transactionId: string): Promise<DBTransactionOutput[]> {
    const db = await this.getDb();
    const rows = await db.all(
      'SELECT * FROM transaction_outputs WHERE transaction_id = ? ORDER BY output_index',
      transactionId
    );
    
    return rows.map((row: any) => ({
      address: row.address,
      amount: row.amount,
      scriptPubKey: row.script_pub_key
    }));
  }

  private mapRowToTransaction(row: any, inputs: DBTransactionInput[], outputs: DBTransactionOutput[]): ITransaction {
    // Map DB inputs to ITransactionInput
    const transactionInputs: ITransactionInput[] = inputs.map(input => ({
      previousTransactionId: input.previousTransactionId,
      outputIndex: input.previousOutputIndex,
      scriptSig: input.scriptSig
    }));

    // Map DB outputs to ITransactionOutput  
    const transactionOutputs: ITransactionOutput[] = outputs.map(output => ({
      address: output.address,
      amount: output.amount,
      scriptPubKey: output.scriptPubKey
    }));

    // Create a transaction-like object that matches ITransaction
    return {
      id: row.id,
      from: transactionInputs.length > 0 ? 'multiple_inputs' : '',
      to: transactionOutputs.length > 0 ? transactionOutputs[0].address : '',
      amount: transactionOutputs.reduce((sum, output) => sum + output.amount, 0),
      fee: row.fee || 0,
      timestamp: new Date(row.created_at).getTime(),
      inputs: transactionInputs,
      outputs: transactionOutputs,
      size: JSON.stringify({ inputs: transactionInputs, outputs: transactionOutputs }).length
    };
  }
}
