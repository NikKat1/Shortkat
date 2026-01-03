// Главный компонент приложения ShortKat
// Управляет навигацией и состоянием авторизации

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './utils/supabase/info'
import { Auth } from './components/Auth'
import { VideoFeed } from './components/VideoFeed'
import { Upload } from './components/Upload'
import { Comments } from './components/Comments'
import { Profile } from './components/Profile'
import { Chat } from './components/Chat'
import { CreativeStudio } from './components/CreativeStudio'
import { AdminPanel } from './components/AdminPanel'
import { Home, Plus, MessageCircle, User, BarChart3, Shield } from 'lucide-react'

// Создаем Supabase клиент
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

// Типы экранов приложения
type Screen = 
  | 'feed'          // Главная лента
  | 'upload'        // Загрузка видео
  | 'profile'       // Профиль
  | 'chat'          // Чаты
  | 'studio'        // Creative Studio
  | 'admin'         // Админ-панель

export default function App() {
  // =====================================================
  // СОСТОЯНИЕ ПРИЛОЖЕНИЯ
  // =====================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [currentScreen, setCurrentScreen] = useState<Screen>('feed')
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)

  // =====================================================
  // ПРОВЕРКА АКТИВНОЙ СЕССИИ при загрузке
  // =====================================================
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session && !error) {
        setUserId(session.user.id)
        setAccessToken(session.access_token)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Check session error:', error)
    }
  }

  // =====================================================
  // ОБРАБОТЧИК УСПЕШНОЙ АВТОРИЗАЦИИ
  // =====================================================
  const handleAuthSuccess = (uid: string, token: string) => {
    setUserId(uid)
    setAccessToken(token)
    setIsAuthenticated(true)
  }

  // =====================================================
  // ВЫХОД ИЗ АККАУНТА
  // =====================================================
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setUserId('')
    setAccessToken('')
    setCurrentScreen('feed')
  }

  // =====================================================
  // ОТКРЫТИЕ КОММЕНТАРИЕВ
  // =====================================================
  const handleOpenComments = (video: any) => {
    setSelectedVideo(video)
    setIsCommentsOpen(true)
  }

  // =====================================================
  // ОБРАБОТЧИК УСПЕШНОЙ ЗАГРУЗКИ ВИДЕО
  // =====================================================
  const handleUploadSuccess = () => {
    // Возвращаемся на главную и обновляем ленту
    setCurrentScreen('feed')
    // В реальном приложении здесь была бы перезагрузка ленты
  }

  // =====================================================
  // ЭКРАН АВТОРИЗАЦИИ
  // =====================================================
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  // =====================================================
  // РЕНДЕР ЭКРАНОВ
  // =====================================================
  const renderScreen = () => {
    switch (currentScreen) {
      case 'feed':
        return (
          <VideoFeed
            accessToken={accessToken}
            currentUserId={userId}
            onOpenComments={handleOpenComments}
          />
        )
      
      case 'profile':
        return (
          <Profile
            userId={userId}
            accessToken={accessToken}
            currentUserId={userId}
            onBack={() => setCurrentScreen('feed')}
          />
        )
      
      case 'chat':
        return (
          <Chat
            accessToken={accessToken}
            currentUserId={userId}
            onBack={() => setCurrentScreen('feed')}
          />
        )
      
      case 'studio':
        return (
          <CreativeStudio
            accessToken={accessToken}
            currentUserId={userId}
            onBack={() => setCurrentScreen('feed')}
          />
        )
      
      case 'admin':
        return (
          <AdminPanel
            accessToken={accessToken}
            currentUserId={userId}
            onBack={() => setCurrentScreen('feed')}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className="relative">
      {/* ОСНОВНОЙ КОНТЕНТ */}
      {renderScreen()}

      {/* МОДАЛЬНОЕ ОКНО ЗАГРУЗКИ */}
      {currentScreen === 'upload' && (
        <Upload
          accessToken={accessToken}
          onClose={() => setCurrentScreen('feed')}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО КОММЕНТАРИЕВ */}
      {isCommentsOpen && selectedVideo && (
        <Comments
          video={selectedVideo}
          accessToken={accessToken}
          onClose={() => setIsCommentsOpen(false)}
        />
      )}

      {/* НИЖНЯЯ НАВИГАЦИЯ (только на главном экране) */}
      {currentScreen === 'feed' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-40">
          <div className="flex items-center justify-around p-3 max-w-lg mx-auto">
            {/* Главная */}
            <button
              onClick={() => setCurrentScreen('feed')}
              className="flex flex-col items-center gap-1 text-white"
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">Главная</span>
            </button>

            {/* Creative Studio */}
            <button
              onClick={() => setCurrentScreen('studio')}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Студия</span>
            </button>

            {/* Загрузка (центральная кнопка) */}
            <button
              onClick={() => setCurrentScreen('upload')}
              className="flex flex-col items-center -mt-4"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </button>

            {/* Сообщения */}
            <button
              onClick={() => setCurrentScreen('chat')}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Чаты</span>
            </button>

            {/* Профиль */}
            <button
              onClick={() => setCurrentScreen('profile')}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Профиль</span>
            </button>
          </div>
        </nav>
      )}

      {/* КНОПКА АДМИН-ПАНЕЛИ (плавающая, показывается только на главной) */}
      {currentScreen === 'feed' && (
        <button
          onClick={() => setCurrentScreen('admin')}
          className="fixed top-4 right-4 w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center shadow-lg hover:bg-pink-700 transition-colors z-30"
          title="Админ-панель"
        >
          <Shield className="w-6 h-6 text-white" />
        </button>
      )}

      {/* КНОПКА ВЫХОДА (плавающая, только на главной) */}
      {currentScreen === 'feed' && (
        <button
          onClick={handleSignOut}
          className="fixed top-4 left-4 px-4 py-2 bg-zinc-800 rounded-full text-white text-sm hover:bg-zinc-700 transition-colors z-30"
        >
          Выйти
        </button>
      )}
    </div>
  )
}
