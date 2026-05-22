'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api/client';
import { USE_MOCK, mockDelay } from '@/data/mock';
import type { Advocate } from '@/types';

export default function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Security Check: Redirect citizens back to /matters
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth/signup?returnTo=' + encodeURIComponent(pathname));
      } else if (user?.role !== 'advocate') {
        router.replace('/matters');
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  // Fetch Advocate Profile to show status in sidebar
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'advocate') return;

    async function fetchAdvocate() {
      setProfileLoading(true);
      try {
        if (USE_MOCK) {
          await mockDelay(300);
          // Restore mock advocate profile from localStorage if present
          const localProfile = localStorage.getItem('mock_advocate_profile');
          if (localProfile) {
            setAdvocate(JSON.parse(localProfile));
          } else {
            setAdvocate({
              name: 'John Doe',
              address: '',
              phone: '',
              verification_status: 'pending',
              auth_email: user?.email,
              courts: [],
              languages: ['en'],
              districts: [],
            });
          }
        } else {
          const res = await apiClient<Advocate>('/advocate/me');
          if (res.success && res.data) {
            setAdvocate(res.data);
          }
        }
      } catch (err) {
        console.error('Failed to load advocate sidebar profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    fetchAdvocate();

    // Listen for custom events to refresh sidebar if profile updates
    const handleProfileUpdate = () => {
      fetchAdvocate();
    };
    window.addEventListener('advocate-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('advocate-profile-updated', handleProfileUpdate);
    };
  }, [isAuthenticated, user]);

  if (isLoading || !isAuthenticated || user?.role !== 'advocate') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream)' }}>
        <div className="skeleton" style={{ height: '3rem', width: '200px' }} />
      </div>
    );
  }

  const menuItems = [
    {
      path: '/advocate/dashboard',
      labelEn: 'Console Dashboard',
      labelBn: 'কনসোল ড্যাশবোর্ড',
      icon: '📊',
    },
    {
      path: '/advocate/consultations',
      labelEn: 'Consultation Requests',
      labelBn: 'পরামর্শের অনুরোধ',
      icon: '📥',
    },
    {
      path: '/advocate/profile',
      labelEn: 'Professional Profile',
      labelBn: 'পেশাগত প্রোফাইল',
      icon: '💼',
    },
    {
      path: '/advocate/documents',
      labelEn: 'Verification Vault',
      labelBn: 'যাচাইকরণ ভল্ট',
      icon: '🔒',
    },
    {
      path: '/advocate/onboarding',
      labelEn: 'Onboarding Wizard',
      labelBn: 'অনবোর্ডিং উইজার্ড',
      icon: '🎯',
    },
  ];

  const status = advocate?.verification_status || advocate?.verificationStatus || 'pending';

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 4rem)', // accounting for main top navbar
      background: '#F8F6F2',
      color: '#0D1B2A',
      position: 'relative',
    }}>
      <style>{`
        .sidebar-container {
          width: 280px;
          background: #0D1B2A;
          border-right: 1px solid rgba(201,168,76,0.15);
          display: flex;
          flex-direction: column;
          padding: 2rem 1.25rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 4px 0 25px rgba(0,0,0,0.05);
        }
        .sidebar-profile {
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .sidebar-avatar {
          width: 4.5rem;
          height: 4.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #09131F 0%, #152232 100%);
          border: 2px solid #C9A84C;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #C9A84C;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          margin-bottom: 1rem;
        }
        .sidebar-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.25rem;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-email {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.45);
          margin-bottom: 1rem;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .status-pending {
          background: rgba(201, 168, 76, 0.15);
          color: #E2C475;
          border: 1px solid rgba(201, 168, 76, 0.35);
        }
        .status-verified {
          background: rgba(16, 185, 129, 0.15);
          color: #34D399;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        .status-rejected {
          background: rgba(239, 68, 68, 0.15);
          color: #F87171;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .menu-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .menu-link:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }
        .menu-link.active {
          color: #C9A84C;
          background: rgba(201,168,76,0.08);
          border-color: rgba(201,168,76,0.25);
        }
        .menu-icon {
          font-size: 1.1rem;
        }
        .content-area {
          flex: 1;
          padding: 2.5rem;
          overflow-y: auto;
        }
        @media (max-width: 900px) {
          .sidebar-container {
            width: 80px;
            padding: 1.5rem 0.5rem;
            align-items: center;
          }
          .sidebar-profile {
            border: none;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
          }
          .sidebar-name, .sidebar-email, .status-badge, .menu-text {
            display: none;
          }
          .menu-link {
            justify-content: center;
            padding: 0.75rem;
            border-radius: 50%;
          }
          .content-area {
            padding: 1.5rem;
          }
        }
      `}</style>

      {/* Sidebar Navigation */}
      <aside className="sidebar-container">
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {profileLoading ? '...' : (advocate?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'A')}
          </div>
          <h2 className="sidebar-name">{profileLoading ? 'Loading...' : (advocate?.name || 'New Advocate')}</h2>
          <span className="sidebar-email">{user?.email}</span>

          {!profileLoading && (
            <span className={`status-badge status-${status}`}>
              ● {status === 'verified'
                ? (language === 'en' ? 'Verified' : 'যাচাইকৃত')
                : status === 'rejected'
                  ? (language === 'en' ? 'Rejected' : 'প্রত্যাখ্যাত')
                  : (language === 'en' ? 'Pending' : 'অপেক্ষমান')}
            </span>
          )}
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => {
            const isActive = pathname === item.path || (item.path !== '/advocate/dashboard' && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={`menu-link ${isActive ? 'active' : ''}`}>
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">
                  {language === 'en' ? item.labelEn : item.labelBn}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Page Content */}
      <main className="content-area">
        {children}
      </main>
    </div>
  );
}
