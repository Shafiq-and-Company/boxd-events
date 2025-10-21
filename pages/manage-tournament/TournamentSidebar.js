import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/AuthContext';
import styles from './TournamentSidebar.module.css';

export default function TournamentSidebar({ activeSection, onSectionChange }) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarItems = [
    {
      id: 'bracket',
      label: 'Bracket',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      )
    },
    {
      id: 'standings',
      label: 'Standings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18v18H3z"/>
          <path d="M9 9h6v6H9z"/>
          <path d="M9 3v6"/>
          <path d="M15 3v6"/>
          <path d="M3 9h6"/>
          <path d="M15 9h6"/>
        </svg>
      )
    },
    {
      id: 'participants',
      label: 'Participants',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      id: 'details',
      label: 'Details',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    }
  ];

  const handleSectionClick = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSectionClick(item.id)}
            className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
            title={item.label}
          >
            <div className={styles.navIcon}>
              {item.icon}
            </div>
          </button>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <button
          onClick={handleBackClick}
          className={styles.backButton}
          title="Back to Event Settings"
        >
          <div className={styles.navIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
