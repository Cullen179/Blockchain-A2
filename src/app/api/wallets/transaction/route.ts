import { NextRequest, NextResponse } from "next/server";
import { Transaction } from "@/blockchain/structure/transaction";
import { UTXOManager } from "@/blockchain/structure/utxo";
import { ITransaction, ITransactionInput, ITransactionOutput } from "@/types/blocks";
import { TransactionBodySchema } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    // Parse the signed transaction data from request body
    const body = await request.json();
    
    // Validate required fields for signed transaction
    const { 
      from, 
      to, 
      inputs, 
      outputs, 
      fee, 
      amount,
    } = body;
    
    try {
        const validatedBody = TransactionBodySchema.parse(body);
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: "Invalid transaction body format",
            },
            { status: 400 }
        );
    }

    const transaction: ITransaction = {
      ...body,
        id: "", 
        timestamp: Date.now(),
        size: 0,
        outputs: [],
    };

    const isValidInputs = await UTXOManager.validateTransactionInputs(transaction);
    if (!isValidInputs) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid transaction inputs: UTXOs not found or already spent" 
        },
        { status: 400 }
      );
    }

    // Calculate total input value to validate against outputs
    let totalInputValue = 0;
    for (const input of inputs) {
      const utxo = await UTXOManager.getUTXOsForAddress(from);
      const matchingUTXO = utxo.find(u => 
        u.transactionId === input.previousTransactionId && 
        u.outputIndex === input.outputIndex
      );
      if (matchingUTXO) {
        totalInputValue += matchingUTXO.amount;
      }
    }

    // Create transaction outputs if not provided
    let transactionOutputs: ITransactionOutput[] = outputs || [];
    
    if (!outputs || outputs.length === 0) {
      // Create outputs: recipient + change back to sender
      transactionOutputs = [
        {
          amount: amount,
          scriptPubKey: `OP_DUP OP_HASH160 ${to} OP_EQUALVERIFY OP_CHECKSIG`,
          address: to
        }
      ];

      // Add change output if there's remaining value after amount + fee
      const changeAmount = totalInputValue - amount - fee;
      if (changeAmount > 0) {
        transactionOutputs.push({
          amount: changeAmount,
          scriptPubKey: `OP_DUP OP_HASH160 ${from} OP_EQUALVERIFY OP_CHECKSIG`,
          address: from
        });
      }
    }

    // Validate that inputs cover outputs + fee
    const totalOutputValue = transactionOutputs.reduce((sum, output) => sum + output.amount, 0);
    if (totalInputValue < totalOutputValue + fee) {
      return NextResponse.json(
        { 
          success: false,
          error: "Insufficient input value to cover outputs and fee" 
        },
        { status: 400 }
      );
    }

    

    // The Transaction constructor automatically:
    // - Generates the transaction ID
    // - Calculates the transaction size
    // - Sets the timestamp

    // Process the transaction through UTXOManager
    const isProcessed = await UTXOManager.processTransaction(transaction);
    if (!isProcessed) {
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to process transaction" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: "Transaction created and processed successfully",
        transaction: {
          id: transaction.id,
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          fee: transaction.fee,
          timestamp: transaction.timestamp,
          inputs: transaction.inputs,
          outputs: transaction.outputs,
          size: transaction.size
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}