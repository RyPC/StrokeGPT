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
};

// const readableStream = new ReadableStream({
//   start(controller) {
//     // Simulate sending data in chunks
//     for (let i = 1; i <= 5; i++) {
//       const chunk = `Chunk ${i}\n`;
//       controller.enqueue(chunk); // Enqueue data into the stream
//     }
//     controller.close(); // Signals the end of data
//   }
// });
// const reader = readableStream.getReader();

// async function consumeStream() {
//   try {
//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) {
//         console.log('Stream ended.');
//         break;
//       }
//       console.log(value);
//     }
//   } catch (error) {
//     console.error('Error consuming stream:', error);
//   } finally {
//     reader.releaseLock(); // Release the lock on the reader
//   }
// }

// consumeStream();

function App() {
  const [prompt, setPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  const getChatResponse = async (message) => {
    // construct url for get request
    const getURL = "http://localhost:3001/api/chat/" + encodeURIComponent(message);
    console.log(getURL);
  
    // Fetch response from server
    axios({
      method: 'get',
      url: getURL,
      responseType: 'stream'
    })
      .then(handleStream)
      .catch(err => console.error('Error:', err));
  };

  const handleStream = async (response) => {
    const reader = response.data.getReader();
    const decoder = new TextDecoder();
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Stream ended.');
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      setChatMessages(chatMessages + chunk);
    }
  };

  

  const handleSubmitForm = async () => {
    // Clean message of personal information
    const cleanMessage = await anonymizeMessage(prompt)

    // Clear message from input box
    setPrompt("");
    setChatMessages([...chatMessages, cleanMessage]);
    console.log(chatMessages);

    // Pass to OpenAI and get response
    getChatResponse(cleanMessage);
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
        <div
          id="chat-output"
        >
          {chatMessages.map((message) => (
            <p className='chat-text'>
              {message}
            </p>
          ))}
        </div>
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
      </header>
    </div>
  );
}

export default App;
