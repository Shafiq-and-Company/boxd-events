import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import Script from 'next/script';

const ManageTournament = () => {
  const router = useRouter();
  const { eventId } = router.query;
  
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const bracketContainerRef = useRef(null);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchParticipants();
      fetchTournament();
    }
  }, [eventId]);

  useEffect(() => {
    if (tournament && bracketContainerRef.current && viewerLoaded) {
      renderBracket();
    }
  }, [tournament, viewerLoaded]);

  const fetchEvent = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
    }
  };

  const fetchParticipants = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          users:user_id (
            username,
            first_name,
            last_name
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'going')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedParticipants = (data || []).map(rsvp => {
        const user = rsvp.users;
        return {
          id: rsvp.user_id,
          name: user?.username || 
                `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 
                `User ${rsvp.user_id}`,
          created_at: rsvp.created_at
        };
      });

      setParticipants(mappedParticipants);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const fetchTournament = async () => {
    if (!eventId) return;
    
    try {
      setBracketLoading(true);
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) {
        // Tournament might not exist yet
        console.error('Error fetching tournament:', error);
        return;
      }

      setTournament(data);
    } catch (err) {
      console.error('Error fetching tournament:', err);
    } finally {
      setBracketLoading(false);
    }
  };

  const renderBracket = async () => {
    if (!tournament || !tournament.bracket_data || !bracketContainerRef.current) return;
    
    try {
      // Check if bracket_data is empty or has no stages
      if (!tournament.bracket_data.stage || 
          !tournament.bracket_data.match || 
          !tournament.bracket_data.participant) {
        return;
      }

      // Wait for bracketsViewer to be available
      if (typeof window === 'undefined' || !window.bracketsViewer) {
        console.log('Waiting for bracketsViewer to load...');
        return;
      }
      
      // Clear container
      bracketContainerRef.current.innerHTML = '';
      
      // Create a wrapper div with proper class for brackets-viewer
      const wrapper = document.createElement('div');
      wrapper.className = 'brackets-viewer';
      bracketContainerRef.current.appendChild(wrapper);
      
      // Use bracketsViewer from window (loaded via CDN)
      window.bracketsViewer.render({
        stages: tournament.bracket_data.stage,
        matches: tournament.bracket_data.match,
        participants: tournament.bracket_data.participant
      }, {
        clear: true
      });
    } catch (err) {
      console.error('Error rendering bracket:', err);
    }
  };

  const createTournamentBracket = async () => {
    if (!eventId || !participants || participants.length < 2) {
      alert('You need at least 2 participants to create a tournament');
      return;
    }

    try {
      setCreatingTournament(true);

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
            name: event?.title || 'Tournament',
            tournament_type: 'single_elimination',
            max_participants: participants.length,
            min_participants: 2,
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
      let seeding = participants.map(p => p.name);

      // Calculate next power of 2
      const participantCount = participants.length;
      const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(participantCount)));
      
      // Pad with nulls if needed (nulls will become BYEs)
      if (seeding.length < nextPowerOf2) {
        const byesNeeded = nextPowerOf2 - seeding.length;
        seeding = seeding.concat(new Array(byesNeeded).fill(null));
      }

      // Create bracket stage
      await manager.create.stage({
        tournamentId: 0,
        name: 'Main Bracket',
        type: 'single_elimination',
        seeding: seeding,
        settings: {
          seedOrdering: ['natural'],
          balanceByes: true
        }
      });

      // Get ALL bracket data from in-memory storage
      const bracketData = {
        participant: await storage.select('participant'),
        stage: await storage.select('stage'),
        group: await storage.select('group'),
        round: await storage.select('round'),
        match: await storage.select('match')
      };

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

      // Refetch tournament to update the UI
      await fetchTournament();
    } catch (err) {
      console.error('Error creating tournament bracket:', err);
      alert('Failed to create tournament bracket: ' + err.message);
    } finally {
      setCreatingTournament(false);
    }
  };

  const handleBackToEvents = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.css"
        />
      </Head>
      <Script 
        src="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          setViewerLoaded(true);
        }}
      />
    <div style={{ 
      minHeight: '100vh',
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem'
      }}>
        <h1 style={{ 
          fontSize: '2rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
          color: '#000000'
        }}>
          Tournament Management
        </h1>
        {event && (
          <p style={{ 
            fontSize: '1rem',
            color: '#404040'
          }}>
            {event.title}
          </p>
        )}
      </div>

      {/* Participants Panel */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #000000',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 500,
          marginBottom: '1rem',
          color: '#000000'
        }}>
          Participants ({participants.length})
        </h2>

        {loading && (
          <div style={{
            color: '#707070',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            Loading participants...
          </div>
        )}

        {error && (
          <div style={{
            color: '#404040',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && participants.length === 0 && (
          <div style={{
            color: '#707070',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            No participants registered yet
          </div>
        )}

        {!loading && participants.length > 0 && (
          <div style={{
            display: 'grid',
            gap: '0.5rem'
          }}>
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                style={{
                  padding: '0.75rem',
                  background: '#F8F8F8',
                  border: '1px solid #E8E8E8',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#E8E8E8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F8F8F8';
                }}
              >
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#000000',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginRight: '0.75rem'
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#000000'
                  }}>
                    {participant.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bracket Visualization Panel */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #000000',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 500,
            color: '#000000',
            margin: 0
          }}>
            Tournament Bracket
          </h2>
          
          {(!tournament || !tournament.bracket_data?.stage || tournament.bracket_data?.stage.length === 0) && (
            <button
              onClick={createTournamentBracket}
              disabled={creatingTournament || participants.length < 2}
              style={{
                background: creatingTournament ? '#E8E8E8' : '#000000',
                color: creatingTournament ? '#707070' : '#ffffff',
                border: 'none',
                borderRadius: 0,
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: creatingTournament || participants.length < 2 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!creatingTournament && participants.length >= 2) {
                  e.target.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!creatingTournament && participants.length >= 2) {
                  e.target.style.opacity = '1';
                }
              }}
            >
              {creatingTournament ? 'Creating...' : 'Create Tournament'}
            </button>
          )}
        </div>
        
        {tournament && (
          <div style={{
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#404040',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {tournament.status && (
              <span>
                Status: <span style={{ textTransform: 'capitalize' }}>{tournament.status}</span>
              </span>
            )}
            {tournament.tournament_type && (
              <span>
                Type: <span style={{ textTransform: 'capitalize' }}>{tournament.tournament_type.replace('_', ' ')}</span>
              </span>
            )}
            {tournament.name && (
              <span>
                Name: <span>{tournament.name}</span>
              </span>
            )}
          </div>
        )}

        {bracketLoading && (
          <div style={{
            color: '#707070',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            Loading bracket...
          </div>
        )}

        {!tournament && !bracketLoading && (
          <div style={{
            color: '#707070',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            No tournament created yet
          </div>
        )}

        {tournament && 
         (!tournament.bracket_data || 
          !tournament.bracket_data.stage || 
          tournament.bracket_data.stage.length === 0 || 
          !tournament.bracket_data.match ||
          tournament.bracket_data.match.length === 0) && (
          <div style={{
            color: '#707070',
            fontSize: '0.875rem',
            padding: '1rem 0'
          }}>
            Bracket not initialized yet
          </div>
        )}

        <div 
          ref={bracketContainerRef}
          style={{
            minHeight: '200px',
            overflowX: 'auto'
          }}
        />
      </div>

      {/* Back Button */}
      <button
        onClick={handleBackToEvents}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#ffffff',
          border: '1px solid #000000',
          borderRadius: 0,
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '3px 3px 0px 0px #000000'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000000';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span>←</span>
        <span>Back to Events</span>
      </button>
    </div>
    </>
  );
};

export default ManageTournament;