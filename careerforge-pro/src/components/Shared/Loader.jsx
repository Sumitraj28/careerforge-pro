import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import './Loader.css';

const MESSAGES = [
  'AI is rewriting your resume…',
  'Optimizing for ATS keywords…',
  'Crafting compelling bullet points…',
  'Almost there…',
];

export default function Loader({ text, visible = true }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  /* ── Cycle through messages if no custom text ── */
  useEffect(() => {
    if (text) return; // custom text overrides cycling

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [text]);

  /* ── Lock body scroll ── */
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  const displayText = text || MESSAGES[msgIndex];

  return (
    <div className="loader-overlay" id="global-loader">
      {/* Background particles */}
      <div className="loader-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="loader-particle" style={{ '--i': i }} />
        ))}
      </div>

      <div className="loader-content">
        {/* Spinner rings */}
        <div className="loader-spinner-wrap">
          <div className="loader-ring loader-ring--outer" />
          <div className="loader-ring loader-ring--inner" />
          <div className="loader-core">
            <Sparkles size={22} />
          </div>
        </div>

        {/* Message */}
        <p className={`loader-text ${fade ? 'loader-text--visible' : ''}`}>
          {displayText}
        </p>

        {/* Progress dots */}
        <div className="loader-dots">
          <span className="loader-dot" />
          <span className="loader-dot" />
          <span className="loader-dot" />
        </div>
      </div>
    </div>
  );
}
