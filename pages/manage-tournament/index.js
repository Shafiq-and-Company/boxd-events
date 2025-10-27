import React from 'react';
import { useRouter } from 'next/router';

const ManageTournament = () => {
  const router = useRouter();
  const { eventId } = router.query;

  const handleBackToEvents = () => {
    router.push('/');
  };

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <h1 style={{ 
        fontSize: '2rem',
        fontWeight: 600,
        marginBottom: '1rem',
        color: '#374151'
      }}>
        Welcome to Tournament Management
      </h1>
      <p style={{ 
        fontSize: '1rem',
        color: '#6b7280',
        marginBottom: '2rem'
      }}>
        Tournament management features coming soon
      </p>
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
          color: '#374151',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '3px 3px 0px 0px #000000'
        }}
        onMouseOver={(e) => {
          e.target.style.boxShadow = '2px 2px 0px 0px #000000';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.target.style.boxShadow = '3px 3px 0px 0px #000000';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <span>←</span>
        <span>Back to Events</span>
      </button>
    </div>
  );
};

export default ManageTournament;