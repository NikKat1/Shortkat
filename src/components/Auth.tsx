// Компонент авторизации и регистрации для ShortKat
// Обрабатывает вход и регистрацию пользователей через Supabase Auth

import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

// Создаем Supabase клиент для авторизации
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

interface AuthProps {
  onAuthSuccess: (userId: string, accessToken: string) => void
}

export function Auth({ onAuthSuccess }: AuthProps) {
  // Состояние: true = вход, false = регистрация
  const [isSignIn, setIsSignIn] = useState(true)
  
  // Поля формы
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  
  // Состояние загрузки и ошибки
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // =====================================================
  // ОБРАБОТЧИК РЕГИСТРАЦИИ
  // =====================================================
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Отправляем запрос на регистрацию на сервер
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            email,
            password,
            username,
            displayName
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации')
      }

      // После успешной регистрации автоматически входим
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      // Получаем access token
      const accessToken = authData.session?.access_token || ''
      onAuthSuccess(data.userId, accessToken)
      
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'Не удалось зарегистрироваться')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ОБРАБОТЧИК ВХОДА
  // =====================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Вход через Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      // Получаем access token и user id
      const accessToken = data.session?.access_token || ''
      const userId = data.user?.id || ''
      
      onAuthSuccess(userId, accessToken)
      
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl text-center text-white">
            {isSignIn ? 'Вход в ShortKat' : 'Регистрация в ShortKat'}
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            {isSignIn 
              ? 'Войдите в свой аккаунт для продолжения' 
              : 'Создайте новый аккаунт'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Пароль */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Дополнительные поля для регистрации */}
            {!isSignIn && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">Имя пользователя</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="@username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">Отображаемое имя</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Ваше имя"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </>
            )}

            {/* Сообщение об ошибке */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Кнопка отправки */}
            <Button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700"
              disabled={loading}
            >
              {loading 
                ? 'Загрузка...' 
                : isSignIn ? 'Войти' : 'Зарегистрироваться'}
            </Button>

            {/* Переключение между входом и регистрацией */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignIn(!isSignIn)
                  setError('')
                }}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {isSignIn 
                  ? 'Нет аккаунта? Зарегистрируйтесь' 
                  : 'Уже есть аккаунт? Войдите'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
