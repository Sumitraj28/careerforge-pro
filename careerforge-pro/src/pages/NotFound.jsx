import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '120px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh'
    }}>
      <h1 style={{ fontSize: '8rem', fontWeight: 900, color: '#9b4f38', margin: 0, lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#23211d', marginTop: 16 }}>Page Not Found</h2>
      <p style={{ fontSize: '1.1rem', color: '#625c50', marginBottom: 32, maxWidth: '400px' }}>
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="navbar__btn navbar__btn--primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
        Go Back Home
      </Link>
    </div>
  );
}
