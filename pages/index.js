import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UpcomingEvents from '../components/UpcomingEvents'
import DiscoverEvents from '../components/DiscoverEvents'
import NavBar from '../components/NavBar'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('upcoming')

  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab)
    }
  }, [router.query.tab])

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
      case 'about':
        return <div>About content coming soon...</div>
      default:
        return <UpcomingEvents />
    }
  }

  return (
    <div>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
      {renderContent()}
    </div>
  )
}