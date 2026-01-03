// Сервер для ShortKat - аналог TikTok
// Обрабатывает загрузку видео, комментарии, лайки, чаты, подписки

import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

// CORS и логирование
app.use('*', cors())
app.use('*', logger(console.log))

// Создание Supabase клиента для админских операций
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// =====================================================
// ИНИЦИАЛИЗАЦИЯ: Создание бакетов для хранения файлов
// =====================================================
async function initializeStorage() {
  const buckets = ['make-4bd5b3a9-videos', 'make-4bd5b3a9-avatars']
  
  const { data: existingBuckets } = await supabase.storage.listBuckets()
  
  for (const bucketName of buckets) {
    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false })
      console.log(`Bucket created: ${bucketName}`)
    }
  }
}

// Запускаем инициализацию при старте сервера
initializeStorage()

// =====================================================
// РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
// =====================================================
app.post('/make-server-4bd5b3a9/signup', async (c) => {
  try {
    const { email, password, username, displayName } = await c.req.json()
    
    // Создаем пользователя через Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username, displayName },
      email_confirm: true // Автоматически подтверждаем email (нет почтового сервера)
    })
    
    if (error) {
      console.log(`Sign up error: ${error.message}`)
      return c.json({ error: error.message }, 400)
    }
    
    // Проверяем, есть ли уже пользователи в системе
    const allUsers = await kv.getByPrefix('user:')
    const isFirstUser = allUsers.length === 0
    
    // Сохраняем профиль пользователя в KV
    const userId = data.user.id
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      username,
      displayName,
      bio: '',
      avatar: '',
      isVerified: isFirstUser, // Первый пользователь автоматически верифицирован
      isAdmin: isFirstUser,    // Первый пользователь автоматически становится админом
      createdAt: new Date().toISOString()
    })
    
    console.log(`User created: ${email}, isFirstUser: ${isFirstUser}, isAdmin: ${isFirstUser}`)
    
    return c.json({ success: true, userId, isFirstUser })
  } catch (error) {
    console.log(`Sign up server error: ${error}`)
    return c.json({ error: 'Failed to sign up' }, 500)
  }
})

// =====================================================
// ВХОД ПОЛЬЗОВАТЕЛЯ
// =====================================================
app.post('/make-server-4bd5b3a9/signin', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    // Вход через Supabase Auth (обрабатывается на клиенте)
    return c.json({ success: true })
  } catch (error) {
    console.log(`Sign in server error: ${error}`)
    return c.json({ error: 'Failed to sign in' }, 500)
  }
})

// =====================================================
// ЗАГРУЗКА ВИДЕО (ФАЙЛ)
// =====================================================
app.post('/make-server-4bd5b3a9/upload-video', async (c) => {
  try {
    // Проверка авторизации
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const formData = await c.req.formData()
    const videoFile = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    
    if (!videoFile) {
      return c.json({ error: 'No video file provided' }, 400)
    }
    
    // Генерируем уникальный ID для видео
    const videoId = crypto.randomUUID()
    const fileName = `${videoId}-${videoFile.name}`
    
    // Конвертируем File в ArrayBuffer
    const arrayBuffer = await videoFile.arrayBuffer()
    
    // Загружаем видео в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-4bd5b3a9-videos')
      .upload(fileName, arrayBuffer, {
        contentType: videoFile.type,
        upsert: false
      })
    
    if (uploadError) {
      console.log(`Video upload error: ${uploadError.message}`)
      return c.json({ error: 'Failed to upload video' }, 500)
    }
    
    // Получаем подписанный URL (действителен 1 год)
    const { data: urlData } = await supabase.storage
      .from('make-4bd5b3a9-videos')
      .createSignedUrl(fileName, 31536000)
    
    // Сохраняем метаданные видео
    const videoMetadata = {
      id: videoId,
      userId: user.id,
      title,
      description,
      fileName,
      url: urlData?.signedUrl || '',
      likes: 0,
      comments: 0,
      views: 0,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`video:${videoId}`, videoMetadata)
    
    // Добавляем видео в список видео пользователя
    const userVideosKey = `user-videos:${user.id}`
    const userVideos = await kv.get(userVideosKey) || []
    userVideos.unshift(videoId)
    await kv.set(userVideosKey, userVideos)
    
    return c.json({ success: true, videoId, video: videoMetadata })
  } catch (error) {
    console.log(`Upload video server error: ${error}`)
    return c.json({ error: 'Failed to upload video' }, 500)
  }
})

// =====================================================
// СКАЧИВАНИЕ ВИДЕО С TIKTOK
// =====================================================
app.post('/make-server-4bd5b3a9/tiktok-download', async (c) => {
  try {
    // Проверка авторизации
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { tiktokUrl, title, description } = await c.req.json()
    
    // В реальном приложении здесь была бы интеграция с API для скачивания TikTok
    // Но так как нам нужен бесплатный вариант, мы просто сохраняем ссылку
    // Пользователь может использовать сторонние сервисы для скачивания
    
    const videoId = crypto.randomUUID()
    
    // Сохраняем метаданные с внешней ссылкой
    const videoMetadata = {
      id: videoId,
      userId: user.id,
      title,
      description,
      url: tiktokUrl, // Сохраняем исходную ссылку TikTok
      isExternal: true,
      likes: 0,
      comments: 0,
      views: 0,
      createdAt: new Date().toISOString()
    }
    
    await kv.set(`video:${videoId}`, videoMetadata)
    
    return c.json({ 
      success: true, 
      videoId, 
      video: videoMetadata,
      note: 'External TikTok link saved. For actual download, use third-party services.'
    })
  } catch (error) {
    console.log(`TikTok download error: ${error}`)
    return c.json({ error: 'Failed to process TikTok link' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ ЛЕНТЫ ВИДЕО
// =====================================================
app.get('/make-server-4bd5b3a9/videos', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = parseInt(c.req.query('offset') || '0')
    
    // Получаем все видео
    const allVideos = await kv.getByPrefix('video:')
    
    // Сортируем по дате создания (новые первыми)
    const sortedVideos = allVideos
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
    
    // Обогащаем данными о пользователях
    const videosWithUsers = await Promise.all(
      sortedVideos.map(async (video) => {
        const user = await kv.get(`user:${video.userId}`)
        return { ...video, user }
      })
    )
    
    return c.json({ videos: videosWithUsers })
  } catch (error) {
    console.log(`Get videos error: ${error}`)
    return c.json({ error: 'Failed to get videos' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ ВИДЕО ПО ID
// =====================================================
app.get('/make-server-4bd5b3a9/video/:id', async (c) => {
  try {
    const videoId = c.req.param('id')
    const video = await kv.get(`video:${videoId}`)
    
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    const user = await kv.get(`user:${video.userId}`)
    
    return c.json({ video: { ...video, user } })
  } catch (error) {
    console.log(`Get video error: ${error}`)
    return c.json({ error: 'Failed to get video' }, 500)
  }
})

// =====================================================
// ЛАЙК ВИДЕО
// =====================================================
app.post('/make-server-4bd5b3a9/like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { videoId } = await c.req.json()
    
    // Получаем видео
    const video = await kv.get(`video:${videoId}`)
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    // Получаем список лайков
    const likesKey = `likes:${videoId}`
    const likes = await kv.get(likesKey) || []
    
    // Проверяем, лайкал ли уже пользователь
    const alreadyLiked = likes.includes(user.id)
    
    if (alreadyLiked) {
      // Убираем лайк
      const newLikes = likes.filter(id => id !== user.id)
      await kv.set(likesKey, newLikes)
      video.likes = newLikes.length
    } else {
      // Добавляем лайк
      likes.push(user.id)
      await kv.set(likesKey, likes)
      video.likes = likes.length
    }
    
    // Обновляем счетчик в видео
    await kv.set(`video:${videoId}`, video)
    
    return c.json({ success: true, likes: video.likes, isLiked: !alreadyLiked })
  } catch (error) {
    console.log(`Like video error: ${error}`)
    return c.json({ error: 'Failed to like video' }, 500)
  }
})

// =====================================================
// КОММЕНТАРИЙ К ВИДЕО
// =====================================================
app.post('/make-server-4bd5b3a9/comment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { videoId, text } = await c.req.json()
    
    // Получаем видео
    const video = await kv.get(`video:${videoId}`)
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    // Создаем комментарий
    const commentId = crypto.randomUUID()
    const comment = {
      id: commentId,
      userId: user.id,
      videoId,
      text,
      createdAt: new Date().toISOString()
    }
    
    // Получаем существующие комментарии
    const commentsKey = `comments:${videoId}`
    const comments = await kv.get(commentsKey) || []
    comments.push(comment)
    await kv.set(commentsKey, comments)
    
    // Обновляем счетчик комментариев
    video.comments = comments.length
    await kv.set(`video:${videoId}`, video)
    
    return c.json({ success: true, comment, totalComments: comments.length })
  } catch (error) {
    console.log(`Comment error: ${error}`)
    return c.json({ error: 'Failed to comment' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ КОММЕНТАРИЕВ
// =====================================================
app.get('/make-server-4bd5b3a9/comments/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId')
    const comments = await kv.get(`comments:${videoId}`) || []
    
    // Обогащаем комментарии данными о пользователях
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await kv.get(`user:${comment.userId}`)
        return { ...comment, user }
      })
    )
    
    return c.json({ comments: commentsWithUsers })
  } catch (error) {
    console.log(`Get comments error: ${error}`)
    return c.json({ error: 'Failed to get comments' }, 500)
  }
})

// =====================================================
// ПОДПИСКА НА ПОЛЬЗОВАТЕЛЯ
// =====================================================
app.post('/make-server-4bd5b3a9/subscribe', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { targetUserId } = await c.req.json()
    
    if (user.id === targetUserId) {
      return c.json({ error: 'Cannot subscribe to yourself' }, 400)
    }
    
    // Получаем подписки текущего пользователя
    const subscriptionsKey = `subscriptions:${user.id}`
    const subscriptions = await kv.get(subscriptionsKey) || []
    
    // Проверяем, подписан ли уже
    const alreadySubscribed = subscriptions.includes(targetUserId)
    
    if (alreadySubscribed) {
      // Отписываемся
      const newSubscriptions = subscriptions.filter(id => id !== targetUserId)
      await kv.set(subscriptionsKey, newSubscriptions)
    } else {
      // Подписываемся
      subscriptions.push(targetUserId)
      await kv.set(subscriptionsKey, subscriptions)
    }
    
    return c.json({ success: true, isSubscribed: !alreadySubscribed })
  } catch (error) {
    console.log(`Subscribe error: ${error}`)
    return c.json({ error: 'Failed to subscribe' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// =====================================================
app.get('/make-server-4bd5b3a9/user/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const user = await kv.get(`user:${userId}`)
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Получаем видео пользователя
    const userVideos = await kv.get(`user-videos:${userId}`) || []
    const videos = await Promise.all(
      userVideos.map(async (videoId) => await kv.get(`video:${videoId}`))
    )
    
    // Получаем подписчиков
    const allSubscriptions = await kv.getByPrefix('subscriptions:')
    const followers = allSubscriptions.filter(sub => sub.includes(userId)).length
    
    // Получаем подписки
    const subscriptions = await kv.get(`subscriptions:${userId}`) || []
    
    return c.json({
      user: {
        ...user,
        videosCount: videos.length,
        followersCount: followers,
        followingCount: subscriptions.length
      },
      videos
    })
  } catch (error) {
    console.log(`Get user error: ${error}`)
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

// =====================================================
// ОБНОВЛЕНИЕ ПРОФИЛЯ
// =====================================================
app.post('/make-server-4bd5b3a9/update-profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const updates = await c.req.json()
    const profile = await kv.get(`user:${user.id}`)
    
    // Обновляем профиль
    const updatedProfile = { ...profile, ...updates }
    await kv.set(`user:${user.id}`, updatedProfile)
    
    return c.json({ success: true, user: updatedProfile })
  } catch (error) {
    console.log(`Update profile error: ${error}`)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// =====================================================
// ОТПРАВКА СООБЩЕНИЯ
// =====================================================
app.post('/make-server-4bd5b3a9/message', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const { recipientId, text } = await c.req.json()
    
    // Создаем уникальный ID чата (сортируем ID для консистентности)
    const chatId = [user.id, recipientId].sort().join(':')
    
    // Создаем сообщение
    const messageId = crypto.randomUUID()
    const message = {
      id: messageId,
      chatId,
      senderId: user.id,
      recipientId,
      text,
      createdAt: new Date().toISOString()
    }
    
    // Получаем существующие сообщения
    const messagesKey = `messages:${chatId}`
    const messages = await kv.get(messagesKey) || []
    messages.push(message)
    await kv.set(messagesKey, messages)
    
    // Обновляем стрик (огонек)
    await updateStreak(chatId, user.id, recipientId)
    
    return c.json({ success: true, message })
  } catch (error) {
    console.log(`Send message error: ${error}`)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ СООБЩЕНИЙ ЧАТА
// =====================================================
app.get('/make-server-4bd5b3a9/messages/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const otherUserId = c.req.param('userId')
    const chatId = [user.id, otherUserId].sort().join(':')
    
    const messages = await kv.get(`messages:${chatId}`) || []
    const streak = await kv.get(`streak:${chatId}`) || { count: 0, lastDate: null }
    
    return c.json({ messages, streak })
  } catch (error) {
    console.log(`Get messages error: ${error}`)
    return c.json({ error: 'Failed to get messages' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ СПИСКА ЧАТОВ
// =====================================================
app.get('/make-server-4bd5b3a9/chats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    // Получаем все чаты
    const allMessages = await kv.getByPrefix('messages:')
    
    // Фильтруем чаты, где участвует пользователь
    const userChats = allMessages.filter(messages => {
      if (!Array.isArray(messages) || messages.length === 0) return false
      const chatId = messages[0].chatId
      return chatId.includes(user.id)
    })
    
    // Формируем список чатов с последним сообщением
    const chats = await Promise.all(
      userChats.map(async (messages) => {
        const lastMessage = messages[messages.length - 1]
        const chatId = lastMessage.chatId
        const otherUserId = chatId.split(':').find(id => id !== user.id)
        const otherUser = await kv.get(`user:${otherUserId}`)
        const streak = await kv.get(`streak:${chatId}`) || { count: 0 }
        
        return {
          chatId,
          otherUser,
          lastMessage,
          streak,
          messagesCount: messages.length
        }
      })
    )
    
    return c.json({ chats })
  } catch (error) {
    console.log(`Get chats error: ${error}`)
    return c.json({ error: 'Failed to get chats' }, 500)
  }
})

// =====================================================
// ЗАПИСЬ ПРОСМОТРА ВИДЕО (для аналитики)
// =====================================================
app.post('/make-server-4bd5b3a9/view', async (c) => {
  try {
    const { videoId, watchTime, duration } = await c.req.json()
    
    // Получаем видео
    const video = await kv.get(`video:${videoId}`)
    if (!video) {
      return c.json({ error: 'Video not found' }, 404)
    }
    
    // Увеличиваем счетчик просмотров
    video.views = (video.views || 0) + 1
    await kv.set(`video:${videoId}`, video)
    
    // Сохраняем аналитику удержания
    const analyticsKey = `analytics:${videoId}`
    const analytics = await kv.get(analyticsKey) || { views: [], retention: [] }
    
    const retentionRate = duration > 0 ? (watchTime / duration) * 100 : 0
    
    analytics.views.push({
      timestamp: new Date().toISOString(),
      watchTime,
      duration
    })
    
    analytics.retention.push(retentionRate)
    
    await kv.set(analyticsKey, analytics)
    
    return c.json({ success: true })
  } catch (error) {
    console.log(`Record view error: ${error}`)
    return c.json({ error: 'Failed to record view' }, 500)
  }
})

// =====================================================
// ПОЛУЧЕНИЕ АНАЛИТИКИ (Creative Studio)
// =====================================================
app.get('/make-server-4bd5b3a9/analytics/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    const userId = c.req.param('userId')
    
    // Пользователь может видеть только свою аналитику
    if (user.id !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    
    // Получаем все видео пользователя
    const userVideos = await kv.get(`user-videos:${userId}`) || []
    
    // Собираем аналитику по каждому видео
    const videosAnalytics = await Promise.all(
      userVideos.map(async (videoId) => {
        const video = await kv.get(`video:${videoId}`)
        const analytics = await kv.get(`analytics:${videoId}`) || { 
          views: [], 
          retention: [] 
        }
        
        // Вычисляем среднее удержание
        const avgRetention = analytics.retention.length > 0
          ? analytics.retention.reduce((a, b) => a + b, 0) / analytics.retention.length
          : 0
        
        return {
          video,
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          avgRetention: avgRetention.toFixed(1)
        }
      })
    )
    
    return c.json({ analytics: videosAnalytics })
  } catch (error) {
    console.log(`Get analytics error: ${error}`)
    return c.json({ error: 'Failed to get analytics' }, 500)
  }
})

// =====================================================
// АДМИН: ВЫДАЧА ВЕРИФИКАЦИИ
// =====================================================
app.post('/make-server-4bd5b3a9/admin/verify', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    // Проверяем, является ли пользователь админом
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile?.isAdmin) {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { targetUserId, verified } = await c.req.json()
    
    // Обновляем статус верификации
    const targetProfile = await kv.get(`user:${targetUserId}`)
    if (!targetProfile) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    targetProfile.isVerified = verified
    await kv.set(`user:${targetUserId}`, targetProfile)
    
    return c.json({ success: true, user: targetProfile })
  } catch (error) {
    console.log(`Admin verify error: ${error}`)
    return c.json({ error: 'Failed to verify user' }, 500)
  }
})

// =====================================================
// АДМИН: ВЫДАЧА АДМИНСКИХ ПРАВ
// =====================================================
app.post('/make-server-4bd5b3a9/admin/grant', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    // Проверяем, является ли пользователь админом
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile?.isAdmin) {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { targetUserId, isAdmin } = await c.req.json()
    
    // Обновляем админский статус
    const targetProfile = await kv.get(`user:${targetUserId}`)
    if (!targetProfile) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    targetProfile.isAdmin = isAdmin
    await kv.set(`user:${targetUserId}`, targetProfile)
    
    return c.json({ success: true, user: targetProfile })
  } catch (error) {
    console.log(`Admin grant error: ${error}`)
    return c.json({ error: 'Failed to grant admin' }, 500)
  }
})

// =====================================================
// АДМИН: ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// =====================================================
app.get('/make-server-4bd5b3a9/admin/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    
    // Проверяем, является ли пользователь админом
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile?.isAdmin) {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    // Получаем всех пользователей
    const users = await kv.getByPrefix('user:')
    
    return c.json({ users })
  } catch (error) {
    console.log(`Get users error: ${error}`)
    return c.json({ error: 'Failed to get users' }, 500)
  }
})

// =====================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Обновление стрика
// =====================================================
async function updateStreak(chatId: string, userId1: string, userId2: string) {
  const streakKey = `streak:${chatId}`
  const streak = await kv.get(streakKey) || {
    count: 0,
    lastDate: null,
    participants: [userId1, userId2]
  }
  
  const today = new Date().toISOString().split('T')[0]
  const lastDate = streak.lastDate
  
  if (!lastDate) {
    // Первое сообщение
    streak.count = 1
    streak.lastDate = today
  } else if (lastDate === today) {
    // Уже общались сегодня, стрик не меняется
    return
  } else {
    const lastDateObj = new Date(lastDate)
    const todayObj = new Date(today)
    const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      // Общаются каждый день подряд
      streak.count++
      streak.lastDate = today
    } else {
      // Пропустили день, стрик сбрасывается
      streak.count = 1
      streak.lastDate = today
    }
  }
  
  await kv.set(streakKey, streak)
}

// Запуск сервера
Deno.serve(app.fetch)