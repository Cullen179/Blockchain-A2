'use client';

import {
  Card,
  CardContent, CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IBlockchain } from '@/repositories/BlockRepository';
import {
  RefreshCw,
  Clock,
  Hash,
  Layers,
  Activity,
  Database,
} from 'lucide-react';
import { Typography } from '@/components/ui/typography';


export default function BlockchainDisplay({
  blockchain }: { blockchain: IBlockchain;
}) {

  if (!blockchain) {
    return (
      <div>
        <Alert>
          <AlertDescription>
            No blockchain found. Create your first blockchain to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const blocks = blockchain.blocks || [];
  const totalTransactions = blocks.reduce(
    (sum, block) => sum + block.transactionCount,
    0
  );
  const averageBlockSize =
    blocks.length > 0
      ? blocks.reduce((sum, block) => sum + block.size, 0) / blocks.length
      : 0;
  const latestBlock = blocks[blocks.length - 1];

  function handleRefresh() {
    // reset window
    window.location.reload();
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blockchain Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your blockchain network and view detailed block information
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4`} />
          Refresh
        </Button>
      </div>

      {/* Blockchain Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocks.length}</div>
            <p className="text-muted-foreground text-xs">
              {blocks.length > 0
                ? `Latest: #${latestBlock?.header.index}`
                : 'No blocks yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-muted-foreground text-xs">Across all blocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Difficulty</CardTitle>
            <Database className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockchain.difficulty}</div>
            <Progress
              value={Math.min((blockchain.difficulty / 10) * 100, 100)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Block Size
            </CardTitle>
            <Hash className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(averageBlockSize)}
            </div>
            <p className="text-muted-foreground text-xs">bytes per block</p>
          </CardContent>
        </Card>
      </div>

      {/* Blocks List */}

      <Typography variant="h2">Blocks</Typography>
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No blocks found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={block.hash}>
                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        Block #{block.header.index}
                      </Badge>
                      {index === 0 && <Badge variant="outline">Genesis</Badge>}
                      {index === blocks.length - 1 && (
                        <Badge variant="outline">Latest</Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="text-muted-foreground h-4 w-4" />
                        <span className="font-mono text-xs">{block.hash}</span>
                      </div>

                      <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(
                            block.header.timestamp * 1000
                          ).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {block.transactionCount} transaction
                          {block.transactionCount !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {block.size} bytes
                        </div>
                      </div>
                    </div>

                    {/* Block Details */}
                    <div className="mt-3 grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2">
                      <div>
                        <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                          Previous Hash
                        </h5>
                        <code className="bg-muted block rounded p-1 text-xs">
                          {block.header.previousHash}
                        </code>
                      </div>
                      <div>
                        <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                          Merkle Root
                        </h5>
                        <code className="bg-muted block rounded p-1 text-xs">
                          {block.header.merkleRoot}
                        </code>
                      </div>
                      <div>
                        <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                          Nonce
                        </h5>
                        <span className="font-mono text-sm">
                          {block.header.nonce}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                          Difficulty
                        </h5>
                        <span className="font-mono text-sm">
                          {block.header.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Transactions */}
                    {block.transactions.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <h5 className="mb-2 text-sm font-medium">
                          Transactions
                        </h5>
                        <div className="space-y-2">
                          {block.transactions.map(tx => (
                            <div key={tx.id} className="bg-muted rounded p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <code className="text-xs">{tx.id}</code>
                                <Badge variant="outline" className="text-xs">
                                  {tx.amount} coins
                                </Badge>
                              </div>
                              <div className="text-muted-foreground text-xs">
                                From:{' '}
                                <span className="font-mono">{tx.from}</span> →
                                To: <span className="font-mono">{tx.to}</span>
                                {tx.fee > 0 && (
                                  <span className="ml-2">Fee: {tx.fee}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {index < blocks.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
