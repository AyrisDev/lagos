import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface FileSession {
  id: string;
  name: string;
  createdAt: Date;
  summary: Record<string, unknown> | null;
  messages: Message[];
  status: 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';
  type: 'file' | 'chat';
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  case_id?: string;
  title: string;
  description?: string;
  date: Date;
  type: 'hearing' | 'meeting' | 'deadline';
  location?: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  activeTab: '' | 'chats' | 'files' | 'search' | 'generate' | 'uyap' | 'calendar';
  setActiveTab: (tab: '' | 'chats' | 'files' | 'search' | 'generate' | 'uyap' | 'calendar') => void;
  sessions: FileSession[];
  events: CalendarEvent[];
  activeSessionId: string | null;
  fetchCases: (userId: string) => Promise<void>;
  fetchMessages: (caseId: string) => Promise<void>;
  createSession: (name: string, userId: string) => Promise<string | null>;
  setActiveSession: (id: string | null) => void;
  updateSession: (id: string, data: Partial<FileSession>) => void;
  renameSession: (id: string, newName: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addMessage: (sessionId: string, message: Message) => void;
  
  fetchEvents: (userId: string) => Promise<void>;
  createEvent: (eventData: Omit<CalendarEvent, 'id' | 'user_id' | 'date'> & { date: string }, userId: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  activeTab: 'files',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sessions: [],
  events: [],
  activeSessionId: null,

  fetchCases: async (userId: string) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*, documents(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching cases:', error);
      return;
    }

    if (data) {
      // Map cases to FileSession interface format
      const formattedSessions: FileSession[] = data.map((c: {
        id: string; title: string; created_at: string; status?: string; documents?: { id: string }[];
      }) => ({
        id: c.id,
        name: c.title,
        createdAt: new Date(c.created_at),
        summary: null, // We'll fetch this if needed later
        messages: [],
        status: c.status === 'active' ? 'ready' : 'idle', // Temporary mapping
        type: c.documents && c.documents.length > 0 ? 'file' : 'chat'
      }));
      set({ sessions: formattedSessions });
    }
  },
  
  createSession: async (name, userId) => {
    const { data, error } = await supabase
      .from('cases')
      .insert([
        { title: name, user_id: userId }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating case:', error);
      return null;
    }

    if (data) {
      const newSession: FileSession = {
        id: data.id,
        name: data.title,
        createdAt: new Date(data.created_at),
        summary: null,
        messages: [],
        status: 'idle',
        type: 'chat'
      };
      
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: data.id
      }));
      
      return data.id;
    }
    return null;
  },

  fetchMessages: async (caseId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    if (data) {
      const messages: Message[] = data.map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({
        id: m.id,
        role: m.role,
        content: m.content
      }));

      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === caseId ? { ...s, messages } : s
        )
      }));
    }
  },
  
  setActiveSession: (id) => {
    set({ activeSessionId: id });
    if (id) {
      get().fetchMessages(id);
    }
  },
  
  updateSession: (id, data) => set((state) => ({
    sessions: state.sessions.map(s => s.id === id ? { ...s, ...data } : s)
  })),
  
  renameSession: async (id, newName) => {
    set((state) => ({
      sessions: state.sessions.map(s => s.id === id ? { ...s, name: newName } : s)
    }));
    
    const { error } = await supabase.from('cases').update({ title: newName }).eq('id', id);
    if (error) {
      console.error('Failed to rename case:', error);
    }
  },

  deleteSession: async (id) => {
    // 1. Store'dan kaldır ve aktif session id silinen ise null yap
    set((state) => {
      const newSessions = state.sessions.filter(s => s.id !== id);
      const newActiveSessionId = state.activeSessionId === id ? null : state.activeSessionId;
      return {
        sessions: newSessions,
        activeSessionId: newActiveSessionId
      };
    });

    // 2. DB'den sil
    const { error } = await supabase.from('cases').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete case:', error);
    }
  },
  
  addMessage: async (sessionId, message) => {
    // 1. Store in Zustand immediately for optimistic UI
    set((state) => ({
      sessions: state.sessions.map(s => 
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      )
    }));
    
    // Sadece 'user' rolündeki mesajları backend'e gönderiyoruz, 
    // çünkü assistant mesajları zaten backend'den geliyor veya optimistik eklenmiş (upload gibi).
    if (message.role === 'user') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '').replace(/\/api$/, '');
          const response = await fetch(`${apiUrl}/api/chat/${sessionId}/message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ content: message.content })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to get response from backend:', response.status, errorText);
            return;
          }
          
          const data = await response.json();
          // Backend'den asistanın yanıtı dönüyor, bunu da state'e ekleyelim
          if (data.message) {
            set((state) => ({
              sessions: state.sessions.map(s => 
                s.id === sessionId ? { 
                  ...s, 
                  messages: [...s.messages, { id: data.message.id, role: 'assistant', content: data.message.content }] 
                } : s
              )
            }));
          }
        } catch (error) {
          console.error('Chat API Error:', error);
        }
      }
    }
  },

  fetchEvents: async (userId) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
      
    if (error) {
      if (error.code === '42P01') {
        console.warn('⚠️ [AyrisLegal] "events" tablosu bulunamadı. Lütfen Supabase SQL Editor üzerinden events tablosunu oluşturun.');
      } else {
        console.error('Error fetching events:', error);
      }
      return;
    }

    if (data) {
      set({
        events: data.map((e: Omit<CalendarEvent, 'date'> & { date: string }) => ({
          ...e,
          date: new Date(e.date)
        }))
      });
    }
  },

  createEvent: async (eventData, userId) => {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        user_id: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return;
    }

    if (data) {
      const newEvent = { ...data, date: new Date(data.date) };
      set((state) => ({
        events: [...state.events, newEvent].sort((a, b) => a.date.getTime() - b.date.getTime())
      }));
    }
  },

  deleteEvent: async (id) => {
    set((state) => ({
      events: state.events.filter(e => e.id !== id)
    }));

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      console.error('Error deleting event:', error);
    }
  }
}));
