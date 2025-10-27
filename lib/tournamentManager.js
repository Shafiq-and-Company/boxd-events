import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { supabase } from './supabaseClient';

/**
 * Tournament Management Module
 * 
 * Data Flow:
 * 1. getTournamentParticipants(eventId) - Loads participants from RSVPs with status='going'
 *    - Links to users table via rsvps.user_id -> users.id
 *    - Returns array of { id: user_id, name, created_at }
 * 
 * 2. createEventTournament(eventId, config) - Creates tournament and bracket
 *    - Creates tournament record in tournaments table
 *    - Gets participants from RSVPs for the event
 *    - Uses brackets-manager to generate bracket structure
 *    - Enriches participant data with user_id from RSVPs
 *    - Stores enriched bracket_data in tournaments.bracket_data (JSONB)
 * 
 * 3. updateMatchResult(tournamentId, matchId, scores) - Updates match scores
 *    - Preserves user_id and tournament_id data when updating matches
 * 
 * Data Relationships:
 * - RSVPs -> Users: rsvps.user_id = users.id
 * - RSVPs -> Events: rsvps.event_id = events.id  
 * - Tournaments -> Events: tournaments.event_id = events.id
 * - Bracket participants contain: user_id (from RSVP), tournament_id (tournament UUID), and bracket data
 */

// Create fresh in-memory manager
function createManager() {
  const storage = new InMemoryDatabase();
  return new BracketsManager(storage);
}

// Get participants from RSVPs
async function getTournamentParticipants(eventId) {
  const { data: rsvps, error } = await supabase
    .from('rsvps')
    .select(`
      user_id,
      created_at,
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
  
  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }
  
  if (!rsvps || rsvps.length === 0) {
    return [];
  }
  
  const participants = rsvps.map((rsvp, index) => {
    const user = rsvp.users;
    if (!user) {
      console.warn(`Missing user data for rsvp with user_id: ${rsvp.user_id}`);
      return {
        id: rsvp.user_id, // This is the user_id from RSVP linked to users table
        name: `User ${rsvp.user_id}`,
        created_at: rsvp.created_at,
        bracket_index: index // Position for bracket seeding
      };
    }
    
    return {
      id: rsvp.user_id, // This is the actual user_id from the rsvps.user_id column
      name: user.username || 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
            `User ${rsvp.user_id}`,
      created_at: rsvp.created_at,
      bracket_index: index // Position for bracket seeding
    };
  });
  
  console.log(`Loaded ${participants.length} participants from RSVPs for event ${eventId}:`, participants);
  
  return participants;
}

// Create tournament
async function createEventTournament(eventId, tournamentConfig) {
  try {
    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, host_id, title')
      .eq('id', eventId)
      .single();
    
    if (eventError) throw eventError;
    if (!event) throw new Error('Event not found');
    
    // Get participants from RSVPs
    const participants = await getTournamentParticipants(eventId);
    
    if (participants.length < (tournamentConfig.min_participants || 2)) {
      throw new Error(`Minimum ${tournamentConfig.min_participants || 2} participants required`);
    }
    
    if (tournamentConfig.max_participants && participants.length > tournamentConfig.max_participants) {
      throw new Error(`Maximum ${tournamentConfig.max_participants} participants allowed`);
    }
    
    // Check if tournament already exists
    const { data: existingTournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', eventId)
      .single();
    
    let tournamentId;
    
    if (existingTournament) {
      tournamentId = existingTournament.id;
    } else {
      // Create tournament record
      const { data: newTournament, error: createError } = await supabase
        .from('tournaments')
        .insert({
          event_id: eventId,
          name: tournamentConfig.name || event.title || 'Tournament',
          description: tournamentConfig.description || '',
          tournament_type: tournamentConfig.tournament_type || 'single_elimination',
          max_participants: tournamentConfig.max_participants || participants.length,
          min_participants: tournamentConfig.min_participants || 2,
          status: 'registration',
          bracket_data: {}
        })
        .select()
        .single();
      
      if (createError) throw createError;
      tournamentId = newTournament.id;
    }
    
    // Initialize bracket using brackets-manager
    const storage = new InMemoryDatabase();
    const manager = new BracketsManager(storage);
    
    // Prepare seeding data (just names for brackets-manager)
    const seeding = participants.map(p => p.name);
    
    // Create bracket stage
    await manager.create.stage({
      tournamentId: 0,
      name: 'Main Bracket',
      type: tournamentConfig.tournament_type || 'single_elimination',
      seeding: seeding,
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true
      }
    });
    
    // Get ALL bracket data from in-memory storage
    const rawBracketData = {
      participant: await storage.select('participant'),
      stage: await storage.select('stage'),
      group: await storage.select('group'),
      round: await storage.select('round'),
      match: await storage.select('match')
    };
    
    // Map participants to include actual user_ids from RSVPs
    // brackets-manager creates participants with id: 0, 1, 2, etc.
    // We need to preserve the mapping to actual user_ids from our participants array
    const enrichedParticipants = rawBracketData.participant.map((p, index) => {
      // Find the corresponding participant by name match
      const originalParticipant = participants.find(op => op.name === p.name);
      return {
        ...p,
        tournament_id: tournamentId, // Store the actual tournament UUID
        user_id: originalParticipant?.id || null, // Store the user_id from RSVP
        rsvp_data: originalParticipant || null // Store full participant data
      };
    });
    
    console.log('Enriched participants with user_ids:', enrichedParticipants);
    
    const bracketData = {
      ...rawBracketData,
      participant: enrichedParticipants
    };
    
    console.log(`Tournament ${tournamentId} bracket data structure:`, {
      participants: bracketData.participant.length,
      stages: bracketData.stage.length,
      matches: bracketData.match.length,
      sampleParticipant: bracketData.participant[0]
    });
    
    // Update tournament with bracket data
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ 
        bracket_data: bracketData,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', tournamentId);
    
    if (updateError) throw updateError;
    
    // Fetch and return the complete tournament
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    return tournament;
  } catch (error) {
    console.error('Failed to create tournament:', error);
    throw error;
  }
}

// Update match results
async function updateMatchResult(tournamentId, matchId, scores) {
  const { data: tournament, error: fetchError } = await supabase
    .from('tournaments')
    .select('bracket_data')
    .eq('id', tournamentId)
    .single();
  
  if (fetchError) throw fetchError;
  
  if (!tournament.bracket_data || !tournament.bracket_data.match) {
    throw new Error('Tournament bracket data not found');
  }
  
  const manager = createManager();
  const storage = manager.storage;
  
  // Load existing bracket data into in-memory database
  // IMPORTANT: Extract enriched fields from participants before inserting
  const bracketData = tournament.bracket_data;
  const enrichedParticipantData = bracketData.participant || [];
  
  // Create a map of participant id to enriched data (user_id, tournament_id, etc.)
  const enrichmentMap = new Map();
  enrichedParticipantData.forEach(p => {
    if (p.id !== undefined && p.id !== null) {
      enrichmentMap.set(p.id, {
        user_id: p.user_id,
        tournament_id: p.tournament_id,
        rsvp_data: p.rsvp_data
      });
    }
  });
  
  // Strip enriched fields before inserting into brackets-manager storage
  const cleanParticipants = enrichedParticipantData.map(p => ({
    id: p.id,
    tournament_id: p.tournament_id, // brackets-manager expects this
    name: p.name
  }));
  
  await storage.insert('participant', cleanParticipants);
  await storage.insert('stage', bracketData.stage || []);
  await storage.insert('group', bracketData.group || []);
  await storage.insert('round', bracketData.round || []);
  await storage.insert('match', bracketData.match || []);
  
  // Update match using brackets-manager
  await manager.update.match({
    id: matchId,
    opponent1: { score: scores.opponent1 },
    opponent2: { score: scores.opponent2 }
  });
  
  // Get updated data from in-memory storage
  const rawUpdatedData = {
    participant: await storage.select('participant'),
    stage: await storage.select('stage'),
    group: await storage.select('group'),
    round: await storage.select('round'),
    match: await storage.select('match')
  };
  
  // Re-enrich participants with original data
  const updatedBracketData = {
    ...rawUpdatedData,
    participant: rawUpdatedData.participant.map(p => ({
      ...p,
      ...enrichmentMap.get(p.id)
    }))
  };
  
  // Update tournament record in Supabase
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ 
      bracket_data: updatedBracketData,
      updated_at: new Date().toISOString()
    })
    .eq('id', tournamentId);
  
  if (updateError) throw updateError;
  
  return updatedBracketData;
}

export { 
  createEventTournament, 
  updateMatchResult, 
  getTournamentParticipants,
  createManager
};

