import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Remove Personal Information
// function redactPersonalInfo(input_text) {
//   const patterns = {
//     name: /\b([A-Za-z'-]+(?: [A-Za-z'-]+)+)\b/g,
//     email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
//     phone: /\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b/g,
//   };
//   let redactedText = input_text;
//   for (const pattern in patterns) {
//     redactedText = redactedText.replace(patterns[pattern], '[REDACTED]');
//   }
//   return redactedText;
// }
function capitalizeNames(text) {
  // Define a regex for words that might be names (excluding common lowercase words)
  const nameRegex = /\b(?!(?:and|or|but|the|a|an|in|on|at|to|for|of|with|by|from)\b)[a-z]+\b/gi;
  
  return text.replace(nameRegex, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });
}
function redactPersonalInfo(message) {
  // First, capitalize potential names
  const capitalizedMessage = capitalizeNames(message);

  // Remove names after "my name is" or similar phrases
  const nameRegex = /\b(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+and|\s*[,.]|\s*$)/gi;
  const anonymizedMessage = capitalizedMessage.replace(nameRegex, (match, name) => {
    return match.replace(name, '[REDACTED NAME]');
  });

  // Add more regex patterns here for other types of sensitive information

  return anonymizedMessage;
}

function App() {
  const [prompt, setPrompt] = useState("");


  const handleSubmitForm = () => {

    alert(redactPersonalInfo(prompt));
  };
  
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
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
        >
        </input>
      </header>
    </div>
  );
}

export default App;
