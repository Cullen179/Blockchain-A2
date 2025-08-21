import { MempoolRepository } from "@/repositories/MempoolRepository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the default mempool
    const mempool = await MempoolRepository.getDefaultMempool();
    
    if (!mempool) {
      // If no mempool exists, create one
      const newMempool = await MempoolRepository.createMempool();
      return NextResponse.json(newMempool);
    }
    
    return NextResponse.json(mempool);
  } catch (error) {
    console.error('Error fetching mempool:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch mempool API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxSize = 1000 } = body;
    
    const mempool = await MempoolRepository.createMempool(maxSize);
    
    return NextResponse.json({
      success: true,
      mempool,
      message: 'Mempool created successfully'
    });
  } catch (error) {
    console.error('Error creating mempool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create mempool'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mempoolId = searchParams.get('id');
    
    if (!mempoolId) {
      return NextResponse.json(
        { error: 'Mempool ID is required' },
        { status: 400 }
      );
    }
    
    const action = searchParams.get('action');
    
    if (action === 'clear') {
      // Clear mempool
      await MempoolRepository.clearMempool(mempoolId);
      
      return NextResponse.json({
        success: true,
        message: 'Mempool cleared successfully'
      });
    } else {
      // Delete mempool
      await MempoolRepository.deleteMempool(mempoolId);
      
      return NextResponse.json({
        success: true,
        message: 'Mempool deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error modifying mempool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}