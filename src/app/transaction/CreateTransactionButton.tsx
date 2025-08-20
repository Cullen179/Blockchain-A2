'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Send, Wallet, Hash, Coins, AlertCircle, CheckCircle2, Pen } from 'lucide-react';
import { toast } from 'sonner';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchAPI } from '@/lib/fetch';
import UTXOSelector from './UTXOSelector';
import { IUTXO } from '@/types/blocks';

const transactionSchema = z.object({
  fromAddress: z.string(),
  inputs: z.array(
    z.object({
      transactionId: z.string().min(1, 'Transaction ID is required'),
      outputIndex: z.number().min(0, 'Output index must be 0 or greater'),
      privateKey: z.string().min(1, 'Private key is required for signing'),
      amount: z.number().min(1, 'Amount is required'),
      scriptSig: z.string(),
      signed: z.boolean(),
    })
  ).min(1, 'At least one input is required'),
  outputs: z.array(
    z.object({
      address: z.string().min(1, 'Address is required'),
      amount: z.number().min(1, 'Amount must be greater than 0'),
      isChange: z.boolean(),
    })
  ).min(1, 'At least one output is required'),
  fee: z.number().min(0, 'Fee must be 0 or greater'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function CreateTransactionButton() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressBalance, setAddressBalance] = useState(0);
  const [availableUTXOs, setAvailableUTXOs] = useState<IUTXO[]>([]);
  const [showUTXOSelector, setShowUTXOSelector] = useState(false);
  const [selectedInputIndex, setSelectedInputIndex] = useState<number | null>(null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      fromAddress: '',
      inputs: [{ 
        transactionId: '', 
        outputIndex: 0, 
        privateKey: '', 
        amount: 0,
        scriptSig: '',
        signed: false
      }],
      outputs: [{ address: '', amount: 0, isChange: false }],
      fee: 1000,
    },
  });

  const {
    fields: inputFields,
    append: appendInput,
    remove: removeInput,
    update: updateInput,
  } = useFieldArray({
    control: form.control,
    name: 'inputs',
  });

  const {
    fields: outputFields,
    append: appendOutput,
    remove: removeOutput,
    update: updateOutput,
  } = useFieldArray({
    control: form.control,
    name: 'outputs',
  });

  const watchedOutputs = form.watch('outputs');
  const watchedInputs = form.watch('inputs');
  const watchedFromAddress = form.watch('fromAddress');
  const fee = form.watch('fee') || 0;

  const totalOutput = watchedOutputs
    .filter(output => !output.isChange)
    .reduce((sum, output) => sum + (output.amount || 0), 0);
  
  const totalInput = watchedInputs.reduce((sum, input) => sum + (input.amount || 0), 0);
  const change = totalInput - totalOutput - fee;
  const hasChange = change > 0;

  // Fetch address balance and UTXOs when address changes
  useEffect(() => {
    if (watchedFromAddress) {
      fetchAddressData(watchedFromAddress);
    }
  }, [watchedFromAddress]);

  // Update change output when amounts change
  useEffect(() => {
    if (hasChange) {
      const changeOutputIndex = outputFields.findIndex(field => field.isChange);
      if (changeOutputIndex >= 0) {
        updateOutput(changeOutputIndex, {
          address: watchedFromAddress,
          amount: change,
          isChange: true,
        });
      } else {
        appendOutput({
          address: watchedFromAddress,
          amount: change,
          isChange: true,
        });
      }
    } else {
      // Remove change output if no change needed
      const changeOutputIndex = outputFields.findIndex(field => field.isChange);
      if (changeOutputIndex >= 0) {
        removeOutput(changeOutputIndex);
      }
    }
  }, [totalInput, totalOutput, fee, watchedFromAddress, hasChange]);

  const fetchAddressData = async (address: string) => {
    try {
      // Fetch balance
      const balanceResponse = await fetchAPI(`/wallet/balance/${address}`);
      setAddressBalance(balanceResponse.balance || 0);

      // Fetch UTXOs
      const utxoResponse = await fetchAPI(`/utxo/address/${address}`);
      setAvailableUTXOs(utxoResponse || []);
    } catch (error) {
      console.error('Error fetching address data:', error);
      setAddressBalance(0);
      setAvailableUTXOs([]);
    }
  };

  const handleSelectUTXO = (utxo: UTXO) => {
    if (selectedInputIndex !== null) {
      updateInput(selectedInputIndex, {
        transactionId: utxo.transactionId,
        outputIndex: utxo.outputIndex,
        privateKey: '',
        amount: utxo.amount,
        scriptSig: '',
        signed: false,
      });
      setShowUTXOSelector(false);
      setSelectedInputIndex(null);
    }
  };

  const handleSignTransaction = async (inputIndex: number) => {
    const input = watchedInputs[inputIndex];
    if (!input.privateKey) {
      toast.error('Private key is required for signing');
      return;
    }

    try {
      // Mock signing - in real implementation, this would create a proper signature
      const mockScriptSig = `304402207${Math.random().toString(16).slice(2, 34)}01`;
      
      updateInput(inputIndex, {
        ...input,
        scriptSig: mockScriptSig,
        signed: true,
      });

      toast.success(`Input #${inputIndex + 1} signed successfully`);
    } catch (error) {
      console.error('Error signing transaction:', error);
      toast.error('Failed to sign transaction');
    }
  };

  const isBalanceSufficient = totalInput >= (totalOutput + fee);
  const allInputsSigned = watchedInputs.every(input => input.signed);

  async function onSubmit(data: TransactionFormData) {
    
  }

  const formatBTC = (satoshi: number) => (satoshi / 100000000).toFixed(8);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Transaction
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create New Transaction
          </DialogTitle>
          <DialogDescription>
            Create a new blockchain transaction by specifying inputs and outputs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* From Address Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-4 w-4" />
                  From Address
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          {...field}
                        />
                      </FormControl>
                      {watchedFromAddress && (
                        <FormDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="font-mono">
                              Balance: {addressBalance.toLocaleString()} sats (≈ {formatBTC(addressBalance)} BTC)
                            </Badge>
                            <Badge variant="outline">
                              {availableUTXOs.length} UTXOs available
                            </Badge>
                          </div>
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Transaction Inputs Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-4 w-4" />
                  Transaction Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inputFields.map((field, index) => {
                  const input = watchedInputs[index];
                  const hasAmount = input?.amount > 0;
                  
                  return (
                    <div key={field.id} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          Input #{index + 1}
                          {input?.signed && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          )}
                        </h4>
                        <div className="flex items-center gap-2">
                          {!input?.signed && hasAmount && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSignTransaction(index)}
                              disabled={!input.privateKey}
                            >
                              <Pen className="h-3 w-3 mr-1" />
                              Sign
                            </Button>
                          )}
                          {inputFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInput(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedInputIndex(index);
                              setShowUTXOSelector(true);
                            }}
                            disabled={!watchedFromAddress || availableUTXOs.length === 0}
                          >
                            Select UTXO
                          </Button>
                          {hasAmount && (
                            <Badge variant="outline" className="font-mono">
                              {input.amount.toLocaleString()} sats
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`inputs.${index}.transactionId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transaction ID</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Auto-filled when UTXO selected"
                                    className="font-mono text-sm"
                                    disabled
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`inputs.${index}.outputIndex`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Output Index</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Auto-filled"
                                    disabled
                                    {...field}
                                    value={field.value?.toString() || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`inputs.${index}.privateKey`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Private Key *</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Required for signing this input"
                                  className="font-mono text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {input?.scriptSig && (
                          <FormField
                            control={form.control}
                            name={`inputs.${index}.scriptSig`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Script Signature</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Generated after signing"
                                    className="font-mono text-sm"
                                    disabled
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Digital signature for this input
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appendInput({ 
                      transactionId: '', 
                      outputIndex: 0, 
                      privateKey: '', 
                      amount: 0,
                      scriptSig: '',
                      signed: false 
                    })
                  }
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Input
                </Button>
              </CardContent>
            </Card>

            {/* Transaction Outputs Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-4 w-4" />
                  Transaction Outputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {outputFields.map((field, index) => {
                  const output = watchedOutputs[index];
                  const isChangeOutput = output?.isChange;
                  
                  return (
                    <div key={field.id} className={`space-y-3 p-4 border rounded-lg ${isChangeOutput ? 'bg-muted/50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          Output #{index + 1}
                          {isChangeOutput && (
                            <Badge variant="secondary">Change</Badge>
                          )}
                        </h4>
                        {!isChangeOutput && outputFields.filter(f => !f.isChange).length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOutput(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`outputs.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Address *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={isChangeOutput ? "Your address (auto-filled)" : "Bitcoin address"}
                                  className="font-mono text-sm"
                                  disabled={isChangeOutput}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`outputs.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (satoshis) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="100000000"
                                  disabled={isChangeOutput}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  value={field.value?.toString() || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                {field.value > 0 && (
                                  <>≈ {formatBTC(field.value)} BTC{isChangeOutput && ' (calculated change)'}</>
                                )}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendOutput({ address: '', amount: 0, isChange: false })}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Output
                </Button>
              </CardContent>
            </Card>

            {/* Transaction Fee Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Coins className="h-4 w-4" />
                  Transaction Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value?.toString() || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        {fee > 0 && <>≈ {formatBTC(fee)} BTC</>}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Transaction Summary */}
            <Card className={`${!isBalanceSufficient ? 'border-red-200 bg-red-50' : 'bg-muted/50'}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Transaction Summary
                  {!isBalanceSufficient && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Insufficient Balance
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Input Amount:</span>
                    <span className="font-mono">
                      {totalInput.toLocaleString()} sats (≈ {formatBTC(totalInput)} BTC)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Output Amount:</span>
                    <span className="font-mono">
                      {totalOutput.toLocaleString()} sats (≈ {formatBTC(totalOutput)} BTC)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Fee:</span>
                    <span className="font-mono">
                      {fee.toLocaleString()} sats (≈ {formatBTC(fee)} BTC)
                    </span>
                  </div>
                  {hasChange && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Change:</span>
                      <span className="font-mono">
                        {change.toLocaleString()} sats (≈ {formatBTC(change)} BTC)
                      </span>
                    </div>
                  )}
                </div>

                {!isBalanceSufficient && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient balance. You need {((totalOutput + fee) - totalInput).toLocaleString()} more satoshis.
                    </AlertDescription>
                  </Alert>
                )}

                {!allInputsSigned && totalInput > 0 && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      All inputs must be signed before submitting the transaction.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !isBalanceSufficient || !allInputsSigned} 
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Transaction
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* UTXO Selector Dialog */}
      <UTXOSelector
        open={showUTXOSelector}
        onOpenChange={setShowUTXOSelector}
        utxos={availableUTXOs}
        onSelect={handleSelectUTXO}
        address={watchedFromAddress}
      />
    </Dialog>
  );
}