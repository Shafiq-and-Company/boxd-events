import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import NavBar from '../components/NavBar'
import UpcomingEvents from '../components/UpcomingEvents'
import DiscoverEvents from '../components/DiscoverEvents'
import MyEvents from '../components/MyEvents'
import CreateEvent from '../components/CreateEvent'
import UserSettings from '../components/UserSettings'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('upcoming')

  // Handle tab parameter from URL
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab)
    }
  }, [router.query.tab])

  // Redirect to splash if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/splash')
    }
  }, [user, authLoading, router])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    router.push(`/?tab=${tab}`, undefined, { shallow: true })
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Redirect to splash if not authenticated
  if (!user) {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {activeTab === 'upcoming' && <UpcomingEvents onTabChange={handleTabChange} />}
      {activeTab === 'discover' && <DiscoverEvents onTabChange={handleTabChange} />}
      {activeTab === 'myEvents' && <MyEvents onTabChange={handleTabChange} />}
      {activeTab === 'createEvent' && <CreateEvent onTabChange={handleTabChange} />}
      {activeTab === 'settings' && <UserSettings />}
    </div>
  )
}