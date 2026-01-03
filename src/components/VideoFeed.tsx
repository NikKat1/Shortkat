// Компонент вертикальной видео-ленты
// Отображает видео в стиле TikTok с прокруткой

import React, { useState, useEffect, useRef } from 'react'
import { VideoPlayer } from './VideoPlayer'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Loader2 } from 'lucide-react'

interface VideoFeedProps {
  accessToken: string
  currentUserId: string
  onOpenComments: (video: any) => void
}

export function VideoFeed({ accessToken, currentUserId, onOpenComments }: VideoFeedProps) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // =====================================================
  // ЗАГРУЗКА ВИДЕО при монтировании компонента
  // =====================================================
  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/videos?limit=20&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setVideos(data.videos || [])
      }
    } catch (error) {
      console.error('Load videos error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ОТСЛЕЖИВАНИЕ СКРОЛЛА для определения активного видео
  // =====================================================
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const windowHeight = window.innerHeight
      
      // Определяем индекс видео, которое больше всего видно на экране
      const newIndex = Math.round(scrollTop / windowHeight)
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < videos.length) {
        setActiveIndex(newIndex)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeIndex, videos.length])

  // =====================================================
  // ОБРАБОТЧИК ПОДПИСКИ
  // =====================================================
  const handleSubscribe = (userId: string) => {
    console.log('Subscribed to user:', userId)
    // Можно обновить состояние или перезагрузить видео
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <p className="text-white text-xl mb-2">Видео пока нет</p>
          <p className="text-zinc-400">Загрузите первое видео!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollBehavior: 'smooth' }}
    >
      {videos.map((video, index) => (
        <VideoPlayer
          key={video.id}
          video={video}
          isActive={index === activeIndex}
          accessToken={accessToken}
          currentUserId={currentUserId}
          onSubscribe={handleSubscribe}
          onOpenComments={onOpenComments}
        />
      ))}
    </div>
  )
}
