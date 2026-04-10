import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, LogOut, ChevronDown, FileText, Layout, BookOpen, Briefcase, Sparkles } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user: userProfile, logout } = useAuth();
  const session = userProfile;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [clDropdownOpen, setClDropdownOpen] = useState(false);
  const [clMobileOpen, setClMobileOpen] = useState(false);
  const clDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  /* ── Scroll effect ── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    setMenuOpen(false);
    setClDropdownOpen(false);
    setClMobileOpen(false);
  }, [location.pathname]);

  /* ── Close dropdown on click outside ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clDropdownRef.current && !clDropdownRef.current.contains(e.target)) {
        setClDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Cover Letter dropdown sub-links ── */
  const clSubLinks = [
    { to: '/cover-letter#cl-builder', label: 'Cover Letter Builder', icon: <Sparkles size={16} />, desc: 'AI-powered cover letter generator' },
    { to: '/cover-letter#cl-templates', label: 'Templates', icon: <Layout size={16} />, desc: 'Professionally designed templates' },
    { to: '/cover-letter#cl-guides', label: 'Writing Guides', icon: <BookOpen size={16} />, desc: 'Expert advice and tips' },
    { to: '/cover-letter#cl-examples', label: 'Examples', icon: <Briefcase size={16} />, desc: 'Browse by job title' },
  ];

  const handleClSubClick = (e, subLink) => {
    e.preventDefault();
    setClDropdownOpen(false);
    setClMobileOpen(false);
    setMenuOpen(false);
    const hash = subLink.to.split('#')[1];

    const scrollToEl = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (location.pathname !== '/cover-letter') {
      navigate('/cover-letter');
      setTimeout(scrollToEl, 500);
    } else {
      scrollToEl();
    }
  };

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = async () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const getAvatarUrl = () => userProfile?.user_metadata?.avatar_url || null;

  const getAvatarInitials = () => {
    const name =
      userProfile?.user_metadata?.full_name || userProfile?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const navLinks = [
    { to: '/#how-it-works', label: 'How it Works' },
    { to: '/#features', label: 'Features' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/builder', label: 'Resources' },
    ...(session ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
  ];

  /* ── Handle hash-link scrolling ── */
  const handleNavClick = (e, link) => {
    const hashIndex = link.to.indexOf('#');
    if (hashIndex === -1) return; // normal link, let React Router handle it

    e.preventDefault();
    setMenuOpen(false);
    const hash = link.to.substring(hashIndex + 1);

    const scrollToElement = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (location.pathname !== '/') {
      navigate('/');
      // Wait for home page to render before scrolling
      setTimeout(scrollToElement, 400);
    } else {
      scrollToElement();
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-navbar">
      <div className="navbar__inner">
        {/* ── Logo ── */}
        <Link to="/" className="navbar__logo" id="navbar-logo">
          <span className="navbar__logo-mark">CF</span>
          <span className="navbar__logo-text">
            CareerForge <span className="navbar__logo-light">Pro</span>
          </span>
        </Link>

        {/* ── Desktop Links ── */}
        <div className="navbar__links">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__link ${isActive(link.to) ? 'navbar__link--active' : ''}`}
              id={`nav-link-${link.label.toLowerCase()}`}
              onClick={(e) => handleNavClick(e, link)}
            >
              {link.label}
            </Link>
          ))}

          {/* ── Cover Letter Dropdown ── */}
          <div
            className={`navbar__dropdown ${clDropdownOpen ? 'navbar__dropdown--open' : ''}`}
            ref={clDropdownRef}
            onMouseEnter={() => setClDropdownOpen(true)}
            onMouseLeave={() => setClDropdownOpen(false)}
          >
            <button
              className={`navbar__link navbar__dropdown-trigger ${location.pathname === '/cover-letter' ? 'navbar__link--active' : ''}`}
              onClick={() => { navigate('/cover-letter'); setClDropdownOpen(false); }}
              id="nav-link-cover-letter"
            >
              Cover Letter <ChevronDown size={14} className="navbar__dropdown-arrow" />
            </button>
            <div className="navbar__dropdown-menu">
              {clSubLinks.map((sub) => (
                <a
                  key={sub.to}
                  href={sub.to}
                  className="navbar__dropdown-item"
                  onClick={(e) => handleClSubClick(e, sub)}
                >
                  <span className="navbar__dropdown-item-icon">{sub.icon}</span>
                  <div className="navbar__dropdown-item-text">
                    <span className="navbar__dropdown-item-label">{sub.label}</span>
                    <span className="navbar__dropdown-item-desc">{sub.desc}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Desktop Auth ── */}
        <div className="navbar__auth">
          {session ? (
            <>
              <div
                className="navbar__avatar"
                title={userProfile?.email}
                id="navbar-avatar"
              >
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt="avatar"
                    className="navbar__avatar-img"
                  />
                ) : (
                  <span className="navbar__avatar-initials">
                    {getAvatarInitials()}
                  </span>
                )}
                <span className="navbar__avatar-ring" />
              </div>
              <button
                className="navbar__btn navbar__btn--logout"
                onClick={handleLogout}
                id="navbar-logout-btn"
              >
                <LogOut size={15} />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="navbar__btn navbar__btn--ghost"
                id="navbar-login-btn"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="navbar__btn navbar__btn--primary"
                id="navbar-get-started-btn"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile Toggle ── */}
        <button
          className="navbar__toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          id="navbar-mobile-toggle"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`navbar__mobile-link ${isActive(link.to) ? 'navbar__link--active' : ''}`}
            onClick={(e) => handleNavClick(e, link)}
          >
            {link.label}
          </Link>
        ))}

        {/* ── Mobile Cover Letter Accordion ── */}
        <button
          className="navbar__mobile-link navbar__mobile-accordion-trigger"
          onClick={() => setClMobileOpen(!clMobileOpen)}
        >
          Cover Letter
          <ChevronDown size={16} className={`navbar__mobile-accordion-arrow ${clMobileOpen ? 'navbar__mobile-accordion-arrow--open' : ''}`} />
        </button>
        {clMobileOpen && (
          <div className="navbar__mobile-accordion-body">
            {clSubLinks.map((sub) => (
              <a
                key={sub.to}
                href={sub.to}
                className="navbar__mobile-accordion-item"
                onClick={(e) => handleClSubClick(e, sub)}
              >
                {sub.icon}
                {sub.label}
              </a>
            ))}
          </div>
        )}

        <div className="navbar__mobile-divider" />

        {session ? (
          <div className="navbar__mobile-auth">
            <div className="navbar__mobile-user">
              <div className="navbar__avatar navbar__avatar--lg">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt="avatar"
                    className="navbar__avatar-img"
                  />
                ) : (
                  <span className="navbar__avatar-initials">
                    {getAvatarInitials()}
                  </span>
                )}
              </div>
              <span className="navbar__mobile-username">
                {userProfile?.user_metadata?.full_name ||
                  userProfile?.email ||
                  'User'}
              </span>
            </div>
            <button
              className="navbar__btn navbar__btn--logout navbar__btn--full"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        ) : (
          <div className="navbar__mobile-auth">
            <Link
              to="/login"
              className="navbar__btn navbar__btn--ghost navbar__btn--full"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="navbar__btn navbar__btn--primary navbar__btn--full"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
