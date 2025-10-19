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

      {/* Tournament Configuration */}
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

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.saveButton}>Save Settings</button>
        <button className={styles.publishButton}>Publish Tournament</button>
        <button className={styles.previewButton}>Preview Bracket</button>
      </div>
    </div>
  );
};

export default TournamentFormat;
