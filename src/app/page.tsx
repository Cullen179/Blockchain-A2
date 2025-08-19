import { TabNavigation } from '@/components/TabNavigation';
import { Typography } from '@/components/ui/typography';

interface Props {
  searchParams: Promise<{
    tab?: string;
    page?: string;
  }>;
}

export default async function Homepage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || 'utxo';
  const page = resolvedSearchParams.page || '1';

  // Lazy Loading Content for each Tab for performance
  const renderTabContent = async () => {
    switch (activeTab) {
      // case 'driver-sessions': {
      //   const { DriverSessionsIndex } = await import('./driver-sessions');
      //   return <DriverSessionsIndex page={page} />;
      // }

      case 'utxo': {
        const { UTXOManagerIndex } = await import('./utxo/page');
        return <UTXOManagerIndex />;
      }
      case 'wallets': {
        const { WalletIndex } = await import('./wallet/page');
        return <WalletIndex />;
      }
      default: {
        const { UTXOManagerIndex } = await import('./utxo/page');
        return <UTXOManagerIndex />;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <Typography variant="h1">
          Blockchain Management Dashboard
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          Here you can manage your blockchain network, monitor transactions, and optimize performance.
        </Typography>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} />

      {/* Tab Content */}
      <div className="mt-6">{await renderTabContent()}</div>
    </div>
  );
}
