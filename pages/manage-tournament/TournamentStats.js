import React from 'react';
import styles from './TournamentStats.module.css';

const TournamentStats = ({ participants, eventData }) => {
  const stats = [
    {
      value: participants?.length || 0,
      label: 'Participants'
    },
    {
      value: '4-6',
      label: 'Hours Duration'
    },
    {
      value: '$500',
      label: 'Prize Pool'
    },
    {
      value: 'Single',
      label: 'Elimination'
    }
  ];

  return (
    <div className={styles.analyticsSection}>
      <div className={styles.analyticsCard}>
        <h3 className={styles.analyticsTitle}>Tournament Statistics</h3>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentStats;
