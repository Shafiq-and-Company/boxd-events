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
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [registrationDetails, setRegistrationDetails] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleTabChange = (tab) => {
    if (tab === 'upcoming') {
      router.push('/')
    } else {
      router.push(`/?tab=${tab}`)
    }
  }

  useEffect(() => {
    if (id) {
      fetchEvent()
    }
  }, [id])

  useEffect(() => {
    if (user && event && !authLoading) {
      checkRegistrationStatus()
    } else if (!user) {
      setIsAlreadyRegistered(false)
    }
  }, [user, event, authLoading])

  const fetchEvent = async () => {
    try {
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

      if (error) {
        throw error
      }

      setEvent(data)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err.message)
    } finally {
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
      
      const { data, error } = await supabase
        .from('rsvps')
        .select('user_id, event_id, status, payment_status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('status', 'going')
        .maybeSingle()

      if (error) {
        console.error('Error checking registration status:', error)
        setIsAlreadyRegistered(false)
        setRegistrationDetails(null)
        return
      }

      const isRegistered = !!data
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

  const copyEventLink = async () => {
    try {
      const eventUrl = `${window.location.origin}/event/${id}`
      await navigator.clipboard.writeText(eventUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleRSVP = async () => {
    // Check if user is logged in
    if (!user) {
      router.push('/login')
      return
    }

    // Check if already registered
    if (isAlreadyRegistered) {
      return
    }

    // Create RSVP (all events are now free)
    await createRSVP()
  }

  const createRSVP = async () => {
    if (!user || !event) {
      return
    }

    try {
      setIsProcessingRSVP(true)
      
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
        return
      }

      // RSVP succeeded - update registration status and redirect to home page
      setIsAlreadyRegistered(true)
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push('/?tab=myEvents&rsvp=success&event=' + event.id)
      }, 2000)
      
    } catch (err) {
      console.error('Error creating RSVP:', err)
    } finally {
      setIsProcessingRSVP(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading event...</div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className={styles.pageWrapper}>
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
    <div className={styles.pageWrapper}>
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
              
              {/* Host Management Section - Only show if user is the host */}
              {user && event && user.id === event.host_id && (
                <div className={styles.hostManagement}>
                  <span className={styles.hostManagementText}>You're hosting this event</span>
                  <button 
                    className={styles.manageButton}
                    onClick={() => router.push(`/manage-event/${event.id}`)}
                  >
                    Manage
                  </button>
                </div>
              )}

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
              <h1 className={styles.eventTitle}>{event.title}</h1>

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

                <div className={styles.rsvpCard}>
                    <div className={styles.rsvpHeader}>
                      <h3>Registration</h3>
                    </div>
                    <div className={styles.rsvpContent}>
                      <div className={styles.welcomeMessage}>
                        {isAlreadyRegistered ? 'See you there!' : 'Welcome! Register below to join this event.'}
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
                      <div className={styles.buttonContainer}>
                        <button 
                          className={styles.rsvpButton}
                          onClick={handleRSVP}
                          disabled={isProcessingRSVP || checkingRegistration || isAlreadyRegistered}
                        >
                          {isProcessingRSVP ? 'Processing...' : 
                           checkingRegistration ? 'Checking...' : 
                           isAlreadyRegistered ? 'Registered' : 
                           'One-Click RSVP'}
                        </button>
                        
                        {isAlreadyRegistered && (
                          <button 
                            className={styles.inviteButton}
                            onClick={copyEventLink}
                            title="Invite a friend to this event"
                          >
                            {copySuccess ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                              </svg>
                            )}
                            {copySuccess ? 'Copied!' : 'Invite a Friend'}
                          </button>
                        )}
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
