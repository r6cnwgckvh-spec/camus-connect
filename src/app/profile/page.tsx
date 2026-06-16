'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';
import type { Listing } from '@/types';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const COURSES = ['B.Tech', 'B.E.', 'BCA', 'MCA', 'MBA', 'BBA', 'B.Sc', 'M.Tech', 'M.Sc', 'B.Com', 'M.Com', 'BA', 'MA', 'Diploma', 'PhD', 'Other'];
const BRANCHES = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT', 'AI & ML', 'Data Science', 'Full Stack Development', 'Civil', 'Chemical', 'Biotech', 'Aerospace', 'Automobile', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Final Year', 'Graduated/Alumni'];
const LOOKING_FOR = ['Roommate', 'PG/Hostel info', 'Study group', 'Just networking'];

function formatRent(min: number | null, max: number | null) {
  if (min && max) return `\u20B9${min.toLocaleString()} - \u20B9${max.toLocaleString()}`;
  if (min) return `From \u20B9${min.toLocaleString()}`;
  if (max) return `Upto \u20B9${max.toLocaleString()}`;
  return 'Negotiable';
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [tab, setTab] = useState<'listings' | 'favorites'>('listings');

  const [form, setForm] = useState({
    name: '',
    bio: '',
    gender: '',
    course: '',
    branch: '',
    yearOfStudy: '',
    lookingFor: [] as string[],
  });

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
  }, [status, router]);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        const [listingsRes, favoritesRes] = await Promise.all([
          fetch(`/api/listings?userId=${user.id}&limit=50`),
          fetch('/api/favorites'),
        ]);
        const listingsData = await listingsRes.json();
        const favoritesData = await favoritesRes.json();
        if (listingsRes.ok) setListings(listingsData.listings || []);
        if (favoritesRes.ok) setFavorites(favoritesData.favorites || []);
      } catch {
        toast.error('Failed to load profile data');
      } finally {
        setLoadingListings(false);
        setLoadingFavorites(false);
      }
    };

    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: '',
        gender: '',
        course: '',
        branch: '',
        yearOfStudy: '',
        lookingFor: [],
      });
    }
  }, [user]);

  const startEditing = async () => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || user.name || '',
          bio: data.bio || '',
          gender: data.gender || '',
          course: data.course || '',
          branch: data.branch || '',
          yearOfStudy: data.yearOfStudy || '',
          lookingFor: data.lookingFor || [],
        });
      } else {
        setForm({
          name: user.name || '',
          bio: '',
          gender: '',
          course: '',
          branch: '',
          yearOfStudy: '',
          lookingFor: [],
        });
      }
    } catch {
      setForm({
        name: user.name || '',
        bio: '',
        gender: '',
        course: '',
        branch: '',
        yearOfStudy: '',
        lookingFor: [],
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          gender: form.gender,
          course: form.course,
          branch: form.branch,
          yearOfStudy: form.yearOfStudy,
          lookingFor: form.lookingFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Profile updated!');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLookingFor = (item: string) => {
    setForm(f => ({
      ...f,
      lookingFor: f.lookingFor.includes(item)
        ? f.lookingFor.filter(x => x !== item)
        : [...f.lookingFor, item],
    }));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 sm:h-40" />

          <div className="px-6 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-20 gap-4 sm:gap-6">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-800 overflow-hidden flex-shrink-0 shadow-lg">
                {user?.image ? (
                  <img src={user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-300">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.name || 'User'}
                  </h1>
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={editing ? handleSave : startEditing}
                disabled={saving}
                className="self-start sm:self-end px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : editing ? (
                  'Save Profile'
                ) : (
                  'Edit Profile'
                )}
              </button>
            </div>

            {editing && (
              <div className="mt-6 space-y-2 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Course</label>
                    <select
                      value={form.course}
                      onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Select course</option>
                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
                    <select
                      value={form.branch}
                      onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Select branch</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year of Study</label>
                    <select
                      value={form.yearOfStudy}
                      onChange={e => setForm(f => ({ ...f, yearOfStudy: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Select year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Looking For</label>
                  <div className="flex flex-wrap gap-1.5">
                    {LOOKING_FOR.map(lf => (
                      <button
                        key={lf}
                        onClick={() => toggleLookingFor(lf)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          form.lookingFor.includes(lf)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        {lf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => e.target.value.length <= 300 && setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell other students about yourself..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/300</p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            )}

            {!editing && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    B.Tech CSE
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    3rd Year
                  </span>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bio</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    No bio yet. Click Edit Profile to add one.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setTab('listings')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'listings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setTab('favorites')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'favorites'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Favorites ({favorites.length})
            </button>
          </div>

          {tab === 'listings' && (
            <div className="space-y-3">
              {loadingListings ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : listings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No listings yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Post a room listing from the Map page.</p>
                </div>
              ) : (
                listings.map(listing => (
                  <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex">
                      <div className="w-28 h-28 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          listing.listingType === 'have_room' ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white'
                        }`}>
                          {listing.listingType === 'have_room' ? 'Room' : 'Looking'}
                        </div>
                      </div>
                      <div className="flex-1 p-4 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatRent(listing.rentMin, listing.rentMax)}</p>
                        {listing.roomType && <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">{listing.roomType}</p>}
                        <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-1">{listing.address}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${listing.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                          <span className="text-xs text-gray-400 capitalize">{listing.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'favorites' && (
            <div className="space-y-3">
              {loadingFavorites ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No favorites yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Save listings you like by clicking the heart icon on the Map page.</p>
                </div>
              ) : (
                favorites.map(listing => (
                  <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex">
                      <div className="w-28 h-28 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          listing.listingType === 'have_room' ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white'
                        }`}>
                          {listing.listingType === 'have_room' ? 'Room' : 'Looking'}
                        </div>
                      </div>
                      <div className="flex-1 p-4 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatRent(listing.rentMin, listing.rentMax)}</p>
                        {listing.roomType && <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">{listing.roomType}</p>}
                        <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-1">{listing.address}</p>
                        {listing.user && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                              {listing.user.name?.[0] || '?'}
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{listing.user.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
