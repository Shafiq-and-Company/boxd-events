import React, { useState } from 'react';
import SplashNav from './SplashNav';
import styles from './Splash.module.css';

export default function SplashPage() {
  const [openFaq, setOpenFaq] = useState(null);
  
  const handleGetStarted = () => {
    window.open('https://forms.gle/z9zBsz1Dyq66oqcv6', '_blank');
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className={styles.pageContainer}>
      <SplashNav />
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              <span>This is where</span>
              <br />
              <span>Gaming starts</span>
            </h1>
            
            <div className={styles.divider}></div>
            
            <p className={styles.heroSubtitle}>
              Find gaming events near you or make your own to build the gaming community you want. Connect with local gamers and join fun tournaments.
            </p>
            
            <button className={styles.ctaButton} onClick={handleGetStarted}>
              Get Started
            </button>
          </div>
          <div className={styles.heroImage}>
            <img src="/for-par.gif" alt="Hero Demo" className={styles.heroImagePlaceholder} />
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className={styles.valuePropsSection}>
        <div className={styles.sectionContent}>
          <div className={styles.valuePropsText}>
            <div className={styles.valuePropText}>
              <h3>For Participants</h3>
              <p>Find gaming events near you, search for tournaments and meetups, and join local gaming communities to discover new players.</p>
            </div>
            
            <div className={styles.valuePropText}>
              <h3>For Organizers</h3>
              <p>Make and run gaming events using our simple tools to set up tournaments and manage brackets while creating community events.</p>
            </div>
          </div>
          
          <div className={styles.valuePropsGrid}>
            <div className={styles.valueProp}>
              <img src="/view-cal.gif" alt="View Calendar Demo" className={styles.demoImage} />
            </div>
            
            <div className={styles.valueProp}>
              <img src="/for-org.gif" alt="For Organizers Demo" className={styles.demoImage} />
            </div>
          </div>
        </div>
      </section>

      

      {/* Video Demo Section */}
      <section className={styles.videoDemoSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>See it in action</h2>
          <p className={styles.sectionSubtitle}>Watch how easy it is to create and manage gaming events</p>
          
          <div className={styles.videoDemoGrid}>
            <div className={styles.videoDemo}>
              <div className={styles.videoContainer}>
                <img src="/create-event.gif" alt="Event Creation Demo" className={styles.demoGif} />
              </div>
              <h3>Create Events in Seconds</h3>
              <p>See how quickly you can set up a tournament with all the details your community needs.</p>
            </div>
            
            <div className={styles.videoDemo}>
              <div className={styles.videoContainer}>
                <div className={styles.videoPlaceholder}>
                  <div className={styles.playButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className={styles.videoLabel}>Tournament Management</div>
                </div>
              </div>
              <h3>Manage Tournaments</h3>
              <p>Watch how automated brackets and live results keep your tournaments running smoothly.</p>
            </div>
            
            <div className={styles.videoDemo}>
              <div className={styles.videoContainer}>
                <div className={styles.videoPlaceholder}>
                  <div className={styles.playButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className={styles.videoLabel}>Community Features</div>
                </div>
              </div>
              <h3>Never Get Lost</h3>
              <p>Powerful event management engine with useful hints at every step</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionContent}>
          <div className={styles.heavyTextSection}>
            <h3 className={styles.heavyTextTitle}>There's no more excuse for Bad UI.</h3>
            <h3 className={styles.heavyTextSubtitle}>Gamers deserve better.</h3>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className={styles.advancedFeaturesSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Powerful features, easy events</h2>
          <p className={styles.sectionSubtitle}>Fun, modern events in 1-click. 100% free, no paywalls.</p>
          
          <div className={styles.advancedFeaturesGrid}>
            <div className={styles.advancedFeature}>
              <div className={styles.advancedFeatureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4"/>
                  <path d="M16 2v4"/>
                  <rect width="18" height="18" x="3" y="4" rx="2"/>
                  <path d="M3 10h18"/>
                </svg>
              </div>
              <h4>Community Calendar</h4>
              <p>See all upcoming gaming events in your area with one unified calendar view</p>
              <button className={styles.tryButton} onClick={handleGetStarted}>Try it ↗</button>
            </div>
            
            <div className={styles.advancedFeature}>
              <div className={styles.advancedFeatureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.91.37 4.15 1.02"/>
                </svg>
              </div>
              <h4>Add a Bracket</h4>
              <p>Create tournament brackets automatically with seeding, elimination rounds, and live results</p>
              <button className={styles.tryButton} onClick={handleGetStarted}>Try it ↗</button>
            </div>
            
            <div className={styles.advancedFeature}>
              <div className={styles.advancedFeatureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <h4>Link Online Profiles</h4>
              <p>Connect to Start.gg, Challonge, and Supermajor for seamless tournament integration</p>
              <button className={styles.tryButton} onClick={handleGetStarted}>Try it ↗</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className={styles.faqsSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          
          <div className={styles.faqsGrid}>
            <div className={styles.faq} onClick={() => toggleFaq(0)}>
              <div className={styles.faqHeader}>
                <h3>Is Locals really free?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 0 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 0 && (
                <div className={styles.faqContent}>
                  <p>Yes! Locals is completely free to use. Create unlimited events, invite unlimited guests, and use all features without any paywalls or hidden costs.</p>
                </div>
              )}
            </div>
            
            <div className={styles.faq} onClick={() => toggleFaq(1)}>
              <div className={styles.faqHeader}>
                <h3>How do I create my first event?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 1 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 1 && (
                <div className={styles.faqContent}>
                  <p>Simply click "Create an Event Now" and fill out the event details. You can add a banner image, set the date and time, choose your game, and start inviting people immediately.</p>
                </div>
              )}
            </div>
            
            <div className={styles.faq} onClick={() => toggleFaq(2)}>
              <div className={styles.faqHeader}>
                <h3>Can I create tournament brackets?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 2 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 2 && (
                <div className={styles.faqContent}>
                  <p>Absolutely! Locals supports single elimination, double elimination, round robin, and Swiss tournament formats with automatic seeding and live results.</p>
                </div>
              )}
            </div>
            
            <div className={styles.faq} onClick={() => toggleFaq(3)}>
              <div className={styles.faqHeader}>
                <h3>Do I need to download an app?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 3 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 3 && (
                <div className={styles.faqContent}>
                  <p>No setup required! Locals works on any browser, iPhone, and Android. Just visit the website and start creating events immediately.</p>
                </div>
              )}
            </div>
            
            <div className={styles.faq} onClick={() => toggleFaq(4)}>
              <div className={styles.faqHeader}>
                <h3>How do people find my events?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 4 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 4 && (
                <div className={styles.faqContent}>
                  <p>Events are automatically discoverable in your local area. Players can browse by game, date, or location to find tournaments and meetups near them.</p>
                </div>
              )}
            </div>
            
            <div className={styles.faq} onClick={() => toggleFaq(5)}>
              <div className={styles.faqHeader}>
                <h3>Can I integrate with other platforms?</h3>
                <div className={`${styles.faqIcon} ${openFaq === 5 ? styles.faqIconOpen : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </div>
              {openFaq === 5 && (
                <div className={styles.faqContent}>
                  <p>Yes! Connect your Start.gg, Challonge, and Supermajor accounts for seamless tournament integration and cross-platform results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>Let's get the gaming started</h2>
          <p className={styles.finalCtaSubtitle}>Find us at LOCALS.GG. Mobile Experience coming soon</p>
          <button className={styles.primaryButton} onClick={handleGetStarted}>
            <span>Create event</span>
          </button>
        </div>
      </section>
    </div>
  );
}
