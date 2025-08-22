export const BLOCKCHAIN_CONFIG = {
  GENESIS_BLOCK: {
    INDEX: 0,
    PREVIOUS_HASH: '0',
    TIMESTAMP: 1609459200000, // Jan 1, 2021
    DATA: 'Genesis Block',
  },
  MINING: {
    DEFAULT_DIFFICULTY: 4,
    MIN_DIFFICULTY: 1,
    MAX_DIFFICULTY: 10,
    BLOCK_TIME_TARGET: 4000, // 4 seconds in milliseconds
    DIFFICULTY_ADJUSTMENT_INTERVAL: 10, // blocks
  },
  TRANSACTION: {
    MIN_FEE: 0.001,
    MAX_TRANSACTION_SIZE: 1024, // bytes
  },
  BLOCK: {
    MAX_SIZE: 1048576, // 1MB in bytes
    MAX_TRANSACTIONS: 1000,
  },
  CONSENSUS: {
    POW: 'PoW',
    POW_TARGET_PREFIX: '0000',
    POA_MIN_VALIDATORS: 3,
    VALIDATION_TIMEOUT: 30000, // 30 seconds
  },
} as const;

export const HASH_ALGORITHMS = {
  SHA256: 'sha256',
  SHA512: 'sha512',
} as const;

export const ERRORS = {
  INVALID_BLOCK: 'Invalid block structure',
  INVALID_HASH: 'Invalid block hash',
  INVALID_PREVIOUS_HASH: 'Invalid previous block hash',
  INVALID_TIMESTAMP: 'Invalid block timestamp',
  INVALID_TRANSACTIONS: 'Invalid transactions in block',
  INVALID_MERKLE_ROOT: 'Invalid merkle root',
  CONSENSUS_FAILURE: 'Consensus validation failed',
} as const;
