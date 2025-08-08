import { BLOCKCHAIN_CONFIG } from "@/constants";

export interface ITransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  signature: string;
  data?: any;
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