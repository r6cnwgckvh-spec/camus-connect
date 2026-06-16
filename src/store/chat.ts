import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface ChatState {
  socket: Socket | null;
  activeConnectionId: string | null;
  setActiveConnectionId: (id: string | null) => void;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  activeConnectionId: null,
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),
  connectSocket: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Chat] Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Chat] Socket connection error:', error.message);
    });

    set({ socket });
  },
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
