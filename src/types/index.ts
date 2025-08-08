import { IBlock, ITransaction } from "./blocks";

export interface IBlockchain {
  chain: IBlock[];
  difficulty: number;
  pendingTransactions: ITransaction[];
  miningReward: number;
  consensusType: string;
}

export interface IBlockValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IHashVerificationResult {
  isValid: boolean;
  errors: string[];
  expectedHash: string;
  actualHash: string;
}

export interface IChainValidationResult {
  isValid: boolean;
  invalidBlocks: number[];
  errors: string[];
}

export interface IMiningResult {
  block: IBlock;
  nonce: number;
  hash: string;
  timeTaken: number;
}

export interface IMempool {
  transactions: ITransaction[];
  maxSize: number;
  currentSize: number;
  miningReward: number;
  consensusType: string;
  difficulty: number;
}
