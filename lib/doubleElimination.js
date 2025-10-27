// Double elimination tournament utilities
import { supabase } from './supabaseClient';

/**
 * Generate double elimination bracket
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Bracket data structure
 */
export const generateDoubleEliminationBracket = (participants) => {
  const numParticipants = participants.length;
  const winnersRounds = Math.ceil(Math.log2(numParticipants));
  const losersRounds = (winnersRounds - 1) * 2;
  const totalRounds = winnersRounds + losersRounds + 1; // +1 for grand finals
  
  const rounds = [];
  
  // Winners bracket - all rounds
  for (let round = 1; round <= winnersRounds; round++) {
    const matchesInRound = Math.ceil(numParticipants / Math.pow(2, round));
    const winnersRoundMatches = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `winners_round${round}_match${i + 1}`;
      winnersRoundMatches.push({
        matchId,
        player1: round === 1 ? (participants[i * 2] || null) : null,
        player2: round === 1 ? (participants[i * 2 + 1] || null) : null,
        winner: null,
        status: 'scheduled'
      });
    }
    
    rounds.push({
      roundNumber: round,
      name: `Winners Round ${round}`,
      bracket: 'winners',
      matches: winnersRoundMatches
    });
  }

  // Losers bracket - all rounds
  for (let round = 1; round <= losersRounds; round++) {
    const losersRoundMatches = [];
    const matchesInRound = Math.ceil(numParticipants / Math.pow(2, Math.ceil(round / 2) + 1));
    
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `losers_round${round}_match${i + 1}`;
      losersRoundMatches.push({
        matchId,
        player1: null, // Will be filled by losers from winners bracket
        player2: null, // Will be filled by previous losers bracket winners
        winner: null,
        status: 'scheduled'
      });
    }
    
    rounds.push({
      roundNumber: round + winnersRounds,
      name: `Losers Round ${round}`,
      bracket: 'losers',
      matches: losersRoundMatches
    });
  }

  // Grand finals - create two matches for "if necessary"
  rounds.push({
    roundNumber: totalRounds,
    name: 'Grand Finals',
    bracket: 'grand_finals',
    matches: [
      {
        matchId: 'grand_finals_match1',
        player1: null, // Winner of winners bracket
        player2: null, // Winner of losers bracket
        winner: null,
        status: 'scheduled'
      },
      {
        matchId: 'grand_finals_match2',
        player1: null, // If losers bracket winner wins first match
        player2: null, // Winner of winners bracket gets a second chance
        winner: null,
        status: 'scheduled'
      }
    ]
  });

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      eliminated: false,
      losses: 0,
      inLosersBracket: false
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'double_elimination'
  };
};

/**
 * Handle double elimination match completion and bracket advancement
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @returns {Object} Updated bracket data
 */
export const handleDoubleEliminationMatchCompletion = (bracketData, completedMatch, winnerId) => {
  if (!bracketData || !completedMatch) return bracketData;

  const updatedBracketData = { ...bracketData };
  
  // Find loser by checking which player is not the winner
  let loserId = null;
  bracketData.rounds.forEach(round => {
    if (round.matches) {
      round.matches.forEach(match => {
        if (match.matchId === completedMatch.match_id) {
          if (match.player1?.id === winnerId) {
            loserId = match.player2?.id || null;
          } else if (match.player2?.id === winnerId) {
            loserId = match.player1?.id || null;
          } else if (typeof match.player1 === 'string' && match.player1 === winnerId) {
            loserId = typeof match.player2 === 'string' ? match.player2 : null;
          } else if (typeof match.player2 === 'string' && match.player2 === winnerId) {
            loserId = typeof match.player1 === 'string' ? match.player1 : null;
          }
        }
      });
    }
  });
  
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
      const newLosses = (participant.losses || 0) + 1;
      return { 
        ...participant, 
        losses: newLosses,
        eliminated: newLosses >= 2,
        inLosersBracket: newLosses >= 1
      };
    }
    return participant;
  });

  // Find which bracket this match was in
  let matchBracket = 'winners';
  bracketData.rounds.forEach(round => {
    if (round.matches) {
      round.matches.forEach(match => {
        if (match.matchId === completedMatch.match_id) {
          matchBracket = round.bracket || 'winners';
        }
      });
    }
  });

  // Handle bracket advancement based on match type
  if (matchBracket === 'winners') {
    // Winner advances in winners bracket, loser goes to losers bracket
    advanceWinnerInWinnersBracket(updatedBracketData, winnerId, completedMatch);
    advanceLoserToLosersBracket(updatedBracketData, loserId, completedMatch);
    
    // Check if this is the winners bracket finals
    const winnersRound = bracketData.rounds.find(round => 
      round.bracket === 'winners' && 
      round.matches.some(m => m.matchId === completedMatch.match_id)
    );
    
    if (winnersRound && winnersRound.roundNumber === Math.max(...bracketData.rounds.filter(r => r.bracket === 'winners').map(r => r.roundNumber))) {
      // This is winners bracket finals - advance winner to grand finals
      const grandFinalsRound = updatedBracketData.rounds.find(round => round.bracket === 'grand_finals');
      if (grandFinalsRound && grandFinalsRound.matches[0]) {
        grandFinalsRound.matches[0].player1 = { id: winnerId, name: updatedBracketData.participants.find(p => p.id === winnerId)?.username };
      }
    }
  } else if (matchBracket === 'losers') {
    // Winner advances in losers bracket, loser is eliminated
    advanceWinnerInLosersBracket(updatedBracketData, winnerId, completedMatch);
    
    // Check if this is the losers bracket finals
    const losersRound = bracketData.rounds.find(round => 
      round.bracket === 'losers' && 
      round.matches.some(m => m.matchId === completedMatch.match_id)
    );
    
    if (losersRound && losersRound.roundNumber === Math.max(...bracketData.rounds.filter(r => r.bracket === 'losers').map(r => r.roundNumber))) {
      // This is losers bracket finals - advance winner to grand finals
      const grandFinalsRound = updatedBracketData.rounds.find(round => round.bracket === 'grand_finals');
      if (grandFinalsRound && grandFinalsRound.matches[0]) {
        grandFinalsRound.matches[0].player2 = { id: winnerId, name: updatedBracketData.participants.find(p => p.id === winnerId)?.username };
      }
    }
  } else if (matchBracket === 'grand_finals') {
    // Grand finals logic
    const grandFinalsRound = updatedBracketData.rounds.find(round => round.bracket === 'grand_finals');
    if (grandFinalsRound && grandFinalsRound.matches) {
      const grandFinalsMatch = grandFinalsRound.matches.find(m => m.matchId === completedMatch.match_id);
      
      if (grandFinalsMatch && grandFinalsMatch.matchId === 'grand_finals_match1') {
        // First grand finals match completed
        const winnersPlayer = grandFinalsMatch.player1; // Undefeated winner from winners bracket
        
        // Check if the losers bracket winner won
        if (loserId && winnerId === grandFinalsMatch.player2?.id) {
          // Losers bracket winner won - set up rematch (if necessary match)
          if (grandFinalsRound.matches[1]) {
            grandFinalsRound.matches[1].player1 = { id: winnerId, name: updatedBracketData.participants.find(p => p.id === winnerId)?.username };
            grandFinalsRound.matches[1].player2 = winnersPlayer;
          }
        } else {
          // Winners bracket winner (undefeated) won - tournament complete
          updatedBracketData.tournamentComplete = true;
          updatedBracketData.winner = updatedBracketData.participants.find(p => p.id === winnerId);
        }
      } else if (grandFinalsMatch && grandFinalsMatch.matchId === 'grand_finals_match2') {
        // Rematch completed - tournament is definitely complete
        updatedBracketData.tournamentComplete = true;
        updatedBracketData.winner = updatedBracketData.participants.find(p => p.id === winnerId);
      }
    }
  }

  return updatedBracketData;
};

/**
 * Advance winner in winners bracket
 * @param {Object} bracketData - Current bracket data
 * @param {string} winnerId - Winner's ID
 * @param {Object} completedMatch - The completed match
 */
const advanceWinnerInWinnersBracket = (bracketData, winnerId, completedMatch) => {
  // Find current round where this match was played
  let currentRound = null;
  bracketData.rounds.forEach(round => {
    if (round.matches) {
      round.matches.forEach(match => {
        if (match.matchId === completedMatch.match_id && match.winner === winnerId) {
          currentRound = round;
        }
      });
    }
  });

  if (!currentRound || !currentRound.bracket || currentRound.bracket !== 'winners') return;

  const nextRoundNumber = currentRound.roundNumber + 1;
  
  // Find next match in winners bracket
  const nextRound = bracketData.rounds.find(round => 
    round.roundNumber === nextRoundNumber && 
    round.bracket === 'winners'
  );
  
  if (nextRound && nextRound.matches) {
    // Find the first available spot in the next round
    for (const match of nextRound.matches) {
      if (!match.player1) {
        match.player1 = { id: winnerId, name: bracketData.participants.find(p => p.id === winnerId)?.username };
        break;
      } else if (!match.player2) {
        match.player2 = { id: winnerId, name: bracketData.participants.find(p => p.id === winnerId)?.username };
        break;
      }
    }
  }
};

/**
 * Advance loser to losers bracket
 * @param {Object} bracketData - Current bracket data
 * @param {string} loserId - Loser's ID
 * @param {Object} completedMatch - The completed match
 */
const advanceLoserToLosersBracket = (bracketData, loserId, completedMatch) => {
  // Find current round where this match was played
  let currentRound = null;
  bracketData.rounds.forEach(round => {
    if (round.matches) {
      round.matches.forEach(match => {
        if (match.matchId === completedMatch.match_id) {
          currentRound = round;
        }
      });
    }
  });

  if (!currentRound) return;

  // Find the first losers bracket round
  const losersRounds = bracketData.rounds.filter(round => round.bracket === 'losers');
  if (losersRounds.length === 0) return;

  // Find an available match in losers bracket
  for (const round of losersRounds) {
    if (round.matches) {
      for (const match of round.matches) {
        if (!match.player1) {
          match.player1 = { id: loserId, name: bracketData.participants.find(p => p.id === loserId)?.username };
          return;
        } else if (!match.player2) {
          match.player2 = { id: loserId, name: bracketData.participants.find(p => p.id === loserId)?.username };
          return;
        }
      }
    }
  }
};

/**
 * Advance winner in losers bracket
 * @param {Object} bracketData - Current bracket data
 * @param {string} winnerId - Winner's ID
 * @param {Object} completedMatch - The completed match
 */
const advanceWinnerInLosersBracket = (bracketData, winnerId, completedMatch) => {
  // Find current round where this match was played
  let currentRound = null;
  bracketData.rounds.forEach(round => {
    if (round.matches) {
      round.matches.forEach(match => {
        if (match.matchId === completedMatch.match_id && match.winner === winnerId) {
          currentRound = round;
        }
      });
    }
  });

  if (!currentRound || !currentRound.bracket || currentRound.bracket !== 'losers') return;

  const nextRoundNumber = currentRound.roundNumber + 1;
  
  // Find next match in losers bracket
  const nextRound = bracketData.rounds.find(round => 
    round.roundNumber === nextRoundNumber && 
    round.bracket === 'losers'
  );
  
  if (nextRound && nextRound.matches) {
    // Find the first available spot in the next round
    for (const match of nextRound.matches) {
      if (!match.player1) {
        match.player1 = { id: winnerId, name: bracketData.participants.find(p => p.id === winnerId)?.username };
        break;
      } else if (!match.player2) {
        match.player2 = { id: winnerId, name: bracketData.participants.find(p => p.id === winnerId)?.username };
        break;
      }
    }
  }
};

/**
 * Fetch tournament participants from RSVPs
 * @param {string} eventId - Event ID
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Array} Array of participant objects
 */
export const fetchTournamentParticipants = async (eventId, supabaseClient = supabase) => {
  try {
    const { data, error } = await supabaseClient
      .from('rsvps')
      .select(`
        user_id,
        users:user_id (
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(rsvp => ({
      id: rsvp.user_id,
      username: rsvp.users?.username,
      first_name: rsvp.users?.first_name,
      last_name: rsvp.users?.last_name
    }));
  } catch (error) {
    console.error('Error fetching tournament participants:', error);
    return [];
  }
};

/**
 * Update tournament matches in database
 * @param {string} tournamentId - Tournament ID
 * @param {Object} bracketData - Bracket data structure
 * @param {Object} supabaseClient - Supabase client instance
 */
export const updateTournamentMatches = async (tournamentId, bracketData, supabaseClient = supabase) => {
  try {
    const matches = [];
    
    bracketData.rounds.forEach(round => {
      if (round.matches) {
        round.matches.forEach(match => {
          matches.push({
            tournament_id: tournamentId,
            match_id: match.matchId,
            round_number: round.roundNumber,
            player1_id: match.player1?.id || null,
            player2_id: match.player2?.id || null,
            winner_id: match.winner || null,
            status: match.status || 'scheduled',
            match_data: {
              bracket: round.bracket || 'main',
              round_name: round.name
            }
          });
        });
      }
    });

    if (matches.length > 0) {
      const { error } = await supabaseClient
        .from('tournament_matches')
        .insert(matches);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating tournament matches:', error);
    throw error;
  }
};

/**
 * Clear all tournament matches
 * @param {string} tournamentId - Tournament ID
 * @param {Object} supabaseClient - Supabase client instance
 */
export const clearTournamentMatches = async (tournamentId, supabaseClient = supabase) => {
  try {
    const { error } = await supabaseClient
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing tournament matches:', error);
    throw error;
  }
};

/**
 * Generate bracket data for double elimination tournament
 * @param {string} tournamentType - Type of tournament (should be 'double_elimination')
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants = 2) => {
  if (participants.length < minParticipants) {
    throw new Error(`Need at least ${minParticipants} participants. Currently have ${participants.length}.`);
  }

  if (tournamentType !== 'double_elimination') {
    throw new Error(`Unsupported tournament type for double elimination: ${tournamentType}`);
  }

  return generateDoubleEliminationBracket(participants);
};

/**
 * Handle match completion for double elimination tournament
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @param {string} tournamentType - Type of tournament
 * @returns {Object} Updated bracket data
 */
export const handleMatchCompletion = (bracketData, completedMatch, winnerId, tournamentType) => {
  if (tournamentType !== 'double_elimination') {
    throw new Error(`Unsupported tournament type for double elimination: ${tournamentType}`);
  }

  return handleDoubleEliminationMatchCompletion(bracketData, completedMatch, winnerId);
};