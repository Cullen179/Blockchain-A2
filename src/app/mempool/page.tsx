import ErrorWrapper from '@/components/ErrorWrapper';
import { MEMPOOL_BASE_URL } from '@/constants/api';
import { fetchAPI } from '@/lib/fetch';
import { IMempool, ITransaction } from '@/types/blocks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  Clock,
  DollarSign,
  Hash,
  Layers,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle,
  Users,
  Zap,
} from 'lucide-react';
import MineBlockButton from './MineBlockButton';

export const MempoolIndex = () => {
  return (
    <ErrorWrapper>
      <MempoolPage />
    </ErrorWrapper>
  );
};

async function MempoolPage() {
  // Fetch mempool data from API
  let mempool: IMempool;
  try {
    mempool = await fetchAPI(MEMPOOL_BASE_URL, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching mempool:', error);
    // Fallback to empty mempool
    mempool = {
      id: 'mempool-001',
      transactions: [],
      maxSize: 1000,
      currentSize: 0,
    };
  }

  // Calculate stats
  const utilizationRate = (mempool.currentSize / mempool.maxSize) * 100;
  const totalFees = mempool.transactions.reduce((sum, tx) => sum + tx.fee, 0);
  const avgFee =
    mempool.transactions.length > 0
      ? totalFees / mempool.transactions.length
      : 0;
  const highPriorityTxs = mempool.transactions.filter(
    tx => tx.fee > avgFee
  ).length;

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mempool Management
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage pending transactions in your blockchain network
          </p>
        </div>
        <div className="flex gap-2">
          <MineBlockButton />
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Pool
          </Button>
          <Button variant="default" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pool Utilization
            </CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mempool.currentSize}/{mempool.maxSize}
            </div>
            <Progress value={utilizationRate} className="mt-2" />
            <p className="text-muted-foreground mt-1 text-xs">
              {utilizationRate.toFixed(1)}% capacity used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalFees)} BTC
            </div>
            <p className="text-muted-foreground text-xs">
              Avg: {formatAmount(avgFee)} BTC per tx
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityTxs}</div>
            <p className="text-muted-foreground text-xs">Above average fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {mempool.currentSize === 0 ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mempool.currentSize === 0
                ? 'Empty'
                : utilizationRate > 90
                  ? 'Nearly Full'
                  : 'Active'}
            </div>
            <p className="text-muted-foreground text-xs">
              {mempool.currentSize} bytes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by transaction ID or address..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">All ({mempool.currentSize})</Badge>
              <Badge variant="outline">High Fee ({highPriorityTxs})</Badge>
              <Badge variant="outline">Low Fee ({mempool.currentSize - highPriorityTxs})</Badge>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pending Transactions</CardTitle>
            <Badge variant="outline">{mempool.currentSize} transactions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mempool.currentSize === 0 ? (
            <div className="py-12 text-center">
              <Activity className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">
                No Pending Transactions
              </h3>
              <p className="text-muted-foreground mb-4">
                The mempool is currently empty. New transactions will appear
                here when submitted.
              </p>
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Refresh Pool
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mempool.transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hash className="text-muted-foreground h-4 w-4" />
                          <code className="bg-muted rounded px-2 py-1 text-xs">
                            {formatAddress(transaction.id)}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted rounded px-2 py-1 text-xs">
                          {formatAddress(transaction.from)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted rounded px-2 py-1 text-xs">
                          {formatAddress(transaction.to)}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatAmount(transaction.amount)} BTC
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            transaction.fee > avgFee ? 'default' : 'secondary'
                          }
                        >
                          {formatAmount(transaction.fee)} BTC
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.fee > avgFee ? 'default' : 'outline'
                          }
                        >
                          {transaction.fee > avgFee ? 'High' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="text-muted-foreground h-3 w-3" />
                          {formatTimestamp(transaction.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MempoolIndex;
