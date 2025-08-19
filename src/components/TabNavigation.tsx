'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabNavigationProps {
  activeTab: string;
}

const tabs = [
  { value: 'utxo', label: 'UTXO' },
  { value: 'wallets', label: 'Wallet' },
  { value: 'payments', label: 'Payments' },
  { value: 'history', label: 'History' },
];

export const TabNavigation = ({ activeTab }: TabNavigationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'utxo') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/${newUrl}`);
  };

  return (
    <div className="w-full">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 gap-2 p-1">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};
