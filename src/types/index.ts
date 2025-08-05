import { Block, ConsensusType, Transaction } from "./blocks";

export interface IBlockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  consensusType: ConsensusType;
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
  block: Block;
  nonce: number;
  hash: string;
  timeTaken: number;
}