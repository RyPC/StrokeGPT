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
  const [cleanPrompt, setCleanPrompt] = useState("");


  const handleSubmitForm = async () => {
    const newMessage = await anonymizeMessage(prompt)
    setCleanPrompt(newMessage);
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
        >
        </input>
        <p
          id='prompt-output'
          className='chat-text'
        >{cleanPrompt}</p>
      </header>
    </div>
  );
}

export default App;
