import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UpcomingEvents from '../components/UpcomingEvents'
import DiscoverEvents from '../components/DiscoverEvents'
import MyEvents from '../components/MyEvents'
import CreateEvent from '../components/CreateEvent'
import UserSettings from '../components/UserSettings'
import Pricing from '../components/Pricing'
import NavBar from '../components/NavBar'
import PaymentConfirmation from '../components/PaymentConfirmation'
import Splash from '../components/Splash'

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
      setSuccessMessage('Successfully registered for the event!')
      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        // Clean up URL but keep the tab
        router.replace('/?tab=myEvents', undefined, { shallow: true })
      }, 5000)
    }
  }, [router.query])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'upcoming') {
      router.push('/?tab=upcoming', undefined, { shallow: true })
    } else if (tab === 'splash') {
      router.push('/?tab=splash', undefined, { shallow: true })
    } else {
      router.push(`/?tab=${tab}`, undefined, { shallow: true })
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'splash':
        return <Splash onTabChange={handleTabChange} />
      case 'upcoming':
        return <UpcomingEvents />
      case 'discover':
        return <DiscoverEvents />
      case 'myEvents':
        return <MyEvents onTabChange={handleTabChange} />
      case 'createEvent':
        return <CreateEvent />
      case 'settings':
        return <UserSettings />
      case 'pricing':
        return <Pricing />
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
      background: `
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
      `,
      backgroundSize: '8px 8px',
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