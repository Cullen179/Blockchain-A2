'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pickaxe, Timer, Hash, Coins, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { BLOCKCHAIN_CONFIG } from '@/constants';

interface MempoolStats {
  id: string;
  maxSize: number;
  currentSize: number;
  actualTransactionCount: number;
  totalFees: number;
  totalSize: number;
  avgFee: number;
  avgSize: number;
  utilizationRate: number;
  isEmpty: boolean;
  isFull: boolean;
}

interface MiningResult {
  success: boolean;
  block?: {
    hash: string;
    nonce: number;
    timestamp: number;
    elapsedTime: number;
    iterations: number;
    difficulty: number;
  };
  error?: string;
  mempoolInfo: {
    transactionCount: number;
    totalFees: number;
  };
}

interface BlockchainInfo {
  id: string;
  difficulty: number;
  blocks?: any[];
}

export default function MineBlockButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [mempoolStats, setMempoolStats] = useState<MempoolStats | null>(null);
  const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null);
  const [miningResult, setMiningResult] = useState<MiningResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch mempool and blockchain data when dialog opens
  useEffect(() => {
    if (isOpen && !mempoolStats) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mempoolResponse, blockchainResponse] = await Promise.all([
        fetch('/api/mempool/stats'),
        fetch('/api/blockchain')
      ]);

      if (mempoolResponse.ok) {
        const mempoolData = await mempoolResponse.json();
        setMempoolStats(mempoolData);
      }

      if (blockchainResponse.ok) {
        const blockchainData = await blockchainResponse.json();
        setBlockchainInfo(blockchainData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch mempool data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMining = async () => {
    if (!mempoolStats || mempoolStats.isEmpty) {
      toast.error('No transactions in mempool to mine');
      return;
    }

    setIsMining(true);
    setMiningResult(null);
    
    try {
      const response = await fetch('/api/mine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxIterations: 1000000 // 1 million iterations max
        }),
      });

      const result: MiningResult = await response.json();
      setMiningResult(result);

      if (result.success && result.block) {
        toast.success(`Block mined successfully! Hash: ${result.block.hash.substring(0, 16)}...`);
        // Refresh data after successful mining
        await fetchData();
      } else {
        toast.error(result.error || 'Mining failed');
      }
    } catch (error) {
      console.error('Mining error:', error);
      toast.error('Mining request failed');
      setMiningResult({
        success: false,
        error: 'Network error during mining',
        mempoolInfo: { transactionCount: 0, totalFees: 0 }
      });
    } finally {
      setIsMining(false);
    }
  };

  const formatElapsedTime = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(2)}s`;
    return `${(milliseconds / 60000).toFixed(2)}m`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Pickaxe className="h-4 w-4" />
          Mine Block
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5" />
            Mine Mempool Block
          </DialogTitle>
          <DialogDescription>
            Review mempool information and mine a new block with proof-of-work consensus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                Loading mempool data...
              </CardContent>
            </Card>
          )}

          {/* Mempool Stats */}
          {mempoolStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Mempool Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold">{mempoolStats.actualTransactionCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Fees</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(mempoolStats.totalFees)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Fee</p>
                    <p className="text-xl font-semibold">
                      {mempoolStats.avgFee.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilization</p>
                    <Badge 
                      variant={mempoolStats.utilizationRate > 80 ? "destructive" : 
                               mempoolStats.utilizationRate > 50 ? "default" : "secondary"}
                    >
                      {mempoolStats.utilizationRate}%
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="text-lg">
                      {formatNumber(mempoolStats.currentSize)} / {formatNumber(mempoolStats.maxSize)} bytes
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex gap-2">
                      {mempoolStats.isEmpty && <Badge variant="outline">Empty</Badge>}
                      {mempoolStats.isFull && <Badge variant="destructive">Full</Badge>}
                      {!mempoolStats.isEmpty && !mempoolStats.isFull && (
                        <Badge variant="default">Ready to Mine</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mining Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mining Operation</CardTitle>
              <CardDescription>
                Find a nonce that creates a hash matching the blockchain difficulty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleMining}
                disabled={isMining || !mempoolStats || mempoolStats.isEmpty || isLoading}
                className="w-full gap-2"
                size="lg"
              >
                {isMining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Mining Block...
                  </>
                ) : (
                  <>
                    <Pickaxe className="h-5 w-5" />
                    Start Mining
                  </>
                )}
              </Button>
              
              {mempoolStats?.isEmpty && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Add transactions to the mempool before mining
                </p>
              )}
            </CardContent>
          </Card>

          {/* Mining Results */}
          {miningResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {miningResult.success ? (
                    <>
                      <Hash className="h-5 w-5 text-green-500" />
                      Mining Successful!
                    </>
                  ) : (
                    <>
                      <Hash className="h-5 w-5 text-red-500" />
                      Mining Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {miningResult.success && miningResult.block ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Block Hash</p>
                        <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                          {miningResult.block.hash}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nonce Found</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatNumber(miningResult.block.nonce)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          Elapsed Time
                        </p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formatElapsedTime(miningResult.block.elapsedTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Elapsed Time</p>
                        <p className="text-lg font-semibold">
                          {formatNumber(BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Difficulty</p>
                        <Badge variant="secondary">
                          {miningResult.block.difficulty} zeros
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          Fees Collected
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatNumber(miningResult.mempoolInfo.totalFees)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-red-600 font-medium">{miningResult.error}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try reducing the blockchain difficulty or increasing max iterations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
