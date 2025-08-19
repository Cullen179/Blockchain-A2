'use client';

import React, { useState, useMemo } from 'react';
import type { UTXO } from '@/generated/prisma';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface UTXODisplayProps {
  utxos: UTXO[];
}

export function UTXODisplay({ utxos }: UTXODisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'spent' | 'unspent'>('all');

  // Filter and search UTXOs
  const filteredUTXOs = useMemo(() => {
    return utxos.filter(utxo => {
      // Filter by spent status
      const statusMatch = 
        filterType === 'all' ||
        (filterType === 'spent' && utxo.isSpent) ||
        (filterType === 'unspent' && !utxo.isSpent);

      // Filter by search term
      const searchMatch = !searchTerm || 
        utxo.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.id.toLowerCase().includes(searchTerm.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [utxos, searchTerm, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const unspentUTXOs = utxos.filter(utxo => !utxo.isSpent);
    const spentUTXOs = utxos.filter(utxo => utxo.isSpent);
    
    return {
      total: utxos.length,
      unspent: unspentUTXOs.length,
      spent: spentUTXOs.length,
      totalValue: unspentUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0),
      spentValue: spentUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0),
    };
  }, [utxos]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return (amount / 100000000).toFixed(8); // Convert satoshi to BTC
  };

  const truncateHash = (hash: string, length = 8) => {
    if (hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total UTXOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unspent UTXOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.unspent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent UTXOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.spent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalValue)} BTC</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>UTXO Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Input
              placeholder="Search by address, transaction ID, or UTXO ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filterType === 'unspent' ? 'default' : 'outline'}
                onClick={() => setFilterType('unspent')}
              >
                Unspent ({stats.unspent})
              </Button>
              <Button
                variant={filterType === 'spent' ? 'default' : 'outline'}
                onClick={() => setFilterType('spent')}
              >
                Spent ({stats.spent})
              </Button>
            </div>
          </div>

          {/* UTXO Table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                Showing {filteredUTXOs.length} of {stats.total} UTXOs
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>UTXO ID</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Output Index</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Spent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUTXOs.map((utxo) => (
                  <TableRow key={utxo.id}>
                    <TableCell className="font-mono text-xs">
                      {truncateHash(utxo.id)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {truncateHash(utxo.transactionId)}
                    </TableCell>
                    <TableCell>{utxo.outputIndex}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {truncateHash(utxo.address)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(utxo.amount)} BTC
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={utxo.isSpent ? "destructive" : "default"}
                      >
                        {utxo.isSpent ? 'Spent' : 'Unspent'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(utxo.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {utxo.spentAt ? formatDate(utxo.spentAt) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUTXOs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No UTXOs found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
