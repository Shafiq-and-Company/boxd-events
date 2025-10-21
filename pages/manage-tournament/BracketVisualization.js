import React from 'react';
import styles from './BracketVisualization.module.css';

const BracketVisualization = ({ format }) => {
  // Generate 16 participants for the bracket
  const participants = Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    seed: i + 1
  }));

  // Generate bracket structure based on format
  const generateBracket = (players, format) => {
    switch (format) {
      case 'single-elimination':
        return generateSingleElimination(players);
      case 'double-elimination':
        return generateDoubleElimination(players);
      case 'round-robin':
        return generateRoundRobin(players);
      case 'swiss':
        return generateSwiss(players);
      default:
        return generateSingleElimination(players);
    }
  };

  const generateSingleElimination = (players) => {
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

  const generateDoubleElimination = (players) => {
    // Simplified double elimination - shows winners and losers brackets
    const winnersRounds = generateSingleElimination(players);
    const losersRounds = generateSingleElimination(players.slice(8)); // Simplified losers bracket
    
    return {
      winners: winnersRounds,
      losers: losersRounds,
      isDoubleElimination: true
    };
  };

  const generateRoundRobin = (players) => {
    // Generate round-robin matches
    const matches = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          id: `rr-${i}-${j}`,
          players: [players[i], players[j]],
          winner: null,
          round: Math.floor(matches.length / 4) + 1, // Group matches into rounds
          match: matches.length % 4
        });
      }
    }
    
    // Group matches by round
    const rounds = [];
    const matchesPerRound = Math.ceil(players.length / 2);
    for (let i = 0; i < matches.length; i += matchesPerRound) {
      rounds.push(matches.slice(i, i + matchesPerRound));
    }
    
    return rounds;
  };

  const generateSwiss = (players) => {
    // Simplified Swiss system - shows multiple rounds
    const rounds = [];
    for (let round = 1; round <= 5; round++) {
      const roundMatches = [];
      for (let i = 0; i < players.length; i += 2) {
        roundMatches.push({
          id: `swiss-r${round}-${i/2}`,
          players: [players[i], players[i + 1] || null],
          winner: null,
          round: round,
          match: i / 2
        });
      }
      rounds.push(roundMatches);
    }
    return rounds;
  };

  const bracketData = generateBracket(participants, format);

  return (
    <div className={styles.bracketCard}>
      <div className={styles.bracketHeader}>
        <h3 className={styles.bracketTitle}>Bracket Visualization</h3>
        <div className={styles.bracketInfo}>
          <span className={styles.participantCount}>16 Participants</span>
          <span className={styles.bracketType}>
            {format === 'single-elimination' && 'Single Elimination'}
            {format === 'double-elimination' && 'Double Elimination'}
            {format === 'round-robin' && 'Round Robin'}
            {format === 'swiss' && 'Swiss System'}
          </span>
        </div>
      </div>
      
      <div className={styles.bracketContainer}>
        <div className={styles.bracket}>
          {format === 'double-elimination' && bracketData.isDoubleElimination ? (
            // Double elimination layout
            <>
              <div className={styles.bracketSection}>
                <h4 className={styles.sectionTitle}>Winners Bracket</h4>
                {bracketData.winners.map((round, roundIndex) => (
                  <div key={`w-${roundIndex}`} className={styles.bracketRound}>
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
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.bracketSection}>
                <h4 className={styles.sectionTitle}>Losers Bracket</h4>
                {bracketData.losers.map((round, roundIndex) => (
                  <div key={`l-${roundIndex}`} className={styles.bracketRound}>
                    <div className={styles.roundLabel}>Losers Round {roundIndex + 1}</div>
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
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Single elimination, round robin, and Swiss layouts
            Array.isArray(bracketData) ? bracketData.map((round, roundIndex) => (
              <div key={roundIndex} className={styles.bracketRound}>
                <div className={styles.roundLabel}>
                  {format === 'round-robin' ? `Round ${roundIndex + 1}` :
                   format === 'swiss' ? `Swiss Round ${roundIndex + 1}` :
                   roundIndex === 0 ? 'Round 1' : 
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
                      {format === 'single-elimination' && roundIndex < bracketData.length - 1 && (
                        <div className={styles.matchConnector}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) : null
          )}
        </div>
      </div>
    </div>
  );
};

export default BracketVisualization;
