import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import './App.css';
import Markdown from 'react-markdown';
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
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

function App() {
  const [prompt, setPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [thread, setThread] = useState();
  const [answerOptions, setAnswerOptions] = useState([]);

  useEffect(() => {
  }, [chatMessages]);


  // Makes a call to OpenAI API
  const getChatResponse = async (message, thread) => {
    try {
      const updateChatObjects = (message, responseText) => {
        const responseMessage = responseText.split("[[")[0];

        const regexp = /\[\[([^\[\]]*)\]\]/g;
        const answers = [...responseText.matchAll(regexp)].map(answer => answer[1]);
        console.log(responseText);

        setChatMessages([
          ...chatMessages,
          createMessageObject(message, true),
          createMessageObject(responseMessage, false)
        ]);
        setAnswerOptions(answers);
      };

      const assistant = await openai.beta.assistants.create({
        name: "StrokeGPT",
        instructions: (
          "You are a stroke informant API, offering personalized information to answer the users' specific questions.  " +
          "Respond breifly and friendly, asking questions for any clarifications. " +
          "Every question that you ask should be accompanied with 2-3 general options. " +
          "All responses and options should be in the following format: How old are you? [[<50]] [[51-65]] [[66+]]"
        ),
        model: "gpt-4o",
        // tools: [{ type: "file_search" }],
      });

      const returnMessage = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: message
        }
      );

      let responseText = "";
      const addToResponseText = (text) => {
        responseText += text;
        updateChatObjects(message, responseText);
      };

      const run = openai.beta.threads.runs.stream(thread.id, {
        assistant_id: assistant.id
      })
      .on('textCreated', (text) => addToResponseText("\n"))
      .on('textDelta', (textDelta, snapshot) => addToResponseText(textDelta.value))
      .on('toolCallCreated', (toolCall) => addToResponseText(`\n${toolCall.type}\n\n`))
      .on('toolCallDelta', (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === 'code_interpreter') {
          if (toolCallDelta.code_interpreter.input) { 
            addToResponseText(toolCallDelta.code_interpreter.input);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            addToResponseText("\noutput >\n");
            toolCallDelta.code_interpreter.outputs.forEach(output => {
              if (output.type === "logs") {
                addToResponseText(`\n${output.logs}\n`);
              }
            });
          }
        }
      });

      setThread(thread);
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

  const handleSubmitForm = async (message) => {
    // Clean message of personal information
    const cleanMessage = await anonymizeMessage(message)

    // Clear message from input box
    setPrompt("");
    setAnswerOptions([]);
    setChatMessages([
      ...chatMessages,
      createMessageObject(cleanMessage, true),
    ]);

    // Get response from OpenAI
    const response = await getChatResponse(cleanMessage, chatMessages.length === 0 ? await openai.beta.threads.create() : thread);

    // Add messages to chat
    // setChatMessages([
    //   ...chatMessages,
    //   createMessageObject(cleanMessage, true),
    //   createMessageObject(response, false)
    // ]);
  };
  
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && prompt !== "") {
      handleSubmitForm(prompt);
    }
  };
  
  const handlePromptChange = (x) => {
    setPrompt(x.target.value);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="chat-container" >
          {chatMessages.map((message) => (
            <div className={"chat-bubble-container " + message.type + "-container"}>
              <div className={"chat-bubble " + message.type}>
                <Markdown>
                  {message.contents}
                </Markdown>
              </div>
            </div>
          ))}
          <div className="answer-options-container">
            {answerOptions.map((option) => (
              <div
                className="chat-bubble answer-option"
                onClick={() => {
                  handleSubmitForm(option);
                  setAnswerOptions([]);
                }}
              >
                {option}
              </div>
            ))}
          </div>
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
