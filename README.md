# 🔗 Blockchain Assignment 2

A comprehensive blockchain implementation built with Next.js, TypeScript, and Prisma ORM, featuring UTXO management, double spend prevention, and adaptive difficulty adjustment.

<!-- Author -->
**Student**: Do Tung Lam
**SID**: s3963286
**Code Repository**: https://github.com/Cullen179/Blockchain-A2

**Demo Link**: The demo of the web application can be view in this recap demo video in the Blockchain Tutorial from 17:57 - 28:44 - [Demo Link](https://rmiteduau-my.sharepoint.com/personal/jeff_nijsse_rmit_edu_vn/_layouts/15/stream.aspx?id=%2Fpersonal%2Fjeff%5Fnijsse%5Frmit%5Fedu%5Fvn%2FDocuments%2FRecordings%2FBlockchain%20Tutorial%20Meeting%20INTE264%5B12%5D%2D20250821%5F064337UTC%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Eda49981e%2Dbf21%2D41d2%2D929f%2Dc39c87dc6ad2)
## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing & Demonstrations](#testing--demonstrations)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)


## 🎯 Overview

This project implements a fully functional blockchain system with:
- **UTXO (Unspent Transaction Output) management**
- **Double spend prevention mechanisms**
- **Adaptive difficulty adjustment**
- **Transaction validation and cryptographic signatures**
- **Mining simulation with proof-of-work**
- **Web interface for blockchain interaction**
- **Comprehensive test suite**

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **pnpm** package manager
- **Git** for version control

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Cullen179/Blockchain-A2.git
   cd Blockchain-A2
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

## 🗄️ Database Setup

This project uses SQLite with Prisma ORM for data persistence.

1. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

2. **Push database schema**
   ```bash
   npm run db:push
   ```

3. **Seed the database with initial data**
   ```bash
   npm run db:seed
   ```

4. **Optional: View database with Prisma Studio**
   ```bash
   npm run db:studio
   ```

## 🏃‍♂️ Running the Application

### Web Application (Next.js)

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Available pages:**
   - `/` - Main blockchain dashboard
   - `/wallet` - Wallet management and balance viewing
   - `/transaction` - Create and view transactions
   - `/utxo` - UTXO management interface

## 🧪 Testing & Demonstrations

The project includes comprehensive test demonstrations:

#### 1. Double Spend Prevention Demo
```bash
# Basic double spend demonstration (in-memory)
npx tsx src/tests/double-spend.ts

# Database-integrated double spend prevention
npx tsx src/tests/database-double-spend.ts

# Comprehensive UTXO lifecycle management
npx tsx src/tests/comprehensive-double-spend.ts
```

**What it demonstrates:**
- ✅ Valid transaction creation and UTXO management
- ❌ Double spend attack detection and prevention
- 🔐 Cryptographic signature verification
- 📝 Transaction tampering detection

#### 2. Difficulty Adjustment Demo
```bash
# Blockchain difficulty adjustment simulation
npx tsx src/tests/adjust-difficulty.ts
```

**What it demonstrates:**
- 📊 Automatic difficulty adjustment based on mining time
- ⚡ Fast mining → difficulty increase
- 🐌 Slow mining → difficulty decrease
- 🎯 Target block time maintenance (4 seconds)
- 📈 Real-time blockchain state changes

## 🌐 API Endpoints

The application provides RESTful API endpoints:

### Blockchain Operations
- `GET /api/blocks` - Retrieve all blocks
- `POST /api/blocks/mine` - Mine a new block
- `GET /api/stats` - Get blockchain statistics

### Transaction Management
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/[id]` - Get specific transaction

### UTXO Management
- `GET /api/utxos` - List all UTXOs
- `POST /api/utxos` - Create new UTXO
- `GET /api/utxos/[address]` - Get UTXOs for address

### Wallet Operations
- `GET /api/wallets` - List all wallets
- `POST /api/wallets` - Create new wallet
- `GET /api/wallets/[address]` - Get wallet details

## 📁 Project Structure

```
Blockchain-A2/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   ├── transaction/       # Transaction UI
│   │   ├── utxo/             # UTXO management UI
│   │   └── wallet/           # Wallet UI
│   ├── blockchain/           # Core blockchain logic
│   │   └── structure/        # Block, Transaction, UTXO classes
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utility libraries
│   ├── repositories/         # Data access layer
│   ├── services/            # Business logic services
│   ├── tests/               # Educational test demonstrations
│   │   ├── double-spend.ts           # Basic double spend demo
│   │   ├── database-double-spend.ts  # DB-integrated demo
│   │   ├── comprehensive-double-spend.ts # Complete UTXO demo
│   │   └── adjust-difficulty.ts      # Difficulty adjustment demo
│   └── types/               # TypeScript type definitions
├── prisma/                  # Database schema and migrations
├── database/               # Seeding and demo scripts
├── test/                   # Jest unit tests
└── public/                 # Static assets
```

## 🛠️ Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite, Prisma ORM
- **Cryptography**: Node.js crypto module, RSA key pairs
- **Testing**: Jest, tsx (TypeScript execution)
- **UI Components**: Radix UI, Lucide React icons
- **Development**: ESLint, Prettier, Turbopack

