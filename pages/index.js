import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UpcomingEvents from '../components/UpcomingEvents'
import DiscoverEvents from '../components/DiscoverEvents'
import MyEvents from '../components/MyEvents'
import NavBar from '../components/NavBar'
import PaymentConfirmation from '../components/PaymentConfirmation'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab)
    }
    
    // Handle success messages from payment/RSVP
    if (router.query.payment === 'success') {
      setSuccessMessage('Payment successful! You have been registered for the event.')
      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        // Clean up URL
        router.replace('/', undefined, { shallow: true })
      }, 5000)
    } else if (router.query.rsvp === 'success') {
      setSuccessMessage('Successfully registered for the event! Check your My Events tab.')
      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        // Clean up URL
        router.replace('/', undefined, { shallow: true })
      }, 5000)
    }
  }, [router.query])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'upcoming') {
      router.push('/', undefined, { shallow: true })
    } else {
      router.push(`/?tab=${tab}`, undefined, { shallow: true })
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'upcoming':
        return <UpcomingEvents />
      case 'discover':
        return <DiscoverEvents />
      case 'myEvents':
        return <MyEvents />
      case 'about':
        return <div>About content coming soon...</div>
      default:
        return <UpcomingEvents />
    }
  }

  const handleCloseMessage = () => {
    setSuccessMessage(null)
    router.replace('/', undefined, { shallow: true })
  }

  return (
    <div style={{
      background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 20%)',
      flex: 1
    }}>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
      {successMessage && (
        <PaymentConfirmation 
          message={successMessage} 
          onClose={handleCloseMessage}
        />
      )}
      {renderContent()}
    </div>
  )
}