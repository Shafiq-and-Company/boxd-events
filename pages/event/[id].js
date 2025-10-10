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

  // Handle success redirect from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const rsvpSuccess = urlParams.get('rsvp')
    const sessionId = urlParams.get('session_id')
    
    if (rsvpSuccess === 'success' && sessionId) {
      setPaymentSuccess(true)
      // Redirect to My Events page after showing success message
      setTimeout(() => {
        router.push('/?tab=my-events&rsvp=success')
      }, 3000)
    }
  }, [router])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      setEvent(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
      
      const { error } = await supabase
        .from('rsvps')
        .insert({
          user_id: user.id,
          event_id: event.id,
          status: 'going'
        })

      if (error) {
        setPaymentError('Error creating RSVP. Please try again.')
        return
      }

      // RSVP succeeded - redirect to home page
      setPaymentSuccess(true)
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        router.push('/?rsvp=success&event=' + event.id)
      }, 2000)
      
    } catch (err) {
      console.error('Error creating RSVP:', err)
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
              ) : paymentSuccess ? (
                <div className={styles.successMessage}>
                  ✅ Successfully registered for this event!
                </div>
              ) : (
                <div className={styles.paymentSection}>
                  {paymentError && (
                    <div className={styles.errorMessage}>
                      ❌ {paymentError}
                    </div>
                  )}
                  <button 
                    className={styles.rsvpButton}
                    onClick={handleRSVP}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Processing...' : 'RSVP Now'}
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
