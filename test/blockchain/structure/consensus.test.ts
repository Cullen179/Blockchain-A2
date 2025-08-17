import { ProofOfWork } from '@/blockchain/structure/consensus';
import { BLOCKCHAIN_CONFIG } from '@/constants';

describe('ProofOfWork', () => {
  let pow: ProofOfWork;

  beforeEach(() => {
    pow = new ProofOfWork();
  });

  describe('constructor', () => {
    it('should handle zero difficulty', () => {
      const zeroDifficulty = new ProofOfWork(0);
      
      expect(zeroDifficulty.getDifficulty()).toBe(0);
    });

    it('should handle very high difficulty', () => {
      const highDifficulty = new ProofOfWork(10);
      
      expect(highDifficulty.getDifficulty()).toBe(10);
    });
  });

  describe('validate', () => {
    it('should validate hash that meets difficulty requirement', () => {
      const difficulty4Pow = new ProofOfWork(4);
      const validHash = '0000abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
      
      expect(difficulty4Pow.validate(validHash)).toBe(true);
    });

    it('should reject hash that does not meet difficulty requirement', () => {
      const difficulty4Pow = new ProofOfWork(4);
      const invalidHash = '000abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567';
      
      expect(difficulty4Pow.validate(invalidHash)).toBe(false);
    });

    it('should validate hash with exact number of leading zeros', () => {
      const difficulty3Pow = new ProofOfWork(3);
      const exactHash = '000abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
      
      expect(difficulty3Pow.validate(exactHash)).toBe(true);
    });

    it('should validate hash with more than required leading zeros', () => {
      const difficulty2Pow = new ProofOfWork(2);
      const moreZerosHash = '00000def1234567890abcdef1234567890abcdef1234567890abcdef123456';
      
      expect(moreZerosHash.startsWith('00')).toBe(true);
      expect(difficulty2Pow.validate(moreZerosHash)).toBe(true);
    });

    it('should handle zero difficulty (any hash should be valid)', () => {
      const zeroDifficultyPow = new ProofOfWork(0);
      const anyHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      expect(zeroDifficultyPow.validate(anyHash)).toBe(true);
    });

    it('should handle very high difficulty', () => {
      const highDifficultyPow = new ProofOfWork(8);
      const notEnoughZeros = '0000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
      const enoughZeros = '00000000bcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
      
      expect(highDifficultyPow.validate(notEnoughZeros)).toBe(false);
      expect(highDifficultyPow.validate(enoughZeros)).toBe(true);
    });

    it('should handle edge case with empty string', () => {
      const difficulty1Pow = new ProofOfWork(1);
      
      expect(difficulty1Pow.validate('')).toBe(false);
    });

    it('should handle hash shorter than difficulty requirement', () => {
      const difficulty5Pow = new ProofOfWork(5);
      const shortHash = '000';
      
      expect(difficulty5Pow.validate(shortHash)).toBe(false);
    });

    it('should be case sensitive for hex characters', () => {
      const difficulty1Pow = new ProofOfWork(1);
      const upperCaseHash = '0ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456';
      const lowerCaseHash = '0abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
      
      expect(difficulty1Pow.validate(upperCaseHash)).toBe(true);
      expect(difficulty1Pow.validate(lowerCaseHash)).toBe(true);
    });
  });

  describe('adjustDifficulty', () => {
    beforeEach(() => {
      // Reset to known difficulty for consistent testing
      pow = new ProofOfWork(4);
    });

    it('should increase difficulty when block time is too fast', () => {
      const fastTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2; // Half the target time
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(fastTime);
      
      expect(newDifficulty).toBe(initialDifficulty + 1);
      expect(pow.getDifficulty()).toBe(initialDifficulty + 1);
    });

    it('should decrease difficulty when block time is too slow', () => {
      const slowTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 2; // Double the target time
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(slowTime);
      
      expect(newDifficulty).toBe(initialDifficulty - 1);
      expect(pow.getDifficulty()).toBe(initialDifficulty - 1);
    });

    it('should not exceed maximum difficulty', () => {
      // Set difficulty to near maximum
      const nearMaxPow = new ProofOfWork(BLOCKCHAIN_CONFIG.MINING.MAX_DIFFICULTY);
      const fastTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2;
      
      const newDifficulty = nearMaxPow.adjustDifficulty(fastTime);
      
      expect(newDifficulty).toBe(BLOCKCHAIN_CONFIG.MINING.MAX_DIFFICULTY);
      expect(nearMaxPow.getDifficulty()).toBe(BLOCKCHAIN_CONFIG.MINING.MAX_DIFFICULTY);
    });

    it('should not go below minimum difficulty', () => {
      // Set difficulty to near minimum
      const nearMinPow = new ProofOfWork(BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY);
      const slowTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 2;
      
      const newDifficulty = nearMinPow.adjustDifficulty(slowTime);
      
      expect(newDifficulty).toBe(BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY);
      expect(nearMinPow.getDifficulty()).toBe(BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY);
    });

    it('should handle exact target time (boundary condition)', () => {
      const exactTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET;
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(exactTime);
      
      // Should decrease difficulty since it's not strictly less than target
      expect(newDifficulty).toBe(initialDifficulty - 1);
    });

    it('should handle alternating fast and slow times', () => {
      const fastTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2;
      const slowTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 2;
      const initialDifficulty = pow.getDifficulty();
      
      pow.adjustDifficulty(fastTime);  // +1
      pow.adjustDifficulty(slowTime);  // -1
      pow.adjustDifficulty(fastTime);  // +1
      pow.adjustDifficulty(slowTime);  // -1
      
      expect(pow.getDifficulty()).toBe(initialDifficulty);
    });

    it('should handle zero time (extremely fast)', () => {
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(0);
      
      expect(newDifficulty).toBe(initialDifficulty + 1);
    });

    it('should handle very large time values', () => {
      const veryLargeTime = Number.MAX_SAFE_INTEGER;
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(veryLargeTime);
      
      expect(newDifficulty).toBe(initialDifficulty - 1);
    });

    it('should return the new difficulty value', () => {
      const fastTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2;
      const initialDifficulty = pow.getDifficulty();
      
      const returnedDifficulty = pow.adjustDifficulty(fastTime);
      
      expect(returnedDifficulty).toBe(initialDifficulty + 1);
      expect(returnedDifficulty).toBe(pow.getDifficulty());
    });
  });

  describe('integration scenarios', () => {
    it('should simulate realistic mining scenario', () => {
      const testPow = new ProofOfWork(3);
      
      // Simulate finding blocks with various times
      const blockTimes = [
        BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2,  // Fast block
        BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 1.5, // Slow block  
        BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 3,   // Very fast block
        BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 2,   // Very slow block
      ];
      
      const difficultyHistory = [testPow.getDifficulty()];
      
      blockTimes.forEach(time => {
        testPow.adjustDifficulty(time);
        difficultyHistory.push(testPow.getDifficulty());
      });
      
      // Verify difficulty adjustments make sense
      expect(difficultyHistory[1]).toBe(difficultyHistory[0] + 1); // Fast -> increase
      expect(difficultyHistory[2]).toBe(difficultyHistory[1] - 1); // Slow -> decrease
      expect(difficultyHistory[3]).toBe(difficultyHistory[2] + 1); // Very fast -> increase
      expect(difficultyHistory[4]).toBe(difficultyHistory[3] - 1); // Very slow -> decrease
    });

    it('should maintain difficulty bounds during extreme conditions', () => {
      const testPow = new ProofOfWork(BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY);
      
      // Try to go below minimum with many slow blocks
      for (let i = 0; i < 10; i++) {
        testPow.adjustDifficulty(BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 10);
      }
      
      expect(testPow.getDifficulty()).toBe(BLOCKCHAIN_CONFIG.MINING.MIN_DIFFICULTY);
      
      // Try to go above maximum with many fast blocks
      for (let i = 0; i < 20; i++) {
        testPow.adjustDifficulty(1); // Very fast blocks
      }
      
      expect(testPow.getDifficulty()).toBeLessThanOrEqual(BLOCKCHAIN_CONFIG.MINING.MAX_DIFFICULTY);
    });

    it('should validate hashes after difficulty adjustments', () => {
      const testPow = new ProofOfWork(2);
      
      // Hash valid for difficulty 2
      const validHash2 = '00abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
      expect(testPow.validate(validHash2)).toBe(true);
      
      // Increase difficulty
      testPow.adjustDifficulty(BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET / 2);
      
      // Same hash should now be invalid for difficulty 3
      expect(testPow.validate(validHash2)).toBe(false);
      
      // Hash valid for difficulty 3
      const validHash3 = '000bcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
      expect(testPow.validate(validHash3)).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle negative time values', () => {
      const initialDifficulty = pow.getDifficulty();
      
      const newDifficulty = pow.adjustDifficulty(-1000);
      
      // Negative time should be treated as very fast
      expect(newDifficulty).toBe(initialDifficulty + 1);
    });

    it('should handle floating point time values', () => {
      const initialDifficulty = pow.getDifficulty();
      const floatTime = BLOCKCHAIN_CONFIG.MINING.BLOCK_TIME_TARGET * 0.5;
      
      const newDifficulty = pow.adjustDifficulty(floatTime);
      
      expect(newDifficulty).toBe(initialDifficulty + 1);
    });

    it('should handle hash with non-hex characters in validation', () => {
      const invalidHexHash = '0000GHIJK234567890abcdef1234567890abcdef1234567890abcdef123456';
      
      // Should still work since startsWith only checks the prefix
      expect(pow.validate(invalidHexHash)).toBe(true);
    });
  });
});