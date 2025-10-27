import React from 'react';
import { useRouter } from 'next/router';

const ManageTournament = () => {
  const router = useRouter();

  const handleBackToEvents = () => {
    router.push('/');
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Back Button */}
      <button
        onClick={handleBackToEvents}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#ffffff',
          border: '1px solid #000000',
          borderRadius: 0,
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '3px 3px 0px 0px #000000'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000000';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span>←</span>
        <span>Back to Events</span>
      </button>
    </div>
  );
};

export default ManageTournament;