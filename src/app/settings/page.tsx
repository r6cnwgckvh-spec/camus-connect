'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';

interface BlockedUser {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [phoneVisibility, setPhoneVisibility] = useState('connections');
  const [profileVisible, setProfileVisible] = useState(true);
  const [mapPrecision, setMapPrecision] = useState('approximate');
  const [emailDigest, setEmailDigest] = useState('off');
  const [theme, setTheme] = useState('system');

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const loadSettings = async () => {
      try {
        const [profileRes, blocksRes] = await Promise.all([
          fetch('/api/profile', { method: 'GET' }),
          fetch('/api/blocks'),
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile.phoneVisibility) setPhoneVisibility(profile.phoneVisibility);
          if (profile.profileVisible !== undefined) setProfileVisible(profile.profileVisible);
          if (profile.mapPrecision) setMapPrecision(profile.mapPrecision);
          if (profile.emailDigest) setEmailDigest(profile.emailDigest);
          if (profile.theme) setTheme(profile.theme);
        }

        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          setBlockedUsers(blocksData.blockedUsers || []);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [status]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneVisibility,
          profileVisible,
          mapPrecision,
          emailDigest,
          theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      toast.success('Settings saved!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      const res = await fetch(`/api/blocks?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unblock');
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User unblocked');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUnblockingId(null);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const res = await fetch('/api/profile?action=deactivate', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
      toast.success('Account deactivated');
      router.push('/');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeactivating(false);
      setShowDeactivate(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/profile?action=delete', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      toast.success('Account permanently deleted');
      router.push('/');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const RadioGroup = ({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              value === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors flex items-center gap-2"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy</h2>
            <div className="space-y-5">
              <RadioGroup
                label="Phone Visibility"
                value={phoneVisibility}
                onChange={setPhoneVisibility}
                options={[
                  { value: 'nobody', label: 'Nobody' },
                  { value: 'connections', label: 'Connections' },
                  { value: 'everyone', label: 'Everyone' },
                ]}
              />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Visibility</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Show your profile in search results and to other students</p>
                </div>
                <button
                  onClick={() => setProfileVisible(!profileVisible)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    profileVisible ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    profileVisible ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <RadioGroup
                label="Map Precision"
                value={mapPrecision}
                onChange={setMapPrecision}
                options={[
                  { value: 'exact', label: 'Exact' },
                  { value: 'approximate', label: 'Approximate' },
                ]}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h2>
            <div className="space-y-5">
              <RadioGroup
                label="Email Digest"
                value={emailDigest}
                onChange={setEmailDigest}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                ]}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
            <div className="space-y-5">
              <RadioGroup
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Blocked Users</h2>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(bu => (
                  <div key={bu.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 overflow-hidden flex-shrink-0">
                        {bu.profilePhotoUrl ? (
                          <img src={bu.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                            {bu.name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{bu.name}</span>
                    </div>
                    <button
                      onClick={() => handleUnblock(bu.id)}
                      disabled={unblockingId === bu.id}
                      className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium disabled:opacity-50 transition-colors"
                    >
                      {unblockingId === bu.id ? '...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowDeactivate(true)}
                className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-medium text-sm transition-colors text-left"
              >
                Deactivate Account
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium text-sm transition-colors text-left"
              >
                Delete Account Permanently
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deactivate Account</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Your profile will be hidden and you won't appear in searches. You can reactivate by logging in again.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeactivate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deactivating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deactivating...</>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Account Permanently</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This action is irreversible. All your data including listings, connections, and messages will be permanently deleted.
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                ) : (
                  'Permanently Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
