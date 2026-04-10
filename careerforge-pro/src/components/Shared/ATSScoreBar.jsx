import { useState, useEffect, useRef } from 'react';
import './ATSScoreBar.css';

export default function ATSScoreBar({ score = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(0);
  const barRef = useRef(null);
  const hasAnimated = useRef(false);

  /* ── Color tiers ── */
  const getColorTier = (val) => {
    if (val >= 75) return 'excellent';
    if (val >= 50) return 'good';
    return 'needs-work';
  };

  const getLabel = (val) => {
    if (val >= 75) return 'Excellent';
    if (val >= 50) return 'Good';
    return 'Needs Work';
  };

  /* ── Intersection Observer for scroll-triggered animation ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Trigger the bar fill
          requestAnimationFrame(() => setAnimatedScore(score));
          // Count up the number
          animateNumber(0, score, 1200);
        }
      },
      { threshold: 0.3 }
    );

    if (barRef.current) observer.observe(barRef.current);
    return () => observer.disconnect();
  }, [score]);

  /* ── Re-animate when score changes ── */
  useEffect(() => {
    if (hasAnimated.current) {
      setAnimatedScore(score);
      animateNumber(displayNumber, score, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const animateNumber = (from, to, duration) => {
    const startTime = performance.now();
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplayNumber(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const tier = getColorTier(score);

  return (
    <div className="ats-bar" ref={barRef} id="ats-score-bar">
      {/* Header row */}
      <div className="ats-bar__header">
        <span className="ats-bar__label">ATS Score</span>
        <div className="ats-bar__result">
          <span className={`ats-bar__number ats-bar__number--${tier}`}>
            {displayNumber}
          </span>
          <span className={`ats-bar__badge ats-bar__badge--${tier}`}>
            {getLabel(score)}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="ats-bar__track">
        <div
          className={`ats-bar__fill ats-bar__fill--${tier}`}
          style={{ width: `${animatedScore}%` }}
        >
          <span className="ats-bar__fill-glow" />
        </div>
        {/* Tick marks */}
        <div className="ats-bar__tick" style={{ left: '25%' }} />
        <div className="ats-bar__tick" style={{ left: '50%' }} />
        <div className="ats-bar__tick" style={{ left: '75%' }} />
      </div>

      {/* Scale labels */}
      <div className="ats-bar__scale">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}
