import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


export class TransactionRepository {
  static async getAllTransactions() {
    try {
      const transactions = await prisma.transaction.findMany({
        include: {
          inputs: true,
          outputs: true,
        },
      });

      return NextResponse.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );  
    }
  }

  // Additional methods for creating, updating, and deleting transactions can be added here
}
