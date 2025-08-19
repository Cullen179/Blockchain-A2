'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UTXO } from '@/generated/prisma';

interface AddUTXOButtonProps {
  onUTXOAdded?: (utxo: UTXO) => void;
}

interface UTXOFormData {
  transactionId: string;
  outputIndex: number;
  address: string;
  amount: number;
  scriptPubKey: string;
}

export function AddUTXOButton({ onUTXOAdded }: AddUTXOButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<UTXOFormData>({
    transactionId: '',
    outputIndex: 0,
    address: '',
    amount: 0,
    scriptPubKey: '',
  });

  const resetForm = () => {
    setFormData({
      transactionId: '',
      outputIndex: 0,
      address: '',
      amount: 0,
      scriptPubKey: '',
    });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/utxos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create UTXO');
      }

      setSuccess(true);
      onUTXOAdded?.(data.utxo);
      
      // Reset form after successful creation
      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UTXOFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'outputIndex' || field === 'amount' 
      ? parseInt(e.target.value) || 0 
      : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateSampleData = () => {
    const sampleTxId = 'tx_' + Math.random().toString(36).substring(2, 15);
    const sampleAddress = '1' + Math.random().toString(36).substring(2, 15).toUpperCase();
    
    setFormData({
      transactionId: sampleTxId,
      outputIndex: Math.floor(Math.random() * 5),
      address: sampleAddress,
      amount: Math.floor(Math.random() * 100000000) + 1000000, // 0.01 to 1 BTC in satoshi
      scriptPubKey: `OP_DUP OP_HASH160 ${sampleAddress.substring(1)} OP_EQUALVERIFY OP_CHECKSIG`,
    });
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="mb-4"
        size="lg"
      >
        + Add New UTXO
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Create New UTXO</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                UTXO created successfully! 🎉
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Transaction ID *
              </label>
              <Input
                value={formData.transactionId}
                onChange={handleInputChange('transactionId')}
                placeholder="Enter transaction hash"
                required
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Output Index *
              </label>
              <Input
                type="number"
                min="0"
                value={formData.outputIndex}
                onChange={handleInputChange('outputIndex')}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Address *
              </label>
              <Input
                value={formData.address}
                onChange={handleInputChange('address')}
                placeholder="Bitcoin address"
                required
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (satoshi) *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.amount}
                onChange={handleInputChange('amount')}
                placeholder="100000000"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.amount > 0 && `≈ ${(formData.amount / 100000000).toFixed(8)} BTC`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Script Pub Key
              </label>
              <Input
                value={formData.scriptPubKey}
                onChange={handleInputChange('scriptPubKey')}
                placeholder="OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG"
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={generateSampleData}
                className="flex-1"
              >
                🎲 Generate Sample
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || success}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : success ? 'Created!' : 'Create UTXO'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
