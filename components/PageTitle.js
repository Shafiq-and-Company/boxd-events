import styles from './PageTitle.module.css'

export default function PageTitle({ title, subtitle }) {
  return (
    <div className={styles.pageTitle}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && (
        <p className={styles.subtitle}>{subtitle}</p>
      )}
    </div>
  )
}
