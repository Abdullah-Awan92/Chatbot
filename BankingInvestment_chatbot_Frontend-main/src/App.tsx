import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Menu, Send, Moon, Sun, Plus, Mic, ArrowUp } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chats from local storage
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    document.documentElement.classList.toggle('dark', savedDarkMode);
  }, []);

  // Save chats to local storage
  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Online status handling
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop } = chatContainerRef.current;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Auto-scroll when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const createNewChat = () => {
    if (currentChatId && messages.length > 0) {
      const firstMessage = messages[0];
      setChats((prev: Chat[]) => prev.map((chat: Chat) => 
        chat.id === currentChatId
          ? { ...chat, title: firstMessage.content.slice(0, 30) + '...' }
          : chat
      ));
    }

    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date().toISOString()
    };
    setChats((prev: Chat[]) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([]);
  };

  const selectChat = (chatId: string) => {
    if (currentChatId && messages.length > 0) {
      setChats((prev: Chat[]) => prev.map((chat: Chat) => 
        chat.id === currentChatId
          ? { ...chat, messages }
          : chat
      ));
    }

    const chat = chats.find((c: Chat) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      scrollToBottom();
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats((prev: Chat[]) => prev.filter((chat: Chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  const streamResponse = async (response: string) => {
    const words = response.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      currentText += (i > 0 ? ' ' : '') + words[i];
      const botMessage: Message = {
        role: 'bot',
        content: currentText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev.slice(0, -1), botMessage]);
      scrollToBottom();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isOnline) return;

    if (!currentChatId) {
      createNewChat();
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (messages.length === 0) {
      setChats((prev: Chat[]) => prev.map((chat: Chat) => 
        chat.id === currentChatId
          ? { ...chat, title: input.slice(0, 30) + '...' }
          : chat
      ));
    }

    try {
      const response = await fetch('https://web-production-2fc6.up.railway.app/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input, user_id: 'default_user' })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const botMessage: Message = {
        role: 'bot',
        content: '',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);
      await streamResponse(data.response);

      const finalBotMessage = { ...botMessage, content: data.response };
      const updatedMessages = [...newMessages, finalBotMessage];
      setChats((prev: Chat[]) => prev.map((chat: Chat) => 
        chat.id === currentChatId
          ? { ...chat, messages: updatedMessages }
          : chat
      ));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'bot',
        content: "I apologize, but I'm having trouble connecting to the server. Please try again later.",
        timestamp: new Date().toISOString()
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      setChats((prev: Chat[]) => prev.map((chat: Chat) => 
        chat.id === currentChatId
          ? { ...chat, messages: updatedMessages }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-64 bg-emerald-800 dark:bg-emerald-900 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out z-30`}>
          <div className="p-4">
            <button
              onClick={createNewChat}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="h-5 w-5" />
              New Chat
            </button>
            <div className="space-y-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-2 rounded-lg cursor-pointer flex justify-between items-center ${
                    currentChatId === chat.id ? 'bg-emerald-700' : 'hover:bg-emerald-700/50'
                  }`}
                  onClick={() => selectChat(chat.id)}
                >
                  <span className="text-white truncate">{chat.title}</span>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="text-emerald-300 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-200 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-red-500 text-white text-center py-2 px-4">
              You are currently offline. Chat functionality is limited.
            </div>
          )}

          {/* Header */}
          <header className="bg-emerald-700 dark:bg-emerald-800 shadow-lg p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-white hover:bg-emerald-600 p-2 rounded-lg"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-semibold text-white">AI Investment Assistant</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-white">
                  <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="text-white hover:bg-emerald-600 p-2 rounded-lg"
                >
                  {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <main className="max-w-4xl mx-auto p-4">
            <div 
              ref={chatContainerRef}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 h-[calc(100vh-12rem)] overflow-y-auto relative"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.role === 'bot' ? (
                      <div className="prose dark:prose-invert prose-sm">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-emerald-200' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-left mb-4">
                  <div className="inline-block bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              
              {/* Scroll to top button */}
              {showScrollTop && (
                <button
                  onClick={scrollToTop}
                  className="fixed bottom-24 right-8 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 animate-fade-in"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="mt-4 flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isOnline ? "Ask about investments..." : "Chat is disabled while offline"}
                disabled={!isOnline}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={!isOnline || isLoading}
                className={`bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording ? 'animate-pulse' : ''
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!isOnline || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;