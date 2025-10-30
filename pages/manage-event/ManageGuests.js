import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from './ManageGuests.module.css'

export default function ManageGuests() {
  const router = useRouter()
  const { id } = router.query
  
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  const fetchAttendees = useCallback(async () => {
    if (!id) return
    
    try {
      setLoadingAttendees(true)
      
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          users:user_id (
            username,
            first_name
          )
        `)
        .eq('event_id', id)
        .eq('status', 'going')
        .order('created_at', { ascending: true })

      if (error) {
        setAttendees([])
        return
      }

      setAttendees(data || [])
    } catch (err) {
      setAttendees([])
    } finally {
      setLoadingAttendees(false)
    }
  }, [id])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  const handleShareLink = () => {
    const eventUrl = `${window.location.origin}/view-event/${id}`
    navigator.clipboard.writeText(eventUrl).then(() => {
      alert('Event link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy link. Please copy manually: ' + eventUrl)
    })
  }

  return (
    <div className={styles.guestsTabContent}>
      <div className={styles.guestsStats}>
        <div className={styles.guestStat}>
          <div className={styles.guestStatNumber}>
            {loadingAttendees ? '...' : attendees.length}
          </div>
          <div className={styles.guestStatLabel}>
            {attendees.length === 1 ? 'Attendee' : 'Attendees'}
          </div>
        </div>
        
        <div className={styles.shareLinkStat} onClick={handleShareLink}>
          <div className={styles.shareLinkIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </div>
          <div className={styles.shareLinkLabel}>Share Link</div>
        </div>
      </div>

      {loadingAttendees ? (
        <div className={styles.guestsLoading}>Loading attendees...</div>
      ) : attendees.length === 0 ? (
        <div className={styles.guestsEmpty}>
          <div className={styles.guestsEmptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className={styles.guestsEmptyTitle}>No attendees yet</div>
          <div className={styles.guestsEmptyDescription}>
            Share your event to start getting RSVPs
          </div>
        </div>
      ) : (
        <div className={styles.guestsList}>
          {attendees.map((attendee) => (
            <div key={attendee.user_id} className={styles.guestItem}>
              <div className={styles.guestAvatar}>
                <div className={styles.guestInitial}>
                  {(attendee.users?.username?.charAt(0) || attendee.users?.first_name?.charAt(0) || 'U').toUpperCase()}
                </div>
              </div>
              <div className={styles.guestInfo}>
                <div className={styles.guestName}>
                  {attendee.users?.username || attendee.users?.first_name || 'Unknown User'}
                </div>
                <div className={styles.guestJoined}>
                  Joined {new Date(attendee.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

