import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useRouter } from 'next/router'
import styles from './Pricing.module.css'

export default function Pricing() {
  const { user } = useAuth()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState('annual')

  const handleGetStarted = () => {
    if (user) {
      router.push('/?tab=createEvent')
    } else {
      router.push('/login')
    }
  }

  const handleUpgrade = () => {
    if (user) {
      router.push('/?tab=settings')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className={styles.pricingContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pricing</h1>
        <p className={styles.subtitle}>
          Use Locals for free with unlimited events and guests. Upgrade for more features, 0% platform fee, and more.
        </p>
        
        <div className={styles.billingToggle}>
          <button 
            className={`${styles.toggleButton} ${billingCycle === 'monthly' ? styles.active : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`${styles.toggleButton} ${billingCycle === 'annual' ? styles.active : ''}`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
          </button>
        </div>
      </div>

      <div className={styles.pricingGrid}>
        {/* Free Plan */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>Locals</h3>
            <div className={styles.price}>
              <span className={styles.priceAmount}>Free</span>
              <span className={styles.pricePeriod}>Free, forever</span>
            </div>
            <button 
              className={styles.ctaButton}
              onClick={handleGetStarted}
            >
              Get Started
            </button>
          </div>
          
          <div className={styles.features}>
            <p className={styles.featureIntro}>Use Locals for free with:</p>
            
            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Unlimited number of events</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Unlimited number of guests per event</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Automated reminders via email and SMS</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Send up to 500 invites per week</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Check in guests to your events</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Accept all credit cards, Apple Pay & Google Pay</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Set up ticket types and group purchasing</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>5% platform fee for paid events</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Unlimited cohosts and event managers</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Up to 3 admins for your calendar</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Import and export data via CSV</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Built-in bracketology for tournaments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plus Plan */}
        <div className={`${styles.pricingCard} ${styles.featured}`}>
          <div className={styles.popularBadge}>Most Popular</div>
          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>Locals Plus</h3>
            <div className={styles.price}>
              <span className={styles.priceAmount}>
                ${billingCycle === 'annual' ? '49' : '59'}
              </span>
              <span className={styles.pricePeriod}>
                {billingCycle === 'annual' ? 'Per month, billed annually' : 'Per month'}
                {billingCycle === 'annual' && <span className={styles.savings}>Save 14%</span>}
              </span>
            </div>
            <button 
              className={`${styles.ctaButton} ${styles.primaryButton}`}
              onClick={handleUpgrade}
            >
              Get Locals Plus
            </button>
          </div>
          
          <div className={styles.features}>
            <p className={styles.featureIntro}>Everything in the free plan, plus:</p>
            
            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>0% platform fee for paid events</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Send up to 5,000 invites per week</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Ability to collect taxes for ticket sales</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Check-in manager role for your events</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Custom URL for event pages</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Collect separate first and last names</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>5 calendar admins included</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Automate workflows with Zapier</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>API access</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Priority support</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Early access to select features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.planName}>Enterprise</h3>
            <div className={styles.price}>
              <span className={styles.priceAmount}>Custom</span>
              <span className={styles.pricePeriod}>Contact us</span>
            </div>
            <button 
              className={styles.ctaButton}
              onClick={() => window.open('mailto:hello@boxdevents.com', '_blank')}
            >
              Contact Us
            </button>
          </div>
          
          <div className={styles.features}>
            <div className={styles.featureList}>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Organization Account</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Security Restrictions</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Community Events</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Single Sign On</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Advanced Integrations</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Additional APIs</span>
              </div>
              <div className={styles.feature}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>Custom-Built Features</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className={styles.footerNote}>
        <p>
          Stripe, our payment processor, charges a credit card fee (typically 2.9% + 30 cents). 
          The platform fee is on top of the Stripe fee.
        </p>
      </div>
    </div>
  )
}
