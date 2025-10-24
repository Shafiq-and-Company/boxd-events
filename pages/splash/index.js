import React, { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
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
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>LOCALS.GG - Local Gaming Tournaments & Events Platform</title>
        <meta name="title" content="LOCALS.GG - Local Gaming Tournaments & Events Platform" />
        <meta name="description" content="Find and create local gaming tournaments, events, and meetups. Connect with gamers in your area, manage brackets, and build your gaming community. Free tournament management platform." />
        <meta name="keywords" content="gaming tournaments, local gaming events, tournament brackets, gaming community, esports events, fighting game tournaments, gaming meetups, tournament management" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="author" content="LOCALS.GG" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://locals.gg/splash" />
        <meta property="og:title" content="LOCALS.GG - Local Gaming Tournaments & Events Platform" />
        <meta property="og:description" content="Find and create local gaming tournaments, events, and meetups. Connect with gamers in your area, manage brackets, and build your gaming community." />
        <meta property="og:image" content="https://locals.gg/for-par.webm" />
        <meta property="og:site_name" content="LOCALS.GG" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://locals.gg/splash" />
        <meta property="twitter:title" content="LOCALS.GG - Local Gaming Tournaments & Events Platform" />
        <meta property="twitter:description" content="Find and create local gaming tournaments, events, and meetups. Connect with gamers in your area, manage brackets, and build your gaming community." />
        <meta property="twitter:image" content="https://locals.gg/for-par.webm" />
        
        {/* Additional SEO */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <link rel="canonical" href="https://locals.gg/splash" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "LOCALS.GG",
              "description": "Local gaming tournaments and events platform",
              "url": "https://locals.gg",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://locals.gg/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "LOCALS.GG",
                "url": "https://locals.gg"
              }
            })
          }}
        />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "LOCALS.GG",
              "description": "Platform for local gaming tournaments and events",
              "applicationCategory": "GameApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Tournament Management",
                "Bracket Generation",
                "Event Discovery",
                "Community Building",
                "Profile Integration"
              ]
            })
          }}
        />
      </Head>
      
      <div className={styles.pageContainer}>
        <SplashNav />
      
      {/* Hero Section */}
      <main className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              <span>Local Gaming</span>
              <br />
              <span>Starts Here</span>
            </h1>
            
            <div className={styles.divider}></div>
            
            <p className={styles.heroSubtitle}>
              Find gaming events near you or make your own to build the gaming community you want. Connect with local gamers and join fun tournaments.
            </p>
            
            <button className={styles.ctaButton} onClick={handleGetStarted}>
              Get Early Access
            </button>
          </div>
          <div className={styles.heroImage}>
            <video 
              className={styles.heroImagePlaceholder}
              width={1200}
              height={600}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            >
              <source src="/for-par.webm" type="video/webm" />
            </video>
          </div>
        </div>
      </main>

      {/* Value Props Section */}
      <section className={styles.valuePropsSection}>
        <div className={styles.sectionContent}>
          <div className={styles.valuePropsGrid}>
            <article className={styles.valueProp}>
              <h2>For Participants</h2>
              <p>Find gaming events near you, search for tournaments and meetups, and join local gaming communities to discover new players.</p>
              <video 
                className={styles.demoImage}
                width={400}
                height={300}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/view-cal.webm" type="video/webm" />
              </video>
            </article>
            
            <article className={styles.valueProp}>
              <h2>For Organizers</h2>
              <p>Make and run gaming events using our simple tools to set up tournaments and manage brackets while creating community events.</p>
              <video 
                className={styles.demoImage}
                width={400}
                height={300}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/for-org.webm" type="video/webm" />
              </video>
            </article>
          </div>
        </div>
      </section>

      {/* Discover Section */}
      <section className={styles.discoverSection}>
        <div className={styles.sectionContent}>
          <div className={styles.discoverContent}>
            <div className={styles.discoverText}>
              <h2 className={styles.sectionTitle}>Discover</h2>
              <p className={styles.sectionSubtitle}>Find gaming events happening near you. See what tournaments and meetups are going on in your area right now.</p>
            </div>
            <div className={styles.discoverImage}>
              <Image 
                src="/discover.png" 
                alt="Discover Events Interface" 
                className={styles.discoverImagePlaceholder}
                width={600}
                height={400}
                quality={85}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className={styles.calendarSection}>
        <div className={styles.sectionContent}>
          <div className={styles.calendarContent}>
            <div className={styles.calendarImage}>
              <Image 
                src="/calendar.png" 
                alt="Calendar Interface" 
                className={styles.calendarImagePlaceholder}
                width={600}
                height={400}
                quality={85}
              />
            </div>
            <div className={styles.calendarText}>
              <h2 className={styles.sectionTitle}>Calendars</h2>
              <p className={styles.sectionSubtitle}>Never miss a tournament again. Follow your favorite gaming groups and get automatic updates when new events are added.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Link Profiles Section */}
      <section className={styles.linkProfilesSection}>
        <div className={styles.sectionContent}>
          <div className={styles.linkProfilesContent}>
            <div className={styles.linkProfilesText}>
              <h2 className={styles.sectionTitle}>Link Online Profiles</h2>
              <p className={styles.sectionSubtitle}>Connect your gaming accounts to show your tournament history and rankings across all platforms</p>
            </div>
            <div className={styles.linkProfilesIcons}>
              <div className={styles.profileIcon}>
                <div className={styles.iconContainer}>
                  <Image 
                    src="/start-logo.png" 
                    alt="start.gg" 
                    className={styles.platformLogo}
                    width={48}
                    height={48}
                    quality={90}
                  />
                </div>
              </div>
              <div className={styles.profileIcon}>
                <div className={styles.iconContainer}>
                  <Image 
                    src="/challonge-logo.svg" 
                    alt="Challonge" 
                    className={styles.platformLogo}
                    width={48}
                    height={48}
                    quality={90}
                  />
                </div>
              </div>
              <div className={styles.profileIcon}>
                <div className={styles.iconContainer}>
                  <Image 
                    src="/supermajor-logo.png" 
                    alt="Supermajor" 
                    className={styles.platformLogo}
                    width={48}
                    height={48}
                    quality={90}
                  />
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
                <Image 
                  src="/create-event-image.png" 
                  alt="Event Creation Demo" 
                  className={styles.demoGif}
                  width={400}
                  height={200}
                  quality={80}
                />
              </div>
              <h3>Create Events in Seconds</h3>
              <p>See how quickly you can set up an event with all the details your community needs.</p>
            </div>
            
            <div className={styles.videoDemo}>
              <div className={styles.videoContainer}>
                <Image 
                  src="/bracket.png" 
                  alt="Tournament Bracket Visualization" 
                  className={styles.demoGif}
                  width={400}
                  height={200}
                  quality={80}
                />
              </div>
              <h3>Manage Tournaments</h3>
              <p>Watch how automated brackets and live results keep your tournaments running smoothly.</p>
            </div>
            
            <div className={styles.videoDemo}>
              <div className={styles.videoContainer}>
                <Image 
                  src="/conflict.png" 
                  alt="Conflict Resolver Assistant" 
                  className={styles.demoGif}
                  width={400}
                  height={200}
                  quality={80}
                />
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
                  <p>Yes! Locals is free to start using. For Paid events, we charge a 5% platform fee. We will also be offering a Premium tier for power users.</p>
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
                  <p>We have a mobile app in the works. For now, you can use our website on any browser, iPhone, and Android.</p>
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
                  <p>Yes! Connect your Start.gg, Challonge, and Supermajor accounts for seamless profile integration and cross-platform results.</p>
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
          <p className={styles.finalCtaSubtitle}></p>
          <button className={styles.primaryButton} onClick={handleGetStarted}>
            <span>Get Early Access</span>
          </button>
        </div>
      </section>
      </div>
    </>
  );
}
