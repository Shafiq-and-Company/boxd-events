import React from 'react';
import styles from './BracketVisualization.module.css';

const BracketVisualization = () => {
  // Generate 16 participants for the bracket
  const participants = Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    seed: i + 1
  }));

  // Generate bracket structure for 16 players
  const generateBracket = (players) => {
    const rounds = [];
    let currentRound = players.map((player, index) => ({
      id: `r1-${index}`,
      players: [player, players[index + 1] || null],
      winner: null,
      round: 1,
      match: Math.floor(index / 2)
    })).filter((_, index) => index % 2 === 0);

    rounds.push(currentRound);

    // Generate subsequent rounds
    let roundNumber = 2;
    while (currentRound.length > 1) {
      const nextRound = [];
      for (let i = 0; i < currentRound.length; i += 2) {
        nextRound.push({
          id: `r${roundNumber}-${i/2}`,
          players: [null, null], // Winners will be filled in
          winner: null,
          round: roundNumber,
          match: i / 2
        });
      }
      rounds.push(nextRound);
      currentRound = nextRound;
      roundNumber++;
    }

    return rounds;
  };

  const bracketRounds = generateBracket(participants);

  return (
    <div className={styles.bracketCard}>
      <div className={styles.bracketHeader}>
        <h3 className={styles.bracketTitle}>Bracket Visualization</h3>
        <div className={styles.bracketInfo}>
          <span className={styles.participantCount}>16 Participants</span>
          <span className={styles.bracketType}>Single Elimination</span>
        </div>
      </div>
      
      <div className={styles.bracketContainer}>
        <div className={styles.bracket}>
          {bracketRounds.map((round, roundIndex) => (
            <div key={roundIndex} className={styles.bracketRound}>
              <div className={styles.roundLabel}>
                {roundIndex === 0 ? 'Round 1' : 
                 roundIndex === 1 ? 'Quarterfinals' :
                 roundIndex === 2 ? 'Semifinals' : 'Final'}
              </div>
              <div className={styles.roundMatches}>
                {round.map((match, matchIndex) => (
                  <div key={match.id} className={styles.match}>
                    <div className={styles.matchParticipants}>
                      {match.players.map((player, playerIndex) => (
                        <div 
                          key={playerIndex} 
                          className={`${styles.matchPlayer} ${playerIndex === 0 ? styles.player1 : styles.player2}`}
                        >
                          {player ? (
                            <div className={styles.playerInfo}>
                              <span className={styles.playerSeed}>{player.seed}</span>
                              <span className={styles.playerName}>{player.name}</span>
                            </div>
                          ) : (
                            <div className={styles.placeholder}>TBD</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {roundIndex < bracketRounds.length - 1 && (
                      <div className={styles.matchConnector}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketVisualization;
