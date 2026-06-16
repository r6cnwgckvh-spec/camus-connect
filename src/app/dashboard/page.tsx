'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';

interface StudentUser {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  gender: string | null;
  collegeId: string | null;
  course: string | null;
  branch: string | null;
  yearOfStudy: string | null;
  lookingFor: string[];
  bio: string | null;
  verifiedBadge: boolean;
  lastActive: string | null;
  compatibilityAnswers: Record<string, string> | null;
  college: { name: string; city: string; state: string } | null;
  compatibilityScore: number | null;
}

interface CollegeOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

const COURSES = ['B.Tech', 'B.E.', 'BCA', 'MCA', 'MBA', 'BBA', 'B.Sc', 'M.Tech', 'M.Sc', 'B.Com', 'M.Com', 'BA', 'MA', 'Diploma', 'PhD', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Final Year', 'Graduated/Alumni'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const LOOKING_FOR = ['Roommate', 'PG/Hostel info', 'Study group', 'Just networking'];
const LIMIT = 20;

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && !(session.user as any)?.onboardingCompleted) {
      router.push('/onboarding');
    }
  }, [session, router]);

  const [students, setStudents] = useState<StudentUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState({
    collegeId: '',
    collegeName: '',
    course: '',
    yearOfStudy: '',
    gender: '',
    lookingFor: '',
  });

  const [collegeQuery, setCollegeQuery] = useState('');
  const [collegeResults, setCollegeResults] = useState<CollegeOption[]>([]);
  const [collegeSearching, setCollegeSearching] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const collegeSearchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasActiveFilters = filters.collegeId || filters.course || filters.yearOfStudy || filters.gender || filters.lookingFor || search;

  const fetchStudents = useCallback(async (pageNum: number, reset: boolean) => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', String(LIMIT));
      if (search) params.set('search', search);
      if (filters.collegeId) params.set('collegeId', filters.collegeId);
      if (filters.course) params.set('course', filters.course);
      if (filters.yearOfStudy) params.set('yearOfStudy', filters.yearOfStudy);
      if (filters.gender) params.set('gender', filters.gender);
      if (filters.lookingFor) params.set('lookingFor', filters.lookingFor);

      const res = await fetch(`/api/users?${params.toString()}`, { method: 'POST' });
      const data = await res.json();

      if (id !== fetchIdRef.current) return;

      if (!res.ok) throw new Error(data.error || 'Failed to load students');

      if (reset) {
        setStudents(data.users);
      } else {
        setStudents(prev => [...prev, ...data.users]);
      }
      setHasMore(data.users.length === LIMIT);
    } catch (e: any) {
      if (id !== fetchIdRef.current) return;
      setError(e.message);
    } finally {
      if (id === fetchIdRef.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [search, filters]);

  useEffect(() => {
    setPage(1);
    fetchStudents(1, true);
  }, [fetchStudents]);

  useEffect(() => {
    if (page > 1) {
      fetchStudents(page, false);
    }
  }, [page, fetchStudents]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore && !error) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, error]);

  useEffect(() => {
    if (collegeQuery.length < 2) {
      setCollegeResults([]);
      setShowCollegeDropdown(false);
      return;
    }

    if (collegeSearchTimeoutRef.current) clearTimeout(collegeSearchTimeoutRef.current);

    collegeSearchTimeoutRef.current = setTimeout(async () => {
      setCollegeSearching(true);
      try {
        const res = await fetch(`/api/colleges?q=${encodeURIComponent(collegeQuery)}&limit=10`);
        const data = await res.json();
        setCollegeResults(data.colleges || []);
        setShowCollegeDropdown(true);
      } catch {
      } finally {
        setCollegeSearching(false);
      }
    }, 300);

    return () => {
      if (collegeSearchTimeoutRef.current) clearTimeout(collegeSearchTimeoutRef.current);
    };
  }, [collegeQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  const selectCollege = (college: CollegeOption) => {
    setFilters(f => ({ ...f, collegeId: college.id, collegeName: college.name }));
    setCollegeQuery(college.name);
    setShowCollegeDropdown(false);
  };

  const clearCollege = () => {
    setFilters(f => ({ ...f, collegeId: '', collegeName: '' }));
    setCollegeQuery('');
    setCollegeResults([]);
  };

  const clearAllFilters = () => {
    setFilters({ collegeId: '', collegeName: '', course: '', yearOfStudy: '', gender: '', lookingFor: '' });
    setSearchInput('');
    setSearch('');
    setCollegeQuery('');
    setCollegeResults([]);
  };

  const handleConnect = async (receiverId: string) => {
    setConnectingId(receiverId);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');
      setPendingRequests(prev => new Set(prev).add(receiverId));
      toast.success('Connection request sent!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConnectingId(null);
    }
  };

  const formatLastActive = (lastActive: string | null) => {
    if (!lastActive) return 'Recently';
    const diff = Date.now() - new Date(lastActive).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const renderSkeletons = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
          <div className="px-4 pb-3 flex gap-1.5">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
          </div>
          <div className="px-4 pb-3 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
          <div className="px-4 pb-4">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
          </div>
        </div>
      ))}
    </>
  );

  const filterContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Filters</h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium">
            Clear all
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">College</label>
        {filters.collegeId ? (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
            <span className="flex-1 truncate">{filters.collegeName}</span>
            <button onClick={clearCollege} className="hover:text-indigo-900 dark:hover:text-indigo-100 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={collegeQuery}
              onChange={e => setCollegeQuery(e.target.value)}
              onFocus={() => collegeResults.length > 0 && setShowCollegeDropdown(true)}
              placeholder="Search college..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {collegeSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showCollegeDropdown && collegeResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {collegeResults.map(c => (
                  <button key={c.id} type="button" onClick={() => selectCollege(c)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-gray-600 border-b border-gray-50 dark:border-gray-600 last:border-0 transition-colors">
                    <p className="text-gray-900 dark:text-white font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.city}, {c.state}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Course</label>
        <select
          value={filters.course}
          onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Courses</option>
          {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Year of Study</label>
        <select
          value={filters.yearOfStudy}
          onChange={e => setFilters(f => ({ ...f, yearOfStudy: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Gender</label>
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map(g => (
            <button
              key={g}
              onClick={() => setFilters(f => ({ ...f, gender: f.gender === g ? '' : g }))}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                filters.gender === g
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Looking For</label>
        <div className="flex flex-wrap gap-1.5">
          {LOOKING_FOR.map(lf => (
            <button
              key={lf}
              onClick={() => setFilters(f => ({ ...f, lookingFor: f.lookingFor === lf ? '' : lf }))}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                filters.lookingFor === lf
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
              }`}
            >
              {lf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6 animate-pulse w-full max-w-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {renderSkeletons()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by name or college..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className={`${showMobileFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:sticky lg:top-24">
              {filterContent}
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-6">
                <p className="text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>
                <button
                  onClick={() => { setPage(1); fetchStudents(1, true); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {!error && students.length === 0 && !loading && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No students found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'No other students have joined yet. Check back soon!'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map(student => {
                const isPending = pendingRequests.has(student.id);
                const isConnecting = connectingId === student.id;

                return (
                  <div key={student.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <Link href={`/profile/${student.id}`} className="block">
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-800 overflow-hidden flex-shrink-0">
                          {student.profilePhotoUrl ? (
                            <img src={student.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                              {student.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{student.name}</h3>
                            {student.verifiedBadge && (
                              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {student.college?.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {student.course} {student.branch ? `• ${student.branch}` : ''} • {student.yearOfStudy}
                          </p>
                        </div>
                        {student.compatibilityScore !== null && (
                          <div className="flex-shrink-0 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full">
                            {student.compatibilityScore}% Match
                          </div>
                        )}
                      </div>
                    </Link>

                    {student.lookingFor.length > 0 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                        {student.lookingFor.map(lf => (
                          <span key={lf} className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {lf}
                          </span>
                        ))}
                      </div>
                    )}

                    {student.bio && (
                      <p className="px-4 pb-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {student.bio}
                      </p>
                    )}

                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${student.lastActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-400">{formatLastActive(student.lastActive)}</span>
                      </div>
                      <button
                        onClick={() => handleConnect(student.id)}
                        disabled={isPending || isConnecting}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          isPending
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 cursor-default'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isConnecting ? (
                          <span className="inline-flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : isPending ? (
                          'Request Sent ✓'
                        ) : (
                          'Connect'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {loading && renderSkeletons()}
            </div>

            {!hasMore && students.length > 0 && !loading && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6 py-4">
                You've seen everyone! Check back later for new students.
              </p>
            )}

            <div ref={sentinelRef} className="h-4" />
          </main>
        </div>
      </div>
    </div>
  );
}
