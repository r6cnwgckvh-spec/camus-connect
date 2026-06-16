'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';
import type { Connection } from '@/types';

type Tab = 'received' | 'sent' | 'connections' | 'find';

interface FoundUser {
  id: string;
  name: string;
  username: string | null;
  profilePhotoUrl: string | null;
  course: string | null;
  branch: string | null;
  yearOfStudy: string | null;
  college: { name: string } | null;
}

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('received');
  const [received, setReceived] = useState<Connection[]>([]);
  const [sent, setSent] = useState<Connection[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchSent, setSearchSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); }
  }, [status, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [receivedRes, sentRes, connectionsRes] = await Promise.all([
        fetch('/api/connections?type=received&status=pending'),
        fetch('/api/connections?type=sent&status=pending'),
        fetch('/api/connections?status=accepted'),
      ]);
      const [receivedData, sentData, connectionsData] = await Promise.all([
        receivedRes.json(), sentRes.json(), connectionsRes.json(),
      ]);
      setReceived(receivedData.connections || []);
      setSent(sentData.connections || []);
      setConnections(connectionsData.connections || []);
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchAll();
  }, [status, fetchAll]);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Connection accepted!');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Request declined');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Request cancelled');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Connection removed');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getOtherUser = (conn: Connection) => {
    if (!session?.user) return null;
    return conn.requesterId === (session.user as any).id ? conn.receiver : conn.requester;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const searchUser = async () => {
    const q = searchUsername.trim().toLowerCase();
    if (!q) { toast.error('Enter a username'); return; }
    setSearching(true);
    setFoundUser(null);
    setSearchSent(false);
    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFoundUser(data.user);
      if (!data.user) toast.error('No user found with that username');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (receiverId: string) => {
    setSearchSent(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Connection request sent!');
      setSearchUsername('');
      setFoundUser(null);
      setSearchSent(false);
    } catch (e: any) {
      toast.error(e.message);
      setSearchSent(false);
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'find', label: 'Find Users' },
    { key: 'received', label: 'Requests Received', count: received.length },
    { key: 'sent', label: 'Requests Sent', count: sent.length },
    { key: 'connections', label: 'My Connections', count: connections.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connections</h1>
        </div>

        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {tab === 'find' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Find Users by Username</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">@</span>
                      <input
                        type="text"
                        value={searchUsername}
                        onChange={e => setSearchUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                        onKeyDown={e => { if (e.key === 'Enter') searchUser(); }}
                        placeholder="Enter username"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={searchUser}
                      disabled={searching || !searchUsername.trim()}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {foundUser && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                      {foundUser.profilePhotoUrl ? (
                        <img src={foundUser.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                          {foundUser.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {foundUser.name}
                        <span className="text-sm text-gray-500 font-normal ml-2">@{foundUser.username}</span>
                      </p>
                      {foundUser.course && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {foundUser.course}{foundUser.college ? ` • ${foundUser.college.name}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => sendRequest(foundUser.id)}
                      disabled={searchSent}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      {searchSent ? 'Sending...' : 'Connect'}
                    </button>
                  </div>
                )}

                {foundUser === null && searchUsername && !searching && (
                  <div className="text-center py-10">
                    <p className="text-gray-400 text-sm">Search for a user by their username to send a connection request.</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'received' && (
              <div className="space-y-3">
                {received.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No pending requests</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">When someone sends you a connection request, it will appear here.</p>
                  </div>
                ) : (
                  received.map((conn) => {
                    const other = conn.requester;
                    return (
                      <div key={conn.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                          {other?.profilePhotoUrl ? (
                            <img src={other.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                              {other?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{other?.name || 'Unknown'}</p>
                          {other?.course && other?.yearOfStudy && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{other.course} &middot; {other.yearOfStudy}</p>
                          )}
                          {conn.message && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">&ldquo;{conn.message}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(conn.id)}
                            disabled={actionLoading === conn.id}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                          >
                            {actionLoading === conn.id ? '...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleDecline(conn.id)}
                            disabled={actionLoading === conn.id}
                            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'sent' && (
              <div className="space-y-3">
                {sent.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No requests sent</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Go to the Discover page to find and connect with students.</p>
                  </div>
                ) : (
                  sent.map((conn) => {
                    const other = conn.receiver;
                    return (
                      <div key={conn.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                          {other?.profilePhotoUrl ? (
                            <img src={other.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                              {other?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{other?.name || 'Unknown'}</p>
                          {other?.course && other?.yearOfStudy && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{other.course} &middot; {other.yearOfStudy}</p>
                          )}
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
                            Pending
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancel(conn.id)}
                          disabled={actionLoading === conn.id}
                          className="px-4 py-2 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          {actionLoading === conn.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'connections' && (
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No connections yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Once your connection requests are accepted, they will appear here.</p>
                  </div>
                ) : (
                  connections.map((conn) => {
                    const other = getOtherUser(conn);
                    return (
                      <div key={conn.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                          {other?.profilePhotoUrl ? (
                            <img src={other.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                              {other?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{other?.name || 'Unknown'}</p>
                          {other?.course && other?.yearOfStudy && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{other.course} &middot; {other.yearOfStudy}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/chat?connectionId=${conn.id}`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                          >
                            Message
                          </Link>
                          <button
                            onClick={() => handleRemove(conn.id)}
                            disabled={actionLoading === conn.id}
                            className="px-4 py-2 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium transition-colors"
                          >
                            {actionLoading === conn.id ? '...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
