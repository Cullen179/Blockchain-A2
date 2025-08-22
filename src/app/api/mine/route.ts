import { NextRequest } from 'next/server';
import { Block } from '@/blockchain/structure/block';

export async function POST(request: NextRequest) {
  return await Block.mineBlock();
}
