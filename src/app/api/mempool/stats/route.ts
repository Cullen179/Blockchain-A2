import { MempoolRepository } from "@/repositories/MempoolRepository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mempoolId = searchParams.get('id');
    
    if (!mempoolId) {
      // Get default mempool first
      const mempool = await MempoolRepository.getDefaultMempool();
      if (!mempool) {
        return NextResponse.json(
          { error: 'No mempool found' },
          { status: 404 }
        );
      }
      
      const stats = await MempoolRepository.getMempoolStats(mempool.id);
      return NextResponse.json(stats);
    }
    
    const stats = await MempoolRepository.getMempoolStats(mempoolId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching mempool stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mempool statistics' },
      { status: 500 }
    );
  }
}
