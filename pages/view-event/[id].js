import { useState, useEffect, useRef } from 'react'
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
  const [copySuccess, setCopySuccess] = useState(false)
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false)
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(null)
  const [gameBackgroundImage, setGameBackgroundImage] = useState(null)
  const containerRef = useRef(null)

  const handleTabChange = (tab) => {
    router.push(tab === 'upcoming' ? '/' : `/?tab=${tab}`)
  }

  useEffect(() => {
    if (id) fetchEvent()
  }, [id])

  useEffect(() => {
    if (user && event && !authLoading) {
      checkRegistrationStatus()
    } else if (!user) {
      setIsAlreadyRegistered(false)
    }
  }, [user, event, authLoading])

  useEffect(() => {
    if (event) fetchAttendees()
  }, [event])

  useEffect(() => {
    if (!containerRef.current) return

    const overlayColor = currentTheme
      ? (() => {
          const hex = currentTheme.colors.background
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return `rgba(${r}, ${g}, ${b}, 0.8)`
        })()
      : 'rgba(255, 255, 255, 0.95)'

    containerRef.current.style.setProperty('--theme-overlay-color', overlayColor)
  }, [currentTheme])

  // Handle payment success/cancel redirect
  useEffect(() => {
    if (!router.isReady || !id) return
    
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    
    if (paymentStatus === 'success') {
      // Refresh event data to update registration status
      fetchEvent()
      checkRegistrationStatus()
      // Clean up URL
      router.replace(`/view-event/${id}`, undefined, { shallow: true })
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled')
      router.replace(`/view-event/${id}`, undefined, { shallow: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host_user:host_id (first_name, stripe_account_id, stripe_onboarding_complete),
          games (id, game_title, game_background_image_url)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setEvent(data)
      setCurrentTheme(
        data.theme && typeof data.theme === 'object' && data.theme.name
          ? data.theme
          : null
      )

      const gameData = data.game_id
        ? (Array.isArray(data.games) ? data.games[0] : data.games)
        : null
      setGameBackgroundImage(gameData?.game_background_image_url || null)
    } catch (err) {
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

      setIsAlreadyRegistered(error ? false : !!data)
    } catch (err) {
      setIsAlreadyRegistered(false)
    } finally {
      setCheckingRegistration(false)
    }
  }

  const fetchAttendees = async () => {
    if (!event) return

    try {
      setLoadingAttendees(true)
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          users:user_id (username, first_name)
        `)
        .eq('event_id', event.id)
        .eq('status', 'going')
        .order('created_at', { ascending: true })

      setAttendees(data || [])
    } catch (err) {
      setAttendees([])
    } finally {
      setLoadingAttendees(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCalendarMonth = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short'
    }).toUpperCase()
  }

  const formatCalendarDay = (dateString) => {
    return new Date(dateString).getDate().toString()
  }

  const formatTimeRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const startTime = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (!endDate) return startTime

    const end = new Date(endDate)
    const endTime = end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${startTime} - ${endTime}`
  }

  const copyEventLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/view-event/${id}`)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      // Silent fail
    }
  }

  const handleRSVP = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    if (isAlreadyRegistered) return

    // Check if payment is required
    if (event.payment_required && event.cost > 0) {
      // Verify host has Stripe account connected
      if (!event.host_user?.stripe_account_id || !event.host_user?.stripe_onboarding_complete) {
        setError('Event organizer has not set up payment processing yet')
        return
      }

      try {
        setIsProcessingRSVP(true)
        setError(null)

        // Get user's session token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('You must be logged in to register')
          return
        }

        // Create checkout session
        const response = await fetch('/api/stripe/checkout/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            eventId: event.id,
            userId: user.id,
          }),
        })

        const data = await response.json()

        console.log('Checkout session response:', { status: response.status, data })

        if (!response.ok) {
          console.error('Checkout session failed:', data)
          setError(data.error || 'Failed to create payment session')
          return
        }

        if (data.error) {
          console.error('Checkout session error:', data.error)
          setError(data.error)
          return
        }

        if (data.url) {
          console.log('Redirecting to Stripe Checkout:', data.url)
          // Redirect to Stripe Checkout
          window.location.href = data.url
        } else {
          console.error('No checkout URL in response:', data)
          setError('Failed to create payment session - no checkout URL received')
        }
      } catch (error) {
        console.error('Error creating checkout session:', error)
        setError('Error processing payment. Please try again.')
      } finally {
        setIsProcessingRSVP(false)
      }
    } else {
      // Free event - create RSVP directly
      await createRSVP()
    }
  }

  const createRSVP = async () => {
    if (!user || !event) return

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

      if (!error) {
        setIsAlreadyRegistered(true)
        fetchAttendees()
        setTimeout(() => {
          router.push(`/?tab=myEvents&rsvp=success&event=${event.id}`)
        }, 2000)
      }
    } catch (err) {
      // Silent fail
    } finally {
      setIsProcessingRSVP(false)
    }
  }

  const handleUnregister = async () => {
    if (!user || !event) return

    try {
      setIsProcessingRSVP(true)
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('status', 'going')

      if (!error) {
        setIsAlreadyRegistered(false)
        setShowUnregisterConfirm(false)
        fetchAttendees()
      }
    } catch (err) {
      // Silent fail
    } finally {
      setIsProcessingRSVP(false)
    }
  }

  const getAttendeeInitial = (attendee) => {
    return (attendee.users?.username?.charAt(0) || 
            attendee.users?.first_name?.charAt(0) || 
            'U').toUpperCase()
  }

  const getAttendeeName = (attendee) => {
    return attendee.users?.username || 
           attendee.users?.first_name || 
           'Unknown User'
  }

  const getAttendeeCountText = () => {
    if (loadingAttendees) return 'Loading...'
    if (attendees.length === 0) return 'No attendees yet'
    if (attendees.length === 1) return '1 person attending'
    return `${attendees.length} people attending`
  }

  const pageStyle = gameBackgroundImage ? {
    backgroundImage: `url(${gameBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {}

  if (loading) {
    return (
      <div ref={containerRef} className={styles.pageWrapper} style={pageStyle}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading event...</div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div ref={containerRef} className={styles.pageWrapper} style={pageStyle}>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.error}>{error || 'Event not found'}</div>
        </div>
      </div>
    )
  }

  const isHost = user && user.id === event.host_id
  const hasLocation = event.location || event.city || event.state

  return (
    <div ref={containerRef} className={styles.pageWrapper} style={pageStyle}>
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
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>No image</div>
                )}
              </div>
              
              {isHost && (
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

              <div className={styles.attendeesSection}>
                <div className={styles.attendeesHeader}>
                  <div className={styles.attendeesIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className={styles.attendeesLabel}>{getAttendeeCountText()}</div>
                </div>
                
                {!loadingAttendees && attendees.length > 0 && (
                  <div className={styles.attendeesList}>
                    {attendees.map((attendee) => (
                      <div key={attendee.user_id} className={styles.attendeeItem}>
                        <div className={styles.attendeeIcon}>
                          <div className={styles.attendeeInitial}>
                            {getAttendeeInitial(attendee)}
                          </div>
                        </div>
                        <div className={styles.attendeeName}>
                          {getAttendeeName(attendee)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

                <div className={styles.dateSeparate}>
                  <div className={styles.dateTimeText}>
                    <div className={styles.dateText}>{formatDate(event.starts_at)}</div>
                  </div>
                </div>

                <div className={styles.timeSeparate}>
                  <div className={styles.dateTimeText}>
                    <div className={styles.timeText}>{formatTimeRange(event.starts_at, event.ends_at)}</div>
                  </div>
                </div>

                {hasLocation && (
                  <div className={styles.locationInfo}>
                    <div className={styles.locationIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div className={styles.locationText}>
                      {isAlreadyRegistered && event.location ? (
                        <div className={styles.locationAddress}>
                          {event.location}
                          {event.city && `, ${event.city}`}
                          {event.state && `, ${event.state}`}
                        </div>
                      ) : (
                        <>
                          {(event.city || event.state) && (
                            <div className={styles.locationAddress}>
                              {event.city && event.city}
                              {event.city && event.state && `, `}
                              {event.state && event.state}
                            </div>
                          )}
                          {event.location && (
                            <div className={styles.locationNote}>
                              The full address will be shown after you RSVP.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.rsvpCard}>
                  <div className={styles.rsvpHeader}>
                    <h3>Registration</h3>
                    {isAlreadyRegistered && (
                      <button 
                        onClick={() => setShowUnregisterConfirm(true)}
                        className={styles.unregisterButton}
                        disabled={isProcessingRSVP}
                      >
                        I can't make it anymore
                      </button>
                    )}
                  </div>
                  <div className={styles.rsvpContent}>
                    {/* Display registration fee */}
                    {event.payment_required && event.cost > 0 && (
                      <div className={styles.registrationFee}>
                        <span className={styles.feeLabel}>Registration Fee:</span>
                        <span className={styles.feeAmount}>
                          ${parseFloat(event.cost).toFixed(2)}
                        </span>
                        <span className={styles.feeNote}>(+ Stripe processing fees)</span>
                      </div>
                    )}
                    
                    <div className={styles.welcomeMessage}>
                      {isAlreadyRegistered 
                        ? 'You\'re registered for this event!' 
                        : 'Welcome! Register below to join this event.'}
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
                              {user.user_metadata?.first_name?.charAt(0) || 
                               user.email?.charAt(0) || 
                               'U'}
                            </div>
                          )}
                        </div>
                        <div className={styles.userDetails}>
                          <div className={styles.userName}>
                            {user.user_metadata?.first_name || 
                             user.email?.split('@')[0] || 
                             'User'}
                          </div>
                          <div className={styles.userEmail}>{user.email}</div>
                        </div>
                      </div>
                    )}
                    <div className={styles.buttonContainer}>
                      {!isAlreadyRegistered ? (
                        <button 
                          className={styles.rsvpButton}
                          onClick={handleRSVP}
                          disabled={isProcessingRSVP || checkingRegistration}
                        >
                          {isProcessingRSVP 
                            ? 'Processing...' 
                            : checkingRegistration 
                            ? 'Checking...' 
                            : event.payment_required && event.cost > 0
                            ? `Register - $${parseFloat(event.cost).toFixed(2)}`
                            : 'One-Click RSVP'}
                        </button>
                      ) : (
                        <div className={styles.registeredButtons}>
                          <button 
                            className={styles.rsvpButton}
                            style={{ 
                              background: '#e8e8e8', 
                              color: '#666',
                              flex: 1
                            }}
                            disabled
                          >
                            Registered
                          </button>
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
                            {copySuccess ? 'Copied!' : 'Invite'}
                          </button>
                        </div>
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
        </div>
      </div>
      
      {showUnregisterConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Unregister from Event</h3>
            <p className={styles.modalMessage}>
              Are you sure you want to unregister from "{event.title}"? You can always register again later.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowUnregisterConfirm(false)}
                className={styles.modalCancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleUnregister}
                disabled={isProcessingRSVP}
                className={styles.modalConfirmButton}
              >
                {isProcessingRSVP ? 'Unregistering...' : 'Unregister'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
