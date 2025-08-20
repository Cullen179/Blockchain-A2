'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, Coins } from 'lucide-react';
import { IUTXO } from '@/types/blocks';

interface UTXOSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  utxos: IUTXO[];
  onSelect: (utxo: IUTXO) => void;
  address: string;
}

export default function UTXOSelector({ open, onOpenChange, utxos, onSelect, address }: UTXOSelectorProps) {
  const formatBTC = (satoshi: number) => (satoshi / 100000000).toFixed(8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Select UTXO for Spending
          </DialogTitle>
          <DialogDescription>
            Choose an unspent transaction output from {address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {utxos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Hash className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No UTXOs available for this address
                </p>
              </CardContent>
            </Card>
          ) : (
            utxos.map((utxo) => (
              <Card key={`${utxo.transactionId}-${utxo.outputIndex}`} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                          {utxo.transactionId.slice(0, 8)}...{utxo.transactionId.slice(-8)}
                        </code>
                        <Badge variant="outline">#{utxo.outputIndex}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">
                          {utxo.amount.toLocaleString()} sats
                        </span>
                        <span className="text-muted-foreground text-sm">
                          (≈ {formatBTC(utxo.amount)} BTC)
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => onSelect(utxo)}>
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}