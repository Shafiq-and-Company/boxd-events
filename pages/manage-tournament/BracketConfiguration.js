import React, { useState } from 'react';
import styles from './BracketConfiguration.module.css';

const BracketConfiguration = () => {
  const [format, setFormat] = useState('single-elimination');
  const [seedingMethod, setSeedingMethod] = useState('random');

  const handleShuffleSeeds = () => {
    console.log('Shuffling seeds...');
  };

  const handleResetSeeds = () => {
    console.log('Resetting seeds...');
  };

  const handleUpdateBracket = () => {
    console.log('Updating bracket...');
  };

  return (
    <div className={styles.configCard}>
      <div className={styles.configHeader}>
        <h3 className={styles.configTitle}>Bracket Configuration</h3>
      </div>
      
      <div className={styles.configContent}>
        <div className={styles.configRow}>
          <label className={styles.configLabel}>Format</label>
          <select 
            className={styles.configSelect}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="single-elimination">Single Elimination</option>
            <option value="double-elimination">Double Elimination</option>
            <option value="round-robin">Round Robin</option>
            <option value="swiss">Swiss</option>
          </select>
        </div>

        <div className={styles.configRow}>
          <label className={styles.configLabel}>Seeding Method</label>
          <select 
            className={styles.configSelect}
            value={seedingMethod}
            onChange={(e) => setSeedingMethod(e.target.value)}
          >
            <option value="random">Random</option>
            <option value="skill-based">Skill Based</option>
            <option value="registration-order">Registration Order</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className={styles.buttonRow}>
          <button 
            className={styles.configButton}
            onClick={handleShuffleSeeds}
          >
            Shuffle Seeds
          </button>
          <button 
            className={styles.configButton}
            onClick={handleResetSeeds}
          >
            Reset Seeds
          </button>
          <button 
            className={styles.configButton}
            onClick={handleUpdateBracket}
          >
            Update Bracket
          </button>
        </div>
      </div>
    </div>
  );
};

export default BracketConfiguration;
