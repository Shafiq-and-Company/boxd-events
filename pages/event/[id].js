import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import NavBar from '../../components/NavBar'
import styles from './EventDetail.module.css'

export default function EventDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isProcessingRSVP, setIsProcessingRSVP] = useState(false)
  const [rsvpSuccess, setRsvpSuccess] = useState(false)
  const [rsvpError, setRsvpError] = useState(null)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [registrationDetails, setRegistrationDetails] = useState(null)

  const handleTabChange = (tab) => {
    if (tab === 'upcoming') {
      router.push('/')
    } else {
      router.push(`/?tab=${tab}`)
    }
  }

  useEffect(() => {
    console.log('ID useEffect triggered:', { id, loading })
    if (id) {
      fetchEvent()
    }
  }, [id])

  useEffect(() => {
    if (user && event && !authLoading) {
      console.log('useEffect triggered for registration check:', { user: !!user, event: !!event, authLoading })
      checkRegistrationStatus()
    } else if (!user) {
      setIsAlreadyRegistered(false)
    }
  }, [user, event, authLoading])

  // Function to refresh RSVP status (can be called from parent components)
  const refreshRsvpStatus = () => {
    if (user && event) {
      checkRegistrationStatus()
    }
  }


  const fetchEvent = async () => {
    try {
      console.log('Fetching event with ID:', id)
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host_user:host_id (
            first_name
          )
        `)
        .eq('id', id)
        .single()

      console.log('Event fetch result:', { data, error })

      if (error) {
        throw error
      }

      setEvent(data)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err.message)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const checkRegistrationStatus = async () => {
    if (!user || !event) {
      setIsAlreadyRegistered(false)
      return
    }
    
    try {
      setCheckingRegistration(true)
      console.log('Checking registration status for user:', user.id, 'event:', event.id)
      
      const { data, error } = await supabase
        .from('rsvps')
        .select('user_id, event_id, status, payment_status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('status', 'going')
        .maybeSingle()

      console.log('Registration check result:', { data, error })

      if (error) {
        console.error('Error checking registration status:', error)
        setIsAlreadyRegistered(false)
        setRegistrationDetails(null)
        return
      }

      const isRegistered = !!data
      console.log('Setting isAlreadyRegistered to:', isRegistered)
      setIsAlreadyRegistered(isRegistered)
      setRegistrationDetails(data)
    } catch (err) {
      console.error('Error checking registration status:', err)
      setIsAlreadyRegistered(false)
      setRegistrationDetails(null)
    } finally {
      setCheckingRegistration(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRSVP = async () => {
    // Check if user is logged in
    if (!user) {
      router.push('/login')
      return
    }

    // Check if already registered
    if (isAlreadyRegistered) {
      setRsvpError('You are already registered for this event.')
      return
    }

    // Create RSVP (all events are now free)
    await createRSVP()
  }

  const createRSVP = async () => {
    if (!user || !event) {
      setRsvpError('Authentication error. Please try again.')
      return
    }

    try {
      setIsProcessingRSVP(true)
      setRsvpError(null)
      
      const { error } = await supabase
        .from('rsvps')
        .insert({
          user_id: user.id,
          event_id: event.id,
          status: 'going',
          payment_status: 'paid'
        })

      if (error) {
        console.error('Error creating RSVP:', error)
        setRsvpError('Error creating RSVP. Please try again.')
        return
      }

      // RSVP succeeded - update registration status and redirect to home page
      setRsvpSuccess(true)
      setIsAlreadyRegistered(true)
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push('/?tab=myEvents&rsvp=success&event=' + event.id)
      }, 2000)
      
    } catch (err) {
      console.error('Error creating RSVP:', err)
      setRsvpError('Error creating RSVP. Please try again.')
    } finally {
      setIsProcessingRSVP(false)
    }
  }



  if (loading) {
    console.log('Event detail loading state:', { loading, event, error, id })
    return (
      <div style={{ flex: 1 }}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading event...</div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div style={{ flex: 1 }}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.error}>
            {error || 'Event not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1 }}>
      <NavBar activeTab="" onTabChange={handleTabChange} />
      <div className={styles.container}>
        <div className={styles.eventDetail}>
          <div className={styles.eventHero}>
            <div className={styles.eventImage}></div>
            <div className={styles.eventHeader}>
              {event.game_title && (
                <div className={styles.gameTitle}>{event.game_title}</div>
              )}
              <h1 className={styles.eventTitle}>{event.title}</h1>
              {event.host_user && event.host_user.first_name && (
                <div className={styles.hostedBy}>
                  <span className={styles.hostedByLabel}>Hosted by</span>
                  <span className={styles.hostName}>{event.host_user.first_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.eventContent}>
            <div className={styles.eventCards}>
              <div className={styles.eventCard}>
                <div className={styles.cardHeader}>
                  <h3>Date & Time</h3>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.dateTime}>
                    <div className={styles.date}>{formatDate(event.starts_at)}</div>
                    <div className={styles.timeContainer}>
                      <div className={styles.timeLabel}>Starts:</div>
                      <div className={styles.time}>{formatTime(event.starts_at)}</div>
                    </div>
                    {event.ends_at && (
                      <div className={styles.timeContainer}>
                        <div className={styles.timeLabel}>Ends:</div>
                        <div className={styles.time}>{formatTime(event.ends_at)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {event.location && (
                <div className={styles.eventCard}>
                  <div className={styles.cardHeader}>
                    <h3>Location</h3>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.location}>
                      {event.location}
                      {event.city && `, ${event.city}`}
                      {event.state && `, ${event.state}`}
                    </div>
                  </div>
                </div>
              )}

              {event.cost && (
                <div className={styles.eventCard}>
                  <div className={styles.cardHeader}>
                    <h3>Price</h3>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.price}>
                      {event.cost} USD
                    </div>
                  </div>
                </div>
              )}

              {event.description && (
                <div className={styles.eventCard}>
                  <div className={styles.cardHeader}>
                    <h3>About This Event</h3>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.description}>
                      {event.description}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.eventActions}>
              {!user ? (
                <button 
                  className={styles.rsvpButton}
                  onClick={() => router.push('/login')}
                >
                  Login to RSVP
                </button>
              ) : checkingRegistration ? (
                <div className={styles.loading}>
                  Checking registration status...
                </div>
              ) : isAlreadyRegistered ? (
                <div style={{ 
                  background: '#d4edda', 
                  color: '#155724',
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                  display: 'inline-block'
                }}>
                  ✓ Going
                </div>
              ) : rsvpSuccess ? (
                <div className={styles.successMessage}>
                  Successfully registered for this event!
                </div>
              ) : (
                <div className={styles.rsvpSection}>
                  {rsvpError && (
                    <div className={styles.errorMessage}>
                      {rsvpError}
                    </div>
                  )}
                  <button 
                    className={styles.rsvpButton}
                    onClick={handleRSVP}
                    disabled={isProcessingRSVP || checkingRegistration}
                  >
                    {isProcessingRSVP ? 'Processing...' : checkingRegistration ? 'Checking...' : 'RSVP Now'}
                  </button>
                </div>
              )}
            </div>

            {/* Debug information pills */}
            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ 
                background: '#f0f0f0', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                user: {user?.id?.slice(0, 8) || 'none'}
              </div>
              <div style={{ 
                background: '#f0f0f0', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                event: {event?.id?.slice(0, 8) || 'none'}
              </div>
              {registrationDetails ? (
                <>
                  <div style={{ 
                    background: registrationDetails.status === 'going' ? '#d4edda' : '#f8d7da', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {registrationDetails.status}
                  </div>
                  <div style={{ 
                    background: registrationDetails.payment_status === 'paid' ? '#d4edda' : '#fff3cd', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {registrationDetails.payment_status}
                  </div>
                </>
              ) : (
                <div style={{ 
                  background: '#f8d7da', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  no rsvp
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
