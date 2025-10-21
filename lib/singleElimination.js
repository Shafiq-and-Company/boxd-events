// Single elimination tournament utilities

/**
 * Generate single elimination bracket
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Bracket data structure
 */
export const generateSingleEliminationBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = Math.ceil(Math.log2(numParticipants));
  
  // Create rounds array
  const rounds = [];
  
  // First round - all participants
  const firstRoundMatches = [];
  for (let i = 0; i < numParticipants; i += 2) {
    const matchId = `round1_match${Math.floor(i / 2) + 1}`;
    firstRoundMatches.push({
      matchId,
      player1: participants[i] || null,
      player2: participants[i + 1] || null,
      winner: null,
      status: 'scheduled'
    });
  }
  
  rounds.push({
    roundNumber: 1,
    name: 'Round 1',
    matches: firstRoundMatches
  });

  // Generate subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const prevRoundMatches = rounds[round - 2].matches;
    const currentRoundMatches = [];
    
    for (let i = 0; i < prevRoundMatches.length / 2; i++) {
      const matchId = `round${round}_match${i + 1}`;
      currentRoundMatches.push({
        matchId,
        player1: null, // Will be filled by winners
        player2: null,
        winner: null,
        status: 'scheduled'
      });
    }
    
    rounds.push({
      roundNumber: round,
      name: round === totalRounds ? 'Finals' : `Round ${round}`,
      matches: currentRoundMatches
    });
  }

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      eliminated: false
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'single_elimination'
  };
};

/**
 * Handle single elimination match completion and bracket advancement
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @returns {Object} Updated bracket data
 */
export const handleSingleEliminationMatchCompletion = (bracketData, completedMatch, winnerId) => {
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
      return { ...participant, wins: (participant.wins || 0) + 1 };
    } else if (participant.id === loserId) {
      return { 
        ...participant, 
        eliminated: true
      };
    }
    return participant;
  });

  // Advance winner to next round
  advanceWinnerToNextRound(updatedBracketData, winnerId, completedMatch);

  // Check if tournament is complete (only one player left)
  const remainingPlayers = updatedBracketData.participants.filter(p => !p.eliminated);
  if (remainingPlayers.length === 1) {
    updatedBracketData.tournamentComplete = true;
    updatedBracketData.winner = remainingPlayers[0];
  }

  return updatedBracketData;
};

/**
 * Advance winner to next round in single elimination
 * @param {Object} bracketData - Current bracket data
 * @param {string} winnerId - Winner's ID
 * @param {Object} completedMatch - The completed match
 */
const advanceWinnerToNextRound = (bracketData, winnerId, completedMatch) => {
  const currentRound = completedMatch.round_number;
  const nextRound = currentRound + 1;
  
  // Find next match for this winner
  const nextMatch = bracketData.rounds.find(round => 
    round.roundNumber === nextRound && 
    round.matches.some(match => !match.player1 || !match.player2)
  );
  
  if (nextMatch) {
    const availableMatch = nextMatch.matches.find(match => !match.player1 || !match.player2);
    if (availableMatch) {
      if (!availableMatch.player1) {
        availableMatch.player1 = { id: winnerId };
      } else if (!availableMatch.player2) {
        availableMatch.player2 = { id: winnerId };
      }
    }
  }
};
