import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './Participants.module.css'

export default function Participants({ eventId, maxParticipants = null }) {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)

  useEffect(() => {
    if (eventId) {
      fetchParticipants()
    }
  }, [eventId])

  const fetchParticipants = async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      
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
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      setParticipants(data || [])
    } catch (err) {
      setError(err.message)
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }

  const getParticipantName = (participant) => {
    const user = participant.users
    if (user?.username) {
      return user.username
    }
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user?.first_name) {
      return user.first_name
    }
    return 'Unknown User'
  }

  const getParticipantInitials = (participant) => {
    const user = participant.users
    if (user?.username) {
      return user.username.charAt(0).toUpperCase()
    }
    if (user?.first_name) {
      return user.first_name.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newParticipants = [...participants]
    const draggedParticipant = newParticipants[draggedIndex]
    
    // Remove the dragged participant
    newParticipants.splice(draggedIndex, 1)
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newParticipants.splice(insertIndex, 0, draggedParticipant)
    
    setParticipants(newParticipants)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  if (loading) {
    return (
      <div className={styles.participantsCard}>
        <div className={styles.participantsHeader}>
          <h3 className={styles.participantsTitle}>Participants</h3>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.participantsCard}>
        <div className={styles.participantsHeader}>
          <h3 className={styles.participantsTitle}>Participants</h3>
          <div className={styles.errorText}>Error loading participants</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.participantsCard}>
      <div className={styles.participantsHeader}>
        <h3 className={styles.participantsTitle}>Participants</h3>
        <div className={styles.participantsCount}>
          {participants.length === 0 
            ? 'No participants yet' 
            : participants.length === 1 
              ? '1 participant' 
              : `${participants.length} participants`
          }
          {maxParticipants && (
            <span className={styles.maxParticipants}>
              / {maxParticipants} max
            </span>
          )}
        </div>
      </div>
      
      {participants.length > 0 ? (
        <div className={styles.participantsList}>
          {participants.map((participant, index) => (
            <div 
              key={participant.user_id} 
              className={`${styles.participantItem} ${draggedIndex === index ? styles.dragging : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="12" r="1"/>
                  <circle cx="9" cy="5" r="1"/>
                  <circle cx="9" cy="19" r="1"/>
                  <circle cx="20" cy="12" r="1"/>
                  <circle cx="20" cy="5" r="1"/>
                  <circle cx="20" cy="19" r="1"/>
                </svg>
              </div>
              <div className={styles.participantNumber}>
                {index + 1}
              </div>
              <div className={styles.participantAvatar}>
                <div className={styles.participantInitial}>
                  {getParticipantInitials(participant)}
                </div>
              </div>
              <div className={styles.participantInfo}>
                <div className={styles.participantName}>
                  {getParticipantName(participant)}
                </div>
              </div>
              {index === 0 && (
                <div className={styles.hostBadge}>
                  Host
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noParticipants}>
          <div className={styles.noParticipantsIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className={styles.noParticipantsText}>
            Be the first to join this event!
          </p>
        </div>
      )}
    </div>
  )
}
