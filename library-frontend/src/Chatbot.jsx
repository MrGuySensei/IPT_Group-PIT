import { useState } from 'react';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'bot', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: "Sorry, I'm having trouble connecting right now. Please try again." 
      }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 1000,
          cursor: 'pointer'
        }}
      >
        💬
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '380px',
          height: '520px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          border: '1px solid #ddd'
        }}>
          <div style={{ background: '#2563eb', color: 'white', padding: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            Library Assistant
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>×</button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: '#666', marginTop: '60px' }}>👋 Ask me anything about books!</p>}
            
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: '12px', display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  background: msg.type === 'user' ? '#2563eb' : '#f1f5f9',
                  color: msg.type === 'user' ? 'white' : 'black'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && <div style={{ color: '#666' }}>Thinking...</div>}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #ddd', background: 'white' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                style={{ flex: 1, padding: '12px', borderRadius: '9999px', border: '1px solid #ccc' }}
              />
              <button onClick={sendMessage} disabled={loading} style={{ padding: '0 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '9999px' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;