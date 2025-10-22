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
            <div className={styles.heroImagePlaceholder}>
              Hero Image Placeholder
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className={styles.valuePropsSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Fun, modern events in 1-click</h2>
          <p className={styles.sectionSubtitle}>100% free, no paywalls. Customize the perfect gaming event.</p>
          
          <div className={styles.valuePropsGrid}>
            <div className={styles.valueProp}>
              <h3>Free to Use</h3>
              <p>It's free to start creating events</p>
            </div>
            
            <div className={styles.valueProp}>
              <h3>No Setup Required</h3>
              <p>Start creating events immediately</p>
            </div>
            
            <div className={styles.valueProp}>
              <h3>Build Community</h3>
              <p>Connect with local gamers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className={styles.socialProofSection}>
        <div className={styles.testimonialsSlider}>
          <div className={styles.testimonialsTrack}>
            <div className={styles.testimonial}>
              <p>"I'd Rather Send a Locals Invite"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Best solution to the gaming-event problem"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Facebook events are so last decade"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"This is where my gaming calendar exists"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Locals is a mainstay of my gaming life"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"The primary gaming platform"</p>
            </div>
            {/* Duplicate for seamless loop */}
            <div className={styles.testimonial}>
              <p>"I'd Rather Send a Locals Invite"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Best solution to the gaming-event problem"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Facebook events are so last decade"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"This is where my gaming calendar exists"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"Locals is a mainstay of my gaming life"</p>
            </div>
            <div className={styles.testimonial}>
              <p>"The primary gaming platform"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Demo Section */}
      <section className={styles.mobileDemoSection}>
        <div className={styles.mobileDemoContent}>
          <div className={styles.mobileDemoText}>
            <h2 className={styles.mobileDemoTitle}>Gaming on the Go</h2>
            <p className={styles.mobileDemoSubtitle}>
              Take your local gaming community everywhere with our mobile app. 
              Discover events, manage tournaments, and stay connected with your gaming crew.
            </p>
            <div className={styles.mobileDemoFeatures}>
              <div className={styles.mobileDemoFeature}>
                <div className={styles.mobileDemoFeatureIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <span>Push Notifications</span>
              </div>
              <div className={styles.mobileDemoFeature}>
                <div className={styles.mobileDemoFeatureIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span>Location-Based Discovery</span>
              </div>
              <div className={styles.mobileDemoFeature}>
                <div className={styles.mobileDemoFeatureIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span>Social Features</span>
              </div>
            </div>
            <div className={styles.appButtons}>
              <button className={styles.appButton} onClick={handleGetStarted}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <span>Download on the</span>
                  <strong>App Store</strong>
                </div>
              </button>
              <button className={styles.appButton} onClick={handleGetStarted}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div>
                  <span>Get it on</span>
                  <strong>Google Play</strong>
                </div>
              </button>
            </div>
          </div>
          <div className={styles.mobileDemoMockup}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneScreen}>
                <div className={styles.phoneHeader}>
                  <div className={styles.phoneNotch}></div>
                </div>
                <div className={styles.phoneContent}>
                  <div className={styles.phoneEvent}>
                    <div className={styles.phoneEventTitle}>Smash Bros Tournament</div>
                    <div className={styles.phoneEventTime}>Today, 7:00 PM</div>
                    <div className={styles.phoneEventLocation}>GameStop Downtown</div>
                  </div>
                  <div className={styles.phoneEvent}>
                    <div className={styles.phoneEventTitle}>Magic: The Gathering</div>
                    <div className={styles.phoneEventTime}>Tomorrow, 2:00 PM</div>
                    <div className={styles.phoneEventLocation}>Local Game Store</div>
                  </div>
                </div>
              </div>
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
                <div className={styles.videoPlaceholder}>
                  <div className={styles.playButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className={styles.videoLabel}>Event Creation</div>
                </div>
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
              <h3>Build Community</h3>
              <p>See how players connect, share, and discover events in your local gaming scene.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>We're not like other platforms</h2>
          
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>See who's going</h3>
              <p>Check the guest list, leave comments, reply to friends, and add reactions. Keep the gaming community going.</p>
            </div>
            
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <h3>Text Blast your guests</h3>
              <p>Running late, need more controllers, 10 people texting you asking how to get in? Send updates to everyone at once.</p>
            </div>
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
          <p className={styles.finalCtaSubtitle}>Find us on any browser, iPhone, and Android</p>
          <button className={styles.primaryButton} onClick={handleGetStarted}>
            <span>Create event</span>
          </button>
        </div>
      </section>
    </div>
  );
}
