'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  pendingColleges: number;
  pendingReports: number;
}

interface TopCollege {
  id: string;
  name: string;
  city: string;
  state: string;
  _count: { users: number };
}

interface CollegeSubmission {
  id: string;
  name: string;
  city: string;
  state: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface AdminReport {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  reportedListingId: string | null;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string };
  listing: { id: string; description: string; listingType: string } | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topColleges, setTopColleges] = useState<TopCollege[]>([]);
  const [submissions, setSubmissions] = useState<CollegeSubmission[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'colleges' | 'reports' | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'admin') return;

    const loadAdminData = async () => {
      setLoading(true);
      try {
        const [adminRes, collegesRes, reportsRes] = await Promise.all([
          fetch('/api/admin'),
          fetch('/api/admin/colleges'),
          fetch('/api/admin/reports'),
        ]);

        const adminData = await adminRes.json();
        if (adminRes.ok) {
          setStats(adminData.stats);
          setTopColleges(adminData.topColleges || []);
        }

        const collegesData = await collegesRes.json();
        if (collegesRes.ok) setSubmissions(collegesData.submissions || []);

        const reportsData = await reportsRes.json();
        if (reportsRes.ok) setReports(reportsData.reports || []);
      } catch {
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [status, user?.role]);

  const handleCollegeAction = async (submissionId: string, action: string, collegeId?: string) => {
    setActionLoading(`${submissionId}-${action}`);
    try {
      const res = await fetch('/api/admin/colleges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, action, collegeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setStats(prev => prev ? { ...prev, pendingColleges: prev.pendingColleges - 1 } : prev);
      toast.success(`College ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportAction = async (reportId: string, action: string) => {
    setActionLoading(`${reportId}-${action}`);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setReports(prev => prev.filter(r => r.id !== reportId));
      setStats(prev => prev ? { ...prev, pendingReports: prev.pendingReports - 1 } : prev);

      const labels: Record<string, string> = { resolve: 'Resolved', dismiss: 'Dismissed', ban: 'User banned' };
      toast.success(labels[action] || 'Action completed');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, color: 'bg-blue-500', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Total Listings', value: stats.totalListings, color: 'bg-emerald-500', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Pending Colleges', value: stats.pendingColleges, color: 'bg-amber-500', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Pending Reports', value: stats.pendingReports, color: 'bg-red-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending College Submissions
                  {submissions.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({submissions.length})</span>
                  )}
                </h2>
                {submissions.length > 0 && (
                  <button
                    onClick={() => setActiveSection(activeSection === 'colleges' ? null : 'colleges')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                  >
                    {activeSection === 'colleges' ? 'Hide' : 'Show All'}
                  </button>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No pending submissions</p>
                </div>
              ) : (
                <div className={activeSection === 'colleges' ? 'divide-y divide-gray-100 dark:divide-gray-700' : 'hidden'}>
                  {submissions.map(sub => (
                    <div key={sub.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{sub.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{sub.city}, {sub.state}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Submitted by {sub.user.name} ({sub.user.email}) &middot; {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCollegeAction(sub.id, 'approve')}
                          disabled={actionLoading === `${sub.id}-approve`}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          {actionLoading === `${sub.id}-approve` ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleCollegeAction(sub.id, 'reject')}
                          disabled={actionLoading === `${sub.id}-reject`}
                          className="px-4 py-2 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Reports
                  {reports.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({reports.length})</span>
                  )}
                </h2>
                {reports.length > 0 && (
                  <button
                    onClick={() => setActiveSection(activeSection === 'reports' ? null : 'reports')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                  >
                    {activeSection === 'reports' ? 'Hide' : 'Show All'}
                  </button>
                )}
              </div>

              {reports.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No pending reports</p>
                </div>
              ) : (
                <div className={activeSection === 'reports' ? 'divide-y divide-gray-100 dark:divide-gray-700' : 'hidden'}>
                  {reports.map(report => (
                    <div key={report.id} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                              {report.reason}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white mt-1.5 font-medium">
                            Reported by {report.reporter.name}
                          </p>
                          {report.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{report.description}</p>
                          )}
                          {report.listing && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Listing: {report.listing.description?.slice(0, 100) || `[${report.listing.listingType}]`}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {report.reportedUserId ? `User ID: ${report.reportedUserId}` : ''}
                            {report.reportedListingId ? ` Listing ID: ${report.reportedListingId}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          <button
                            onClick={() => handleReportAction(report.id, 'resolve')}
                            disabled={actionLoading === `${report.id}-resolve`}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-xs font-medium transition-colors"
                          >
                            {actionLoading === `${report.id}-resolve` ? '...' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => handleReportAction(report.id, 'dismiss')}
                            disabled={actionLoading === `${report.id}-dismiss`}
                            className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 text-xs font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                          {report.reportedUserId && (
                            <button
                              onClick={() => handleReportAction(report.id, 'ban')}
                              disabled={actionLoading === `${report.id}-ban`}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs font-medium transition-colors"
                            >
                              {actionLoading === `${report.id}-ban` ? '...' : 'Ban'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-fit lg:sticky lg:top-24">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Colleges</h2>
            </div>
            {topColleges.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400">No colleges yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {topColleges.map((college, idx) => (
                  <div key={college.id} className="px-6 py-3.5 flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      idx === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                      idx === 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{college.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{college.city}, {college.state}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                      {college._count.users}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
