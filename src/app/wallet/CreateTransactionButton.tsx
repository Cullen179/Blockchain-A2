'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    CheckCircle2,
    Coins,
    Hash,
    Pen,
    Plus,
    Send,
    Trash2,
    Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { fetchAPI } from '@/lib/fetch';
import { formatBTC } from '@/lib/utils';
import { ITransaction, IUTXO } from '@/types/blocks';
import { IWallet } from '@/types/blocks';

import UTXOSelector from './UTXOSelector';
import { WALLET_BASE_URL } from '@/constants/api';
import TransactionSummary from './TransactionSummary';

const transactionSchema = z.object({
    fromAddress: z.string(),
    toAddress: z.string().min(1, 'Recipient address is required'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    fee: z.number().min(0, 'Fee must be 0 or greater'),
    inputs: z
        .object({
            previousTransactionId: z.string(),
            outputIndex: z.number(),
            scriptSig: z.string(),
        })
        .array(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function CreateTransactionButton({
    wallet,
}: {
    wallet: IWallet;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [createdTransaction, setCreatedTransaction] =
        useState<ITransaction | null>(null);
    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            fromAddress: wallet.address,
            toAddress: '',
            amount: 1,
            fee: 1,
            // inputs: [
            //     {
            //     previousTransactionId: '123',
            //     // outputIndex: 0,
            //     },
            // ],
        },
    });

    const { amount, fee } = form.watch();
    const isBalanceSufficient = wallet.balance >= amount + fee;

    async function onSubmit(values: TransactionFormData) {
        try {
            const res: { transaction: ITransaction } = await fetchAPI(
                `${WALLET_BASE_URL}/transaction`,
                {
                    method: 'POST',
                    data: {
                        id: '',
                        timestamp: Date.now(),
                        size: 0,
                        from: values.fromAddress,
                        to: values.toAddress,
                        inputs: values.inputs,
                        outputs: [],
                        fee: values.fee,
                        amount: values.amount,
                    } as ITransaction,
                }
            );

            setCreatedTransaction(res.transaction);
            toast.success('Transaction created successfully');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            );
        }
    }

    useEffect(() => {
        if (!isOpen) {
            form.reset();
            setCreatedTransaction(null);
        }
    }, [isOpen]);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Create New Transaction
                    </DialogTitle>
                    <DialogDescription>
                        Create a new blockchain transaction by specifying inputs
                        and outputs.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <FormField
                            control={form.control}
                            name="fromAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Address *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your Bitcoin address"
                                            className="font-mono text-sm"
                                            disabled
                                            {...field}
                                        />
                                    </FormControl>

                                    <FormDescription>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                Balance:{' '}
                                                {wallet.balance.toLocaleString()}{' '}
                                                sats (≈{' '}
                                                {formatBTC(wallet.balance)} BTC)
                                            </Badge>
                                        </div>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 place-items-baseline gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name={`toAddress`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Recipient Address *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={'Bitcoin address'}
                                                className="font-mono text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={`amount`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Amount (satoshis) *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                placeholder="100000000"
                                                {...field}
                                                onChange={e =>
                                                    field.onChange(
                                                        Number(e.target.value)
                                                    )
                                                }
                                                value={
                                                    field.value?.toString() ||
                                                    ''
                                                }
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {field.value > 0 && (
                                                <>
                                                    ≈ {formatBTC(field.value)}{' '}
                                                    BTC
                                                </>
                                            )}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="fee"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fee (satoshis)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="1000"
                                            {...field}
                                            onChange={e =>
                                                field.onChange(
                                                    Number(e.target.value)
                                                )
                                            }
                                            value={
                                                field.value?.toString() || ''
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {field.value > 0 && (
                                            <>≈ {formatBTC(field.value)} BTC</>
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!isBalanceSufficient ? (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Insufficient balance for this transaction.
                                    Please adjust the amount or fee.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <UTXOSelector
                                wallet={wallet}
                                totalValue={amount + fee}
                                form={form}
                            />
                        )}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" className="mr-2">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit">Create Transaction</Button>
                        </DialogFooter>
                    </form>
                </Form>

                {createdTransaction && (
                    <TransactionSummary transaction={createdTransaction} />
                )}
            </DialogContent>
        </Dialog>
    );
}
