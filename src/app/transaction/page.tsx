import ErrorWrapper from '@/components/ErrorWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TRANSACTION_BASE_URL } from '@/constants/api';
import { fetchAPI } from '@/lib/fetch';
import { formatAmount, formatDate, getStatusColor } from '@/lib/utils';
import { ITransaction } from '@/types/blocks';
import { Clock, Coins, Eye, Hash } from 'lucide-react';
import TransactionTable from './TransactionTable';

export const TransactionIndex = () => {
  return (
    <ErrorWrapper>
      <Transaction />
    </ErrorWrapper>
  );
};

async function Transaction() {
  const transactions = await fetchAPI<
    (ITransaction & {
      blockHash: string | null;
      mempoolId: string | null;
    })[]
  >(TRANSACTION_BASE_URL, {
    method: 'GET',
  });

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View all blockchain transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-lg">
            {transactions.length} Total
          </Badge>
        </div>
      </div>

      <TransactionTable transactions={transactions} />
    </div>
  );
}
