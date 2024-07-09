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


  const getChatResponse = async (message, thread) => {
    try {
      const updateChatObjects = (message, responseText) => {
        const deconstructedResponse = responseText.split("[[ANSWER]]");
        const responseMessage = deconstructedResponse[0];
        const answers = deconstructedResponse.slice(1);
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
          "All responses and options should be in the following format: How old are you? [[ANSWER]] <50 [[ANSWER]] 51-65 [[ANSWER]] 66+"
        ),
        model: "gpt-4o"
      });

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
        responseText += ('\n');
        updateChatObjects(message, responseText);
      })
      .on('textDelta', (textDelta, snapshot) => {
        responseText += (textDelta.value);
        updateChatObjects(message, responseText);
      })
      .on('toolCallCreated', (toolCall) => {
        responseText += (`\n${toolCall.type}\n\n`);
        updateChatObjects(message, responseText);
      })
      .on('toolCallDelta', (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === 'code_interpreter') {
          if (toolCallDelta.code_interpreter.input) { 
            responseText += (toolCallDelta.code_interpreter.input);
            updateChatObjects(message, responseText);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            responseText += ("\noutput >\n");
            updateChatObjects(message, responseText);
            toolCallDelta.code_interpreter.outputs.forEach(output => {
              if (output.type === "logs") {
                responseText += (`\n${output.logs}\n`);
                updateChatObjects(message, responseText);
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
