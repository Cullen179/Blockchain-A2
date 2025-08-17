import { ITransaction, IUTXO, IUTXOSet,  } from "@/types/blocks";

export class UTXOManager implements IUTXOSet {
  utxos: Map<string, IUTXO>;
  totalAmount: number;

  constructor() {
    this.utxos = new Map<string, IUTXO>();
    this.totalAmount = 0;
  }

    /**
   * Add UTXOs from a new transaction's outputs
   */
  public addUTXOs(transaction: ITransaction, blockHeight: number): void {
    transaction.outputs.forEach((output, index) => {
      const utxoKey = `${transaction.id}:${index}`;
      const utxo: IUTXO = {
        transactionId: transaction.id,
        outputIndex: index,
        address: output.address,
        amount: output.amount,
        scriptPubKey: output.scriptPubKey,
        isSpent: false
      };

      this.utxos.set(utxoKey, utxo);
      this.updateAddressBalance(output.address, output.amount, true);
    });
  }

  /**
   * Remove UTXOs that are spent by transaction inputs
   */
  public removeUTXOs(transaction: ITransaction): IUTXO[] {
    const spentUTXOs: IUTXO[] = [];
    
    transaction.inputs.forEach(input => {
      const utxoKey = `${input.previousTransactionId}:${input.outputIndex}`;
      const utxo = this.utxos.get(utxoKey);
      
      if (utxo) {
        this.utxos.delete(utxoKey);
        this.updateAddressBalance(utxo.address, utxo.amount, false);
        spentUTXOs.push(utxo);
      }
    });
    
    return spentUTXOs;
  }

  /**
   * Process a complete transaction (remove spent UTXOs, add new UTXOs)
   */
  public processTransaction(transaction: ITransaction, blockHeight: number): boolean {
    // First validate that all inputs exist and can be spent
    if (!this.validateTransactionInputs(transaction)) {
      return false;
    }

    // Remove spent UTXOs
    this.removeUTXOs(transaction);
    
    // Add new UTXOs
    this.addUTXOs(transaction, blockHeight);
    
    return true;
  }

  /**
   * Validate that all transaction inputs exist and are unspent
   */
  public validateTransactionInputs(transaction: ITransaction): boolean {
    for (const input of transaction.inputs) {
      const utxoKey = `${input.previousTransactionId}:${input.outputIndex}`;
      if (!this.utxos.has(utxoKey)) {
        console.error(`UTXO not found: ${utxoKey}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Get all UTXOs for a specific address
   */
  public getUTXOsForAddress(address: string): IUTXO[] {
    return Array.from(this.utxos.values()).filter(utxo => utxo.address === address);
  }

  /**
   * Select UTXOs for spending (coin selection algorithm)
   */
  public selectUTXOsForSpending(address: string, amount: number): IUTXO[] {
    const availableUTXOs = this.getUTXOsForAddress(address);
    const selectedUTXOs: IUTXO[] = [];
    let totalSelected = 0;

    // Simple greedy selection (largest first)
    const sortedUTXOs = availableUTXOs.sort((a, b) => b.amount - a.amount);
    
    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalSelected += utxo.amount;
      
      if (totalSelected >= amount) {
        break;
      }
    }

    return totalSelected >= amount ? selectedUTXOs : [];
  }

  /**
   * Get current UTXO set statistics
   */
  public getUTXOSetStats(): IUTXOSet {
    const totalValue = Array.from(this.utxos.values()).reduce((sum, utxo) => sum + utxo.amount, 0);
    
    return {
      utxos: new Map(this.utxos),
      totalAmount: totalValue,
    };
  }

  /**
   * Update address balance tracking
   */
  private updateAddressBalance(address: string, amount: number, isAdd: boolean): void {
    const 
  }

  /**
   * Calculate transaction fee from inputs and outputs
   */
  public calculateTransactionFee(transaction: ITransaction): number {
    let inputTotal = 0;
    let outputTotal = 0;

    // Sum input values
    transaction.inputs.forEach(input => {
      const utxoKey = `${input.previousTransactionId}:${input.outputIndex}`;
      const utxo = this.utxos.get(utxoKey);
      if (utxo) {
        inputTotal += utxo.amount;
      }
    });

    // Sum output values
    outputTotal = transaction.outputs.reduce((sum, output) => sum + output.amount, 0);

    return inputTotal - outputTotal;
  }
}