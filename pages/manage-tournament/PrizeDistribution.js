import React from 'react';
import styles from './PrizeDistribution.module.css';

const PrizeDistribution = () => {
  const prizePool = {
    total: '$500',
    distribution: [
      { position: '1st Place', amount: '$250' },
      { position: '2nd Place', amount: '$150' },
      { position: '3rd Place', amount: '$100' }
    ]
  };

  return (
    <div className={styles.prizeSection}>
      <div className={styles.prizeCard}>
        <div className={styles.prizeHeader}>
          <h3 className={styles.prizeTitle}>Prize Distribution</h3>
          <span className={styles.prizeTotal}>{prizePool.total} Total</span>
        </div>
        <div className={styles.prizeDistribution}>
          {prizePool.distribution.map((prize, index) => (
            <div key={index} className={styles.prizeItem}>
              <span className={styles.prizePosition}>{prize.position}</span>
              <span className={styles.prizeAmount}>{prize.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrizeDistribution;
