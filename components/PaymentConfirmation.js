import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from './PaymentConfirmation.module.css'

export default function PaymentConfirmation({ message, onClose }) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-redirect to discover page after 5 seconds if no message
    if (!message) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          router.push('/?tab=discover')
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
        router.push('/?tab=discover')
      }
    }, 300)
  }

  const getStatusIcon = () => {
    if (message && message.includes('❌')) {
      return '❌'
    }
    return '✅'
  }

  const getStatusTitle = () => {
    if (message && message.includes('❌')) {
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
            Redirecting to discover page...
          </div>
        )}
        <button 
          className={styles.continueButton}
          onClick={handleContinue}
        >
          Continue to Discover Events
        </button>
      </div>
    </div>
  )
}
