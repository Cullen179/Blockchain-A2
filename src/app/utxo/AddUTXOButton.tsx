'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from 'sonner';

const formSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  outputIndex: z.number().min(0, 'Output index must be 0 or greater'),
  address: z.string().min(1, 'Address is required'),
  amount: z.number(),
  scriptPubKey: z.string().optional(),
});

export default function AddUTXOButton() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionId: '',
      outputIndex: 0,
      address: '',
      amount: 1,
      scriptPubKey: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle UTXO creation logic here
    try {
      const res = await fetchAPI('/utxos', {
        method: 'POST',
        data: values,
      });

      toast.success('UTXO created successfully');

    } catch (error) {
      console.error('Error creating UTXO:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create UTXO');
    }
    
    // Reset form after submission
    form.reset();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mb-4" size="lg">
          + Add New UTXO
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New UTXO</DialogTitle>
          <DialogDescription>
            Add a new Unspent Transaction Output to the blockchain.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction ID *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter transaction hash"
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
              name="outputIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Index *</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value?.toString() || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Bitcoin address"
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (satoshi) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="100000000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value?.toString() || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value > 0 &&
                      `≈ ${(field.value / 100000000).toFixed(8)} BTC`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scriptPubKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Script Pub Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG"
                      className="font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to auto-generate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" variant="outline">
                Create UTXO
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
