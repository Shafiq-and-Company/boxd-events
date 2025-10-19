import React from 'react';
import styles from './SingleElimBracket.module.css';

const SingleElimBracket = ({ participants }) => {
  const generateBracket = (participants) => {
    const numParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(numParticipants));
    const bracket = [];
    
    // Create first round with all participants paired up
    const firstRound = [];
    for (let i = 0; i < participants.length; i += 2) {
      const match = {
        id: `r1-${i/2}`,
        participants: [participants[i], participants[i + 1] || null],
        winner: null,
        round: 1,
        position: i/2
      };
      firstRound.push(match);
    }
    bracket.push(firstRound);
    
    // Create subsequent rounds
    let currentRoundSize = Math.ceil(numParticipants / 2);
    for (let round = 2; round <= rounds; round++) {
      const roundMatches = [];
      for (let i = 0; i < currentRoundSize; i++) {
        roundMatches.push({
          id: `r${round}-${i}`,
          participants: [null, null],
          winner: null,
          round: round,
          position: i
        });
      }
      bracket.push(roundMatches);
      currentRoundSize = Math.ceil(currentRoundSize / 2);
    }
    
    return bracket;
  };

  const bracket = generateBracket(participants);

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracket}>
        {bracket.map((round, roundIndex) => (
          <div key={roundIndex} className={styles.bracketRound}>
            <div className={styles.roundLabel}>Round {roundIndex + 1}</div>
            <div className={styles.roundMatches}>
              {round.map((match, matchIndex) => (
                <div key={match.id} className={styles.match}>
                  <div className={styles.matchParticipants}>
                    {match.participants.map((participant, pIndex) => (
                      <div key={pIndex} className={styles.matchParticipant}>
                        {participant ? (
                          <div className={styles.participantName}>
                            {participant.users?.username || 
                             participant.users?.first_name || 
                             'Unknown'}
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
    </div>
  );
};

export default SingleElimBracket;
