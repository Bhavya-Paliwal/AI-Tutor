import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Square } from 'lucide-react';
import { getApiUrl } from './config';
import './App.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI Tutor. I'm here to help you learn and answer any questions you might have. What would you like to learn today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingControlRef = useRef<{ shouldStop: boolean }>({ shouldStop: false });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  const stopStreaming = () => {
    streamingControlRef.current.shouldStop = true;
    setIsStreaming(false);
    setIsLoading(false);
    
    // Mark any streaming messages as complete
    setMessages(prev => prev.map(msg => 
      msg.isStreaming ? { ...msg, isStreaming: false } : msg
    ));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsStreaming(false);
    streamingControlRef.current.shouldStop = false;

    // Add a streaming bot message
    const botMessageId = (Date.now() + 1).toString();
    const streamingMessage: Message = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, streamingMessage]);

    try {
      // Call your .NET Web API
      const apiUrl = getApiUrl('/api/Tutor/ask');
      const requestBody = {
        message: inputText,
        question: inputText,
        query: inputText,
        prompt: inputText
      };
      
      console.log('Calling API:', apiUrl);
      console.log('Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is streaming or JSON
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const jsonResponse = await response.json();
        console.log('JSON Response:', jsonResponse);
        
        // Check if user stopped before processing
        if (streamingControlRef.current.shouldStop) {
          return;
        }
        
        // Try different possible response formats
        let answer = '';
        if (jsonResponse.answer) {
          answer = jsonResponse.answer;
        } else if (jsonResponse.message) {
          answer = jsonResponse.message;
        } else if (jsonResponse.response) {
          answer = jsonResponse.response;
        } else if (jsonResponse.content) {
          answer = jsonResponse.content;
        } else if (typeof jsonResponse === 'string') {
          answer = jsonResponse;
        } else {
          answer = JSON.stringify(jsonResponse);
        }
        
        console.log('Extracted answer:', answer);
        
        // Format the response for better display
        const formatResponse = (text: string) => {
          return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
            .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
            .replace(/\n/g, '<br>'); // Line breaks
        };
        
        setIsStreaming(true);
        setIsLoading(false);
        
        // Simulate streaming by updating the message character by character
        let displayText = '';
        for (let i = 0; i < answer.length; i++) {
          // Check if user clicked stop
          if (streamingControlRef.current.shouldStop) {
            break;
          }
          
          displayText += answer[i];
          const formattedText = formatResponse(displayText);
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, text: formattedText }
              : msg
          ));
          // Add a small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      } else {
        // Handle actual streaming response
        setIsStreaming(true);
        setIsLoading(false);
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        let accumulatedText = '';
        
        while (true) {
          // Check if user clicked stop
          if (streamingControlRef.current.shouldStop) {
            reader.cancel();
            break;
          }
          
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          accumulatedText += chunk;
          
          // Update the streaming message
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, text: accumulatedText }
              : msg
          ));
        }
      }

      // Mark streaming as complete (only if not stopped by user)
      if (!streamingControlRef.current.shouldStop) {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, text: `Error: ${errorMessage}. Please check your backend connection.`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="App">
      {/* Chat Widget */}
      <div className={`chat-widget ${isChatOpen ? 'open' : ''}`}>
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <Bot className="chat-icon" />
            <div>
              <h3>AI Tutor</h3>
              <span className="status">Online</span>
            </div>
          </div>
          <button 
            className="close-button"
            onClick={() => setIsChatOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'user' ? 'user' : 'bot'}`}
            >
              <div className="message-avatar">
                {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
                {message.isStreaming && <span className="typing-indicator">▋</span>}
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            disabled={isLoading || isStreaming}
            className="chat-input"
          />
          
          {/* Conditional rendering: Show stop button when streaming, send button otherwise */}
          {isStreaming ? (
            <button 
              onClick={stopStreaming}
               className="send-button"
            >
              Stop
            </button>
          ) : (
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="send-button"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Chat Button */}
      <button 
        className="chat-toggle-button"
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

export default App;