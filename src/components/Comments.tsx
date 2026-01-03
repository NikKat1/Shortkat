// Компонент комментариев к видео
// Показывает список комментариев и форму для добавления нового

import React, { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { X, Send, Loader2, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface Comment {
  id: string
  userId: string
  videoId: string
  text: string
  createdAt: string
  user?: {
    username: string
    displayName: string
    avatar: string
    isVerified: boolean
  }
}

interface CommentsProps {
  video: any
  accessToken: string
  onClose: () => void
}

export function Comments({ video, accessToken, onClose }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  // =====================================================
  // ЗАГРУЗКА КОММЕНТАРИЕВ
  // =====================================================
  useEffect(() => {
    loadComments()
  }, [video.id])

  const loadComments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/comments/${video.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Load comments error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ОТПРАВКА КОММЕНТАРИЯ
  // =====================================================
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return

    setPosting(true)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/comment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            videoId: video.id,
            text: newComment.trim()
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Добавляем новый комментарий в список
        await loadComments()
        setNewComment('')
      }
    } catch (error) {
      console.error('Post comment error:', error)
    } finally {
      setPosting(false)
    }
  }

  // =====================================================
  // ФОРМАТИРОВАНИЕ ВРЕМЕНИ
  // =====================================================
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} ч назад`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} д назад`
    
    return date.toLocaleDateString('ru-RU')
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-t-3xl md:rounded-xl w-full md:max-w-lg md:max-h-[80vh] flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-white text-lg">
            Комментарии {comments.length > 0 && `(${comments.length})`}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Список комментариев */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Комментариев пока нет</p>
              <p className="text-zinc-500 text-sm mt-1">Будьте первым!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {/* Аватар */}
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {comment.user?.avatar ? (
                    <img 
                      src={comment.user.avatar} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-white text-sm">
                      {comment.user?.displayName?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Контент комментария */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm flex items-center gap-1">
                      {comment.user?.username || 'Пользователь'}
                      {comment.user?.isVerified && (
                        <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500" />
                      )}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-white/90 text-sm mt-1">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Форма добавления комментария */}
        <div className="p-4 border-t border-zinc-800">
          <form onSubmit={handlePostComment} className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Добавьте комментарий..."
              className="bg-zinc-800 border-zinc-700 text-white flex-1"
              maxLength={500}
              disabled={posting}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-pink-600 hover:bg-pink-700"
              disabled={posting || !newComment.trim()}
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
