// Tournament utilities - main interface to tournament type-specific utilities
import { generateSingleEliminationBracket, handleSingleEliminationMatchCompletion } from './singleElimination';
import { generateDoubleEliminationBracket, handleDoubleEliminationMatchCompletion } from './doubleElimination';
import { generateRoundRobinBracket, handleRoundRobinMatchCompletion } from './roundRobin';
import { generateSwissBracket, handleSwissMatchCompletion } from './swiss';
import { supabase } from './supabaseClient';

/**
 * Generate bracket data for any tournament type
 * @param {string} tournamentType - Type of tournament
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants = 2) => {
  if (participants.length < minParticipants) {
    throw new Error(`Need at least ${minParticipants} participants. Currently have ${participants.length}.`);
  }

  switch (tournamentType) {
    case 'single_elimination':
      return generateSingleEliminationBracket(participants);
    case 'double_elimination':
      return generateDoubleEliminationBracket(participants);
    case 'round_robin':
      return generateRoundRobinBracket(participants);
    case 'swiss':
      return generateSwissBracket(participants);
    default:
      throw new Error(`Unsupported tournament type: ${tournamentType}`);
  }
};

/**
 * Handle match completion for any tournament type
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @param {string} tournamentType - Type of tournament
 * @returns {Object} Updated bracket data
 */
export const handleMatchCompletion = (bracketData, completedMatch, winnerId, tournamentType) => {
  switch (tournamentType) {
    case 'single_elimination':
      return handleSingleEliminationMatchCompletion(bracketData, completedMatch, winnerId);
    case 'double_elimination':
      return handleDoubleEliminationMatchCompletion(bracketData, completedMatch, winnerId);
    case 'round_robin':
      return handleRoundRobinMatchCompletion(bracketData, completedMatch, winnerId);
    case 'swiss':
      return handleSwissMatchCompletion(bracketData, completedMatch, winnerId);
    default:
      throw new Error(`Unsupported tournament type: ${tournamentType}`);
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

// Legacy exports for backward compatibility
export { handleDoubleEliminationMatchCompletion, handleSingleEliminationMatchCompletion };
