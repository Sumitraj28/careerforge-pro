import { useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import './KeywordChip.css';

export default function KeywordChip({ keyword, label, category, matched = false }) {
  // Support both `keyword` and `label` props for compatibility
  const text = keyword || label || '';
  const [copied, setCopied] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setRipple(true);

    toast.success(`Copied "${text}"`, {
      duration: 2000,
      style: {
        background: '#1a1e36',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '0.85rem',
      },
      iconTheme: {
        primary: matched ? '#22c55e' : '#ef4444',
        secondary: '#fff',
      },
    });

    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setRipple(false), 600);
  };

  const tierClass = matched ? 'keyword-chip--matched' : 'keyword-chip--missing';

  return (
    <button
      className={`keyword-chip ${tierClass} ${ripple ? 'keyword-chip--ripple' : ''}`}
      onClick={handleCopy}
      title={`${matched ? '✓ Found' : '✗ Missing'} — Click to copy`}
      type="button"
    >
      {/* Status dot */}
      <span className="keyword-chip__dot" />

      {/* Keyword text */}
      <span className="keyword-chip__text">{text}</span>

      {/* Category tag (if provided) */}
      {category && (
        <span className="keyword-chip__category">
          <Tag size={10} />
          {category}
        </span>
      )}

      {/* Copy icon */}
      <span className="keyword-chip__copy-icon">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </span>
    </button>
  );
}
