import z from 'zod';

// Zod schemas for validation
export const TransactionInputSchema = z.object({
  previousTransactionId: z
    .string()
    .min(1, 'Previous transaction ID is required'),
  outputIndex: z
    .number()
    .int()
    .min(0, 'Output index must be a non-negative integer'),
  scriptSig: z.string().min(1, 'Script signature is required'),
});

export const TransactionOutputSchema = z.object({
  amount: z.number().positive('Output amount must be positive'),
  scriptPubKey: z.string().min(1, 'Script public key is required'),
  address: z.string().min(1, 'Address is required'),
});

export const TransactionBodySchema = z.object({
  from: z.string().min(1, 'From address is required'),
  to: z.string().min(1, 'To address is required'),
  amount: z.number().positive('Amount must be positive'),
  fee: z.number().min(0, 'Fee must be non-negative'),
  inputs: z
    .array(TransactionInputSchema)
    .min(1, 'At least one input is required'),
  outputs: z.array(TransactionOutputSchema).optional(),
});
