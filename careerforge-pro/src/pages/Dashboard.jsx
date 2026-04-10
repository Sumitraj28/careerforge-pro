import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSelector } from 'react-redux';
import {
  Plus, FileText, Mail, Pencil, Download, Trash2,
  FilePlus, Target, Crown, AlertTriangle,
  Zap, BarChart3, Check, X, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Shared/Navbar';
import { getPaymentStatus } from '../utils/api';
import './Dashboard.css';

/* ── Initial states ── */
const INITIAL_RESUMES = [];

/* ════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* ── Auth + Redux state ── */
  const { user, refreshUser } = useAuth();
  const reduxPlan = useSelector((state) => state.user.plan);
  const plan = reduxPlan || user?.plan || 'free';
  const isPro = plan === 'pro' || plan === 'base' || plan === 'enterprise';

  /* ── UI state ── */
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLettersList] = useState([]);
  const [activeTab, setActiveTab] = useState('resumes');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, resume: null });
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const editRef = useRef(null);
  const pollingRef = useRef(null);

  /* ── Focus input when editing ── */
  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  /* ── Task 12: Payment success polling ── */
  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    if (paymentParam === 'success' && user) {
      setPaymentSuccess(true);
      toast.success('Payment successful! Verifying your plan...');

      const userId = user._id || user.id;
      let pollCount = 0;

      pollingRef.current = setInterval(async () => {
        pollCount++;
        try {
          const res = await getPaymentStatus(userId);
          if (res.data.plan && res.data.plan !== 'free') {
            // Plan is upgraded!
            clearInterval(pollingRef.current);
            await refreshUser(); // Refresh user data → syncs to Redux
            toast.success('Welcome to Pro! All features unlocked. 🎉');
            // Remove ?payment=success from URL
            navigate('/dashboard', { replace: true });
          }
        } catch (err) {
          console.error('Polling error:', err);
        }

        // Stop polling after 30 attempts (60 seconds)
        if (pollCount >= 30) {
          clearInterval(pollingRef.current);
          toast('Plan verification is taking longer. Refresh the page.', { icon: '⏳' });
        }
      }, 2000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [searchParams, user, refreshUser, navigate]);

  /* ── Fetch Data ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { getAllResumes, getAllCoverLetters } = await import('../utils/api');
        
        const [res, coverRes] = await Promise.all([
          getAllResumes(),
          getAllCoverLetters()
        ]);
        
        if (res.data) {
          const mappedResumes = res.data.map(r => ({
            id: r._id,
            title: r.title,
            jobTitle: r.job_description ? r.job_description.substring(0, 30) + '...' : r.resume_data?.personalInfo?.jobTitle || 'No Title',
            atsScore: r.ats_score,
            updatedAt: new Date(r.updatedAt).toLocaleDateString(),
            color: r.ats_score >= 75 ? '#22c55e' : r.ats_score >= 50 ? '#eab308' : '#ef4444'
          }));
          setResumes(mappedResumes);
        }
        
        if (coverRes.data) {
          setCoverLettersList(coverRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  /* ── Derived values ── */
  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'User';

  const totalResumes = resumes.length;
  const bestAts = resumes.length
    ? Math.max(...resumes.map((r) => r.atsScore))
    : 0;

  const isFree = !isPro;
  const resumesUsed = totalResumes;
  const resumesLimit = 1;

  /* ── Handlers ── */
  const openDeleteModal = (resume) =>
    setDeleteModal({ open: true, resume });

  const closeDeleteModal = () =>
    setDeleteModal({ open: false, resume: null });

  const confirmDelete = async () => {
    try {
      const { deleteResume } = await import('../utils/api');
      await deleteResume(deleteModal.resume.id);
      setResumes((prev) =>
        prev.filter((r) => r.id !== deleteModal.resume.id)
      );
      toast.success('Resume deleted');
    } catch (err) {
      toast.error('Failed to delete resume');
    }
    closeDeleteModal();
  };

  const startEditing = (resume) => {
    setEditingId(resume.id);
    setEditTitle(resume.title);
    setTimeout(() => {
      if (editRef.current) editRef.current.focus();
    }, 0);
  };

  const saveTitle = (id) => {
    if (editTitle.trim()) {
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: editTitle.trim() } : r))
      );
    }
    setEditingId(null);
  };

  const handleDownload = async (resume) => {
    try {
      const { getAllResumes, generatePDF } = await import('../utils/api');
      const res = await getAllResumes();
      const fullResume = res.data.find(r => r._id === resume.id);
      if(fullResume) {
         toast('PDF download requires rendering the template in builder first. Opening builder...', { icon: '📄' });
         navigate(`/builder?id=${resume.id}`);
      }
    } catch(err) {
      toast.error("Could not download resume");
    }
  };

  /* ── Task 11: Free plan new resume limit ── */
  const handleNewResume = () => {
    if (isFree && resumesUsed >= resumesLimit) {
      setUpgradeModal(true);
      return;
    }
    navigate('/builder');
  };

  /* ── ATS tier helpers ── */
  const atsTier = (score) => {
    if (score >= 75) return 'excellent';
    if (score >= 50) return 'good';
    return 'needs-work';
  };

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */
  return (
    <div className="dash">
      <Navbar />

      {/* ── PAYMENT SUCCESS BANNER ── */}
      {paymentSuccess && isPro && (
        <div className="dash-banner dash-banner--success" id="success-banner">
          <div className="dash-banner__inner">
            <div className="dash-banner__msg">
              <CheckCircle2 size={16} />
              <span>
                <strong>Welcome to Pro!</strong> All features unlocked. Enjoy unlimited resumes and premium templates.
              </span>
            </div>
            <button
              className="dash-banner__dismiss"
              onClick={() => setPaymentSuccess(false)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── FREE‑USER UPGRADE BANNER ── */}
      {isFree && (
        <div className="dash-banner" id="upgrade-banner">
          <div className="dash-banner__inner">
            <div className="dash-banner__msg">
              <Zap size={16} />
              <span>
                You've used <strong>{resumesUsed}/{resumesLimit}</strong> free
                resume. Upgrade to Pro for unlimited!
              </span>
            </div>
            <Link to="/pricing" className="dash-banner__btn" id="upgrade-now-btn">
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      <div className="dash__container">
        {/* ── TOP BAR ── */}
        <header className="dash-topbar" id="dash-topbar">
          <div className="dash-topbar__left">
            <h1 className="dash-topbar__greeting">
              Welcome back, <span className="dash-topbar__name">{userName}</span>
            </h1>
            <span
              className={`dash-topbar__plan ${
                isPro ? 'dash-topbar__plan--pro' : ''
              }`}
            >
              {isPro && <Crown size={12} />}
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </span>
          </div>

          <button
            className="dash-topbar__new-btn"
            id="new-resume-btn"
            onClick={handleNewResume}
          >
            <Plus size={18} />
            New Resume
          </button>
        </header>

        {/* ── STATS ROW ── */}
        <section className="dash-stats" id="stats-row">
          <StatCard
            icon={<FileText size={22} />}
            label="Total Resumes"
            value={totalResumes}
            color="blue"
          />
          <StatCard
            icon={<Target size={22} />}
            label="Best ATS Score"
            value={bestAts}
            suffix="/ 100"
            color="green"
          />
          <StatCard
            icon={<Mail size={22} />}
            label="Cover Letters"
            value={coverLetters.length}
            color="purple"
          />
        </section>

        {/* ── TABS ── */}
        <div className="dash-tabs" id="dash-tabs">
          <button
            className={`dash-tab ${activeTab === 'resumes' ? 'dash-tab--active' : ''}`}
            onClick={() => setActiveTab('resumes')}
            id="tab-resumes"
          >
            <FileText size={15} />
            Resumes
            <span className="dash-tab__count">{totalResumes}</span>
          </button>
          <button
            className={`dash-tab ${activeTab === 'coverLetters' ? 'dash-tab--active' : ''}`}
            onClick={() => setActiveTab('coverLetters')}
            id="tab-cover-letters"
          >
            <Mail size={15} />
            Cover Letters
          </button>
        </div>

        {/* ── CONTENT ── */}
        <main className="dash-content">
          {activeTab === 'resumes' && (
            <>
              {resumes.length === 0 ? (
                /* ── EMPTY STATE ── */
                <div className="dash-empty" id="empty-state">
                  <div className="dash-empty__icon">
                    <FilePlus size={44} />
                  </div>
                  <h3 className="dash-empty__title">
                    No resumes yet. Create your first one!
                  </h3>
                  <p className="dash-empty__desc">
                    Build an ATS-friendly resume and start landing more
                    interviews today.
                  </p>
                  <button
                    className="dash-empty__btn"
                    id="empty-create-btn"
                    onClick={handleNewResume}
                  >
                    <Plus size={18} />
                    Create Resume
                  </button>
                </div>
              ) : (
                /* ── RESUME GRID ── */
                <div className="dash-grid" id="resume-grid">
                  {resumes.map((resume) => (
                    <div className="rcard" key={resume.id}>
                      {/* Thumbnail */}
                      <div
                        className="rcard__thumb"
                        style={{ '--accent': resume.color }}
                        onClick={() => navigate(`/builder?id=${resume.id}`)}
                      >
                        {/* Mini resume skeleton */}
                        <div className="rcard__preview">
                          <div className="rcard__preview-header" />
                          <div className="rcard__preview-line rcard__preview-line--short" />
                          <div className="rcard__preview-line" />
                          <div className="rcard__preview-line" />
                          <div className="rcard__preview-line rcard__preview-line--med" />
                          <div className="rcard__preview-gap" />
                          <div className="rcard__preview-line" />
                          <div className="rcard__preview-line rcard__preview-line--short" />
                        </div>

                        {/* ATS badge */}
                        <span
                          className={`rcard__ats rcard__ats--${atsTier(resume.atsScore)}`}
                        >
                          <BarChart3 size={12} />
                          {resume.atsScore}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="rcard__body">
                        {/* Editable title */}
                        <div className="rcard__title-row">
                          {editingId === resume.id ? (
                            <div className="rcard__edit-wrap">
                              <input
                                ref={editRef}
                                className="rcard__edit-input"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => saveTitle(resume.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveTitle(resume.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <button
                                className="rcard__edit-save"
                                onClick={() => saveTitle(resume.id)}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="rcard__edit-cancel"
                                onClick={() => setEditingId(null)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3
                                className="rcard__title"
                                onClick={() => startEditing(resume)}
                                title="Click to rename"
                              >
                                {resume.title}
                              </h3>
                              <button
                                className="rcard__rename-btn"
                                onClick={() => startEditing(resume)}
                                aria-label="Rename"
                              >
                                <Pencil size={13} />
                              </button>
                            </>
                          )}
                        </div>

                        <p className="rcard__job">
                          <Target size={13} />
                          {resume.jobTitle}
                        </p>
                        <p className="rcard__date">
                          Last updated: {resume.updatedAt}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="rcard__actions">
                        <button
                          className="rcard__action rcard__action--edit"
                          onClick={() => navigate(`/builder?id=${resume.id}`)}
                          title="Edit"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button
                          className="rcard__action rcard__action--download"
                          onClick={() => handleDownload(resume)}
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          className="rcard__action rcard__action--delete"
                          onClick={() => openDeleteModal(resume)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'coverLetters' && (
            <>
              {coverLetters.length === 0 ? (
                <div className="dash-empty" id="cover-letters-empty">
                  <div className="dash-empty__icon dash-empty__icon--purple">
                    <Mail size={44} />
                  </div>
                  <h3 className="dash-empty__title">
                    No cover letters yet
                  </h3>
                  <p className="dash-empty__desc">
                    Generate an AI-powered cover letter to pair perfectly with your resumes.
                  </p>
                  <button
                    className="dash-empty__btn"
                    style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}
                    onClick={() => {
                      if (isFree) setUpgradeModal(true);
                      else navigate('/cover-letter');
                    }}
                  >
                    <Plus size={18} />
                    New Cover Letter
                  </button>
                </div>
              ) : (
                <div className="dash-grid" id="cover-letter-grid">
                  {coverLetters.map((cl) => (
                    <div className="rcard" key={cl._id}>
                      <div className="rcard__thumb" style={{ '--accent': '#8b5cf6' }}>
                        <div className="rcard__preview">
                           <div className="rcard__preview-header" />
                           <div className="rcard__preview-line rcard__preview-line--short" />
                           <div className="rcard__preview-line" />
                           <div className="rcard__preview-line rcard__preview-line--med" />
                        </div>
                      </div>
                      <div className="rcard__body">
                        <h3 className="rcard__title">{cl.companyName}</h3>
                        <p className="rcard__job">
                          Created: {new Date(cl.createdAt).toLocaleDateString()}
                        </p>
                        <p className="rcard__date" style={{fontStyle: 'italic'}}>
                          "{cl.coverLetterText.substring(0, 50)}..."
                        </p>
                      </div>
                      <div className="rcard__actions">
                        <button
                          className="rcard__action rcard__action--download"
                          onClick={async () => {
                            try {
                               toast.loading('Generating PDF...', { id: 'cl-dl' });
                               const { generateCoverLetterPDF } = await import('../utils/api');
                               const res = await generateCoverLetterPDF(cl.coverLetterText, {});
                               const url = window.URL.createObjectURL(new Blob([res.data]));
                               const link = document.createElement('a');
                               link.href = url;
                               link.setAttribute('download', 'cover_letter.pdf');
                               document.body.appendChild(link);
                               link.click();
                               toast.dismiss('cl-dl');
                            } catch(err) {
                               toast.dismiss('cl-dl');
                               toast.error('Failed to download PDF');
                            }
                          }}
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          className="rcard__action rcard__action--delete"
                          onClick={async () => {
                             try {
                               const { deleteCoverLetter } = await import('../utils/api');
                               await deleteCoverLetter(cl._id);
                               setCoverLettersList(prev => prev.filter(c => c._id !== cl._id));
                               toast.success('Cover letter deleted');
                             } catch(err) {
                               toast.error('Failed to delete cover letter');
                             }
                          }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteModal.open && deleteModal.resume && (
        <div className="dash-modal-overlay" id="delete-modal">
          <div className="dash-modal">
            <div className="dash-modal__icon">
              <AlertTriangle size={24} />
            </div>
            <h3 className="dash-modal__title">Delete Resume</h3>
            <p className="dash-modal__desc">
              Are you sure you want to delete "
              <strong>{deleteModal.resume.title}</strong>"? This action
              cannot be undone.
            </p>
            <div className="dash-modal__actions">
              <button
                className="dash-modal__btn dash-modal__btn--cancel"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="dash-modal__btn dash-modal__btn--delete"
                onClick={confirmDelete}
                id="confirm-delete-btn"
              >
                <Trash2 size={14} />
                Delete Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPGRADE MODAL (Task 11 — Free plan resume limit) ── */}
      {upgradeModal && (
        <div className="dash-modal-overlay" onClick={() => setUpgradeModal(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>
              <Crown size={24} />
            </div>
            <h3 className="dash-modal__title">Free Plan Limit Reached</h3>
            <p className="dash-modal__desc">
              You have reached your free limit of <strong>1 resume</strong>.
              Upgrade to Pro for unlimited resumes, premium templates, AI
              rewriting, and cover letter generation.
            </p>
            <div className="dash-modal__actions">
              <button
                className="dash-modal__btn dash-modal__btn--cancel"
                onClick={() => setUpgradeModal(false)}
              >
                Cancel
              </button>
              <button
                className="dash-modal__btn"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none' }}
                onClick={() => {
                  setUpgradeModal(false);
                  navigate('/pricing');
                }}
              >
                <Crown size={14} />
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat Card Sub‑component ── */
function StatCard({ icon, label, value, suffix, color = 'blue' }) {
  return (
    <div className={`dash-stat dash-stat--${color}`}>
      <div className="dash-stat__icon">{icon}</div>
      <div className="dash-stat__info">
        <span className="dash-stat__label">{label}</span>
        <div className="dash-stat__value-row">
          <span className="dash-stat__value">{value}</span>
          {suffix && <span className="dash-stat__suffix">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
