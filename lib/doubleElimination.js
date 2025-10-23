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

  // Grand finals
  rounds.push({
    roundNumber: totalRounds,
    name: 'Grand Finals',
    bracket: 'grand_finals',
    matches: [{
      matchId: 'grand_finals_match1',
      player1: null, // Winner of winners bracket
      player2: null, // Winner of losers bracket
      winner: null,
      status: 'scheduled'
    }]
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

  // Handle bracket advancement based on match type
  if (completedMatch.match_data?.bracket === 'winners') {
    // Winner advances in winners bracket, loser goes to losers bracket
    advanceWinnerInWinnersBracket(updatedBracketData, winnerId, completedMatch);
    advanceLoserToLosersBracket(updatedBracketData, loserId, completedMatch);
  } else if (completedMatch.match_data?.bracket === 'losers') {
    // Winner advances in losers bracket, loser is eliminated
    advanceWinnerInLosersBracket(updatedBracketData, winnerId, completedMatch);
  } else if (completedMatch.match_data?.bracket === 'grand_finals') {
    // Grand finals - tournament is complete
    updatedBracketData.tournamentComplete = true;
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
  // Find next match in winners bracket and advance winner
  const currentRound = completedMatch.round_number;
  const nextRound = currentRound + 1;
  
  // Find next match for this winner
  const nextMatch = bracketData.rounds.find(round => 
    round.roundNumber === nextRound && 
    round.bracket === 'winners' && 
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

/**
 * Advance loser to losers bracket
 * @param {Object} bracketData - Current bracket data
 * @param {string} loserId - Loser's ID
 * @param {Object} completedMatch - The completed match
 */
const advanceLoserToLosersBracket = (bracketData, loserId, completedMatch) => {
  // Find appropriate losers bracket match
  const losersRound = Math.ceil(completedMatch.round_number / 2);
  const losersMatch = bracketData.rounds.find(round => 
    round.bracket === 'losers' && 
    round.roundNumber === losersRound &&
    round.matches.some(match => !match.player1 || !match.player2)
  );
  
  if (losersMatch) {
    const availableMatch = losersMatch.matches.find(match => !match.player1 || !match.player2);
    if (availableMatch) {
      if (!availableMatch.player1) {
        availableMatch.player1 = { id: loserId };
      } else if (!availableMatch.player2) {
        availableMatch.player2 = { id: loserId };
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
  // Find next match in losers bracket
  const currentRound = completedMatch.round_number;
  const nextRound = currentRound + 1;
  
  const nextMatch = bracketData.rounds.find(round => 
    round.roundNumber === nextRound && 
    round.bracket === 'losers' && 
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