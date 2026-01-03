// Компонент загрузки видео
// Позволяет загружать видео файлом или по ссылке TikTok

import React, { useState } from 'react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Upload as UploadIcon, Link as LinkIcon, X, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface UploadProps {
  accessToken: string
  onClose: () => void
  onSuccess: () => void
}

export function Upload({ accessToken, onClose, onSuccess }: UploadProps) {
  // Вкладка: 'file' или 'link'
  const [tab, setTab] = useState<'file' | 'link'>('file')
  
  // Поля формы
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  // Состояние
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string>('')

  // =====================================================
  // ВЫБОР ВИДЕО ФАЙЛА
  // =====================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем, что это видео
    if (!file.type.startsWith('video/')) {
      setError('Пожалуйста, выберите видео файл')
      return
    }

    // Проверяем размер (максимум 50MB для примера)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('Файл слишком большой (максимум 50MB)')
      return
    }

    setVideoFile(file)
    setError('')

    // Создаем превью
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  // =====================================================
  // ЗАГРУЗКА ВИДЕО ФАЙЛОМ
  // =====================================================
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!videoFile || !title) {
      setError('Заполните все обязательные поля')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Создаем FormData для отправки файла
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('title', title)
      formData.append('description', description)

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/upload-video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось загрузить видео')
      }

      // Успешно загружено
      onSuccess()
      onClose()
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Не удалось загрузить видео')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // ЗАГРУЗКА ВИДЕО ПО ССЫЛКЕ TIKTOK
  // =====================================================
  const handleLinkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tiktokUrl || !title) {
      setError('Заполните все обязательные поля')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4bd5b3a9/tiktok-download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            tiktokUrl,
            title,
            description
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обработать ссылку')
      }

      // Успешно сохранено
      alert(data.note || 'Ссылка сохранена!')
      onSuccess()
      onClose()
      
    } catch (err: any) {
      console.error('TikTok link error:', err)
      setError(err.message || 'Не удалось обработать ссылку')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-white text-xl">Загрузить видео</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'file' | 'link')}>
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
              <TabsTrigger value="file" className="data-[state=active]:bg-pink-600">
                <UploadIcon className="w-4 h-4 mr-2" />
                Файл
              </TabsTrigger>
              <TabsTrigger value="link" className="data-[state=active]:bg-pink-600">
                <LinkIcon className="w-4 h-4 mr-2" />
                Ссылка TikTok
              </TabsTrigger>
            </TabsList>

            {/* ЗАГРУЗКА ФАЙЛОМ */}
            <TabsContent value="file">
              <form onSubmit={handleFileUpload} className="space-y-4 mt-4">
                {/* Выбор файла */}
                <div className="space-y-2">
                  <Label htmlFor="video-file" className="text-white">
                    Видео файл *
                  </Label>
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-pink-600 transition-colors">
                    <input
                      id="video-file"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="video-file"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <UploadIcon className="w-12 h-12 text-zinc-400" />
                      <p className="text-white">
                        {videoFile ? videoFile.name : 'Выберите видео'}
                      </p>
                      <p className="text-zinc-400 text-sm">MP4, MOV, AVI (макс. 50MB)</p>
                    </label>
                  </div>
                </div>

                {/* Превью видео */}
                {previewUrl && (
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                )}

                {/* Название */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Название *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Добавьте название..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                    maxLength={100}
                  />
                </div>

                {/* Описание */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Расскажите о своем видео..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none"
                    rows={4}
                    maxLength={500}
                  />
                </div>

                {/* Ошибка */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Кнопка загрузки */}
                <Button
                  type="submit"
                  className="w-full bg-pink-600 hover:bg-pink-700"
                  disabled={loading || !videoFile || !title}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    'Опубликовать'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ЗАГРУЗКА ПО ССЫЛКЕ */}
            <TabsContent value="link">
              <form onSubmit={handleLinkUpload} className="space-y-4 mt-4">
                {/* Ссылка TikTok */}
                <div className="space-y-2">
                  <Label htmlFor="tiktok-url" className="text-white">
                    Ссылка на TikTok *
                  </Label>
                  <Input
                    id="tiktok-url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-zinc-400 text-xs">
                    Примечание: Для скачивания видео используйте сторонние сервисы
                  </p>
                </div>

                {/* Название */}
                <div className="space-y-2">
                  <Label htmlFor="link-title" className="text-white">Название *</Label>
                  <Input
                    id="link-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Добавьте название..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                    maxLength={100}
                  />
                </div>

                {/* Описание */}
                <div className="space-y-2">
                  <Label htmlFor="link-description" className="text-white">Описание</Label>
                  <Textarea
                    id="link-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Расскажите о своем видео..."
                    className="bg-zinc-800 border-zinc-700 text-white resize-none"
                    rows={4}
                    maxLength={500}
                  />
                </div>

                {/* Ошибка */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Кнопка сохранения */}
                <Button
                  type="submit"
                  className="w-full bg-pink-600 hover:bg-pink-700"
                  disabled={loading || !tiktokUrl || !title}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить ссылку'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
