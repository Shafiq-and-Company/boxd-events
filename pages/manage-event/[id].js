import { useRouter } from 'next/router'
import ManageEvent from '../../components/ManageEvent'
import NavBar from '../../components/NavBar'

export default function ManageEventPage() {
  const router = useRouter()

  const handleTabChange = (tab) => {
    if (tab === 'upcoming') {
      router.push('/?tab=upcoming')
    } else {
      router.push(`/?tab=${tab}`)
    }
  }

  return (
    <div style={{
      background: `
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
      `,
      backgroundSize: '8px 8px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <NavBar activeTab="" onTabChange={handleTabChange} />
      <ManageEvent />
    </div>
  )
}
