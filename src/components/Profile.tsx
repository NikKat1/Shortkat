// Компонент профиля пользователя
// Показывает информацию о пользователе и его видео

import React, { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ArrowLeft, Settings, CheckCircle, Grid3x3, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'

interface ProfileProps {
  userId: string
  accessToken: string
  currentUserId: string
  onBack: () => void
}

export function Profile({ userId, accessToken, currentUserId, onBack }: ProfileProps) {
  const [user, setUser] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  // Поля редактирования
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwnProfile = userId === currentUserId

  // =====================================================
  // ЗАГРУЗКА ПРОФИЛЯ
  // =====================================================
  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setUser(data.user)
        setVideos(data.videos || [])
        setDisplayName(data.user.displayName || '')
        setBio(data.user.bio || '')
      }
    } catch (error) {
      console.error('Load profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // СОХРАНЕНИЕ ИЗМЕНЕНИЙ ПРОФИЛЯ
  // =====================================================
  const handleSaveProfile = async () => {
    setSaving(true)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/update-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            displayName,
            bio
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Save profile error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Пользователь не найден</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between p-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-white">{user.username}</h1>
          
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-white"
            >
              <Settings className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Информация о профиле */}
      <div className="p-6">
        {/* Аватар */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden mb-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl">
                {user.displayName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>

          {/* Имя и верификация */}
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-white text-xl">{user.displayName}</h2>
            {user.isVerified && (
              <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500" />
            )}
          </div>
          
          <p className="text-zinc-400 mb-4">@{user.username}</p>

          {/* Статистика */}
          <div className="flex gap-8 mb-4">
            <div className="text-center">
              <p className="text-white">{user.videosCount || 0}</p>
              <p className="text-zinc-400 text-sm">Видео</p>
            </div>
            <div className="text-center">
              <p className="text-white">{user.followersCount || 0}</p>
              <p className="text-zinc-400 text-sm">Подписчики</p>
            </div>
            <div className="text-center">
              <p className="text-white">{user.followingCount || 0}</p>
              <p className="text-zinc-400 text-sm">Подписки</p>
            </div>
          </div>

          {/* Описание */}
          {!isEditing && user.bio && (
            <p className="text-white text-center mb-4 max-w-md">{user.bio}</p>
          )}
        </div>

        {/* РЕЖИМ РЕДАКТИРОВАНИЯ */}
        {isEditing && isOwnProfile && (
          <div className="max-w-md mx-auto mb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white">Имя</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-white">Описание</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveProfile}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Видео пользователя */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 className="w-5 h-5 text-white" />
            <h3 className="text-white">Видео</h3>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">Видео пока нет</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="aspect-[9/16] bg-zinc-800 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {video.url && !video.isExternal && (
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {video.isExternal && (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-white text-xs text-center p-2">
                        {video.title}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
