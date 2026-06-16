'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';
import type { Connection, Message } from '@/types';

interface ConnectionWithLastMessage extends Connection {
  lastMessage?: Message;
}

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<ConnectionWithLastMessage[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); }
  }, [status, router]);

  useEffect(() => {
    const connId = searchParams.get('connectionId');
    if (connId) setActiveConnectionId(connId);
  }, [searchParams]);

  const fetchConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const res = await fetch('/api/connections?status=accepted');
      const data = await res.json();
      setConnections(data.connections || []);
      if (!searchParams.get('connectionId') && data.connections?.length > 0) {
        setActiveConnectionId(data.connections[0].id);
      }
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated') fetchConnections();
  }, [status, fetchConnections]);

  const fetchMessages = useCallback(async (connId: string, pg = 1) => {
    if (pg === 1) setLoadingMessages(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/messages?connectionId=${connId}&page=${pg}&limit=50`);
      const data = await res.json();
      if (pg === 1) {
        setMessages(data.messages || []);
      } else {
        setMessages(prev => [...(data.messages || []), ...prev]);
      }
      setPage(pg);
      setHasMore(data.messages?.length === 50);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      if (pg === 1) setLoadingMessages(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (activeConnectionId) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      fetchMessages(activeConnectionId, 1);
    }
  }, [activeConnectionId, fetchMessages]);

  const loadEarlier = () => {
    if (!activeConnectionId || loadingMore || !hasMore) return;
    fetchMessages(activeConnectionId, page + 1);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConnectionId || sending) return;
    setSending(true);
    const content = messageInput.trim();
    setMessageInput('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: activeConnectionId, content }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
    } catch (e: any) {
      toast.error(e.message);
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeConnectionId) {
      pollingRef.current = setInterval(() => {
        fetch(`/api/messages?connectionId=${activeConnectionId}&page=1&limit=50`)
          .then(r => r.json())
          .then(data => {
            if (data.messages) {
              setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newOnes = data.messages.filter((m: Message) => !existingIds.has(m.id));
                if (newOnes.length > 0) return [...prev, ...newOnes];
                return prev;
              });
            }
          })
          .catch(() => {});
      }, 5000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [activeConnectionId]);

  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const otherUser = activeConnection
    ? activeConnection.requesterId === (session?.user as any)?.id
      ? activeConnection.receiver
      : activeConnection.requester
    : null;

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
      <div className="h-[calc(100vh-4rem)] flex max-w-7xl mx-auto">
        <div className="w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConnections ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : connections.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No connections yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Accept connection requests to start chatting.</p>
              </div>
            ) : (
              connections.map((conn) => {
                const other = conn.requesterId === (session?.user as any)?.id ? conn.receiver : conn.requester;
                return (
                  <button
                    key={conn.id}
                    onClick={() => {
                      setActiveConnectionId(conn.id);
                      router.replace(`/chat?connectionId=${conn.id}`);
                    }}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 ${
                      activeConnectionId === conn.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                      {other?.profilePhotoUrl ? (
                        <img src={other.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                          {other?.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{other?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {other?.course ? `${other.course}` : 'Connected'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {!activeConnectionId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Select a conversation</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Choose a connection to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden flex-shrink-0">
                  {otherUser?.profilePhotoUrl ? (
                    <img src={otherUser.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                      {otherUser?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{otherUser?.name || 'Unknown'}</p>
                  {otherUser?.course && otherUser?.yearOfStudy && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{otherUser.course} &middot; {otherUser.yearOfStudy}</p>
                  )}
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    {hasMore && (
                      <div className="text-center">
                        <button
                          onClick={loadEarlier}
                          disabled={loadingMore}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-50 font-medium"
                        >
                          {loadingMore ? 'Loading...' : 'Load earlier messages'}
                        </button>
                      </div>
                    )}

                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isSent = msg.senderId === (session?.user as any)?.id;
                        return (
                          <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                              isSent
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isSent ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors flex items-center gap-1"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatContent />
    </Suspense>
  );
}
