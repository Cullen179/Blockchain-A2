'use client';

import { useMemo, useState } from 'react';
import { Clock, Coins, Eye, Hash, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAmount, formatDate, getStatusColor } from '@/lib/utils';
import { ITransaction } from '@/types/blocks';

export default function TransactionTable({
  transactions,
}: {
  transactions: (ITransaction & {
    blockHash: string | null;
    mempoolId: string | null;
  })[];
}) {
  const enhancedTransactions: (ITransaction & {
    blockHash: string | null;
    mempoolId: string | null;
    status: 'confirmed' | 'pending' | 'failed';
  })[] = transactions.map(transaction => ({
    ...transaction,
    status: transaction.blockHash
      ? 'confirmed'
      : transaction.mempoolId
        ? 'pending'
        : 'failed',
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return enhancedTransactions.filter(transaction => {
      // Status filter
      if (statusFilter !== 'all' && transaction.status !== statusFilter) {
        return false;
      }

      // Search filter (search in transaction ID, addresses)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = transaction.id.toLowerCase().includes(query);

        const matchFrom = transaction.from.toLowerCase().includes(query);
        const matchTo = transaction.to.toLowerCase().includes(query);

        return matchesId || matchFrom || matchTo;
      }

      return true;
    });
  }, [transactions, searchQuery, statusFilter]);

  if (transactions.length === 0)
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Hash className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No Transactions Found</h3>
          <p className="text-muted-foreground text-center">
            No transactions have been recorded on the blockchain yet.
          </p>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 pt-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by transaction ID or address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        {(searchQuery || statusFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-muted-foreground text-sm">
              Showing {filteredTransactions.length} of {transactions.length}{' '}
              transactions
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No Results Found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              No transactions match your search criteria.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">From</TableHead>
                <TableHead className="text-center">To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map(transaction => {
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="text-muted-foreground h-4 w-4" />
                        <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                          {transaction.id.slice(0, 8)}...
                          {transaction.id.slice(-8)}
                        </code>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status.charAt(0).toUpperCase() +
                          transaction.status.slice(1)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                        {transaction.from.slice(0, 8)}...
                        {transaction.from.slice(-8)}
                      </code>
                    </TableCell>

                    <TableCell className="text-center">
                      <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                        {transaction.to.slice(0, 8)}...
                        {transaction.to.slice(-8)}
                      </code>
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {formatAmount(transaction.amount)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-right font-mono text-sm">
                      {formatAmount(transaction.fee)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="text-muted-foreground h-3 w-3" />
                        {formatDate(transaction.timestamp)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}