import { prisma } from '@/lib/prisma';
import { IUTXO } from '@/types/blocks';



import { Prisma, UTXO } from '../generated/prisma';
import { ISearchableRepository } from './base/IRepository';





export class UTXORepository {
  static async findById(id: string): Promise<IUTXO | null> {
    const utxo = await prisma.uTXO.findUnique({
      where: { id },
    });
    return utxo;
  }

  static async findAll(): Promise<IUTXO[]> {
    const utxos = await prisma.uTXO.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return utxos;
  }

  static async create(utxo: IUTXO, tx?: any): Promise<IUTXO> {
    const id = `${utxo.transactionId}:${utxo.outputIndex}`;
    const client = tx || prisma;

    const createdUTXO = await client.uTXO.create({
      data: {
        id,
        transactionId: utxo.transactionId!,
        outputIndex: utxo.outputIndex!,
        address: utxo.address!,
        amount: utxo.amount!,
        scriptPubKey: utxo.scriptPubKey!,
        isSpent: utxo.isSpent ?? false,
      },
    });

    return createdUTXO;
  }

  static async update(
    id: string,
    utxoData: Partial<UTXO>
  ): Promise<UTXO | null> {
    try {
      const updatedUTXO = await prisma.uTXO.update({
        where: { id },
        data: {
          ...(utxoData.address && { address: utxoData.address }),
          ...(utxoData.amount !== undefined && { amount: utxoData.amount }),
          ...(utxoData.scriptPubKey !== undefined && {
            scriptPubKey: utxoData.scriptPubKey,
          }),
          ...(utxoData.isSpent !== undefined && {
            isSpent: utxoData.isSpent,
            spentAt: utxoData.isSpent ? new Date() : null,
          }),
        },
      });

      return updatedUTXO;
    } catch (error) {
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.uTXO.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async exists(id: string): Promise<boolean> {
    const utxo = await prisma.uTXO.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!utxo;
  }

  static async findBy(criteria: Partial<UTXO>): Promise<UTXO[]> {
    const where: Prisma.UTXOWhereInput = {};

    if (criteria.address) {
      where.address = criteria.address;
    }

    if (criteria.transactionId) {
      where.transactionId = criteria.transactionId;
    }

    if (criteria.isSpent !== undefined) {
      where.isSpent = criteria.isSpent;
    }

    const utxos = await prisma.uTXO.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return utxos;
  }

  static async count(criteria?: Partial<UTXO>): Promise<number> {
    const where: Prisma.UTXOWhereInput = {};

    if (criteria?.address) {
      where.address = criteria.address;
    }

    if (criteria?.isSpent !== undefined) {
      where.isSpent = criteria.isSpent;
    }

    return prisma.uTXO.count({ where });
  }

  static async findByAddress(address: string): Promise<UTXO[]> {
    return UTXORepository.findBy({ address });
  }

  static async findUnspentByAddress(address: string): Promise<UTXO[]> {
    return UTXORepository.findBy({ address, isSpent: false });
  }

  static async markAsSpent(
    transactionId: string,
    outputIndex: number
  ): Promise<boolean> {
    try {
      await prisma.uTXO.updateMany({
        where: {
          transactionId,
          outputIndex,
        },
        data: {
          isSpent: true,
          spentAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getTotalValueByAddress(address: string): Promise<number> {
    const result = await prisma.uTXO.aggregate({
      where: {
        address,
        isSpent: false,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount || 0;
  }

  static async getAllUnspent(): Promise<UTXO[]> {
    return UTXORepository.findBy({ isSpent: false });
  }

  static async getByTransactionAndOutput(
    transactionId: string,
    outputIndex: number
  ): Promise<IUTXO | null> {
    const id = `${transactionId}:${outputIndex}`;
    return UTXORepository.findById(id);
  }
}