import { BLOCKCHAIN_CONFIG } from "@/constants";

export class ProofOfWork {
  private difficulty: number;

  constructor(difficulty: number = BLOCKCHAIN_CONFIG.MINING.DEFAULT_DIFFICULTY) {
    this.difficulty = difficulty;
  }

  /**
   * Validate the proof of work for a given block
   * @param blockHash The hash of the block to validate
   * @returns True if the block hash meets the difficulty requirement, false otherwise
   */
  public validate(blockHash: string): boolean {
    const prefix = '0'.repeat(this.difficulty);
    return blockHash.startsWith(prefix);
  }

  /**
   * Adjust the difficulty based on the time taken to mine the last block
   * @param timeTaken The time taken to mine the last block in milliseconds
   * @returns The new difficulty level
   */
  public adjustDifficulty(timeTaken: number): number {

    if (timeTaken < BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET) {
      this.difficulty = Math.min(
        BLOCKCHAIN_CONFIG.MINING.MAX_DIFFICULTY,
        this.difficulty + 1
      );
    } else {
      this.difficulty = Math.max(
        BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY,
        this.difficulty - 1
      );
    }
    return this.difficulty;
  }

  public getDifficulty(): number {
    return this.difficulty;
  }
}