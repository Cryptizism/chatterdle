import './App.css';
import React, { useState, useEffect } from 'react';
import tmi from 'tmi.js';

const App = () => {
  const [channel, setChannel] = useState(null);
  const [chatters, setChatters] = useState([]);
  const [screen, setScreen] = useState('home');
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [keyColors, setKeyColors] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const user = urlParams.get('user') || prompt('Please enter your name');
    if (user) {
      setChannel(user);
      connectToChannel(user);
    }
  }, []);

  const connectToChannel = (channelName) => {
    const client = new tmi.Client({
      channels: [channelName]
    });

    client.connect().catch(console.error);

    client.on('message', (channel, tags, message, self) => {
      if (!self) {
        const username = tags['username'];
        setChatters((prevChatters) => {
          if (!prevChatters.includes(username)) {
            return [...prevChatters, username];
          }
          return prevChatters;
        });
      }
    });
  };

  const handleStartClick = () => {
    if (chatters.length > 0) {
      const randomUser = chatters[Math.floor(Math.random() * chatters.length)];
      setTargetWord(randomUser);
      setScreen('keyboard');
    } else {
      alert('No chatters available to start the game.');
    }
  };

  const handleKeyPress = (char) => {
    if (currentGuess.length < targetWord.length && !isModalVisible) {
      setCurrentGuess(currentGuess + char);
    }
  };

  const handleDelete = () => {
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  const handleSubmitGuess = () => {
    if (currentGuess.length === targetWord.length) {
      setGuesses([...guesses, currentGuess]);
      setCurrentGuess('');
      updateKeyColors(currentGuess);

      if (currentGuess === targetWord) {
        setModalMessage('Congratulations! You guessed the correct chatter!');
        setIsModalVisible(true);
      } else if (guesses.length >= 6) {
        setModalMessage(`Game Over! The chatter was: ${targetWord}`);
        setIsModalVisible(true);
      }
    }
  };

  const updateKeyColors = (guess) => {
    const newKeyColors = { ...keyColors };
    const feedback = getFeedback(guess);

    guess.split('').forEach((char, index) => {
      const currentColor = newKeyColors[char];
      const feedbackColor = feedback[index] === 'green' ? 'bg-green-500' : feedback[index] === 'yellow' ? 'bg-yellow-500' : 'bg-stone-500';

      if (currentColor === 'bg-green-500') {
        // Green cannot be replaced
        return;
      } else if (currentColor === 'bg-yellow-500' && feedbackColor === 'bg-stone-500') {
        // Yellow cannot be replaced by grey
        return;
      } else {
        // Update the color
        newKeyColors[char] = feedbackColor;
      }
    });

    setKeyColors(newKeyColors);
  };

  const getFeedback = (guess) => {
    const feedback = Array(guess.length).fill('grey');
    const targetWordArray = targetWord.split('');
    const guessArray = guess.split('');

    // First pass: mark greens
    guessArray.forEach((char, index) => {
      if (char === targetWordArray[index]) {
        feedback[index] = 'green';
        targetWordArray[index] = null; // Mark this char as used
      }
    });

    // Second pass: mark yellows
    guessArray.forEach((char, index) => {
      if (feedback[index] !== 'green' && targetWordArray.includes(char)) {
        feedback[index] = 'yellow';
        targetWordArray[targetWordArray.indexOf(char)] = null; // Mark this char as used
      }
    });

    return feedback;
  };

  const resetGame = () => {
    const randomUser = chatters[Math.floor(Math.random() * chatters.length)];
    setTargetWord(randomUser);
    setGuesses([]);
    setCurrentGuess('');
    setKeyColors({});
    setIsModalVisible(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (screen === 'keyboard') {
        if (event.key === 'Backspace') {
          handleDelete();
        } else if (event.key === 'Enter') {
          handleSubmitGuess();
        } else if (event.key.length === 1 && event.key.match(/[a-z0-9_]/i)) {
          handleKeyPress(event.key.toLowerCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, handleDelete, handleSubmitGuess, handleKeyPress]);

  const KeyboardScreen = () => {
    const firstRow = 'qwertyuiop';
    const secondRow = 'asdfghjkl';
    const thirdRow = 'zxcvbnm';
    const numbers = '0123456789_';

    return (
      <div className="KeyboardScreen font-mono">
      <div className="guesses">
        {guesses.map((guess, index) => (
        <div key={index} className="guess flex justify-center mb-2">
          {guess.split('').map((char, charIndex) => {
          const feedback = getFeedback(guess)[charIndex];
          const bgColor = feedback === 'green' ? 'bg-green-500' : feedback === 'yellow' ? 'bg-yellow-500' : 'bg-stone-500';
          return (
            <span key={charIndex} className={`key-button ${bgColor} text-white m-1 p-2 rounded`}>
            {char}
            </span>
          );
          })}
        </div>
        ))}
        <div className="guess flex justify-center mb-2">
        {Array.from({ length: targetWord.length }).map((_, charIndex) => (
          <span key={charIndex} className="key-button bg-stone-200 text-black m-1 p-2 rounded">
          {currentGuess[charIndex] || '\u00A0'}
          </span>
        ))}
        </div>
        {Array.from({ length: 6 - guesses.length }).map((_, index) => (
        <div key={index} className="guess flex justify-center mb-2">
          {Array.from({ length: targetWord.length }).map((_, charIndex) => (
          <span key={charIndex} className="key-button bg-stone-200 text-white m-1 p-2 rounded">
            &nbsp;
          </span>
          ))}
        </div>
        ))}
      </div>
      <hr className="my-4" />
      <div className="keyboard">
        <div className="keyboard-row flex justify-center mb-2">
        {numbers.split('').map((char, index) => (
          <button key={index} className={`key-button font-mono ${keyColors[char] || 'bg-stone-300'} text-white m-1 p-3 rounded`} onClick={() => handleKeyPress(char)}>
          {char}
          </button>
        ))}
        </div>
        <div className="keyboard-row flex justify-center mb-2">
        {firstRow.split('').map((char, index) => (
          <button key={index} className={`key-button font-mono ${keyColors[char] || 'bg-stone-300'} text-white m-1 p-3 rounded`} onClick={() => handleKeyPress(char)}>
          {char}
          </button>
        ))}
        </div>
        <div className="keyboard-row flex justify-center mb-2">
        {secondRow.split('').map((char, index) => (
          <button key={index} className={`key-button font-mono ${keyColors[char] || 'bg-stone-300'} text-white m-1 p-3 rounded`} onClick={() => handleKeyPress(char)}>
          {char}
          </button>
        ))}
        </div>
        <div className="keyboard-row flex justify-center mb-2">
        {thirdRow.split('').map((char, index) => (
          <button key={index} className={`key-button font-mono ${keyColors[char] || 'bg-stone-300'} text-white m-1 p-3 rounded`} onClick={() => handleKeyPress(char)}>
          {char}
          </button>
        ))}
        </div>
        <div className="keyboard-row flex justify-center mb-2">
        <button className="key-button font-mono bg-stone-500 text-white m-1 p-2 rounded" onClick={handleDelete}>Delete</button>
        <button className="key-button font-mono bg-stone-500 text-white m-1 p-2 rounded" onClick={handleSubmitGuess}>Submit</button>
        </div>
      </div>
      {isModalVisible && (
        <dialog open className="modal fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
        <div className="modal-content bg-white p-4 rounded shadow-lg text-center">
          <p className="text-xl mb-4">{modalMessage}</p>
          <button className="bg-stone-500 text-white p-2 rounded" onClick={resetGame}>New Game</button>
        </div>
        </dialog>
      )}
      </div>
    );
  };

  return (
    <div className="App min-h-screen bg-stone-100 flex flex-col items-center justify-center font-mono">
      {screen === 'home' ? (
        <header className="App-header text-center">
          <button onClick={handleStartClick} className="bg-stone-500 text-white p-2 rounded">
            Start
          </button>
          <p className="text-stone-700 text-xl mb-4">
            {channel ? `Hello ${channel}'s chat, type anything to join! (${chatters.length} have joined)` : 'Connecting...'}
          </p>
          <ul className="text-stone-600 mb-4">
            {chatters.map((chatter, index) => (
              <li key={index}>{chatter}</li>
            ))}
          </ul>
        </header>
      ) : (
        <KeyboardScreen />
      )}
    </div>
  );
}

export default App;