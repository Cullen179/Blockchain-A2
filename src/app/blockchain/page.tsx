import ErrorWrapper from "@/components/ErrorWrapper";
import { IBlockchain } from "@/repositories/BlockRepository";
import { fetchAPI } from "@/lib/fetch";
import { BLOCKCHAIN_BASE_URL } from "@/constants/api";
import BlockchainDisplay from "./BlockchainDisplay";

export const BlockchainIndex = () => {
  return (
    <ErrorWrapper>
      <BlockchainPage />
    </ErrorWrapper>
  );
}

async function BlockchainPage() {

  const blockchain: IBlockchain = await fetchAPI(BLOCKCHAIN_BASE_URL, {
    method: 'GET',
  });

  return (
    <BlockchainDisplay blockchain={blockchain} />
  )
}