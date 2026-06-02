import axios from 'axios'
import { DUMMY_ARTICLES, DUMMY_COMMENTS, TRENDING } from '../utils/dummyData'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('nv-token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Simulate API delay
const delay = (ms = 600) =>
  new Promise(r => setTimeout(r, ms))

// --- News ---
export const newsApi = {

  getAll: async (
    { category = 'all', page = 1, search = '' } = {}
  ) => {

    const response = await axios.get(
      'http://127.0.0.1:8000/api/news/',
      {
        params: {
          category,
          page,
          search
        }
      }
    )

    return {
      results: response.data,
      count: response.data.length,
      next: null
    }
  },

  getById: async (id) => {

    const response = await axios.get(
      `http://127.0.0.1:8000/api/news/${id}/`
    )

    return response.data
  },

  getTrending: async () => {

    const response = await axios.get(
      'http://127.0.0.1:8000/api/news/trending/'
    )

    return response.data
  },

  vote: async (id, direction) => {

    await delay(200)

    return {
      success: true,
      upvotes: Math.floor(Math.random() * 5000) + 1000
    }
  },
}

// --- Comments ---
export const commentsApi = {

  getByArticle: async (articleId) => {

    await delay(500)

    return DUMMY_COMMENTS
  },

  create: async (
    articleId,
    { content, parentId = null }
  ) => {

    await delay(400)

    return {
      id: Date.now(),
      user: {
        username: 'raghavsharma',
        avatar: null,
        karma: 4823
      },
      content,
      created_at: new Date().toISOString(),
      upvotes: 0,
      user_vote: null,
      replies: [],
    }
  },

  vote: async (commentId, direction) => {

    await delay(200)

    return { success: true }
  },
}

// --- Auth ---
export const authApi = {

  login: async (credentials) => {

    await delay(800)

    return {
      token: 'dummy-jwt-token',
      user: {
        id: 1,
        username: 'raghavsharma',
        karma: 4823
      }
    }
  },

  signup: async (data) => {

    await delay(1000)

    return {
      token: 'dummy-jwt-token',
      user: {
        id: 1,
        username: data.username,
        karma: 0
      }
    }
  },

  getProfile: async (username) => {

    await delay(400)

    return {
      username,
      karma: 4823,
      joined: '2024-01-15',
      post_count: 234,
      comment_count: 1876,
      recent_posts: DUMMY_ARTICLES.slice(0, 3),
    }
  },
}

// --- Fact Check ---
export const factCheckApi = {
  check: async (text) => {

    const response = await axios.post(
      'http://127.0.0.1:8000/api/fact-check/',
      {
        text
      }
    )

    return response.data
  }
}