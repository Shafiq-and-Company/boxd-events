import React from 'react';
import styles from './TournamentFormat.module.css';

const TournamentFormat = () => {
  return (
    <div className={styles.settingsGrid}>
      {/* Tournament Format */}
      <div className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <h3 className={styles.settingTitle}>Tournament Format</h3>
          <span className={styles.settingBadge}>Single Elimination</span>
        </div>
        <div className={styles.settingOptions}>
          <div className={styles.optionItem}>
            <input type="radio" id="single-elim" name="format" defaultChecked />
            <label htmlFor="single-elim">Single Elimination</label>
          </div>
          <div className={styles.optionItem}>
            <input type="radio" id="double-elim" name="format" />
            <label htmlFor="double-elim">Double Elimination</label>
          </div>
          <div className={styles.optionItem}>
            <input type="radio" id="round-robin" name="format" />
            <label htmlFor="round-robin">Round Robin</label>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TournamentFormat;
