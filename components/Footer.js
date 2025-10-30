import styles from './Footer.module.css'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Image
            src="/logo.png"
            alt="BOXD Logo"
            width={32}
            height={32}
            className={styles.logo}
          />
        </div>

        <div className={styles.center}>
          <span className={styles.copyright}>© 2025 Locals.gg</span>
        </div>

        <nav className={styles.right} aria-label="Footer">
          <a href="/?tab=pricing" className={styles.link}>Pricing</a>
          <a
            href="https://forms.gle/Mqf5bcmbmaCb13HV6"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Report a bug
          </a>
        </nav>
      </div>
    </footer>
  )
}
