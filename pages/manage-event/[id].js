import { useRouter } from 'next/router'
import ManageEvent from '../../components/ManageEvent'
import NavBar from '../../components/NavBar'

export default function ManageEventPage() {
  const router = useRouter()

  const handleTabChange = (tab) => {
    router.push(`/?tab=${tab}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <NavBar activeTab="" onTabChange={handleTabChange} />
      <ManageEvent />
    </div>
  )
}
