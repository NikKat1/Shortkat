// Creative Studio - аналитика для создателей контента
// Показывает просмотры, лайки и удержание аудитории

import React, { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ArrowLeft, Eye, Heart, TrendingUp, Loader2 } from 'lucide-react'

interface CreativeStudioProps {
  accessToken: string
  currentUserId: string
  onBack: () => void
}

interface VideoAnalytics {
  video: any
  views: number
  likes: number
  comments: number
  avgRetention: string
}

export function CreativeStudio({ accessToken, currentUserId, onBack }: CreativeStudioProps) {
  const [analytics, setAnalytics] = useState<VideoAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  // =====================================================
  // ЗАГРУЗКА АНАЛИТИКИ
  // =====================================================
  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/analytics/${currentUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setAnalytics(data.analytics || [])
      } else {
        console.error('Load analytics error:', data.error)
      }
    } catch (error) {
      console.error('Load analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ПОДСЧЕТ ОБЩЕЙ СТАТИСТИКИ
  // =====================================================
  const totalViews = analytics.reduce((sum, item) => sum + item.views, 0)
  const totalLikes = analytics.reduce((sum, item) => sum + item.likes, 0)
  const avgRetention = analytics.length > 0
    ? (analytics.reduce((sum, item) => sum + parseFloat(item.avgRetention), 0) / analytics.length).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-black">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-4 p-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-xl">Creative Studio</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      ) : (
        <div className="p-4">
          {/* Общая статистика */}
          <div className="mb-8">
            <h2 className="text-white text-lg mb-4">Общая статистика</h2>
            <div className="grid grid-cols-3 gap-4">
              {/* Просмотры */}
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <span className="text-zinc-400 text-sm">Просмотры</span>
                </div>
                <p className="text-white text-2xl">{formatNumber(totalViews)}</p>
              </div>

              {/* Лайки */}
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="text-zinc-400 text-sm">Лайки</span>
                </div>
                <p className="text-white text-2xl">{formatNumber(totalLikes)}</p>
              </div>

              {/* Удержание */}
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-zinc-400 text-sm">Удержание</span>
                </div>
                <p className="text-white text-2xl">{avgRetention}%</p>
              </div>
            </div>
          </div>

          {/* Аналитика по каждому видео */}
          <div>
            <h2 className="text-white text-lg mb-4">Ваши видео</h2>
            
            {analytics.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400">Вы еще не загрузили ни одного видео</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.map((item) => (
                  <div
                    key={item.video.id}
                    className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
                  >
                    <div className="flex gap-4">
                      {/* Превью видео */}
                      <div className="w-24 h-32 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                        {item.video.url && !item.video.isExternal && (
                          <video
                            src={item.video.url}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Информация */}
                      <div className="flex-1">
                        <h3 className="text-white mb-1">{item.video.title}</h3>
                        {item.video.description && (
                          <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
                            {item.video.description}
                          </p>
                        )}

                        {/* Метрики */}
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">Просмотры</p>
                            <p className="text-white">{formatNumber(item.views)}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">Лайки</p>
                            <p className="text-white">{formatNumber(item.likes)}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">Комментарии</p>
                            <p className="text-white">{formatNumber(item.comments)}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 text-xs mb-1">Удержание</p>
                            <p className="text-white">{item.avgRetention}%</p>
                          </div>
                        </div>

                        {/* Дополнительные метрики */}
                        <div className="mt-3 flex gap-4 text-sm">
                          {item.views > 0 && (
                            <>
                              <div className="text-zinc-400">
                                CTR лайков: {((item.likes / item.views) * 100).toFixed(1)}%
                              </div>
                              <div className="text-zinc-400">
                                CTR комментариев: {((item.comments / item.views) * 100).toFixed(1)}%
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Форматирование чисел
// =====================================================
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
