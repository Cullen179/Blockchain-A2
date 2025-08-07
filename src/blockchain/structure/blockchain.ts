import { IBlockchain } from "@/types";
import { IBlock, ITransaction } from "@/types/blocks";
import { Block } from "./block";
import { BLOCKCHAIN_CONFIG } from "@/constants";

export class Blockchain implements IBlockchain {
  public chain: Block[] = [];
  public difficulty: number = 4;
  public pendingTransactions: ITransaction[] = [];
  public miningReward: number = 50;
  public consensusType: string = BLOCKCHAIN_CONFIG.CONSENSUS.POW;

  constructor() {
    // Initialize with genesis block
    this.chain.push(this.createGenesisBlock());
  }

    /**
     * Creates the genesis block for the blockchain
     */
    private createGenesisBlock(): Block {
        const genesisHeader = {
            index: 0,
            timestamp: 1609459200000, // Jan 1, 2021
            previousHash: '0',
            merkleRoot: '0'.repeat(64),
            nonce: 0,
            difficulty: this.difficulty
        };

        return new Block(genesisHeader, [], 'genesis-validator', 'genesis-signature');
    }
    /**
     * Adds a new block to the blockchain
     * @param block The block to add
     * @return True if the block was added successfully, false otherwise
     * */
    public addBlock(block: Block): boolean {
        if (!this.isValidNewBlock(block)) {
            return false;
        }

        this.chain.push(block);
        this.pendingTransactions = [];
        return true;
    }

    /**
     * Validates a new block before adding it to the chain
     * @param block The block to validate
     * @return True if the block is valid, false otherwise
     * */
    private isValidNewBlock(block: Block): boolean {
        const lastBlock = this.chain[this.chain.length - 1];
        // Check if the block is valid
        const isValidNewBlock = block.isValid(lastBlock);

        return isValidNewBlock;
    }
    
    /**
     * Returns the latest block in the blockchain
     * @return The latest block
     */
    public getLatestBlock(): IBlock {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Returns the entire blockchain
     * @return The blockchain as an array of blocks
     */
    public getBlockchain(): IBlock[] {
        return this.chain;
    }
    /**
     * Returns the current difficulty level
     * @return The current difficulty
     */
    public getCurrentDifficulty(): number {
        return this.getLatestBlock().header.difficulty;
    }

    /**
     * Returns the current consensus type
     * @return The current consensus type
     */
    public getConsensusType(): string {
        return this.consensusType;
    }

    /**
     * Returns the current mining reward
     * @return The current mining reward
     */

    public getMiningReward(): number {
        return this.miningReward;
    }
    /**
     * Returns the pending transactions
     * @return The pending transactions
     */
    public getPendingTransactions(): ITransaction[] {
        return this.pendingTransactions;
    }
    /**
     * Returns the blockchain as a JSON string
     * @return The blockchain in JSON format
     */
    public toJSON(): string {
        return JSON.stringify(this.chain);
    }
}

