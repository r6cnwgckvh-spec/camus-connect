'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { useChatStore } from '@/store/chat';
import axios from 'axios';

export function useInitialize() {
  const { data: session } = useSession();
  const setUser = useAppStore((s) => s.setUser);
  const connectSocket = useChatStore((s) => s.connectSocket);
  const disconnectSocket = useChatStore((s) => s.disconnectSocket);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as any);
      connectSocket(session.user.id);
    } else {
      setUser(null);
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [session]);
}

export async function fetchApi(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Something went wrong');
  }
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
