import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import styles from './ManageRegistration.module.css'

export default function ManageRegistration() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
  const [cost, setCost] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Stripe Connect state
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false)
  const [event, setEvent] = useState(null)

  // Check Stripe account status
  const checkStripeStatus = async () => {
    if (!user) return
    
    try {
      setCheckingStripeStatus(true)
      
      // Get user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        return
      }

      const response = await fetch(`/api/stripe/connect/status?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStripeConnected(data.connected)
        setStripeOnboardingComplete(data.onboarding_complete)
      } else {
        console.error('Error checking Stripe status:', data.error)
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error)
    } finally {
      setCheckingStripeStatus(false)
    }
  }

  // Connect Stripe account
  const connectStripeAccount = async () => {
    if (!user) return
    
    try {
      setError(null)
      
      // Get user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to connect Stripe')
        return
      }

      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          userId: user.id,
          eventId: id, // Include eventId for redirect URLs
        }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        setError(data.error)
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      setError('Failed to connect Stripe account')
    }
  }

  const fetchCost = useCallback(async () => {
    if (!id || !user) return
    
    try {
      setFetchLoading(true)
      setError(null)

      const { data: eventData, error } = await supabase
        .from('events')
        .select('cost, payment_required')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (error) throw error
      if (!eventData) throw new Error('Event not found or you do not have permission to edit it')

      setEvent(eventData)
      setCost(eventData.cost || '')
      
      // Check Stripe status if payment is required
      if (eventData.payment_required) {
        await checkStripeStatus()
      }
    } catch (err) {
      console.error('Error fetching cost:', err)
      setError(err.message)
    } finally {
      setFetchLoading(false)
    }
  }, [id, user])

  const handleCostChange = (e) => {
    setCost(e.target.value)
  }

  const handleUpdateCost = async () => {
    if (!user) {
      setError('You must be logged in to edit an event')
      return
    }

    const costValue = parseFloat(cost) || 0
    const paymentRequired = costValue > 0

    // If setting payment, ensure Stripe is connected
    if (paymentRequired && !stripeOnboardingComplete) {
      setError('Please connect your Stripe account before setting a registration fee')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          cost: costValue || null,
          payment_required: paymentRequired
        })
        .eq('id', id)
        .eq('host_id', user.id)
        .select()

      if (error) {
        console.error('Database update error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        setError('No rows were updated. You may not have permission to edit this event.')
        return
      }

      setEvent(data[0])
      
      // If payment was just enabled, check Stripe status
      if (paymentRequired) {
        await checkStripeStatus()
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Registration Fee Updated', {
          body: 'Event registration fee has been updated successfully!',
          icon: '/favicon.ico'
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    fetchCost()
  }, [fetchCost])

  // Handle Stripe redirect after onboarding
  useEffect(() => {
    if (!router.isReady) return
    
    const params = new URLSearchParams(window.location.search)
    const stripeStatus = params.get('stripe')
    
    if (stripeStatus === 'success') {
      // Refresh Stripe status after successful onboarding
      checkStripeStatus()
      // Clean up URL
      router.replace(`/manage-event/${id}`, undefined, { shallow: true })
    } else if (stripeStatus === 'refresh') {
      // User was redirected back, check status again
      checkStripeStatus()
      router.replace(`/manage-event/${id}`, undefined, { shallow: true })
    }
  }, [router.isReady, id])

  if (!user) {
    return (
      <div className={styles.manageRegistration}>
        <div className={styles.authRequired}>Please log in to edit event registration.</div>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className={styles.manageRegistration}>
        <div className={styles.loading}>Loading registration details...</div>
      </div>
    )
  }

  return (
    <div className={styles.manageRegistration}>
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.registrationTabContent}>
        {/* Stripe Connection Section */}
        {event?.payment_required && !stripeOnboardingComplete && (
          <div className={styles.stripeSection}>
            <h3 className={styles.sectionTitle}>Payment Processing</h3>
            <p className={styles.stripeDescription}>
              Connect your Stripe account to collect registration fees. Locals takes a 6% platform fee on each registration.
            </p>
            <button 
              onClick={connectStripeAccount} 
              className={styles.connectButton}
              disabled={checkingStripeStatus}
            >
              {checkingStripeStatus 
                ? 'Checking...' 
                : stripeConnected 
                ? 'Complete Stripe Setup' 
                : 'Connect Stripe Account'}
            </button>
          </div>
        )}

        {/* Registration Fee Section */}
        <div className={styles.costSection}>
          <h3 className={styles.sectionTitle}>Registration Fee</h3>
          {!stripeOnboardingComplete && event?.payment_required && (
            <p className={styles.warningText}>
              Connect your Stripe account above before setting a registration fee.
            </p>
          )}
          <div className={styles.costInputRow}>
            <div className={styles.formGroup}>
              <input
                type="number"
                id="cost"
                name="cost"
                value={cost}
                onChange={handleCostChange}
                className={styles.input}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={event?.payment_required && !stripeOnboardingComplete}
              />
            </div>
            <button 
              type="button"
              onClick={handleUpdateCost}
              disabled={loading || (event?.payment_required && !stripeOnboardingComplete)}
              className={styles.updateCostButton}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
          {cost > 0 && (
            <p className={styles.feeInfo}>
              Registration fee: ${parseFloat(cost).toFixed(2)} | 
              Platform fee (6%): ${(parseFloat(cost) * 0.06).toFixed(2)} | 
              You receive: ${(parseFloat(cost) * 0.94).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

