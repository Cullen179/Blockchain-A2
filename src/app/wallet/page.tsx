import { Coins, Eye, Plus, Wallet } from 'lucide-react';

import {
  CopyButton,
  PrivateKeyToggle,
} from '@/app/wallet/WalletClientComponents';
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
import { WALLET_BASE_URL } from '@/constants/api';
import { fetchAPI } from '@/lib/fetch';
import { IUTXO, IWallet } from '@/types/blocks';
import CreateWalletButton from './CreateWalletButton';

export const WalletIndex = () => {
  return (
    <ErrorWrapper>
      <Wallets />
    </ErrorWrapper>
  );
};

async function Wallets() {
  const wallets: IWallet[] = await fetchAPI(WALLET_BASE_URL, {
    method: 'GET',
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground">
            Manage your blockchain wallets and view balances
          </p>
        </div>
        {/* <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Wallet
        </Button> */}
        <CreateWalletButton />
      </div>

      {wallets && wallets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet: IWallet) => (
            <WalletCard key={wallet.address} wallet={wallet} />
          ))}
        </div>
      ) : (
        <EmptyWalletState />
      )}
    </div>
  );
}

function WalletCard({ wallet }: { wallet: IWallet }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
          <Badge variant="secondary">{wallet.utxos?.length || 0} UTXOs</Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="truncate font-mono text-xs">{wallet.address}</span>
          <CopyButton text={wallet.address} label="Address" />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Balance</p>
            <p className="flex items-center gap-1 text-2xl font-bold">
              <Coins className="h-5 w-5" />
              {wallet.balance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Public Key</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">
                {wallet.publicKey.substring(0, 8)}...
              </span>
              <CopyButton text={wallet.publicKey} label="Public key" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Private Key</span>
            <PrivateKeyToggle privateKey={wallet.privateKey} />
          </div>
        </div>

        {wallet.utxos && wallet.utxos.length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-sm font-medium">Unspent Outputs</p>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {wallet.utxos.map((utxo, index) => (
                <UTXOItem
                  key={`${utxo.transactionId}:${utxo.outputIndex}`}
                  utxo={utxo}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            Send
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Receive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UTXOItem({ utxo }: { utxo: IUTXO }) {
  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-md p-2">
      <div className="flex-1">
        <p className="font-mono text-xs">
          {utxo.transactionId.substring(0, 8)}...:{utxo.outputIndex}
        </p>
      </div>
      <Badge variant="secondary" className="text-xs">
        {utxo.amount}
      </Badge>
    </div>
  );
}

function EmptyWalletState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Wallet className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="mb-2 text-lg font-semibold">No Wallets Found</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        You don't have any wallets yet. Create your first wallet to start
        managing your blockchain assets.
      </p>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Wallet
      </Button>
    </div>
  );
}
