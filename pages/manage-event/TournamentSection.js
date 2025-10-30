import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from './TournamentSection.module.css'

export default function TournamentSection({ eventId, eventTitle, eventDescription, onError }) {
  const router = useRouter()
  const [tournament, setTournament] = useState(null)
  const [tournamentLoading, setTournamentLoading] = useState(false)

  // Load tournament data
  const loadTournament = async () => {
    if (!eventId) return
    
    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading tournament:', error)
        return
      }

      setTournament(tournamentData || null)
    } catch (error) {
      console.error('Error loading tournament:', error)
      setTournament(null)
    }
  }

  // Create tournament
  const createTournament = async () => {
    if (!eventTitle) {
      if (onError) onError('Event title is required to create a tournament')
      return
    }

    setTournamentLoading(true)
    if (onError) onError(null)

    try {
      const tournamentData = {
        event_id: eventId,
        name: eventTitle,
        description: eventDescription || 'Tournament for ' + eventTitle,
        max_participants: 64,
        min_participants: 2,
        status: 'active', // Set to active so bracket is immediately generated
        tournament_type: 'single_elimination',
        rules: 'Standard tournament rules apply. Check with event host for specific details.',
        bracket_data: {}
      }

      const { data: newTournament, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Import tournament manager to generate the bracket
      const tournamentManager = (await import('../../lib/tournamentManager')).default
      
      // Generate the tournament bracket immediately (if enough participants)
      const bracketResult = await tournamentManager.createTournament(newTournament.id, eventTitle)
      
      if (bracketResult) {
        console.log('Tournament bracket generated successfully')
      } else {
        console.log('Tournament created but waiting for more participants')
      }

      setTournament(newTournament)
      
      // Navigate to tournament management page
      router.push(`/manage-tournament/${newTournament.id}`)
    } catch (error) {
      console.error('Error creating tournament:', error)
      if (onError) onError('Failed to create tournament: ' + error.message)
    } finally {
      setTournamentLoading(false)
    }
  }

  useEffect(() => {
    if (eventId) {
      loadTournament()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  return (
    <div className={styles.tournamentSectionTop}>
      <div className={styles.tournamentCard}>
        <div className={styles.tournamentCardContent}>
          <div className={styles.tournamentIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21l-1.5.5c-.5.17-1.03.17-1.53 0l-1.5-.5C4.47 17.98 4 17.55 4 17v-2.34"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21l1.5.5c.5.17 1.03.17 1.53 0l1.5-.5C19.53 17.98 20 17.55 20 17v-2.34"/>
              <path d="M18 2H6l2 7h8l2-7Z"/>
              <path d="M12 9v4"/>
            </svg>
          </div>
          <div className={styles.tournamentCardText}>
            <div className={styles.tournamentCardTitle}>Tournament Brackets</div>
            <div className={styles.tournamentCardDescription}>Manage tournament structure, seed players, and track match results</div>
          </div>
          <div className={styles.tournamentCardActions}>
            {tournament ? (
              <button
                type="button"
                className={styles.manageTournamentCardButton}
                onClick={async () => {
                  try {
                    router.push(`/manage-tournament/${tournament.id}`)
                  } catch (error) {
                    console.error('Error navigating to tournament:', error)
                  }
                }}
                title="Manage tournament"
              >
                Manage →
              </button>
            ) : (
              <button
                type="button"
                className={styles.createTournamentCardButton}
                onClick={createTournament}
                disabled={tournamentLoading || !eventTitle}
                title="Create tournament"
              >
                {tournamentLoading ? 'Creating...' : 'Create Tournament'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

