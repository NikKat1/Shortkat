// Компонент личных чатов
// Показывает список чатов и отдельный чат с системой "огонька"

import React, { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface ChatProps {
  accessToken: string
  currentUserId: string
  onBack: () => void
}

interface ChatItem {
  chatId: string
  otherUser: any
  lastMessage: any
  streak: { count: number }
  messagesCount: number
}

export function Chat({ accessToken, currentUserId, onBack }: ChatProps) {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [streak, setStreak] = useState<{ count: number; lastDate: string | null }>({ 
    count: 0, 
    lastDate: null 
  })
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // =====================================================
  // ЗАГРУЗКА СПИСКА ЧАТОВ
  // =====================================================
  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/chats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error('Load chats error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ЗАГРУЗКА СООБЩЕНИЙ КОНКРЕТНОГО ЧАТА
  // =====================================================
  const loadMessages = async (chat: ChatItem) => {
    setSelectedChat(chat)
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/messages/${chat.otherUser.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setMessages(data.messages || [])
        setStreak(data.streak || { count: 0, lastDate: null })
      }
    } catch (error) {
      console.error('Load messages error:', error)
    }
  }

  // =====================================================
  // ОТПРАВКА СООБЩЕНИЯ
  // =====================================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedChat) return

    setSending(true)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            recipientId: selectedChat.otherUser.id,
            text: newMessage.trim()
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Добавляем сообщение в список
        setMessages([...messages, data.message])
        setNewMessage('')
        
        // Обновляем стрик
        await loadMessages(selectedChat)
      }
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setSending(false)
    }
  }

  // =====================================================
  // ФОРМАТИРОВАНИЕ ВРЕМЕНИ
  // =====================================================
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // =====================================================
  // СПИСОК ЧАТОВ
  // =====================================================
  if (!selectedChat) {
    return (
      <div className="min-h-screen bg-black">
        {/* Шапка */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
          <div className="flex items-center gap-4 p-4">
            <button onClick={onBack} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-xl">Сообщения</h1>
          </div>
        </div>

        {/* Список чатов */}
        <div className="divide-y divide-zinc-800">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Нет сообщений</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.chatId}
                onClick={() => loadMessages(chat)}
                className="w-full p-4 flex items-center gap-3 hover:bg-zinc-900 transition-colors"
              >
                {/* Аватар */}
                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {chat.otherUser?.avatar ? (
                    <img 
                      src={chat.otherUser.avatar} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-white">
                      {chat.otherUser?.displayName?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Информация */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white">
                      {chat.otherUser?.displayName || 'Пользователь'}
                    </span>
                    {/* Огонек стрика */}
                    {chat.streak.count > 0 && (
                      <div className="flex items-center gap-1 text-orange-500">
                        <span>🔥</span>
                        <span className="text-xs">{chat.streak.count}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm truncate">
                    {chat.lastMessage?.text || 'Нет сообщений'}
                  </p>
                </div>

                {/* Время */}
                <span className="text-zinc-500 text-xs">
                  {formatTime(chat.lastMessage?.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // =====================================================
  // ОКНО ЧАТА
  // =====================================================
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Шапка чата */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => setSelectedChat(null)} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Аватар и имя */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
              {selectedChat.otherUser?.avatar ? (
                <img 
                  src={selectedChat.otherUser.avatar} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-white">
                  {selectedChat.otherUser?.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div>
              <p className="text-white">
                {selectedChat.otherUser?.displayName || 'Пользователь'}
              </p>
              {/* Стрик */}
              {streak.count > 0 && (
                <p className="text-orange-500 text-sm flex items-center gap-1">
                  <span>🔥</span>
                  <span>{streak.count} {streak.count === 1 ? 'день' : 'дней'} подряд</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">Начните разговор!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId
            
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? 'bg-pink-600 text-white'
                      : 'bg-zinc-800 text-white'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    isMine ? 'text-pink-200' : 'text-zinc-500'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Форма отправки */}
      <div className="p-4 border-t border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Сообщение..."
            className="bg-zinc-800 border-zinc-700 text-white flex-1"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-pink-600 hover:bg-pink-700"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
