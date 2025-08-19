'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Eye, EyeOff, Key, Wallet, Copy, RefreshCw } from 'lucide-react';

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
  address: z.string().min(1, 'Address is required'),
  publicKey: z.string().min(1, 'Public key is required'),
  privateKey: z.string().min(1, 'Private key is required'),
  initialBalance: z.number().min(0, 'Initial balance must be 0 or greater').optional(),
});

export default function CreateWalletButton() {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: '',
      publicKey: '',
      privateKey: '',
      initialBalance: 0,
    },
  });

  // Generate new wallet keys
  const generateWalletKeys = async () => {
    setIsGenerating(true);
    try {
      // Simulate key generation (replace with actual crypto implementation)
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      
      // In a real implementation, use proper cryptographic functions
      const address = `bc1q${randomSuffix}${timestamp.toString().slice(-6)}`;
      const publicKey = `04${Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const privateKey = `L${Array(50).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      // Update form values
      form.setValue('address', address);
      form.setValue('publicKey', publicKey);
      form.setValue('privateKey', privateKey);

      toast.success('Wallet keys generated successfully!');
    } catch (error) {
      console.error('Error generating keys:', error);
      toast.error('Failed to generate wallet keys');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error(`Failed to copy ${label}`);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const walletData = {
        ...values,
        initialBalance: values.initialBalance || 0,
      };

      const res = await fetchAPI('/wallets', {
        method: 'POST',
        data: walletData,
      });

      toast.success('Wallet created successfully!');
      
      // Reset form and close dialog
      form.reset();
      setDialogOpen(false);
      setShowPrivateKey(false);

    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create wallet');
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4" size="lg">
          <Wallet className="mr-2 h-4 w-4" />
          Create New Wallet
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create New Wallet
          </DialogTitle>
          <DialogDescription>
            Create a new blockchain wallet with generated public and private keys.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Generate Keys Button */}
            <div className="flex justify-center py-2">
              <Button
                type="button"
                onClick={generateWalletKeys}
                disabled={isGenerating}
                variant="outline"
                className="w-full max-w-xs"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Generate Wallet Keys
                  </>
                )}
              </Button>
            </div>

            {/* Address Field */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Address *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Generated wallet address will appear here"
                        className="font-mono text-sm"
                        {...field}
                        readOnly
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(field.value, 'Address')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    The wallet's public address for receiving transactions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Public Key Field */}
            <FormField
              control={form.control}
              name="publicKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Key *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Generated public key will appear here"
                        className="font-mono text-xs"
                        {...field}
                        readOnly
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(field.value, 'Public Key')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Used for verifying signatures and generating addresses
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Private Key Field */}
            <FormField
              control={form.control}
              name="privateKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Key * 
                    <span className="text-red-500 text-xs ml-1">(Keep Secret!)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPrivateKey ? 'text' : 'password'}
                          placeholder="Generated private key will appear here"
                          className="font-mono text-xs pr-10"
                          {...field}
                          readOnly
                        />
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                          >
                            {showPrivateKey ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(field.value, 'Private Key')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription className="text-red-600">
                    ⚠️ Never share your private key! It controls access to your funds.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Balance Field */}
            <FormField
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.00000001"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value?.toString() || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Starting balance for the wallet (for testing purposes)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning Message */}
            {form.getValues('privateKey') && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-yellow-600 dark:text-yellow-400">⚠️</div>
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Security Warning
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      Make sure to securely backup your private key before creating the wallet. 
                      Once created, you'll need this key to access your funds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  form.reset();
                  setShowPrivateKey(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.getValues('privateKey') || !form.getValues('publicKey') || !form.getValues('address')}
                className="flex-1"
              >
                Create Wallet
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}