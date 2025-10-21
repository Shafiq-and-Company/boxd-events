import React from 'react';
import styles from './UpNextCard.module.css';

const UpNextCard = ({ tournamentData }) => {
  // Mock data - will be replaced with real tournament data
  const currentRound = {
    roundNumber: 1,
    roundName: "Round of 8",
    matches: [
      {
        id: "match1",
        player1: { name: "Player 1", seed: 1 },
        player2: { name: "Player 2", seed: 8 },
        scheduledTime: "2:00 PM",
        status: "scheduled"
      },
      {
        id: "match2", 
        player1: { name: "Player 3", seed: 4 },
        player2: { name: "Player 4", seed: 5 },
        scheduledTime: "2:30 PM",
        status: "scheduled"
      },
      {
        id: "match3",
        player1: { name: "Player 5", seed: 2 },
        player2: { name: "Player 6", seed: 7 },
        scheduledTime: "3:00 PM",
        status: "in_progress"
      },
      {
        id: "match4",
        player1: { name: "Player 7", seed: 3 },
        player2: { name: "Player 8", seed: 6 },
        scheduledTime: "3:30 PM",
        status: "scheduled"
      },
      {
        id: "match5",
        player1: { name: "Player 9", seed: 1 },
        player2: { name: "Player 10", seed: 8 },
        scheduledTime: "4:00 PM",
        status: "scheduled"
      },
      {
        id: "match6",
        player1: { name: "Player 11", seed: 4 },
        player2: { name: "Player 12", seed: 5 },
        scheduledTime: "4:30 PM",
        status: "scheduled"
      }
    ]
  };


  return (
    <div className={styles.upNextCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Up Next</h3>
        <div className={styles.roundInfo}>
          <span className={styles.roundName}>{currentRound.roundName}</span>
          <span className={styles.roundNumber}>Round {currentRound.roundNumber}</span>
        </div>
      </div>

      <div className={styles.matchesList}>
        {currentRound.matches.map((match) => (
          <div key={match.id} className={styles.matchItem}>
            
            <div className={styles.matchPlayers}>
              <div className={styles.player}>
                <span className={styles.playerName}>{match.player1.name}</span>
              </div>
              <div className={styles.vs}>VS</div>
              <div className={styles.player}>
                <span className={styles.playerName}>{match.player2.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default UpNextCard;
