# SQLite ORM Setup with Prisma

This project now uses Prisma as the ORM for SQLite database operations, providing type-safe database access and excellent developer experience.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set up Database
```bash
# Push schema to database (creates tables)
pnpm run db:push

# Seed database with sample data
pnpm run db:seed-prisma

# Run demo to see ORM in action
pnpm run db:demo
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run db:push` | Push Prisma schema to database |
| `pnpm run db:generate` | Generate Prisma client |
| `pnpm run db:seed-prisma` | Seed database with Prisma |
| `pnpm run db:demo` | Run ORM demonstration |
| `pnpm run db:studio` | Open Prisma Studio (database GUI) |

## 🏗️ Architecture

### Database Schema
The blockchain database includes the following tables:

- **blocks** - Blockchain blocks
- **transactions** - Individual transactions
- **transaction_inputs** - Transaction inputs
- **transaction_outputs** - Transaction outputs  
- **utxos** - Unspent Transaction Outputs

### Repository Pattern
The project uses the Repository pattern with Prisma:

```typescript
// Repository usage
const utxoRepo = new UTXORepository();
const blockRepo = new BlockRepository();

// Get unspent UTXOs for an address
const utxos = await utxoRepo.findUnspentByAddress('alice-wallet-123');

// Get total balance
const balance = await utxoRepo.getTotalValueByAddress('alice-wallet-123');
```

### Direct Prisma Client Usage
```typescript
import { prisma } from '@/lib/prisma';

// Direct queries
const transactions = await prisma.transaction.findMany({
  include: {
    utxos: true,
    inputs: true,
    outputs: true
  }
});

// Aggregations
const stats = await prisma.uTXO.aggregate({
  where: { isSpent: false },
  _sum: { amount: true },
  _count: true
});
```

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL="file:./database/blockchain.db"
```

### Prisma Schema Location
- Schema: `prisma/schema.prisma`
- Generated Client: `src/generated/prisma/`

## 💡 Usage Examples

### 1. Basic Queries
```typescript
// Find all unspent UTXOs
const unspentUtxos = await prisma.uTXO.findMany({
  where: { isSpent: false }
});

// Get transaction with relations
const transaction = await prisma.transaction.findUnique({
  where: { id: 'tx-001' },
  include: { utxos: true, inputs: true, outputs: true }
});
```

### 2. Repository Pattern
```typescript
import { UTXORepository } from '@/repositories/UTXORepository';

const utxoRepo = new UTXORepository();

// Create new UTXO
const utxo = await utxoRepo.create({
  transactionId: 'tx-001',
  outputIndex: 0,
  address: 'wallet-123',
  amount: 100,
  scriptPubKey: 'script',
  isSpent: false
});

// Mark as spent
await utxoRepo.markAsSpent('tx-001', 0);
```

### 3. Advanced Queries
```typescript
// Raw SQL with Prisma
const balances = await prisma.$queryRaw<Array<{address: string, balance: number}>>`
  SELECT address, SUM(amount) as balance
  FROM utxos 
  WHERE is_spent = 0 
  GROUP BY address
`;

// Transactions
const result = await prisma.$transaction(async (tx) => {
  const utxo = await tx.uTXO.create({ data: { ... } });
  await tx.transaction.update({ where: { id }, data: { ... } });
  return utxo;
});
```

## 🎯 Features

### ✅ Type Safety
- Full TypeScript support
- Auto-generated types from schema
- Compile-time type checking

### ✅ Development Experience  
- Prisma Studio for database inspection
- Auto-completion and IntelliSense
- Database introspection

### ✅ Performance
- Connection pooling
- Query optimization
- Efficient relation loading

### ✅ Migration Support
- Schema versioning
- Database migrations
- Schema synchronization

## 🛠️ Development Workflow

### Making Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `pnpm run db:push` to apply changes
3. Run `pnpm run db:generate` to update client

### Database Inspection
```bash
# Open Prisma Studio
pnpm run db:studio
```

### Testing
```bash
# Run repository tests
pnpm test

# Test database connection
pnpm run db:demo
```

## 📁 File Structure

```
database/
├── blockchain.db          # SQLite database file
├── connect.ts            # Legacy database connection
├── seed.ts              # Legacy seed script
├── prisma-seed.ts       # Prisma seed script
└── prisma-demo.ts       # ORM demonstration

prisma/
└── schema.prisma        # Database schema

src/
├── lib/
│   └── prisma.ts        # Prisma client singleton
├── repositories/        # Repository pattern implementations
│   ├── BlockRepository.ts
│   └── UTXORepository.ts
└── generated/
    └── prisma/          # Generated Prisma client
```

## 🔄 Migration from Legacy

The project maintains both legacy and Prisma implementations:

- Legacy: Uses raw SQLite with `database/connect.ts`
- Prisma: Uses ORM with type safety and modern features

To fully migrate:
1. Update API routes to use new repositories
2. Replace legacy database calls with Prisma
3. Remove legacy database utilities

## 📚 Resources

- [Prisma Documentation](https://prisma.io/docs)
- [SQLite with Prisma](https://prisma.io/docs/concepts/database-connectors/sqlite)
- [Repository Pattern](https://prisma.io/docs/concepts/components/prisma-client/crud)

## 🐛 Troubleshooting

### Common Issues

1. **Foreign Key Constraints**
   - Ensure related records exist before creating dependent records
   - Check transaction order in seeding

2. **Type Errors**
   - Run `pnpm run db:generate` after schema changes
   - Check nullable fields in schema vs interface

3. **Database Lock**
   - Close Prisma Studio before running migrations
   - Ensure no other processes are using the database
