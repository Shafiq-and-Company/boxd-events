// Single elimination tournament utilities
import { supabase } from './supabaseClient';

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
      name: rsvp.users?.username || `${rsvp.users?.first_name} ${rsvp.users?.last_name}`.trim() || 'Unknown User',
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
 * Generate bracket data for single elimination tournament
 * @param {string} tournamentType - Type of tournament (should be 'single_elimination')
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants = 2) => {
  if (participants.length < minParticipants) {
    throw new Error(`Need at least ${minParticipants} participants. Currently have ${participants.length}.`);
  }

  if (tournamentType !== 'single_elimination') {
    throw new Error(`Unsupported tournament type for single elimination: ${tournamentType}`);
  }

  return generateSingleEliminationBracket(participants);
};

/**
 * Handle match completion for single elimination tournament
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @param {string} tournamentType - Type of tournament
 * @returns {Object} Updated bracket data
 */
export const handleMatchCompletion = (bracketData, completedMatch, winnerId, tournamentType) => {
  if (tournamentType !== 'single_elimination') {
    throw new Error(`Unsupported tournament type for single elimination: ${tournamentType}`);
  }

  return handleSingleEliminationMatchCompletion(bracketData, completedMatch, winnerId);
};
