import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import PaymentConfirmation from '../components/PaymentConfirmation'
import NavBar from '../components/NavBar'

export default function PaymentConfirmationPage() {
  const router = useRouter()
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    // Handle payment success from URL parameters
    if (router.query.success === 'true') {
      setSuccessMessage('✅ Payment successful! You have been registered for the event.')
    } else if (router.query.cancelled === 'true') {
      setSuccessMessage('❌ Payment was cancelled. You can try again anytime.')
    }
  }, [router.query])

  const handleClose = () => {
    setSuccessMessage(null)
    router.push('/?tab=discover')
  }

  return (
    <div style={{
      background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 20%)',
      minHeight: '100vh'
    }}>
      <NavBar activeTab="discover" />
      <PaymentConfirmation 
        message={successMessage} 
        onClose={handleClose}
      />
    </div>
  )
}
