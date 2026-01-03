// Админ-панель - управление пользователями
// Доступна только администраторам
// Выдача верификации и админских прав

import React, { useState, useEffect } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ArrowLeft, Shield, CheckCircle, Search, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface AdminPanelProps {
  accessToken: string
  currentUserId: string
  onBack: () => void
}

export function AdminPanel({ accessToken, currentUserId, onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  // =====================================================
  // ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
  // =====================================================
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('У вас нет прав администратора')
        } else {
          setError(data.error || 'Не удалось загрузить пользователей')
        }
      } else {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Load users error:', error)
      setError('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ВЫДАЧА/СНЯТИЕ ВЕРИФИКАЦИИ
  // =====================================================
  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/admin/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            targetUserId: userId,
            verified: !currentStatus
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Обновляем пользователя в списке
        setUsers(users.map(u => 
          u.id === userId ? data.user : u
        ))
      } else {
        alert(data.error || 'Не удалось изменить статус верификации')
      }
    } catch (error) {
      console.error('Toggle verification error:', error)
      alert('Не удалось изменить статус верификации')
    }
  }

  // =====================================================
  // ВЫДАЧА/СНЯТИЕ АДМИНСКИХ ПРАВ
  // =====================================================
  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    // Нельзя снять права у самого себя
    if (userId === currentUserId && currentStatus) {
      alert('Вы не можете снять админские права у самого себя')
      return
    }

    if (!confirm(`Вы уверены, что хотите ${currentStatus ? 'снять' : 'выдать'} админские права?`)) {
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/admin/grant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            targetUserId: userId,
            isAdmin: !currentStatus
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Обновляем пользователя в списке
        setUsers(users.map(u => 
          u.id === userId ? data.user : u
        ))
      } else {
        alert(data.error || 'Не удалось изменить админский статус')
      }
    } catch (error) {
      console.error('Toggle admin error:', error)
      alert('Не удалось изменить админский статус')
    }
  }

  // =====================================================
  // ФИЛЬТРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ПО ПОИСКУ
  // =====================================================
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.username?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
          <div className="flex items-center gap-4 p-4">
            <button onClick={onBack} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-xl">Админ-панель</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-4 p-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-xl">Админ-панель</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Информация */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-pink-500" />
            <h2 className="text-white">Управление пользователями</h2>
          </div>
          <p className="text-zinc-400 text-sm">
            Здесь вы можете выдавать верификацию и админские права пользователям
          </p>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, username или email..."
              className="bg-zinc-900 border-zinc-800 text-white pl-10"
            />
          </div>
        </div>

        {/* Список пользователей */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">
                {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
              >
                <div className="flex items-start gap-4">
                  {/* Аватар */}
                  <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white">
                        {user.displayName?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>

                  {/* Информация */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white">{user.displayName}</span>
                      {user.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                      {user.isAdmin && (
                        <Shield className="w-4 h-4 text-pink-500 fill-pink-500" />
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">@{user.username}</p>
                    <p className="text-zinc-500 text-xs">{user.email}</p>
                  </div>

                  {/* Кнопки управления */}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleToggleVerification(user.id, user.isVerified)}
                      size="sm"
                      variant={user.isVerified ? "outline" : "default"}
                      className={user.isVerified ? '' : 'bg-blue-600 hover:bg-blue-700'}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {user.isVerified ? 'Снять' : 'Выдать'}
                    </Button>
                    
                    <Button
                      onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                      size="sm"
                      variant={user.isAdmin ? "outline" : "default"}
                      className={user.isAdmin ? '' : 'bg-pink-600 hover:bg-pink-700'}
                      disabled={user.id === currentUserId && user.isAdmin}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      {user.isAdmin ? 'Админ' : 'Сделать'}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
