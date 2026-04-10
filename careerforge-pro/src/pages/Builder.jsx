import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import ResumeForm from '../components/Resume/ResumeForm';
import ResumePreview from '../components/Resume/ResumePreview';
import { loadResume, resetResume } from '../redux/resumeSlice';
import { getResumeById } from '../utils/api';
import './Builder.css';
import toast from 'react-hot-toast';

export default function Builder() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { atsScore } = useSelector((state) => state.resume);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resumeId = searchParams.get('id');
    if (resumeId) {
      setLoading(true);
      getResumeById(resumeId)
        .then((res) => {
          if (res.data && res.data.resume_data) {
             const loadedData = res.data.resume_data;
             // also set atsScore, jdText, keywords if they exist on the model
             if(res.data.ats_score) loadedData.atsScore = res.data.ats_score;
             if(res.data.job_description) loadedData.jdText = res.data.job_description;
             if(res.data.keywords) loadedData.keywords = res.data.keywords;
             
             dispatch(loadResume(loadedData));
          }
        })
        .catch((err) => {
           console.error('Failed to load resume', err);
           toast.error('Failed to load resume data');
        })
        .finally(() => setLoading(false));
    } else {
      // If no ID, start fresh
      dispatch(resetResume());
    }
  }, [searchParams, dispatch]);

  if (loading) {
    return (
      <div className="builder-wrapper" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
         <Loader2 size={40} className="spinner" style={{animation: 'spin 1s linear infinite', color: '#8b5cf6'}} />
      </div>
    );
  }

  /* ── ATS badge color tier ── */
  const atsBadgeClass =
    atsScore >= 75
      ? 'builder-badge--green'
      : atsScore >= 50
        ? 'builder-badge--yellow'
        : 'builder-badge--red';

  return (
    <div className="builder-wrapper" id="builder-page">
      {/* ── Header Bar ── */}
      <header className="builder-header" id="builder-header">
        <div className="builder-header__left">
          <FileText size={20} className="builder-header__icon" />
          <h1 className="builder-header__title">Resume Builder</h1>
          {atsScore > 0 && (
            <span className={`builder-badge ${atsBadgeClass}`}>
              {atsScore}% ATS
            </span>
          )}
        </div>
      </header>

      {/* ── Main Content: Form + Preview ── */}
      <div className="builder" id="builder-content">
        <div className="builder__form">
          <ResumeForm />
        </div>
        <div className="builder__preview">
          <ResumePreview />
        </div>
      </div>
    </div>
  );
}
