import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
const OpenAI = require('openai');

const OPENAI_API_KEY = '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';
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

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

  useEffect(() => {
  }, [chatMessages]);


  const getChatResponse = async (message) => {

    try {
      const assistant = await openai.beta.assistants.create({
        name: "StrokeGPT",
        instructions: (
          "You are a stroke informant API, offering personalized information.  " +
          "Respond breifly, as if friendly responding to stroke patients, and always prioritize asking questions rather than giving long answers. " +
          "Any question that you ask should be accompanied with up to three general answers. " +
          "All responses should follow this example format: how old are you? [[ANSWER]] < 50 [[ANSWER]] 51-65 [[ANSWER]] 66+ [[END]]. "
        ),
        model: "gpt-4o"
      });

      const thread = await openai.beta.threads.create();

      const returnMessage = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: message
        }
      );

      let responseText = "";

      const run = openai.beta.threads.runs.stream(thread.id, {
        assistant_id: assistant.id
      })
      .on('textCreated', (text) => {
        responseText += ('\n[[START]] ');
        setChatMessages([
          ...chatMessages,
          createMessageObject(message, true),
          createMessageObject(responseText, false)
        ]);
      })
      .on('textDelta', (textDelta, snapshot) => {
        responseText += (textDelta.value);
        setChatMessages([
          ...chatMessages,
          createMessageObject(message, true),
          createMessageObject(responseText, false)
        ]);
      })
      .on('toolCallCreated', (toolCall) => {
        responseText += (`\n[[START]] ${toolCall.type}\n\n`);
        setChatMessages([
          ...chatMessages,
          createMessageObject(message, true),
          createMessageObject(responseText, false)
        ]);
      })
      .on('toolCallDelta', (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === 'code_interpreter') {
          if (toolCallDelta.code_interpreter.input) { 
            responseText += (toolCallDelta.code_interpreter.input);
            setChatMessages([
              ...chatMessages,
              createMessageObject(message, true),
              createMessageObject(responseText, false)
            ]);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            responseText += ("\noutput >\n");
            setChatMessages([
              ...chatMessages,
              createMessageObject(message, true),
              createMessageObject(responseText, false)
            ]);
            toolCallDelta.code_interpreter.outputs.forEach(output => {
              if (output.type === "logs") {
                responseText += (`\n${output.logs}\n`);
                setChatMessages([
                  ...chatMessages,
                  createMessageObject(message, true),
                  createMessageObject(responseText, false)
                ]);
              }
            });
          }
        }
      });
    }
    catch (err) {
        console.error(err);
    }


    // // construct url for get request
    // const getURL = "http://localhost:3001/api/chat/" + encodeURIComponent(message);
    // console.log(getURL);
  
    // // Fetch response from server
    // const response = await axios.get(getURL);
    // console.log(response);
    // if (response) {
    //   return response.data;
    // }
    // return "";
  };

  
  const createMessageObject = (message, user) => {
    return {
      type: user ? "input-message" : "output-message",
      contents: message
    };
  };

  const handleSubmitForm = async () => {
    // Clean message of personal information
    const cleanMessage = await anonymizeMessage(prompt)

    // Clear message from input box
    setPrompt("");
    setChatMessages([
      ...chatMessages,
      createMessageObject(cleanMessage, true),
    ]);

    // Get response from OpenAI
    const response = await getChatResponse(cleanMessage);

    // Add messages to chat
    // setChatMessages([
    //   ...chatMessages,
    //   createMessageObject(cleanMessage, true),
    //   createMessageObject(response, false)
    // ]);
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
        <div id="chat-output" >
          {chatMessages.map((message) => (
            <div className={"chat-bubble-container " + message.type + "-container"}>
              <div className={"chat-bubble " + message.type}>
                {message.contents}
              </div>
            </div>
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
