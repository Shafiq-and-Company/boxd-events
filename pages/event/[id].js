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
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCalendarMonth = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short'
    }).toUpperCase()
  }

  const formatCalendarDay = (dateString) => {
    const date = new Date(dateString)
    return date.getDate().toString()
  }

  const formatTimeRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null
    
    const startTime = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    if (end) {
      const endTime = end.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${startTime} - ${endTime}`
    }
    
    return startTime
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
      <div style={{
        background: `
          linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
        flex: 1
      }}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading event...</div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div style={{
        background: `
          linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
        flex: 1
      }}>
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
    <div style={{
      background: `
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
      `,
      backgroundSize: '8px 8px',
      flex: 1
    }}>
      <NavBar activeTab="" onTabChange={handleTabChange} />
      <div className={styles.container}>
        <div className={styles.eventDetail}>

          <div className={styles.pageLayout}>
            <div className={styles.leftColumn}>
              <div className={styles.eventImage}>
                {event.banner_image_url ? (
                  <img 
                    src={event.banner_image_url} 
                    alt={event.title}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: '0.9rem'
                  }}>
                    No image
                  </div>
                )}
              </div>
              
              <div className={styles.hostedBy}>
                <div className={styles.hostedByIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className={styles.hostedByText}>
                  <div className={styles.hostedByLabel}>Hosted by</div>
                  <div className={styles.hostName}>
                    {event.host_user?.first_name || 'Unknown Host'}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.eventHeader}>
                <h1 className={styles.eventTitle}>{event.title}</h1>
              </div>

              <div className={styles.eventInfo}>
                <div className={styles.dateTime}>
                  <div className={styles.calendarIcon}>
                    <div className={styles.calendarMonth}>{formatCalendarMonth(event.starts_at)}</div>
                    <div className={styles.calendarDay}>{formatCalendarDay(event.starts_at)}</div>
                  </div>
                  <div className={styles.dateTimeText}>
                    <div className={styles.dateText}>{formatDate(event.starts_at)}</div>
                    <div className={styles.timeText}>{formatTimeRange(event.starts_at, event.ends_at)}</div>
                  </div>
                </div>

                {event.location && (
                  <div className={styles.locationInfo}>
                    <div className={styles.locationIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div className={styles.locationText}>
                      <div className={styles.locationAddress}>
                        {event.location}
                        {event.city && `, ${event.city}`}
                        {event.state && `, ${event.state}`}
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.rsvpSection}>
                  <div className={styles.rsvpCard}>
                    <div className={styles.rsvpHeader}>
                      <h3>Registration</h3>
                    </div>
                    <div className={styles.rsvpContent}>
                      <div className={styles.welcomeMessage}>
                        Welcome! Register below to join this event.
                      </div>
                      {user && (
                        <div className={styles.userInfo}>
                          <div className={styles.userIcon}>
                            {user.user_metadata?.avatar_url ? (
                              <img 
                                src={user.user_metadata.avatar_url} 
                                alt="Profile" 
                                className={styles.userAvatar}
                              />
                            ) : (
                              <div className={styles.userInitial}>
                                {user.user_metadata?.first_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          <div className={styles.userDetails}>
                            <div className={styles.userName}>
                              {user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'}
                            </div>
                            <div className={styles.userEmail}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      )}
                      <button 
                        className={styles.rsvpButton}
                        onClick={handleRSVP}
                        disabled={isProcessingRSVP || checkingRegistration || isAlreadyRegistered}
                      >
                        {isProcessingRSVP ? 'Processing...' : 
                         checkingRegistration ? 'Checking...' : 
                         isAlreadyRegistered ? 'Already Registered' : 
                         'One-Click RSVP'}
                      </button>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <div className={styles.aboutSection}>
                    <div className={styles.aboutText}>
                      <div className={styles.aboutTitle}>About</div>
                      <div className={styles.aboutDescription}>
                        {event.description}
                      </div>
                    </div>
                  </div>
                )}

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

          {!user && (
            <div className={styles.loginPrompt}>
              <button 
                className={styles.loginButton}
                onClick={() => router.push('/login')}
              >
                Login to RSVP
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
