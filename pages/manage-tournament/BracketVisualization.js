import React, { useState } from 'react';
import styles from './BracketVisualization.module.css';

const BracketVisualization = ({ eventData }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Bracket data - will be populated from API or props
  const bracketData = {
    rounds: []
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  const handleScoreUpdate = (matchId, player, score) => {
    // In a real app, this would update the database
    console.log(`Updating match ${matchId}, ${player} score to ${score}`);
  };

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracketHeader}>
        <h2 className={styles.bracketTitle}>Bracket Visualization</h2>
        <div className={styles.bracketInfo}>
          <span className={styles.participantCount}>8 Participants</span>
          <span className={styles.tournamentFormat}>Single Elimination</span>
        </div>
      </div>

      <div className={styles.bracketContent}>
        {bracketData.rounds.length > 0 ? (
          bracketData.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className={styles.round}>
              <h3 className={styles.roundTitle}>{round.name}</h3>
              <div className={styles.matches}>
                {round.matches.map((match) => (
                  <div 
                    key={match.id} 
                    className={`${styles.match} ${selectedMatch?.id === match.id ? styles.selected : ''}`}
                    onClick={() => handleMatchClick(match)}
                  >
                    <div className={styles.matchHeader}>
                      <span className={styles.matchNumber}>Match {match.id}</span>
                      <span className={styles.matchStatus}>
                        {match.winner ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className={styles.players}>
                      <div className={`${styles.player} ${match.winner === 1 ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player1}</span>
                        <span className={styles.playerScore}>{match.score1 || '-'}</span>
                      </div>
                      <div className={styles.vs}>VS</div>
                      <div className={`${styles.player} ${match.winner === 2 ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player2}</span>
                        <span className={styles.playerScore}>{match.score2 || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4"/>
                <path d="M16 2v4"/>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <path d="M3 10h18"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
                <path d="M16 18h.01"/>
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No Bracket Available</h3>
            <p className={styles.emptyDescription}>
              The tournament bracket will appear here once participants are added and the tournament begins.
            </p>
          </div>
        )}
      </div>

      {selectedMatch && (
        <div className={styles.matchModal}>
          <div className={styles.modalContent}>
            <h3>Match {selectedMatch.id}</h3>
            <div className={styles.scoreInputs}>
              <div className={styles.scoreInput}>
                <label>{selectedMatch.player1}</label>
                <input 
                  type="number" 
                  placeholder="Score"
                  onChange={(e) => handleScoreUpdate(selectedMatch.id, 'player1', e.target.value)}
                />
              </div>
              <div className={styles.scoreInput}>
                <label>{selectedMatch.player2}</label>
                <input 
                  type="number" 
                  placeholder="Score"
                  onChange={(e) => handleScoreUpdate(selectedMatch.id, 'player2', e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setSelectedMatch(null)}
              >
                Cancel
              </button>
              <button className={styles.saveButton}>
                Save Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BracketVisualization;
