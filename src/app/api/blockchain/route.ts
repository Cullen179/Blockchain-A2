import { NextRequest, NextResponse } from 'next/server';
import { BlockRepository } from '@/repositories/BlockRepository';

export async function GET(request: NextRequest) {
  try {
    const blockchain = await BlockRepository.getDefaultBlockchain();

    if (!blockchain) {
      return NextResponse.json(
        { error: 'No blockchain found' },
        { status: 404 }
      );
    }

    return NextResponse.json(blockchain);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch blockchain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { difficulty } = await request.json();

    if (!difficulty || typeof difficulty !== 'number' || difficulty < 1) {
      return NextResponse.json(
        { error: 'Invalid difficulty. Must be a number >= 1' },
        { status: 400 }
      );
    }

    const blockchain = await BlockRepository.createBlockchain(difficulty);

    return NextResponse.json(blockchain, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create blockchain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
