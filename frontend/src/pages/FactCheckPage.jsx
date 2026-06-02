import { useState } from 'react'

import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  ExternalLink,
  Loader2
} from 'lucide-react'

import { factCheckApi } from '../services/api'

import Layout from '../components/layout/Layout'

import clsx from 'clsx'


const VERDICT_CONFIG = {

  'True': {
    icon: CheckCircle,
    color: 'text-sage-500',
    bg: 'bg-sage-50 dark:bg-sage-950/30 border-sage-200 dark:border-sage-800'
  },

  'False': {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
  },

  'Partially False': {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  },

  'Missing context': {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  },

  'Unverified': {
    icon: Minus,
    color: 'text-ink-400',
    bg: 'bg-ink-50 dark:bg-ink-900 border-ink-200 dark:border-ink-700'
  }
}


export default function FactCheckPage() {

  const [text, setText] = useState('')

  const [results, setResults] = useState([])

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState(null)


  const handleCheck = async (e) => {

    e.preventDefault()

    if (!text.trim()) return

    setLoading(true)

    setResults([])

    setError(null)

    try {

      const data = await factCheckApi.check(text)

      setResults(data.results || [])

    } catch (err) {

      setError('Failed to verify claim')

    }

    setLoading(false)
  }


  return (

    <Layout showSidebar={false} showCategoryNav={false}>

      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}

        <div className="text-center space-y-3">

          <div className="w-14 h-14 bg-sage-400/10 rounded-2xl flex items-center justify-center mx-auto">

            <Shield size={28} className="text-sage-500" />

          </div>

          <h1 className="font-display font-bold text-3xl">

            Fake News Detector

          </h1>

          <p className="text-ink-500 dark:text-ink-400 leading-relaxed">

            Cross-check suspicious claims against real fact-checking databases.

          </p>

        </div>


        {/* Input */}

        <div className="card p-6">

          <form onSubmit={handleCheck} className="space-y-4">

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              placeholder="Paste a suspicious claim..."
              className="input resize-none"
            />

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >

              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Fact Check
                </>
              )}

            </button>

          </form>

        </div>


        {/* Error */}

        {error && (

          <div className="card p-4 border border-red-500 text-red-500">

            {error}

          </div>

        )}


        {/* No Results */}

        {!loading && results.length === 0 && text && (

          <div className="card p-6 text-center text-ink-500">

            No verified claims found.

          </div>

        )}


        {/* Results */}

        <div className="space-y-4">

          {results.map((item, index) => {

            const verdict =
              VERDICT_CONFIG[item.rating]
              || VERDICT_CONFIG['Unverified']

            return (

              <div
                key={index}
                className={clsx(
                  'card p-6 border-2 animate-slide-up',
                  verdict.bg
                )}
              >

                <div className="flex gap-4">

                  <verdict.icon
                    size={28}
                    className={verdict.color}
                  />

                  <div className="flex-1 space-y-3">

                    <div>

                      <p className="text-sm text-ink-500 mb-1">

                        Verdict

                      </p>

                      <h2 className={clsx(
                        'font-bold text-xl',
                        verdict.color
                      )}>

                        {item.rating || 'Unverified'}

                      </h2>

                    </div>


                    <div>

                      <p className="text-sm text-ink-500 mb-1">

                        Claim

                      </p>

                      <p className="leading-relaxed">

                        {item.claim}

                      </p>

                    </div>


                    <div className="flex items-center justify-between flex-wrap gap-3">

                      <div>

                        <p className="text-sm text-ink-500">

                          Publisher

                        </p>

                        <p className="font-medium">

                          {item.publisher}

                        </p>

                      </div>


                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-flame-500 hover:underline"
                      >

                        View Source

                        <ExternalLink size={14} />

                      </a>

                    </div>

                  </div>

                </div>

              </div>
            )
          })}
        </div>

      </div>

    </Layout>
  )
}