import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { IUTXO, IWallet } from '@/types/blocks';
import { UTXOManager } from '@/blockchain/structure/utxo';
import { UTXORepository } from './UTXORepository';

export class WalletRepository {
    /**
     * Create a new wallet
     */
    static async create(walletData: Omit<IWallet, 'utxos'>): Promise<void> {
        await prisma.wallet.create({
            data: {
                address: walletData.address,
                privateKey: walletData.privateKey,
                publicKey: walletData.publicKey,
                balance: walletData.balance,
            },
        });
    }

    /**
     * Find wallet by address
     */
    static async findByAddress(address: string): Promise<IWallet | null> {
        const wallet = await prisma.wallet.findUnique({
            where: { address },
            include: {
                utxos: {
                    where: { isSpent: false },
                },
            },
        });

        if (!wallet) return null;

        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            balance: wallet.balance,
            utxos: wallet.utxos.map(utxo => ({
                transactionId: utxo.transactionId,
                outputIndex: utxo.outputIndex,
                amount: utxo.amount,
                address: utxo.address,
                isSpent: utxo.isSpent,
                scriptPubKey: utxo.scriptPubKey,
            })),
        };
    }

    /**
     * Get all wallets
     */
    static async findAll(): Promise<IWallet[]> {
        const wallets: IWallet[] = await prisma.wallet.findMany({
            include: {
                utxos: {
                    where: { isSpent: false },
                },
            },
        });

        return wallets.map(wallet => ({
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            balance: wallet.balance,
            utxos: wallet.utxos.map(utxo => ({
                transactionId: utxo.transactionId,
                outputIndex: utxo.outputIndex,
                amount: utxo.amount,
                address: utxo.address,
                isSpent: utxo.isSpent,
                scriptPubKey: utxo.scriptPubKey,
            })),
        }));
    }

    /**
     * Sync wallet balance
     */
    static async syncBalance(address: string, tx?: any): Promise<void> {
        try {
            const client = tx || prisma;
            await client.wallet.update({
                where: { address },
                data: {
                    balance: {
                        // Use database-level calculation
                        set: await client.uTXO
                            .aggregate({
                                where: { address, isSpent: false },
                                _sum: { amount: true },
                            })
                            .then((result: any) => result._sum.amount || 0),
                    },
                },
                include: {
                    utxos: {
                        where: { isSpent: false },
                    },
                },
            });
        } catch (error) {
            console.error('Error updating wallet balance:', error);
        }
    }

    /**
     * Calculate and update wallet balance from UTXOs
     */
    static async recalculateBalance(address: string): Promise<number> {
        const utxos = await prisma.uTXO.findMany({
            where: {
                address,
                isSpent: false,
            },
        });

        const calculatedBalance = utxos.reduce(
            (sum: number, utxo: any) => sum + utxo.amount,
            0
        );

        await prisma.wallet.update({
            where: { address },
            data: { balance: calculatedBalance },
        });

        return calculatedBalance;
    }

    /**
     * Get wallet UTXOs
     */
    static async getWalletUTXOs(address: string): Promise<IUTXO[]> {
        const utxos: IUTXO[] = await prisma.uTXO.findMany({
            where: {
                address,
                isSpent: false,
            },
        });

        return utxos.map(utxo => ({
            transactionId: utxo.transactionId,
            outputIndex: utxo.outputIndex,
            amount: utxo.amount,
            address: utxo.address,
            isSpent: utxo.isSpent,
            scriptPubKey: utxo.scriptPubKey,
        }));
    }

    /**
     * Get wallet balance (from database)
     */
    static async getBalance(address: string): Promise<number> {
        const wallet = await prisma.wallet.findUnique({
            where: { address },
            select: { balance: true },
        });

        return wallet?.balance || 0;
    }

    /**
     * Delete a wallet
     */
    static async delete(address: string): Promise<boolean> {
        try {
            await prisma.wallet.delete({
                where: { address },
            });
            return true;
        } catch (error) {
            console.error('Error deleting wallet:', error);
            return false;
        }
    }

    /**
     * Check if wallet exists
     */
    static async exists(address: string): Promise<boolean> {
        const wallet = await prisma.wallet.findUnique({
            where: { address },
            select: { address: true },
        });

        return wallet !== null;
    }

    /**
     * Get wallets with balance greater than amount
     */
    static async findWalletsWithMinBalance(
        minBalance: number
    ): Promise<IWallet[]> {
        const wallets: IWallet[] = await prisma.wallet.findMany({
            where: {
                balance: {
                    gte: minBalance,
                },
            },
            include: {
                utxos: {
                    where: { isSpent: false },
                },
            },
        });

        return wallets.map(wallet => ({
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            balance: wallet.balance,
            utxos: wallet.utxos.map(utxo => ({
                transactionId: utxo.transactionId,
                outputIndex: utxo.outputIndex,
                amount: utxo.amount,
                address: utxo.address,
                isSpent: utxo.isSpent,
                scriptPubKey: utxo.scriptPubKey,
            })),
        }));
    }

    /**
     * Update wallet keys (for key rotation)
     */
    static async updateKeys(
        address: string,
        privateKey: string,
        publicKey: string
    ): Promise<IWallet | null> {
        try {
            const updatedWallet: IWallet = await prisma.wallet.update({
                where: { address },
                data: {
                    privateKey,
                    publicKey,
                },
                include: {
                    utxos: {
                        where: { isSpent: false },
                    },
                },
            });

            return {
                address: updatedWallet.address,
                privateKey: updatedWallet.privateKey,
                publicKey: updatedWallet.publicKey,
                balance: updatedWallet.balance,
                utxos: updatedWallet.utxos.map(utxo => ({
                    transactionId: utxo.transactionId,
                    outputIndex: utxo.outputIndex,
                    amount: utxo.amount,
                    address: utxo.address,
                    isSpent: utxo.isSpent,
                    scriptPubKey: utxo.scriptPubKey,
                })),
            };
        } catch (error) {
            console.error('Error updating wallet keys:', error);
            return null;
        }
    }

    /**
     * Get wallet transaction history
     */
    static async getTransactionHistory(address: string): Promise<any[]> {
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [{ from: address }, { to: address }],
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        return transactions;
    }
}
