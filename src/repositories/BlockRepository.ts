import { prisma } from "@/lib/prisma";
import { IBlock, IBlockHeader, ITransaction } from "@/types/blocks";
import { TransactionRepository } from "./TransactionRepository";

export interface IBlockchain {
  id: string;
  difficulty: number;
  createdAt: Date;
  updatedAt: Date;
  blocks?: IBlock[];
}

export class BlockRepository {
  /**
   * Convert Prisma block to IBlock format
   */
  private static formatBlock(block: any): IBlock {
    return {
      hash: block.hash,
      header: {
        index: block.index,
        timestamp: block.timestamp,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        nonce: block.nonce,
        difficulty: block.blockchain?.difficulty || 4, // Default difficulty if not available
      },
      transactions: block.transactions?.map((tx: any) => ({
        id: tx.id,
        from: tx.from,
        to: tx.to,
        amount: Number(tx.amount),
        fee: Number(tx.fee),
        timestamp: Number(tx.timestamp),
        size: Number(tx.size),
        inputs: tx.inputs?.map((input: any) => ({
          previousTransactionId: input.previousTransactionId,
          outputIndex: Number(input.outputIndex),
          scriptSig: input.scriptSig,
        })) || [],
        outputs: tx.outputs?.map((output: any) => ({
          amount: Number(output.amount),
          address: output.address,
          scriptPubKey: output.scriptPubKey,
        })) || [],
      })) || [],
      size: block.size,
      transactionCount: block.transactions?.length || 0,
      nonce: block.nonce,
      timestamp: block.timestamp,
      merkleRoot: block.merkleRoot,
    };
  }

  /**
   * Create a new blockchain
   */
  static async createBlockchain(difficulty: number = 4): Promise<IBlockchain> {
    try {
      const blockchain = await prisma.blockchain.create({
        data: {
          difficulty,
        },
        include: {
          blocks: {
            orderBy: { index: 'asc' },
            include: {
              transactions: {
                include: {
                  inputs: true,
                  outputs: true,
                },
              },
            },
          },
        },
      });

      return {
        id: blockchain.id,
        difficulty: blockchain.difficulty,
        createdAt: blockchain.createdAt,
        updatedAt: blockchain.updatedAt,
        blocks: blockchain.blocks?.map(block => this.formatBlock({ ...block, blockchain })),
      };
    } catch (error) {
      console.error('Error creating blockchain:', error);
      throw new Error('Failed to create blockchain');
    }
  }

  /**
   * Get blockchain by ID
   */
  static async getBlockchainById(id: string): Promise<IBlockchain | null> {
    try {
      const blockchain = await prisma.blockchain.findUnique({
        where: { id },
        include: {
          blocks: {
            orderBy: { index: 'asc' },
            include: {
              transactions: {
                include: {
                  inputs: true,
                  outputs: true,
                },
              },
            },
          },
        },
      });

      if (!blockchain) return null;

      return {
        id: blockchain.id,
        difficulty: blockchain.difficulty,
        createdAt: blockchain.createdAt,
        updatedAt: blockchain.updatedAt,
        blocks: blockchain.blocks?.map(block => this.formatBlock({ ...block, blockchain })),
      };
    } catch (error) {
      console.error('Error fetching blockchain:', error);
      throw new Error('Failed to fetch blockchain');
    }
  }

  /**
   * Get the default (first) blockchain
   */
  static async getDefaultBlockchain(): Promise<IBlockchain | null> {
    try {
      const blockchain = await prisma.blockchain.findFirst({
        include: {
          blocks: {
            orderBy: { index: 'desc' },
            include: {
              transactions: {
                include: {
                  inputs: true,
                  outputs: true,
                },
              },
            },
          },
        },
      });

      if (!blockchain) return null;

      return {
        id: blockchain.id,
        difficulty: blockchain.difficulty,
        createdAt: blockchain.createdAt,
        updatedAt: blockchain.updatedAt,
        blocks: blockchain.blocks?.map(block => this.formatBlock({ ...block, blockchain })),
      };
    } catch (error) {
      console.error('Error fetching default blockchain:', error);
      throw new Error('Failed to fetch default blockchain');
    }
  }

  /**
   * Add a block to a blockchain
   */
  static async addBlockToBlockchain(
    transactions: ITransaction[],
    blockData: {
      hash: string;
      index: number;
      previousHash: string;
      merkleRoot: string;
      timestamp: number;
      nonce: number;
      size: number;
    }, tx: any
  ): Promise<IBlock> {
    try {
      const blockchain = await this.getDefaultBlockchain();

      if (!blockchain) {
        throw new Error('Blockchain not found');
      }
      
      const block = await tx.block.create({
        data: {
          ...blockData,
          blockchainId: blockchain.id,
        },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
          },
          blockchain: true,
        },
      });
      
      // update the transactions blockhash
      await Promise.all(
        transactions.map(async (transaction: ITransaction) =>
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { blockHash: block.hash },
          })
        )
      );


      return this.formatBlock(block);
    } catch (error) {
      console.error('Error adding block to blockchain:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add block to blockchain');
    }
  }

  /**
   * Get block by hash
   */
  static async getBlockByHash(hash: string): Promise<IBlock | null> {
    try {
      const block = await prisma.block.findUnique({
        where: { hash },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
          },
          blockchain: true,
        },
      });

      if (!block) return null;

      return this.formatBlock(block);
    } catch (error) {
      console.error('Error fetching block:', error);
      throw new Error('Failed to fetch block');
    }
  }

  /**
   * Get all blocks in a blockchain
   */
  static async getBlocksByBlockchainId(blockchainId: string): Promise<IBlock[]> {
    try {
      const blocks = await prisma.block.findMany({
        where: { blockchainId },
        orderBy: { index: 'asc' },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
          },
          blockchain: true,
        },
      });

      return blocks.map(block => this.formatBlock(block));
    } catch (error) {
      console.error('Error fetching blocks:', error);
      throw new Error('Failed to fetch blocks');
    }
  }

  /**
   * Get the latest block in a blockchain
   */
  static async getLatestBlock(blockchainId: string): Promise<IBlock | null> {
    try {
      const block = await prisma.block.findFirst({
        where: { blockchainId },
        orderBy: { index: 'desc' },
        include: {
          transactions: {
            include: {
              inputs: true,
              outputs: true,
            },
          },
          blockchain: true,
        },
      });

      if (!block) return null;

      return this.formatBlock(block);
    } catch (error) {
      console.error('Error fetching latest block:', error);
      throw new Error('Failed to fetch latest block');
    }
  }

  /**
   * Update blockchain difficulty
   */
  static async updateBlockchainDifficulty(blockchainId: string, difficulty: number): Promise<IBlockchain> {
    try {
      const blockchain = await prisma.blockchain.update({
        where: { id: blockchainId },
        data: { difficulty },
        include: {
          blocks: {
            orderBy: { index: 'asc' },
          },
        },
      });

      return {
        id: blockchain.id,
        difficulty: blockchain.difficulty,
        createdAt: blockchain.createdAt,
        updatedAt: blockchain.updatedAt,
      };
    } catch (error) {
      console.error('Error updating blockchain difficulty:', error);
      throw new Error('Failed to update blockchain difficulty');
    }
  }

  static async adjustDifficulty(
    increase: boolean = false,
    tx: any
  ): Promise<void> {
    try {
      const blockchain = await this.getDefaultBlockchain();
      if (!blockchain) {
        throw new Error('Blockchain not found');
      }

      const newDifficulty = increase ? Math.min(10, blockchain.difficulty + 1) : Math.max(1, blockchain.difficulty - 1);
      await tx.blockchain.update({
        where: { id: blockchain.id },
        data: { difficulty: newDifficulty },
      });

    } catch (error) {
      console.error('Error adjusting difficulty:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to adjust difficulty');
    }
  }
}


