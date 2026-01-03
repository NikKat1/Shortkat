// Компонент видеоплеера для вертикальной ленты
// Воспроизводит видео, показывает информацию, лайки и комментарии

import React, { useRef, useEffect, useState } from 'react'
import { Heart, MessageCircle, Share2, CheckCircle } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Button } from './ui/button'

interface Video {
  id: string
  userId: string
  title: string
  description: string
  url: string
  likes: number
  comments: number
  views: number
  isExternal?: boolean
  user?: {
    username: string
    displayName: string
    avatar: string
    isVerified: boolean
  }
}

interface VideoPlayerProps {
  video: Video
  isActive: boolean // Играть видео только когда оно активно на экране
  accessToken: string
  currentUserId: string
  onSubscribe: (userId: string) => void
  onOpenComments: (video: Video) => void
}

export function VideoPlayer({ 
  video, 
  isActive, 
  accessToken, 
  currentUserId,
  onSubscribe,
  onOpenComments 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(video.likes || 0)
  const [watchStartTime, setWatchStartTime] = useState<number>(0)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // =====================================================
  // АВТОВОСПРОИЗВЕДЕНИЕ видео когда оно активно
  // =====================================================
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(err => console.log('Play error:', err))
        setWatchStartTime(Date.now())
      } else {
        videoRef.current.pause()
        // Записываем просмотр при уходе с видео
        recordView()
      }
    }
  }, [isActive])

  // =====================================================
  // ЗАПИСЬ ПРОСМОТРА для аналитики
  // =====================================================
  const recordView = async () => {
    if (!watchStartTime) return
    
    const watchTime = (Date.now() - watchStartTime) / 1000 // в секундах
    const duration = videoRef.current?.duration || 0

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/view`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            videoId: video.id,
            watchTime,
            duration
          })
        }
      )
    } catch (error) {
      console.error('Record view error:', error)
    }
  }

  // =====================================================
  // ЛАЙК ВИДЕО
  // =====================================================
  const handleLike = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ videoId: video.id })
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setIsLiked(data.isLiked)
        setLikesCount(data.likes)
      }
    } catch (error) {
      console.error('Like error:', error)
    }
  }

  // =====================================================
  // ПОДПИСКА НА АВТОРА
  // =====================================================
  const handleSubscribe = async () => {
    if (video.userId === currentUserId) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ targetUserId: video.userId })
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setIsSubscribed(data.isSubscribed)
        onSubscribe(video.userId)
      }
    } catch (error) {
      console.error('Subscribe error:', error)
    }
  }

  // =====================================================
  // ПОДЕЛИТЬСЯ
  // =====================================================
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?video=${video.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: shareUrl
        })
      } catch (error) {
        console.log('Share error:', error)
      }
    } else {
      // Копируем ссылку в буфер обмена
      navigator.clipboard.writeText(shareUrl)
      alert('Ссылка скопирована в буфер обмена!')
    }
  }

  return (
    <div className="relative w-full h-screen snap-start bg-black">
      {/* ВИДЕО */}
      <video
        ref={videoRef}
        src={video.url}
        loop
        playsInline
        className="w-full h-full object-contain"
        onClick={() => {
          // Пауза/воспроизведение по клику
          if (videoRef.current?.paused) {
            videoRef.current.play()
          } else {
            videoRef.current?.pause()
          }
        }}
      />

      {/* ГРАДИЕНТ для читаемости текста */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* ИНФОРМАЦИЯ О ВИДЕО */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20">
        <div className="max-w-[70%]">
          {/* Автор */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
              {video.user?.avatar ? (
                <img src={video.user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">
                  {video.user?.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <span className="text-white flex items-center gap-1">
              {video.user?.username || 'Пользователь'}
              {video.user?.isVerified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
              )}
            </span>
            
            {/* Кнопка подписки */}
            {video.userId !== currentUserId && (
              <Button
                onClick={handleSubscribe}
                size="sm"
                className={`ml-2 ${
                  isSubscribed 
                    ? 'bg-zinc-700 hover:bg-zinc-600' 
                    : 'bg-pink-600 hover:bg-pink-700'
                }`}
              >
                {isSubscribed ? 'Подписан' : 'Подписаться'}
              </Button>
            )}
          </div>

          {/* Название */}
          <h3 className="text-white mb-1">{video.title}</h3>
          
          {/* Описание */}
          {video.description && (
            <p className="text-white/80 text-sm line-clamp-2">{video.description}</p>
          )}
        </div>
      </div>

      {/* БОКОВАЯ ПАНЕЛЬ с действиями */}
      <div className="absolute right-4 bottom-20 flex flex-col gap-6">
        {/* Лайк */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center backdrop-blur-sm transition-transform group-active:scale-90">
            <Heart 
              className={`w-7 h-7 transition-colors ${
                isLiked 
                  ? 'text-pink-500 fill-pink-500' 
                  : 'text-white'
              }`}
            />
          </div>
          <span className="text-white text-xs">
            {likesCount > 0 ? formatCount(likesCount) : ''}
          </span>
        </button>

        {/* Комментарии */}
        <button
          onClick={() => onOpenComments(video)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center backdrop-blur-sm transition-transform group-active:scale-90">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs">
            {video.comments > 0 ? formatCount(video.comments) : ''}
          </span>
        </button>

        {/* Поделиться */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center backdrop-blur-sm transition-transform group-active:scale-90">
            <Share2 className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>
    </div>
  )
}

// =====================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Форматирование чисел
// =====================================================
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}
