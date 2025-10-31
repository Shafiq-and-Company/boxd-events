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
  const [stripeAccountDetails, setStripeAccountDetails] = useState(null)
  const [event, setEvent] = useState(null)

  // Check Stripe account status
  const checkStripeStatus = useCallback(async () => {
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
        // Store detailed account information
        setStripeAccountDetails({
          account_id: data.account_id,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
          details_submitted: data.details_submitted,
          requirements: data.requirements,
        })
      } else {
        console.error('Error checking Stripe status:', data.error)
        setStripeAccountDetails(null)
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error)
      setStripeAccountDetails(null)
    } finally {
      setCheckingStripeStatus(false)
    }
  }, [user])


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
  }, [id, user, checkStripeStatus])

  const handleCostChange = (e) => {
    const newCost = e.target.value
    setCost(newCost)
    
    // Check Stripe status if user is entering a fee (cost > 0)
    // This ensures status is checked before they try to save
    if (parseFloat(newCost) > 0 && !event?.payment_required) {
      checkStripeStatus()
    }
  }

  const handleUpdateCost = async () => {
    if (!user) {
      setError('You must be logged in to edit an event')
      return
    }

    const costValue = parseFloat(cost) || 0
    const paymentRequired = costValue > 0

    // If setting payment, check Stripe status first
    if (paymentRequired) {
      // Verify Stripe status before allowing fee update
      if (!stripeAccountDetails) {
        // Fetch Stripe status if we don't have it yet
        await checkStripeStatus()
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Check again after fetching status
      if (!stripeOnboardingComplete) {
        setError('Please complete your Stripe account setup in user settings before setting a registration fee. Click "Go to Stripe Setup" above.')
        return
      }
      
      // Validate that charges and payouts are enabled
      if (stripeAccountDetails && (!stripeAccountDetails.charges_enabled || !stripeAccountDetails.payouts_enabled)) {
        setError('Your Stripe account is not fully activated. Please complete all onboarding requirements in user settings.')
        return
      }
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
              You need to connect your Stripe account to collect registration fees. Set up your Stripe account in your user settings.
            </p>
            <button 
              onClick={() => router.push('/?tab=settings')} 
              className={styles.connectButton}
            >
              Go to Stripe Setup
            </button>
          </div>
        )}

        {/* Stripe Sync Details Section */}
        {event?.payment_required && stripeAccountDetails && (
          <div className={styles.stripeSyncDetails}>
            <div className={styles.syncDetailsHeader}>
              <h3 className={styles.sectionTitle}>Payment Account Status</h3>
              <button 
                type="button"
                className={styles.syncButton}
                onClick={checkStripeStatus}
                disabled={checkingStripeStatus}
              >
                {checkingStripeStatus ? 'Syncing...' : 'Sync Status'}
              </button>
            </div>
            
            <div className={styles.syncStatusGrid}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Account Status:</span>
                <span className={`${styles.statusValue} ${stripeOnboardingComplete ? styles.statusSuccess : styles.statusWarning}`}>
                  {stripeOnboardingComplete ? 'Ready' : 'Setup Incomplete'}
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Charges Enabled:</span>
                <span className={`${styles.statusValue} ${stripeAccountDetails.charges_enabled ? styles.statusSuccess : styles.statusError}`}>
                  {stripeAccountDetails.charges_enabled ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Payouts Enabled:</span>
                <span className={`${styles.statusValue} ${stripeAccountDetails.payouts_enabled ? styles.statusSuccess : styles.statusError}`}>
                  {stripeAccountDetails.payouts_enabled ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Details Submitted:</span>
                <span className={`${styles.statusValue} ${stripeAccountDetails.details_submitted ? styles.statusSuccess : styles.statusError}`}>
                  {stripeAccountDetails.details_submitted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Requirements Section */}
            {stripeAccountDetails.requirements && (
              <div className={styles.requirementsSection}>
                <h4 className={styles.requirementsTitle}>Onboarding Requirements:</h4>
                {stripeAccountDetails.requirements.currently_due && stripeAccountDetails.requirements.currently_due.length > 0 && (
                  <div className={styles.requirementsList}>
                    <p className={styles.requirementsLabel}>Currently Due:</p>
                    <ul className={styles.requirementsItems}>
                      {stripeAccountDetails.requirements.currently_due.map((req, idx) => (
                        <li key={idx} className={styles.requirementItem}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {stripeAccountDetails.requirements.past_due && stripeAccountDetails.requirements.past_due.length > 0 && (
                  <div className={styles.requirementsList}>
                    <p className={styles.requirementsLabel}>Past Due:</p>
                    <ul className={styles.requirementsItems}>
                      {stripeAccountDetails.requirements.past_due.map((req, idx) => (
                        <li key={idx} className={styles.requirementItem}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!stripeAccountDetails.requirements.currently_due || stripeAccountDetails.requirements.currently_due.length === 0) &&
                 (!stripeAccountDetails.requirements.past_due || stripeAccountDetails.requirements.past_due.length === 0) && (
                  <p className={styles.requirementsComplete}>All requirements completed!</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Registration Fee Section */}
        <div className={styles.costSection}>
          <h3 className={styles.sectionTitle}>Registration Fee</h3>
          {cost > 0 && !stripeOnboardingComplete && (
            <p className={styles.warningText}>
              Please complete your Stripe account setup in user settings before setting a registration fee.
            </p>
          )}
          {cost > 0 && stripeAccountDetails && (!stripeAccountDetails.charges_enabled || !stripeAccountDetails.payouts_enabled) && (
            <p className={styles.warningText}>
              Your Stripe account is not fully activated. Please complete all onboarding requirements in user settings.
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
              />
            </div>
            <button 
              type="button"
              onClick={handleUpdateCost}
              disabled={loading || (cost > 0 && !stripeOnboardingComplete)}
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

