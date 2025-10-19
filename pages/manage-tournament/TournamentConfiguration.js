import React from 'react';
import styles from './TournamentConfiguration.module.css';

const TournamentConfiguration = () => {
  return (
    <div className={styles.settingCard}>
      <div className={styles.settingHeader}>
        <h3 className={styles.settingTitle}>Tournament Configuration</h3>
      </div>
      <div className={styles.configGrid}>
        <div className={styles.configItem}>
          <label className={styles.configLabel}>Max Participants</label>
          <input type="number" className={styles.configInput} defaultValue="32" min="8" max="64" />
        </div>
        <div className={styles.configItem}>
          <label className={styles.configLabel}>Match Duration (minutes)</label>
          <input type="number" className={styles.configInput} defaultValue="15" min="5" max="60" />
        </div>
        <div className={styles.configItem}>
          <label className={styles.configLabel}>Break Duration (minutes)</label>
          <input type="number" className={styles.configInput} defaultValue="5" min="2" max="15" />
        </div>
        <div className={styles.configItem}>
          <label className={styles.configLabel}>Streaming Enabled</label>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="streaming" defaultChecked />
            <label htmlFor="streaming" className={styles.toggleLabel}></label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentConfiguration;
