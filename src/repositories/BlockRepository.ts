import { IBlock, ITransaction } from '@/types/blocks';
import { ISearchableRepository } from './base/IRepository';
import { prisma } from '@/lib/prisma';
import { Block, Transaction, Prisma } from '../generated/prisma';

export interface IBlockRepository extends ISearchableRepository<IBlock, string> {
  findByIndex(index: number): Promise<IBlock | null>;
  findByHash(hash: string): Promise<IBlock | null>;
  findByRange(startIndex: number, endIndex: number): Promise<IBlock[]>;
  getLatestBlock(): Promise<IBlock | null>;
  getBlockHeight(): Promise<number>;
  getBlockTransactions(blockId: string): Promise<ITransaction[]>;
}

export class BlockRepository implements IBlockRepository {

  async findById(id: string): Promise<IBlock | null> {
    const block = await prisma.block.findUnique({
      where: { hash: id },
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      }
    });
    
    if (!block) return null;

    return this.mapBlockToInterface(block);
  }

  async findAll(): Promise<IBlock[]> {
    const blocks = await prisma.block.findMany({
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      },
      orderBy: { indexNum: 'desc' }
    });
    
    return blocks.map(this.mapBlockToInterface);
  }

  async create(block: IBlock): Promise<IBlock> {
    const createdBlock = await prisma.$transaction(async (tx) => {
      // Create block record
      const newBlock = await tx.block.create({
        data: {
          hash: block.hash,
          indexNum: block.header.index,
          previousHash: block.header.previousHash,
          merkleRoot: block.merkleRoot,
          timestamp: block.timestamp,
          nonce: block.nonce,
          difficulty: block.header.difficulty,
          transactionCount: block.transactionCount,
          size: block.size
        }
      });

      // Update transactions with block hash
      if (block.transactions.length > 0) {
        await tx.transaction.updateMany({
          where: {
            id: {
              in: block.transactions.map(t => t.id)
            }
          },
          data: {
            blockHash: block.hash
          }
        });
      }

      return newBlock;
    });

    // Return the full block with transactions
    return this.findById(createdBlock.hash) as Promise<IBlock>;
  }

  async update(id: string, blockData: Partial<IBlock>): Promise<IBlock | null> {
    const existing = await this.findById(id);
    
    if (!existing) return null;

    const updatedBlock = await prisma.block.update({
      where: { hash: id },
      data: {
        ...(blockData.hash && { hash: blockData.hash }),
        ...(blockData.merkleRoot && { merkleRoot: blockData.merkleRoot }),
        ...(blockData.timestamp && { timestamp: blockData.timestamp }),
        ...(blockData.nonce && { nonce: blockData.nonce }),
        ...(blockData.header?.difficulty && { difficulty: blockData.header.difficulty }),
        ...(blockData.transactionCount && { transactionCount: blockData.transactionCount }),
        ...(blockData.size && { size: blockData.size })
      },
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      }
    });

    return this.mapBlockToInterface(updatedBlock);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Remove block hash from transactions
        await tx.transaction.updateMany({
          where: { blockHash: id },
          data: { blockHash: null }
        });
        
        // Delete the block
        await tx.block.delete({
          where: { hash: id }
        });
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async exists(id: string): Promise<boolean> {
    const block = await prisma.block.findUnique({
      where: { hash: id },
      select: { hash: true }
    });
    return !!block;
  }

  async findBy(criteria: Partial<IBlock>): Promise<IBlock[]> {
    const where: Prisma.BlockWhereInput = {};

    if (criteria.hash) {
      where.hash = criteria.hash;
    }

    if (criteria.header?.index !== undefined) {
      where.indexNum = criteria.header.index;
    }

    if (criteria.header?.previousHash) {
      where.previousHash = criteria.header.previousHash;
    }

    const blocks = await prisma.block.findMany({
      where,
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      },
      orderBy: { indexNum: 'desc' }
    });
    
    return blocks.map(this.mapBlockToInterface);
  }

  async count(criteria?: Partial<IBlock>): Promise<number> {
    const where: Prisma.BlockWhereInput = {};

    if (criteria?.hash) {
      where.hash = criteria.hash;
    }

    if (criteria?.header?.index !== undefined) {
      where.indexNum = criteria.header.index;
    }

    return prisma.block.count({ where });
  }

  async findByIndex(index: number): Promise<IBlock | null> {
    const block = await prisma.block.findUnique({
      where: { indexNum: index },
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      }
    });
    
    if (!block) return null;
    return this.mapBlockToInterface(block);
  }

  async findByHash(hash: string): Promise<IBlock | null> {
    return this.findById(hash);
  }

  async findByRange(startIndex: number, endIndex: number): Promise<IBlock[]> {
    const blocks = await prisma.block.findMany({
      where: {
        indexNum: {
          gte: startIndex,
          lte: endIndex
        }
      },
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      },
      orderBy: { indexNum: 'asc' }
    });
    
    return blocks.map(this.mapBlockToInterface);
  }

  async getLatestBlock(): Promise<IBlock | null> {
    const block = await prisma.block.findFirst({
      include: {
        transactions: {
          include: {
            inputs: true,
            outputs: true
          }
        }
      },
      orderBy: { indexNum: 'desc' }
    });
    
    if (!block) return null;
    return this.mapBlockToInterface(block);
  }

  async getBlockHeight(): Promise<number> {
    const result = await prisma.block.aggregate({
      _max: { indexNum: true }
    });
    return result._max.indexNum ?? -1;
  }

  async getBlockTransactions(blockHash: string): Promise<ITransaction[]> {
    const transactions = await prisma.transaction.findMany({
      where: { blockHash },
      include: {
        inputs: true,
        outputs: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    return transactions.map(this.mapTransactionToInterface);
  }

  private mapBlockToInterface(block: Block & {
    transactions: (Transaction & {
      inputs: any[];
      outputs: any[];
    })[];
  }): IBlock {
    return {
      header: {
        index: block.indexNum,
        timestamp: block.timestamp,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        nonce: block.nonce,
        difficulty: block.difficulty
      },
      hash: block.hash,
      transactions: block.transactions.map(this.mapTransactionToInterface),
      size: block.size,
      transactionCount: block.transactionCount,
      nonce: block.nonce,
      timestamp: block.timestamp,
      merkleRoot: block.merkleRoot
    };
  }

  private mapTransactionToInterface(transaction: Transaction & {
    inputs?: any[];
    outputs?: any[];
  }): ITransaction {
    const inputs = transaction.inputs || [];
    const outputs = transaction.outputs || [];
    
    return {
      id: transaction.id,
      from: inputs.length > 0 ? 'multiple_inputs' : transaction.fromAddress,
      to: outputs.length > 0 ? outputs[0]?.address : transaction.toAddress,
      amount: outputs.reduce((sum: number, output: any) => sum + output.amount, 0) || transaction.amount,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
      inputs: inputs.map((input: any) => ({
        previousTransactionId: input.previousTransactionId,
        outputIndex: input.outputIndex,
        scriptSig: input.signature
      })),
      outputs: outputs.map((output: any) => ({
        address: output.address,
        amount: output.amount,
        scriptPubKey: output.scriptPubKey
      })),
      size: transaction.size
    };
  }
}
