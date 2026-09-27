'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Button from '../ui/Button';

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
];

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch (err) {
      // Session may already be gone — still send the user home.
      router.push('/');
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand" aria-label="DevOps Academy home">
          <svg
            className="brand-mark"
            viewBox="0 0 32 32"
            width="32"
            height="32"
            role="img"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M11 20.5 7.5 16 11 11.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 11.5 24.5 16 21 20.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 9.5 14 22.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="brand-name">DevOps Academy</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            {menuOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>

        <div
          id="primary-navigation"
          className={menuOpen ? 'site-nav-wrap is-open' : 'site-nav-wrap'}
        >
          <nav className="site-nav" aria-label="Primary">
            <ul className="site-nav-list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive(link.href) ? 'nav-link is-active' : 'nav-link'}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-auth">
            {loading ? (
              <span className="header-auth-placeholder" aria-hidden="true" />
            ) : user ? (
              <>
                <span className="header-user user-text" title={user.name || user.email}>
                  {user.name || user.email}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                  loading={loggingOut}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button as="link" href="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button as="link" href="/signup" variant="primary" size="sm">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}