import { fetchAPI } from "@/lib/fetch";
import type { UTXO } from "@/generated/prisma";
import { UTXODisplay } from "@/app/utxo/UTXODisplay";
import ErrorWrapper from "@/components/ErrorWrapper";
import { Typography } from "@/components/ui/typography";

const UTXOPage = async () => {
    const data = await fetchAPI<{
      data: UTXO[];
    }>('/utxos', {
      method: 'GET',
    });

    return (
      <div>
        <div className="mb-8">
          <Typography variant="h2" >
            UTXO Manager
          </Typography>
          <Typography variant="p" className="text-muted-foreground">
            All Unspent Transaction Outputs (UTXOs) here.
          </Typography>
        </div>
        
        <UTXODisplay utxos={data.data} />
      </div>
    );
}

export const UTXOManagerIndex = () => {
  return (
    <ErrorWrapper>
      <UTXOPage />
    </ErrorWrapper>
  );
}

