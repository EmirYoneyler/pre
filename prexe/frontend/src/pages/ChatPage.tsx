import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getChatHistory().then(setMessages).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || loading) return
    setInput('')
    setMessages(m => [...m, { id: 'temp', role: 'user', content }])
    setLoading(true)
    try {
      const res = await api.sendMessage(content)
      setMessages(m => [
        ...m.filter(x => x.id !== 'temp'),
        { id: 'u-' + Date.now(), role: 'user', content },
        { id: res.message.id, role: 'assistant', content: res.reply },
      ])
    } catch (e) {
      setMessages(m => m.filter(x => x.id !== 'temp'))
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    if (!confirm('Clear all chat history?')) return
    await api.clearChatHistory()
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Coach</h1>
        <button
          onClick={handleClear}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Clear history
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg mb-2">Hey! I'm your AI fitness coach.</p>
            <p className="text-sm">Ask me anything about workouts, nutrition, or recovery.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-green-500 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask your coach…"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
          />
          <button
            onClick={handleSend} disabled={loading || !input.trim()}
            className="px-5 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
