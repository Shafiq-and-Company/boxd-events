import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { loadStripe } from '@stripe/stripe-js'
import NavBar from '../../components/NavBar'
import styles from './EventDetail.module.css'

export default function EventDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState(null)
  const [redirectHandled, setRedirectHandled] = useState(false)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [registrationDetails, setRegistrationDetails] = useState(null)
  const [stripeSessionId, setStripeSessionId] = useState(null)

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

  // Handle success redirect from Stripe
  useEffect(() => {
    // Simple check for success parameters
    const urlParams = new URLSearchParams(window.location.search)
    const rsvp = urlParams.get('rsvp')
    const sessionId = urlParams.get('session_id')
    
    console.log('Payment redirect check:', { rsvp, sessionId, user, authLoading, event })
    
    if (rsvp === 'success' && sessionId && !redirectHandled && !authLoading && user && event) {
      console.log('Payment success detected, creating RSVP with session ID:', sessionId)
      setStripeSessionId(sessionId)
      setRedirectHandled(true)
      createRSVPFromPayment(sessionId)
    }
  }, [router, redirectHandled, user, authLoading, event])

  const fetchEvent = async () => {
    try {
      console.log('Fetching event with ID:', id)
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
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
        .select('user_id, event_id, status, payment_status, stripe_session_id, created_at, updated_at')
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
      setPaymentError('You are already registered for this event.')
      return
    }

    // If event is free, just create RSVP
    if (!event.cost || event.cost === 0) {
      await createRSVP()
      return
    }

    // For paid events, process payment
    await processPayment()
  }

  const createRSVP = async () => {
    if (!user || !event) {
      setPaymentError('Authentication error. Please try again.')
      return
    }

    try {
      setIsProcessingPayment(true)
      setPaymentError(null)
      
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
        setPaymentError('Error creating RSVP. Please try again.')
        return
      }

      // RSVP succeeded - update registration status and redirect to home page
      setPaymentSuccess(true)
      setIsAlreadyRegistered(true)
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push('/?tab=myEvents&rsvp=success&event=' + event.id)
      }, 2000)
      
    } catch (err) {
      console.error('Error creating RSVP:', err)
      setPaymentError('Error creating RSVP. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const createRSVPFromPayment = async (sessionId) => {
    if (!user || !event) {
      console.error('User or event not available for RSVP creation')
      setPaymentError('Authentication error. Please try again.')
      return
    }

    try {
      console.log('Creating RSVP from payment success with session ID:', sessionId)
      console.log('User context:', { user, authLoading })
      
      setIsProcessingPayment(true)
      setPaymentError(null)
      
      console.log('Creating RSVP with user ID:', user.id)
      
      const { error } = await supabase
        .from('rsvps')
        .insert({
          user_id: user.id,
          event_id: event.id,
          status: 'going',
          payment_status: 'paid',
          stripe_session_id: sessionId
        })

      if (error) {
        console.error('Error creating RSVP from payment:', error)
        setPaymentError('Error creating RSVP. Please try again.')
        return
      }

      console.log('RSVP created successfully from payment')
      setPaymentSuccess(true)
      setIsAlreadyRegistered(true)
      
      // Refresh RSVP status to ensure UI is updated
      setTimeout(() => {
        checkRegistrationStatus()
      }, 1000)
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        console.log('Redirecting to My Events page')
        router.push('/?tab=myEvents&rsvp=success')
      }, 3000)
      
    } catch (err) {
      console.error('Error creating RSVP from payment:', err)
      setPaymentError('Error creating RSVP. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const processPayment = async () => {
    try {
      setIsProcessingPayment(true)
      setPaymentError(null)

      // Check if Stripe keys are configured
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        setPaymentError('Payment processing is not available. Please contact the administrator.')
        return
      }

      // Initialize Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      
      if (!stripe) {
        setPaymentError('Payment system failed to load. Please try again later.')
        return
      }

      // Create checkout session on the server
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          userId: user.id,
          amount: Math.round(event.cost * 100), // Convert to cents
        }),
      })

      if (!response.ok) {
        setPaymentError(`Server error: ${response.status} ${response.statusText}. Please try again.`)
        return
      }

      const { sessionId, url, error: serverError } = await response.json()

      if (serverError) {
        setPaymentError(`Payment setup failed: ${serverError}`)
        return
      }

      if (!url) {
        setPaymentError('Payment system error. Please try again.')
        return
      }

      // Redirect to Stripe Checkout using modern approach
      window.location.href = url
      
    } catch (err) {
      console.error('Payment error:', err)
      setPaymentError(`Payment failed: ${err.message}`)
    } finally {
      setIsProcessingPayment(false)
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
              {event.host && (
                <div className={styles.hostedBy}>
                  <span className={styles.hostedByLabel}>Hosted by</span>
                  <span className={styles.hostName}>{event.host}</span>
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
                <div className={styles.successMessage}>
                  You're already registered
                </div>
              ) : paymentSuccess ? (
                <div className={styles.successMessage}>
                  Successfully registered for this event!
                </div>
              ) : (
                <div className={styles.paymentSection}>
                  {paymentError && (
                    <div className={styles.errorMessage}>
                      {paymentError}
                    </div>
                  )}
                  <button 
                    className={styles.rsvpButton}
                    onClick={handleRSVP}
                    disabled={isProcessingPayment || checkingRegistration}
                  >
                    {isProcessingPayment ? 'Processing...' : checkingRegistration ? 'Checking...' : 'RSVP Now'}
                  </button>
                </div>
              )}
            </div>

            {/* Debug information card */}
            <div className={styles.eventCard} style={{ marginTop: '20px' }}>
              <div className={styles.cardHeader}>
                <h3>Debug Information</h3>
              </div>
              <div className={styles.cardContent}>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  {registrationDetails ? (
                    <>
                      <div><strong>user_id:</strong> {registrationDetails.user_id}</div>
                      <div><strong>event_id:</strong> {registrationDetails.event_id}</div>
                      <div><strong>status:</strong> {registrationDetails.status}</div>
                      <div><strong>payment_status:</strong> {registrationDetails.payment_status}</div>
                      <div><strong>stripe_session_id:</strong> {registrationDetails.stripe_session_id || 'null'}</div>
                      <div><strong>created_at:</strong> {registrationDetails.created_at || 'null'}</div>
                      <div><strong>updated_at:</strong> {registrationDetails.updated_at || 'null'}</div>
                    </>
                  ) : (
                    <div>
                      No registration found
                      {stripeSessionId && (
                        <div style={{ marginTop: '5px', color: '#666' }}>
                          Current session ID: {stripeSessionId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
