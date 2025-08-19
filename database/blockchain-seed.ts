import { openDB } from "./connect"

async function setupBlockchainDatabase() {
  console.log('🔧 Setting up blockchain database...');
  
  // Open SQLite connection
  const db = await openDB()

  try {
    // Create blockchain tables
    console.log('📋 Creating blockchain tables...');

    // UTXOs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS utxos (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        output_index INTEGER NOT NULL,
        address TEXT NOT NULL,
        amount REAL NOT NULL,
        script_pub_key TEXT,
        is_spent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        spent_at DATETIME NULL,
        UNIQUE(transaction_id, output_index)
      )
    `);

    // Transactions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount REAL NOT NULL,
        fee REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        size INTEGER DEFAULT 0,
        block_hash TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transaction inputs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_inputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        previous_transaction_id TEXT NOT NULL,
        output_index INTEGER NOT NULL,
        signature TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);

    // Transaction outputs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_outputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        output_index INTEGER NOT NULL,
        address TEXT NOT NULL,
        amount REAL NOT NULL,
        script_pub_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);

    // Blocks table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        hash TEXT PRIMARY KEY,
        index_num INTEGER NOT NULL,
        previous_hash TEXT NOT NULL,
        merkle_root TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        nonce INTEGER NOT NULL,
        difficulty INTEGER NOT NULL,
        size INTEGER DEFAULT 0,
        transaction_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_utxos_address ON utxos(address);
      CREATE INDEX IF NOT EXISTS idx_utxos_spent ON utxos(is_spent);
      CREATE INDEX IF NOT EXISTS idx_utxos_transaction_output ON utxos(transaction_id, output_index);
      CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
      CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_blocks_index ON blocks(index_num);
      CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
    `);

    console.log('✅ Blockchain tables created successfully!');

    // Insert some sample data for testing
    console.log('📝 Inserting sample blockchain data...');

    // Sample genesis transaction
    const genesisTransactionId = 'genesis-tx-001';
    const genesisTimestamp = Date.now();

    await db.run(
      `INSERT OR IGNORE INTO transactions 
       (id, from_address, to_address, amount, fee, timestamp, size) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      genesisTransactionId,
      'coinbase',
      'alice-wallet-123',
      1000,
      0,
      genesisTimestamp,
      250
    );

    // Sample UTXO from genesis transaction
    await db.run(
      `INSERT OR IGNORE INTO utxos 
       (id, transaction_id, output_index, address, amount, script_pub_key, is_spent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `${genesisTransactionId}:0`,
      genesisTransactionId,
      0,
      'alice-wallet-123',
      1000,
      'alice-public-key-script',
      0
    );

    // Insert transaction output
    await db.run(
      `INSERT OR IGNORE INTO transaction_outputs 
       (transaction_id, output_index, address, amount, script_pub_key) 
       VALUES (?, ?, ?, ?, ?)`,
      genesisTransactionId,
      0,
      'alice-wallet-123',
      1000,
      'alice-public-key-script'
    );

    // Sample second transaction
    const tx2Id = 'tx-002-alice-to-bob';
    await db.run(
      `INSERT OR IGNORE INTO transactions 
       (id, from_address, to_address, amount, fee, timestamp, size) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      tx2Id,
      'alice-wallet-123',
      'bob-wallet-456',
      500,
      10,
      genesisTimestamp + 60000,
      280
    );

    // Add transaction input (spending the genesis UTXO)
    await db.run(
      `INSERT OR IGNORE INTO transaction_inputs 
       (transaction_id, previous_transaction_id, output_index, signature) 
       VALUES (?, ?, ?, ?)`,
      tx2Id,
      genesisTransactionId,
      0,
      'alice-signature-for-spending'
    );

    // Add transaction outputs (Bob gets 500, Alice gets 490 change)
    await db.run(
      `INSERT OR IGNORE INTO transaction_outputs 
       (transaction_id, output_index, address, amount, script_pub_key) 
       VALUES (?, ?, ?, ?, ?)`,
      tx2Id,
      0,
      'bob-wallet-456',
      500,
      'bob-public-key-script'
    );

    await db.run(
      `INSERT OR IGNORE INTO transaction_outputs 
       (transaction_id, output_index, address, amount, script_pub_key) 
       VALUES (?, ?, ?, ?, ?)`,
      tx2Id,
      1,
      'alice-wallet-123',
      490,
      'alice-public-key-script'
    );

    // Mark genesis UTXO as spent
    await db.run(
      `UPDATE utxos SET is_spent = 1, spent_at = CURRENT_TIMESTAMP 
       WHERE transaction_id = ? AND output_index = ?`,
      genesisTransactionId,
      0
    );

    // Add new UTXOs from transaction 2
    await db.run(
      `INSERT OR IGNORE INTO utxos 
       (id, transaction_id, output_index, address, amount, script_pub_key, is_spent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `${tx2Id}:0`,
      tx2Id,
      0,
      'bob-wallet-456',
      500,
      'bob-public-key-script',
      0
    );

    await db.run(
      `INSERT OR IGNORE INTO utxos 
       (id, transaction_id, output_index, address, amount, script_pub_key, is_spent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `${tx2Id}:1`,
      tx2Id,
      1,
      'alice-wallet-123',
      490,
      'alice-public-key-script',
      0
    );

    console.log('✅ Sample blockchain data inserted!');

    // Display summary
    const transactionCount = await db.get('SELECT COUNT(*) as count FROM transactions');
    const utxoCount = await db.get('SELECT COUNT(*) as count FROM utxos WHERE is_spent = 0');
    const totalValue = await db.get('SELECT SUM(amount) as total FROM utxos WHERE is_spent = 0');

    console.log('\n📊 Database Summary:');
    console.log(`   📝 Total Transactions: ${transactionCount.count}`);
    console.log(`   💰 Unspent UTXOs: ${utxoCount.count}`);
    console.log(`   💵 Total Value: ${totalValue.total} coins`);
    console.log(`   📂 Database file: data/blockchain.db`);

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    // Close connection
    await db.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the setup
setupBlockchainDatabase()
  .then(() => {
    console.log('\n🎉 Blockchain database setup completed successfully!');
    console.log('💡 You can now run: pnpm run dev');
  })
  .catch(err => {
    console.error('💥 Setup failed:', err.message);
    process.exit(1);
  });
