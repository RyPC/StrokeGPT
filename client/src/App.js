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
const INITIAL_MESSAGE = "How can I assist you today? [[What is a stroke?]] [[I have a specific question about stoke]] [[I want to talk a bit]]";

// Remove any sensitive information before sending to OpenAI
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
  // State variables
  // Current input
  const [prompt, setPrompt] = useState("");
  // All previous chat messages
  const [chatMessages, setChatMessages] = useState([{
    type: "output-message",
    contents: "How can I assist you today?"
  }]);
  // OpenAI thread of current conversation
  const [thread, setThread] = useState();
  // Current answer options
  const [answerOptions, setAnswerOptions] = useState([
    "What is a stroke?",
    "I have a specific question about stoke",
    "I want to talk a bit",
  ]);
  const [assistant, setAssistant] = useState();

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      // Create assistant
      const newAssistant = await openai.beta.assistants.create({
        name: "StrokeGPT",
        instructions: (
          "You are a stroke informant API, offering personalized information to answer the users' specific questions.  " +
          "Respond breifly and friendly, asking questions for any clarifications. " +
          "Every question that you ask should be accompanied with a couple general options. " +
          "All responses and options should be in the following format: How old are you? [[<50]] [[51-65]] [[66+]]. " +
          "The user will start by responding to this question: " + INITIAL_MESSAGE + ". "
        ),
        model: "gpt-4o",
        // tools: [{ type: "file_search" }],
      });
      setAssistant(newAssistant);

      // Create thread
      const newThread = await openai.beta.threads.create();
      setThread(newThread);
    };
    initializeChat();
  }, []);
  
  // Forces updated chat messages to allow streaming
  useEffect(() => {
  }, [chatMessages]);

  // Makes a call to OpenAI API
  const getChatResponse = async (message) => {
    try {
      const updateChatObjects = (message, responseText) => {
        // Separate response message from list of answers
        const responseMessage = responseText.split("[[")[0];
        const regexp = /\[\[([^\[\]]*)\]\]/g;
        const answers = [...responseText.matchAll(regexp)].map(answer => answer[1]);
        console.log(responseText);

        // Update chat messages (streaming)
        setChatMessages([
          ...chatMessages,
          createMessageObject(message, true),
          createMessageObject(responseMessage, false)
        ]);
        setAnswerOptions(answers);
      };

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
    const response = await getChatResponse(cleanMessage);

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
