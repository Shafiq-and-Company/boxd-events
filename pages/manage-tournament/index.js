import React from 'react';
import { useRouter } from 'next/router';
import styles from './manageTournament.module.css';

const ManageTournament = () => {
  const router = useRouter();
  
  return (
    <div className={styles.dashboard}>
      {/* Floating Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarItem} title="Tournament Settings">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Participants">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Brackets">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v4"/>
                <path d="M16 2v4"/>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <path d="M3 10h18"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
                <path d="M16 18h.01"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Schedule">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Prizes">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55.47.98.97 1.21l1.03.5c.5.23 1.03.23 1.53 0l1.03-.5c.5-.23.97-.66.97-1.21v-2.34"/>
                <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Rules">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            
            <div className={styles.sidebarItem} title="Analytics">
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10"/>
                <path d="M12 20V4"/>
                <path d="M6 20v-6"/>
              </svg>
            </div>
          </div>
          
          {/* Back Button */}
          <div className={styles.sidebarItem} title="Back to Manage Event" onClick={() => router.back()}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Content will be added here */}
      </div>
    </div>
  );
};

export default ManageTournament;
