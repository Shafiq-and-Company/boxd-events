import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <span className={styles.logo}>BOXD</span>
          </div>
          
          <div className={styles.links}>
            <a href="/" className={styles.link}>Events</a>
            <a href="/?tab=discover" className={styles.link}>Discover</a>
            <a href="/login" className={styles.link}>Login</a>
            <a href="#" className={styles.link}>Help</a>
            <a href="#" className={styles.link}>Terms</a>
            <a href="#" className={styles.link}>Privacy</a>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <div className={styles.copyright}>
            © 2024 BOXD
          </div>
        </div>
      </div>
    </footer>
  )
}
