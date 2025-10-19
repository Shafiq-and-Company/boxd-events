import React from 'react';
import styles from './CompetitionRules.module.css';

const CompetitionRules = () => {
  const rules = [
    "Best of 3 matches for all rounds",
    "5-minute break between matches",
    "No substitutions after tournament starts",
    "Disconnection = automatic loss",
    "Final match is Best of 5"
  ];

  return (
    <div className={styles.rulesSection}>
      <div className={styles.rulesCard}>
        <div className={styles.rulesHeader}>
          <h3 className={styles.rulesTitle}>Competition Rules</h3>
        </div>
        <div className={styles.rulesList}>
          {rules.map((rule, index) => (
            <div key={index} className={styles.ruleItem}>
              <span className={styles.ruleNumber}>{index + 1}</span>
              <span className={styles.ruleText}>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompetitionRules;
