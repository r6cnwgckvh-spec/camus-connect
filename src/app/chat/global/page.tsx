'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Navbar from '@/components/navbar';
import type { GlobalMessage } from '@/types';

export default function GlobalChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/global');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchMessages();
  }, [status, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const res = await fetch('/api/chat/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setMessages(prev => [...prev, data]);
    } catch (e: any) {
      toast.error(e.message);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Global Chat</h2>
            <p className="text-xs text-gray-500 mt-0.5">Public chat for all CampusConnect students. Be respectful!</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 dark:text-gray-500 text-sm">No messages yet. Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSent = msg.userId === (session?.user as any)?.id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    {!isSent && (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 overflow-hidden flex-shrink-0 mt-0.5">
                        {msg.user?.profilePhotoUrl ? (
                          <img src={msg.user.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-xs">
                            {msg.user?.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isSent ? 'order-1' : ''}`}>
                      {!isSent && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 px-1">
                          @{msg.user?.username || msg.user?.name}
                        </p>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isSent
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <p className={`text-[10px] mt-0.5 px-1 ${isSent ? 'text-right text-indigo-400' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                maxLength={1000}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">Messages are moderated. Inappropriate content will be flagged.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
