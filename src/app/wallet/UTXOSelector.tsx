import { Coins, Hash } from 'lucide-react';
import { toast } from 'sonner';



import { useEffect } from 'react';
import { Form, UseFormReturn } from 'react-hook-form';



import { Wallet } from '@/blockchain/structure/wallet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { WALLET_BASE_URL } from '@/constants/api';
import { fetchAPI } from '@/lib/fetch';
import { formatBTC } from '@/lib/utils';
import { ITransaction, IUTXO, IWallet } from '@/types/blocks';





export default function UTXOSelector({
  wallet,
  totalValue,
  form,
}: {
  wallet: IWallet;
  totalValue: number;
  form: UseFormReturn<
    {
      fromAddress: string;
      toAddress: string;
      amount: number;
      fee: number;
      inputs: {
        previousTransactionId: string;
        outputIndex: number;
        scriptSig: string;
      }[];
    },
    any,
    {
      fromAddress: string;
      toAddress: string;
      amount: number;
      fee: number;
      inputs: {
        previousTransactionId: string;
        outputIndex: number;
        scriptSig: string;
      }[];
    }
  >;
}) {
  const { control, setValue } = form;
  const selectedUTXOs: IUTXO[] = [];
  let totalSelected = 0;

  // Simple greedy selection (largest first)
  const sortedUTXOs = wallet.utxos.sort((a, b) => b.amount - a.amount);

  for (const utxo of sortedUTXOs) {
    selectedUTXOs.push(utxo);
    totalSelected += utxo.amount;

    if (totalSelected >= totalValue) {
      break;
    }
  }

  // Auto-populate form with selected UTXOs
  useEffect(() => {
    selectedUTXOs.forEach((utxo, index) => {
      setValue(`inputs.${index}.previousTransactionId`, utxo.transactionId);
      setValue(`inputs.${index}.outputIndex`, utxo.outputIndex);
    });
  }, [totalValue]);

  if (selectedUTXOs.length === 0 || totalSelected < totalValue) {
    return (
      <div className="py-4 text-center">
        <p className="text-muted-foreground">
          Insufficient UTXOs for transaction amount of{' '}
          {totalValue.toLocaleString()} sats
        </p>
      </div>
    );
  }

    async function handleSignTransaction() {
        try {
            const { signedTransaction }: { signedTransaction: ITransaction } = await fetchAPI(
              `${WALLET_BASE_URL}/sign`,
              {
                method: 'POST',

                data: {
                  transaction: {
                    id: '',
                    from: wallet.address,
                    to: form.getValues('toAddress'),
                    amount: form.getValues('amount'),
                    fee: form.getValues('fee'),
                    inputs: selectedUTXOs.map((utxo) => ({
                      previousTransactionId: utxo.transactionId,
                      outputIndex: utxo.outputIndex,
                      scriptSig: '',
                    })),
                  },
                    privateKey: wallet.privateKey, 
                    walletAddress: wallet.address, 
                },
              }
            );

            console.log('Signed Transaction:', signedTransaction);
            selectedUTXOs.forEach((utxo, index) => {
              setValue(`inputs.${index}.scriptSig`, signedTransaction.inputs[index].scriptSig);
            });
        } catch (error) {
            console.error('Error signing transaction:', error);
            toast.error(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Inputs ({selectedUTXOs.length})</h4>
        <Badge variant="secondary">
          Total: {totalSelected.toLocaleString()} sats
        </Badge>
      </div>

      {selectedUTXOs.map((utxo, i) => (
        <div
          key={`${utxo.transactionId}:${utxo.outputIndex}`}
          className="space-y-3 rounded-lg border p-4"
        >
          {/* Transaction ID Field */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name={`inputs.${i}.previousTransactionId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Hash className="h-3 w-3" />
                    Transaction ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-muted font-mono text-xs"
                      placeholder="Transaction ID"
                      // onChange={(e) => field.onChange(Number(e.target.value))}
                      // value={field.value?.toString() || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Output Index Field */}
            <FormField
              control={control}
              name={`inputs.${i}.outputIndex`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">
                    Output Index
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      className="bg-muted"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value?.toString() || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name={`inputs.${i}.scriptSig`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground text-xs">
                  ScriptSig
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-muted w-full font-mono text-xs"
                    placeholder="ScriptSig"
                    onChange={(e) => field.onChange(e.target.value)}
                    value={field.value || ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* UTXO Value Display */}
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <Coins className="text-muted-foreground h-4 w-4" />
              <span className="font-mono text-sm font-semibold">
                {utxo.amount.toLocaleString()} sats
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              ≈ {formatBTC(utxo.amount)} BTC
            </span>
          </div>
        </div>
      ))}

      {/* Sign Transaction Button */}
      <Button className="w-full" type="button" onClick={handleSignTransaction}>
        Sign Transaction
      </Button>
    </div>
  );
}