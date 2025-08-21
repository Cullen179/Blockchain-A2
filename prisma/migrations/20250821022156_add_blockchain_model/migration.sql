/*
  Warnings:

  - You are about to drop the column `difficulty` on the `blocks` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_count` on the `blocks` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "blockchain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "difficulty" INTEGER NOT NULL DEFAULT 4,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_blocks" (
    "hash" TEXT NOT NULL PRIMARY KEY,
    "index" INTEGER NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "nonce" INTEGER NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "blockchain_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocks_blockchain_id_fkey" FOREIGN KEY ("blockchain_id") REFERENCES "blockchain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_blocks" ("created_at", "hash", "index", "merkle_root", "nonce", "previous_hash", "size", "timestamp") SELECT "created_at", "hash", "index", "merkle_root", "nonce", "previous_hash", "size", "timestamp" FROM "blocks";
DROP TABLE "blocks";
ALTER TABLE "new_blocks" RENAME TO "blocks";
CREATE UNIQUE INDEX "blocks_index_key" ON "blocks"("index");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
