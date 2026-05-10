import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const finalizePayment = async () => {
      try {
        await refreshUser();
        toast.success('Payment confirmed! Your plan has been updated.');
        setTimeout(() => navigate('/dashboard?payment=success'), 3000);
      } catch (error) {
        console.error('Finalize payment error:', error);
        navigate('/dashboard');
      }
    };
    
    finalizePayment();
  }, [navigate, refreshUser]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '80vh', 
      gap: 20,
      textAlign: 'center',
      padding: '0 24px'
    }}>
      <div className="success-animation">
        <CheckCircle2 size={80} color="#22c55e" strokeWidth={3} />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a1e36' }}>Payment Successful!</h1>
      <p style={{ fontSize: '1.2rem', color: '#6b7194', maxWidth: '500px' }}>
        Thank you for upgrading. Your account is being updated right now.
        You will be redirected to your dashboard in a few seconds.
      </p>
      <div className="loader-mini" style={{ marginTop: 20 }}></div>
    </div>
  );
}
