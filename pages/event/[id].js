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
    }
  }, [user, event, authLoading])

  // Handle success redirect from Stripe
  useEffect(() => {
    // Simple check for success parameters
    const urlParams = new URLSearchParams(window.location.search)
    const rsvp = urlParams.get('rsvp')
    const sessionId = urlParams.get('session_id')
    
    console.log('Payment redirect check:', { rsvp, sessionId, user, authLoading, event })
    
    if (rsvp === 'success' && sessionId && !redirectHandled && !authLoading && user && event) {
      console.log('Payment success detected, creating RSVP')
      setRedirectHandled(true)
      createRSVPFromPayment()
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
    if (!user || !event) return
    
    try {
      setCheckingRegistration(true)
      console.log('Checking registration status for user:', user.id, 'event:', event.id)
      
      // Try to get the session first to ensure we have proper auth context
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        console.error('No valid session found')
        return
      }
      
      const { data, error } = await supabase
        .from('rsvps')
        .select('id, status')
        .eq('user_id', session.user.id)
        .eq('event_id', event.id)
        .eq('status', 'going')
        .maybeSingle()

      console.log('Registration check result:', { data, error })

      if (error) {
        console.error('Error checking registration status:', error)
        return
      }

      const isRegistered = !!data
      console.log('Setting isAlreadyRegistered to:', isRegistered)
      setIsAlreadyRegistered(isRegistered)
    } catch (err) {
      console.error('Error checking registration status:', err)
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
    try {
      setIsProcessingPayment(true)
      setPaymentError(null)
      
      // Get fresh session for RLS compliance
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        setPaymentError('Authentication error. Please try again.')
        return
      }
      
      const { error } = await supabase
        .from('rsvps')
        .insert({
          user_id: session.user.id, // Use session user ID for RLS compliance
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

  const createRSVPFromPayment = async () => {
    try {
      console.log('Creating RSVP from payment success')
      console.log('User context:', { user, authLoading })
      
      // Wait for user to be loaded
      if (authLoading) {
        console.log('Waiting for user authentication...')
        return
      }
      
      if (!user) {
        console.error('User not authenticated - redirecting to login')
        router.push('/login')
        return
      }
      
      if (!event) {
        console.error('Event not loaded yet')
        return
      }
      
      setIsProcessingPayment(true)
      setPaymentError(null)
      
      // Refresh the user session to ensure RLS policies work correctly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Error getting session:', sessionError)
        setPaymentError('Authentication error. Please try again.')
        return
      }
      
      if (!session?.user) {
        console.error('No valid session found')
        router.push('/login')
        return
      }
      
      console.log('Creating RSVP with user ID:', session.user.id)
      
      const { error } = await supabase
        .from('rsvps')
        .insert({
          user_id: session.user.id, // Use session user ID for RLS compliance
          event_id: event.id,
          status: 'going',
          payment_status: 'paid'
        })

      if (error) {
        console.error('Error creating RSVP from payment:', error)
        console.error('RLS error details:', error)
        setPaymentError('Error creating RSVP. Please try again.')
        return
      }

      console.log('RSVP created successfully from payment')
      setPaymentSuccess(true)
      setIsAlreadyRegistered(true)
      
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
              {console.log('Render state:', { user: !!user, isAlreadyRegistered, paymentSuccess, isProcessingPayment, checkingRegistration })}
              {/* Debug button for testing */}
              {user && (
                <button 
                  onClick={() => checkRegistrationStatus()}
                  style={{ marginBottom: '10px', fontSize: '12px', padding: '4px 8px' }}
                >
                  Debug: Check Registration
                </button>
              )}
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
                  ✓ You are registered for this event!
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
          </div>
        </div>
      </div>
    </div>
  )
}
