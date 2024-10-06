import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import tmi from 'tmi.js';
import { useCookies } from 'react-cookie';

const App = () => {
  const [channel, setChannel] = useState();
  const [chatters, setChatters] = useState({});
  const [chatterFilter, setChatterFilter] = useState({
    all: true,
    mods: false,
    subs: false
  });
  const [screen, setScreen] = useState('home');
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [keyColors, setKeyColors] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [cookies, setCookie] = useCookies(['user']);

  const userInputRef = useRef(null);


  const filterChatters = () => {
    if (!chatters) {
      return [];
    }

    return Object.keys(chatters).filter((chatter) => {
      if (chatterFilter.all) {
        return true;
      } else if (chatterFilter.mods && chatters[chatter].mod) {
        return true;
      } else if (chatterFilter.subs && chatters[chatter].subscriber) {
        return true;
      }
      return false;
    });
  }

  const connectToChannel = (channelName) => {
    const client = new tmi.Client({
      channels: [channelName]
    });

    client.connect().catch(console.error);

    client.on('message', (channel, tags, message, self) => {
      if (!self) {
        const username = tags['username'];
        const mod = tags['mod'];
        const subscriber = tags['subscriber'];
        setChatters((prevChatters) => {
          if (!prevChatters[username]) {
            return { ...prevChatters, [username]: { mod, subscriber } };
          } else {
            return prevChatters;
          }
        });
      }
    });
  };

  const handleStartClick = () => {
    const filteredChatters = filterChatters();
    if (filteredChatters.length > 0) {
      const randomUser = filteredChatters[Math.floor(Math.random() * filteredChatters.length)];
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
    const filteredChatters = filterChatters();
    const randomUser = filteredChatters[Math.floor(Math.random() * filteredChatters.length)];
    setTargetWord(randomUser);
    setGuesses([]);
    setCurrentGuess('');
    setKeyColors({});
    setIsModalVisible(false);
  };

  const handleUserSubmit = () => {
    const user = userInputRef.current.value;
    if (user) {
      setCookie('user', user, { path: '/' });
      setChannel(user);
      connectToChannel(user);
    }
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

  useEffect(() => {
    if (cookies.user && userInputRef.current) {
      userInputRef.current.value = cookies.user;   
    }
  }, [cookies.user]);

  const KeyboardScreen = () => {
    const firstRow = 'qwertyuiop';
    const secondRow = 'asdfghjkl';
    const thirdRow = 'zxcvbnm';
    const numbers = '0123456789_';

    const openProfileCard = () => {
      const url = `https://www.twitch.tv/popout/${channel}/viewercard/${targetWord}?popout=`;
      const windowFeatures = 'width=400,height=600,resizable,scrollbars';
      window.open(url, 'ProfileCardPopout', windowFeatures);
    };

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
        <dialog open className="modal fixed inset-0 flex bg-transparent items-center justify-center">
          <div className="modal-content bg-white p-4 rounded-xl shadow-lg text-center">
            <p className="text-xl mb-4">{modalMessage}</p>
            <button
                onClick={openProfileCard}
                className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded mb-4 block mx-auto"
              >
                View {targetWord}'s Profile Card
            </button>
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
          { channel ? (
            <>
              <button onClick={handleStartClick} className="bg-stone-500 text-white p-2 rounded m-2">
                Start Game
              </button>
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center gap-2">
                  <p className="text-stone-700 text-md">Filters:</p>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={chatterFilter.all}
                      onChange={() => setChatterFilter({ all: !chatterFilter.all, mods: false, subs: false })}
                    />
                    All
                  </label>
                  <label className={`flex items-center gap-1 ${chatterFilter.all && 'text-stone-400 hover:cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={chatterFilter.mods}
                      onChange={() => setChatterFilter({ ...chatterFilter, mods: !chatterFilter.mods })}
                      disabled={chatterFilter.all}
                    />
                    Mods
                  </label>
                  <label className={`flex items-center gap-1 ${chatterFilter.all && 'text-stone-400 hover:cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={chatterFilter.subs}
                      onChange={() => setChatterFilter({ ...chatterFilter, subs: !chatterFilter.subs })}
                      disabled={chatterFilter.all}
                    />
                    Subs
                  </label>
                </div>
              </div>
              <p className="text-stone-700 text-xl mb-4">
                {channel ? `Hello ${channel}'s chat, type anything to join! (${filterChatters().length} have joined)` : 'Connecting...'}
              </p>
              <ul className="text-stone-600 mb-4">
                {filterChatters().map((chatter, index) => (
                  <li key={index}>{chatter}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mb-4 flex items-center align-middle justify-center gap-2">
              <input ref={userInputRef} type="text" placeholder="Enter your twitch name" className="p-2 rounded border w-96" />
              <button onClick={handleUserSubmit} className="bg-stone-500 text-white p-2 rounded">
                Enter
              </button>
            </div>
          )}
        </header>
      ) : (
        <KeyboardScreen />
      )}
    </div>
  );
}

export default App;