// GeminiChatbot.jsx
import React, { useState } from 'react';
import axios from 'axios';

function GeminiChatbot({ datasetContext, customerSegments }) {
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState("");

  const handleSend = async () => {
    if (!userInput.trim()) return;
    // Append user's message to the conversation
    setConversation(prev => [...prev, { sender: "user", text: userInput }]);
    try {
      const response = await axios.post("http://localhost:8000/gemini-chatbot", {
        query: userInput,
        datasetContext,      // Summary or key columns from the dataset
        customerSegments     // Array of key customer segment identifiers/names
      });
      const botReply = response.data.response;
      setConversation(prev => [...prev, { sender: "bot", text: botReply }]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setConversation(prev => [...prev, { sender: "bot", text: "Sorry, something went wrong." }]);
    }
    setUserInput("");
  };

  return (
    <div className="gemini-chatbot">
      <h3>Business Recommendations Chatbot</h3>
      <div
        className="chat-window"
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "scroll"
        }}
      >
        {conversation.map((msg, idx) => (
          <div key={idx} style={{ margin: "10px 0", textAlign: msg.sender === "bot" ? "left" : "right" }}>
            <strong>{msg.sender === "bot" ? "Bot:" : "You:"}</strong> {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input" style={{ marginTop: "10px" }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask for business recommendations..."
          style={{ width: "80%", padding: "8px" }}
        />
        <button onClick={handleSend} style={{ padding: "8px 12px", marginLeft: "10px" }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default GeminiChatbot;
