// Round robin tournament utilities

/**
 * Generate round robin bracket
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Bracket data structure
 */
export const generateRoundRobinBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = numParticipants - 1;
  
  const rounds = [];
  
  // Generate all possible matchups
  const allMatches = [];
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      allMatches.push({
        player1: participants[i],
        player2: participants[j],
        winner: null,
        status: 'scheduled'
      });
    }
  }
  
  // Distribute matches across rounds
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = [];
    const matchesPerRound = Math.floor(numParticipants / 2);
    
    for (let i = 0; i < matchesPerRound; i++) {
      const matchIndex = (round - 1) * matchesPerRound + i;
      if (matchIndex < allMatches.length) {
        const match = allMatches[matchIndex];
        roundMatches.push({
          matchId: `round${round}_match${i + 1}`,
          ...match,
          status: 'scheduled'
        });
      }
    }
    
    rounds.push({
      roundNumber: round,
      name: `Round ${round}`,
      matches: roundMatches
    });
  }

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      wins: 0,
      losses: 0,
      points: 0
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'round_robin'
  };
};

/**
 * Handle round robin match completion and standings update
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @returns {Object} Updated bracket data
 */
export const handleRoundRobinMatchCompletion = (bracketData, completedMatch, winnerId) => {
  if (!bracketData || !completedMatch) return bracketData;

  const updatedBracketData = { ...bracketData };
  const loserId = completedMatch.player1_id === winnerId ? completedMatch.player2_id : completedMatch.player1_id;
  
  // Update the completed match
  updatedBracketData.rounds = updatedBracketData.rounds.map(round => {
    if (round.matches) {
      return {
        ...round,
        matches: round.matches.map(match => {
          if (match.matchId === completedMatch.match_id) {
            return {
              ...match,
              winner: winnerId,
              status: 'completed'
            };
          }
          return match;
        })
      };
    }
    return round;
  });

  // Update participant stats
  updatedBracketData.participants = updatedBracketData.participants.map(participant => {
    if (participant.id === winnerId) {
      return { 
        ...participant, 
        wins: (participant.wins || 0) + 1,
        points: (participant.points || 0) + 1
      };
    } else if (participant.id === loserId) {
      return { 
        ...participant, 
        losses: (participant.losses || 0) + 1
      };
    }
    return participant;
  });

  // Check if all matches in current round are complete
  const currentRound = updatedBracketData.rounds.find(round => 
    round.roundNumber === completedMatch.round_number
  );
  
  if (currentRound && currentRound.matches.every(match => match.status === 'completed')) {
    // Move to next round
    updatedBracketData.currentRound = completedMatch.round_number + 1;
    
    // Check if tournament is complete
    if (updatedBracketData.currentRound > updatedBracketData.totalRounds) {
      updatedBracketData.tournamentComplete = true;
      // Determine winner based on standings
      const sortedParticipants = updatedBracketData.participants.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.points - a.points;
      });
      updatedBracketData.winner = sortedParticipants[0];
    }
  }

  return updatedBracketData;
};
