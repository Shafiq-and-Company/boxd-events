import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from './PaymentConfirmation.module.css'

export default function PaymentConfirmation({ message, onClose }) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-redirect to discover page after 3 seconds if no message
    if (!message) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          router.push('/?tab=discover')
        }, 300)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [message, router])

  const handleContinue = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onClose) {
        onClose()
      }
      router.push('/?tab=discover')
    }, 300)
  }

  if (!message) {
    return (
      <div className={`${styles.confirmationContainer} ${!isVisible ? styles.fadeOut : ''}`}>
        <div className={styles.confirmationCard}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.title}>Payment Successful!</h2>
          <p className={styles.message}>
            Thank you for your payment. You have been successfully registered for the event.
          </p>
          <div className={styles.loadingText}>
            Redirecting to discover page...
          </div>
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

  return (
    <div className={`${styles.confirmationContainer} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.confirmationCard}>
        <div className={styles.successIcon}>✅</div>
        <h2 className={styles.title}>Success!</h2>
        <p className={styles.message}>{message}</p>
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
