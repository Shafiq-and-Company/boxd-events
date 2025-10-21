import React, { useState } from 'react';
import styles from './BracketConfiguration.module.css';

const BracketConfiguration = ({ format, onFormatChange }) => {

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
            onChange={(e) => onFormatChange(e.target.value)}
          >
            <option value="single-elimination">Single Elimination</option>
            <option value="double-elimination">Double Elimination</option>
            <option value="round-robin">Round Robin</option>
            <option value="swiss">Swiss</option>
          </select>
        </div>

      </div>
    </div>
  );
};

export default BracketConfiguration;
