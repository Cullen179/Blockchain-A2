import { Wallet } from "@/blockchain/structure/wallet";
import { NextRequest } from "next/server";





export async function POST(request: NextRequest) {
  return await Wallet.generateKeyPair();
}