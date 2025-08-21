-- CreateTable
CREATE TABLE "blocks" (
    "hash" TEXT NOT NULL PRIMARY KEY,
    "index" INTEGER NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "nonce" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "block_hash" TEXT,
    "mempool_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_block_hash_fkey" FOREIGN KEY ("block_hash") REFERENCES "blocks" ("hash") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_mempool_id_fkey" FOREIGN KEY ("mempool_id") REFERENCES "mempools" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_inputs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" TEXT NOT NULL,
    "previous_transaction_id" TEXT NOT NULL,
    "output_index" INTEGER NOT NULL,
    "script_sig" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transaction_inputs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_outputs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "script_pub_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transaction_outputs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "utxos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "output_index" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "script_pub_key" TEXT NOT NULL,
    "is_spent" BOOLEAN NOT NULL DEFAULT false,
    "spent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utxos_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "utxos_address_fkey" FOREIGN KEY ("address") REFERENCES "wallets" ("address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallets" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "private_key" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "mempools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maxSize" INTEGER NOT NULL DEFAULT 1000,
    "currentSize" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_index_key" ON "blocks"("index");

-- CreateIndex
CREATE UNIQUE INDEX "utxos_transaction_id_output_index_key" ON "utxos"("transaction_id", "output_index");
