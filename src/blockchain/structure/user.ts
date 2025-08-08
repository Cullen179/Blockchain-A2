import { createHash, createSign, createVerify, generateKeyPairSync } from 'crypto';
import { ITransaction } from '@/types/blocks';

export interface IUser {
  id: string;
  publicKey: string;
  balance: number;
  nonce: number;
  createdAt: number;
}

export class User implements IUser {
  public id: string;
  public publicKey: string;
  public balance: number;
  public nonce: number;
  public createdAt: number;
  private privateKey: string;
  private transactionHistory: ITransaction[];

  constructor(id: string, initialBalance: number = 0) {
    this.id = id;
    this.balance = initialBalance;
    this.nonce = 0;
    this.createdAt = Date.now();
    this.transactionHistory = [];
    
    // Generate key pair for digital signatures
    const keyPair = this.generateKeyPair();
    this.publicKey = keyPair.publicKey;
    this.privateKey = keyPair.privateKey;
  }

  /**
   * Generate a new key pair for the user
   */
  private generateKeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Sign a transaction with the user's private key
   */
  public signTransaction(transaction: Omit<ITransaction, 'signature'>): string {
    const transactionData = JSON.stringify({
      id: transaction.id,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
      data: transaction.data
    });

    const sign = createSign('SHA256');
    sign.update(transactionData);
    return sign.sign(this.privateKey, 'hex');
  }

  /**
   * Verify a transaction signature
   */
  public static verifySignature(transaction: ITransaction, publicKey: string): boolean {
    const transactionData = JSON.stringify({
      id: transaction.id,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
      data: transaction.data
    });

    const verify = createVerify('SHA256');
    verify.update(transactionData);
    return verify.verify(publicKey, transaction.signature, 'hex');
  }

  /**
   * Create a new transaction
   */
  public createTransaction(to: string, amount: number, fee: number, data?: any): ITransaction {
    if (this.balance < amount + fee) {
      throw new Error('Insufficient balance');
    }

    this.nonce++;
    
    const transaction: Omit<ITransaction, 'signature'> = {
      id: `tx_${this.id}_${this.nonce}_${Date.now()}`,
      from: this.id,
      to,
      amount,
      fee,
      timestamp: Date.now(),
      data
    };

    const signature = this.signTransaction(transaction);
    
    const signedTransaction: ITransaction = {
      ...transaction,
      signature
    };

    this.transactionHistory.push(signedTransaction);
    return signedTransaction;
  }

  /**
   * Update user balance (should only be called by blockchain)
   */
  public updateBalance(amount: number): void {
    this.balance += amount;
  }

  /**
   * Deduct balance for transaction (should only be called by blockchain)
   */
  public deductBalance(amount: number): boolean {
    if (this.balance >= amount) {
      this.balance -= amount;
      return true;
    }
    return false;
  }

  /**
   * Get user's transaction history
   */
  public getTransactionHistory(): ITransaction[] {
    return [...this.transactionHistory];
  }

  /**
   * Get user's public information (without private key)
   */
  public getPublicInfo(): IUser {
    return {
      id: this.id,
      publicKey: this.publicKey,
      balance: this.balance,
      nonce: this.nonce,
      createdAt: this.createdAt
    };
  }

  /**
   * Generate user address from public key
   */
  public getAddress(): string {
    const hash = createHash('sha256').update(this.publicKey).digest('hex');
    return hash.substring(0, 40); // Take first 40 characters as address
  }

  /**
   * Validate user data
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id || this.id.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!this.publicKey || this.publicKey.trim().length === 0) {
      errors.push('Public key is required');
    }

    if (this.balance < 0) {
      errors.push('Balance cannot be negative');
    }

    if (this.nonce < 0) {
      errors.push('Nonce cannot be negative');
    }

    if (this.createdAt <= 0) {
      errors.push('Created timestamp must be valid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a user from existing data (for deserialization)
   */
  public static fromData(userData: IUser & { privateKey?: string }): User {
    const user = new User(userData.id, userData.balance);
    user.nonce = userData.nonce;
    user.createdAt = userData.createdAt;
    user.publicKey = userData.publicKey;
    
    if (userData.privateKey) {
      user.privateKey = userData.privateKey;
    }
    
    return user;
  }

  /**
   * Serialize user data for storage
   */
  public serialize(): string {
    return JSON.stringify({
      id: this.id,
      publicKey: this.publicKey,
      balance: this.balance,
      nonce: this.nonce,
      createdAt: this.createdAt,
      transactionHistory: this.transactionHistory
    });
  }

  /**
   * Deserialize user data from storage
   */
  public static deserialize(data: string): User {
    const userData = JSON.parse(data);
    const user = User.fromData(userData);
    user.transactionHistory = userData.transactionHistory || [];
    return user;
  }
}