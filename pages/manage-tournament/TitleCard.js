import React from 'react';
import styles from './TitleCard.module.css';

const TitleCard = ({ title, eventData }) => {

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.headerTop}>
        <h2 className={styles.sectionTitle}>
          {title}
          {eventData && (
            <>
              <span className={styles.separator}>|</span>
              <span className={styles.eventTitleInline}>{eventData.title}</span>
              <span className={styles.separator}>|</span>
              <span className={styles.gameTitleInline}>{eventData.game_title}</span>
            </>
          )}
        </h2>
      </div>
    </div>
  );
};

export default TitleCard;
