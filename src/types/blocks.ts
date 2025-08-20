import { BLOCKCHAIN_CONFIG } from "@/constants";

export interface ITransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  inputs: ITransactionInput[];
  outputs: ITransactionOutput[];
  size: number;
}

export interface IBlockHeader {
  index: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
}

export interface IBlock {
  header: IBlockHeader;
  hash: string;
  transactions: ITransaction[];
  size: number;
  transactionCount: number;
  nonce: number;
  timestamp: number;
  merkleRoot: string;
}

export interface IGenesisBlock extends Omit<IBlock, 'header'> {
  header: Omit<IBlockHeader, 'previousHash'> & { previousHash: '0' };
}

export interface IConsensusData {
  type: string;
  nonce: number;
  difficulty: number; 
}

export interface IUTXO {
  transactionId: string;
  outputIndex: number;
  amount: number;
  address: string;
  isSpent: boolean;
  scriptPubKey: string;
}

export interface IUTXOSet {
  utxos: Map<string, IUTXO>; // Keyed by transactionId:outputIndex
  totalAmount: number;
}

export interface ITransactionInput {
  previousTransactionId: string;
  outputIndex: number;
  scriptSig: string;
}

export interface ITransactionOutput {
  amount: number;
  scriptPubKey: string;
  address: string;
}

export interface IWallet {
  address: string;
  privateKey: string;
  publicKey: string;
  balance: number;
  utxos: IUTXO[] | [];
}