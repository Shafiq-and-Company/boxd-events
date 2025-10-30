import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import styles from './ManageRegistration.module.css'

export default function ManageRegistration() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
  const [cost, setCost] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCost = useCallback(async () => {
    if (!id || !user) return
    
    try {
      setFetchLoading(true)
      setError(null)

      const { data: event, error } = await supabase
        .from('events')
        .select('cost')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (error) throw error
      if (!event) throw new Error('Event not found or you do not have permission to edit it')

      setCost(event.cost || '')
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

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('events')
        .update({ cost: cost || 0 })
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

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cost Updated', {
          body: 'Event cost has been updated successfully!',
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
        <div className={styles.costSection}>
          <h3 className={styles.sectionTitle}>Event Cost</h3>
          <div className={styles.costInputRow}>
            <div className={styles.formGroup}>
              <input
                type="number"
                id="cost"
                name="cost"
                value={cost}
                onChange={handleCostChange}
                className={styles.input}
                placeholder="Event cost (e.g., 25.00)"
                min="0"
                step="0.01"
              />
            </div>
            <button 
              type="button"
              onClick={handleUpdateCost}
              disabled={loading}
              className={styles.updateCostButton}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

