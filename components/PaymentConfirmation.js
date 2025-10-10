import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from './PaymentConfirmation.module.css'

export default function PaymentConfirmation({ message, onClose }) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-redirect to My Events page after 5 seconds if no message
    if (!message) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          router.push('/?tab=myEvents')
        }, 300)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [message, router])

  const handleContinue = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onClose) {
        onClose()
      } else {
        router.push('/?tab=myEvents')
      }
    }, 300)
  }

  const getStatusIcon = () => {
    if (message && (message.toLowerCase().includes('cancel'))) {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      )
    }
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    )
  }

  const getStatusTitle = () => {
    if (message && message.toLowerCase().includes('cancel')) {
      return 'Payment Cancelled'
    }
    return message ? 'Success!' : 'Payment Successful!'
  }

  const getStatusMessage = () => {
    if (message) {
      return message
    }
    return 'Thank you for your payment. You have been successfully registered for the event.'
  }

  return (
    <div className={`${styles.confirmationContainer} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.confirmationCard}>
        <div className={styles.statusIcon}>{getStatusIcon()}</div>
        <h2 className={styles.title}>{getStatusTitle()}</h2>
        <p className={styles.message}>{getStatusMessage()}</p>
        {!message && (
          <div className={styles.loadingText}>
            Redirecting to My Events...
          </div>
        )}
        <button 
          className={styles.continueButton}
          onClick={handleContinue}
        >
          Continue to My Events
        </button>
      </div>
    </div>
  )
}
