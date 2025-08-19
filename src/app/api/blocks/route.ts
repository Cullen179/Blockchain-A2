import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const index = searchParams.get('index');
    const hash = searchParams.get('hash');
    const range = searchParams.get('range');

    const blockRepository = RepositoryFactory.getBlockRepository();
    
    if (index !== null && !isNaN(parseInt(index))) {
      // Get block by index
      const block = await blockRepository.findByIndex(parseInt(index));
      return NextResponse.json({
        success: true,
        data: block,
        context: `block at index ${index}`
      });
    } else if (hash) {
      // Get block by hash
      const block = await blockRepository.findByHash(hash);
      return NextResponse.json({
        success: true,
        data: block,
        context: `block with hash ${hash}`
      });
    } else if (range) {
      // Get blocks by range (format: "start-end")
      const [start, end] = range.split('-').map(n => parseInt(n));
      if (!isNaN(start) && !isNaN(end)) {
        const blocks = await blockRepository.findByRange(start, end);
        return NextResponse.json({
          success: true,
          data: blocks,
          count: blocks.length,
          context: `blocks from index ${start} to ${end}`
        });
      }
    }

    // Get all blocks
    const blocks = await blockRepository.findAll();
    const latestBlock = await blockRepository.getLatestBlock();
    const blockHeight = await blockRepository.getBlockHeight();

    return NextResponse.json({
      success: true,
      data: {
        blocks,
        latestBlock,
        blockHeight,
        totalBlocks: blocks.length
      },
      context: 'all blocks'
    });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch blocks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
