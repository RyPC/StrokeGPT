import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const anonymizeMessage = async (message) => {
  // construct url for get request
  const getURL = "http://localhost:3001/api/redact/" + encodeURIComponent(message);
  console.log(getURL);

  // Fetch response from server
  const response = await axios.get(getURL);
  if (response) {
    return response.data.message;
  }
  return "";
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState([]);


  const handleSubmitForm = async () => {
    // Clean message of personal information
    const cleanMessage = await anonymizeMessage(prompt)

    // Clear message from input
    setPrompt("");
    setChatMessages([...chatMessages, cleanMessage]);
    console.log(chatMessages);
  };
  
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && prompt !== "") {
      handleSubmitForm();
    }
  };
  
  const handlePromptChange = (x) => {
    setPrompt(x.target.value);
  };

  return (
    <div className="App">
      <header className="App-header">
        <input
          id='prompt-input'
          autoFocus
          onKeyDown={handleKeyDown}
          placeholder='Enter prompt here...'
          onChange={(x) => handlePromptChange(x)}
          autoComplete='off'
          value={prompt}
        >
        </input>
        <div
          id="chat-output"
        >
          {chatMessages.map((message) => (
            <p className='chat-text'>
              {message}
            </p>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
