'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/navigation/dashboard-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Chat {
  id: string;
  type: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt?: string;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    status: string;
  }>;
  participant1: { id: string; firstName: string; lastName: string };
  participant2: { id: string; firstName: string; lastName: string };
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [receiverId, setReceiverId] = useState('');

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiRequest<Chat[]>('/chats'),
  });

  const { data: messages } = useQuery({
    queryKey: ['chat-messages', selectedChatId],
    queryFn: () => selectedChatId ? apiRequest(`/chats/${selectedChatId}/messages`) : null,
    enabled: !!selectedChatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/chats/${selectedChatId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/chat/start', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (chat) => {
      setSelectedChatId(chat.id);
      setReceiverId('');
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const selectedChat = chats?.find(c => c.id === selectedChatId);

  return (
    <AuthGuard>
      <DashboardShell title="Messages" description="Real-time chat with admin and other users">
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <GlassCard className="p-4 h-[600px] flex flex-col">
            <h3 className="font-semibold mb-4">Conversations</h3>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {chats?.map((chat) => {
                const otherParticipant = chat.participant1Id === (window as any).__userId ? chat.participant2 : chat.participant1;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedChatId === chat.id ? 'bg-purple-600/50' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <p className="font-semibold text-sm">{otherParticipant.firstName} {otherParticipant.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{chat.messages?.[0]?.content || 'No messages'}</p>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-sm text-gray-400 mb-2">Start New Chat</p>
              <Input placeholder="Admin/User ID" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="mb-2" />
              <Button onClick={() => startChatMutation.mutate({ receiverId })} className="w-full" size="sm">
                Start Chat
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 h-[600px] flex flex-col">
            {selectedChat ? (
              <>
                <div className="mb-4 pb-4 border-b border-slate-700">
                  <h3 className="font-semibold">
                    {selectedChat.participant1Id === (window as any).__userId 
                      ? `${selectedChat.participant2.firstName} ${selectedChat.participant2.lastName}`
                      : `${selectedChat.participant1.firstName} ${selectedChat.participant1.lastName}`
                    }
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages?.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.senderId === (window as any).__userId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.senderId === (window as any).__userId 
                          ? 'bg-purple-600/50 text-white' 
                          : 'bg-slate-700/50 text-gray-200'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Type a message..." 
                    value={messageContent} 
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={2}
                  />
                  <Button 
                    onClick={() => sendMessageMutation.mutate({ 
                      content: messageContent, 
                      receiverId: selectedChat.participant1Id === (window as any).__userId ? selectedChat.participant2Id : selectedChat.participant1Id 
                    })}
                    disabled={sendMessageMutation.isPending || !messageContent}
                  >
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a conversation or start a new one
              </div>
            )}
          </GlassCard>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
