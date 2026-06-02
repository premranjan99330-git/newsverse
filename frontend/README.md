# Newsverse Frontend

Modern Reddit + HackerNews hybrid news platform built with React + Vite + Tailwind CSS.

## Features
- Real-time news feed with categories
- Reddit-style nested comments with upvotes/downvotes
- Dark/light mode toggle
- Fake news fact checker
- Search with debouncing
- Infinite scroll feed
- User auth (login/signup modal)
- Profile pages
- Trending sidebar
- Loading skeletons
- Mobile responsive

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit http://localhost:5173

### Connect to Django Backend

In `vite.config.js`, the proxy is already configured:
```js
proxy: {
  '/api': 'http://localhost:8000'
}
```

Just make sure your Django backend is running on port 8000.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── layout/         # Navbar, CategoryNav, Sidebar, Layout
│   ├── news/           # ArticleCard
│   ├── comments/       # CommentSection (nested)
│   └── ui/             # AuthModal, Skeleton loaders
├── pages/              # HomePage, ArticlePage, SearchPage, etc.
├── services/           # api.js (Axios + dummy data)
├── hooks/              # useNews, useDebounce, useIntersectionObserver
├── context/            # ThemeContext, AuthContext
└── utils/              # dummyData.js, helpers.js
```

## Connecting Real API

Replace the dummy functions in `src/services/api.js` with real Axios calls:

```js
// Before (dummy)
getAll: async ({ category }) => {
  await delay()
  return { results: DUMMY_ARTICLES }
}

// After (real Django API)
getAll: async ({ category, page }) => {
  const { data } = await api.get('/news/', { params: { category, page } })
  return data
}
```
