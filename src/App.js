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
  const [keyOccurrences, setKeyOccurrences] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [cheats, setCheats] = useState({
    viewNames: true,
    viewOccurrences: true
  });

  const [cookies, setCookie] = useCookies(['user']);
  const [cheatCookie, setCheatCookie] = useCookies(['cheats']);

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

  const addChats = (username, message, tags) => {
    const chatOverlay = document.getElementById('chat-overlay');
    if (chatOverlay) {
      const messageElement = document.createElement('div');
      messageElement.className = 'chat-message text-white p-2 rounded mb-2';
      messageElement.style.color = tags['color'] || 'white';
      
      messageElement.innerHTML = `<strong>${username}</strong>: ${message}`;
      messageElement.style.position = 'absolute';
      messageElement.style.top = `${Math.random() * 100}vh`;
      messageElement.style.left = `${Math.random() * 100}vw`;
      messageElement.style.transition = 'all 0.5s ease-in-out';
      chatOverlay.appendChild(messageElement);
      setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
          chatOverlay.removeChild(messageElement);
        }, 500);
      }, 5000);
    }
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
        const colour = tags['color'] || 'white';
        setChatters((prevChatters) => {
          if (!prevChatters[username]) {
            return { ...prevChatters, [username]: { mod, subscriber, colour } };
          } else {
            return prevChatters;
          }
        });
        addChats(username, message, tags);
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

  const setCurrentGuessPadded = (guess) => {
    const paddedGuess = guess.padEnd(targetWord.length, '\u00A0');
    setCurrentGuess(paddedGuess);
  }

  const handleKeyPress = (char) => {
    if (isModalVisible) return;
  
    const updatedGuess = currentGuess.split('');
    updatedGuess[activeCharIndex] = char;
    setCurrentGuessPadded(updatedGuess.join(''));
    setActiveCharIndex(Math.min(activeCharIndex + 1, targetWord.length - 1));
  };
  
  const handleDelete = () => {
    if (isModalVisible) return;

    const updatedGuess = currentGuess.split('');
    updatedGuess.splice(activeCharIndex, 1);
    setCurrentGuessPadded(updatedGuess.join(''));
    setActiveCharIndex(Math.max(activeCharIndex - 1, 0));
  };

  const handleSubmitGuess = () => {
    const parsedGuess = currentGuess.trim();
    if (parsedGuess.length === targetWord.length) {
      setGuesses([...guesses, currentGuess]);
      setCurrentGuessPadded('');
      setActiveCharIndex(0);
      updateKeyColors(currentGuess);

      if (currentGuess === targetWord) {
        setModalMessage('Congratulations! You guessed the correct chatter!');
        setIsModalVisible(true);
      } else if (guesses.length >= 6) {
        setModalMessage(`You lost! The chatter was: ${targetWord}`);
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
    const newKeyOccurrences = {};

    // First pass: mark greens
    guessArray.forEach((char, index) => {
      if (char === targetWordArray[index]) {
        feedback[index] = 'green';
        targetWordArray[index] = null; // Mark this char as used
        newKeyOccurrences[char] = (newKeyOccurrences[char] || 0) + 1;
      }
    });

    // Second pass: mark yellows
    guessArray.forEach((char, index) => {
      if (feedback[index] !== 'green' && targetWordArray.includes(char)) {
        feedback[index] = 'yellow';
        targetWordArray[targetWordArray.indexOf(char)] = null; // Mark this char as used
        newKeyOccurrences[char] = (newKeyOccurrences[char] || 0) + 1;
      }
    });

    // Update key occurrences
    guessArray.forEach((char) => {
      if (newKeyOccurrences[char] > (keyOccurrences[char] || 0)) {
        setKeyOccurrences((prev) => ({
          ...prev,
          [char]: newKeyOccurrences[char],
        }));
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
        } else if (event.key === 'ArrowLeft') {
          setActiveCharIndex(Math.max(activeCharIndex - 1, 0));
        } else if (event.key === 'ArrowRight') {
          setActiveCharIndex(Math.min(activeCharIndex + 1, targetWord.length - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, handleDelete, handleSubmitGuess, handleKeyPress]);

  const setCheatsWithCookie = (newCheats) => {
    setCheats(newCheats);
    setCheatCookie('cheats', newCheats, { path: '/' });
  };

  useEffect(() => {
    if (cheatCookie.cheats) {
      setCheats(cheatCookie.cheats);
    }
  }, [cheatCookie.cheats]);

  useEffect(() => {
    if (cookies.user && userInputRef.current) {
      userInputRef.current.value = cookies.user;   
    }
  }, [cookies.user]);

  const keyboardRow = (chars) => {
    return (
      <div className="keyboard-row flex justify-center mb-2">
        {chars.split('').map((char, index) => (
          <button key={index} className={`group key-button font-mono ${keyColors[char] || 'bg-stone-300'} text-white m-1 p-3 rounded`} onClick={() => handleKeyPress(char)}>
            {char}
            {cheats.viewOccurrences && (
              <span className="tooltip hidden group-hover:block absolute bg-black text-white text-xs p-1 rounded mt-2">
                {keyOccurrences[char] ? `Max Used: ${keyOccurrences[char]}` : 'Not used'}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

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
          <span key={charIndex} className={`key-button ${activeCharIndex == charIndex ? 'bg-stone-400' : 'bg-stone-200'} text-black m-1 p-2 rounded`} onClick={() => setActiveCharIndex(charIndex)}>
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
        {keyboardRow(numbers)}
        {keyboardRow(firstRow)}
        {keyboardRow(secondRow)}
        {keyboardRow(thirdRow)}
        <div className="keyboard-row flex justify-center mb-2">
        <button className="key-button font-mono bg-stone-500 text-white m-1 p-2 rounded" onClick={handleDelete}>Delete</button>
        <button className="key-button font-mono bg-stone-500 text-white m-1 p-2 rounded" onClick={handleSubmitGuess}>Submit</button>
        </div>
      </div>
      {isModalVisible && (
        <>
          <dialog open className="modal fixed inset-0 flex bg-transparent items-center justify-center z-50">
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
          <div id="chat-overlay" className="fixed inset-0 bg-black opacity-50 z-40">

          </div>
        </>
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
                <div className="flex justify-center gap-2">
                  <p className="text-stone-700 text-md">Cheats:</p>
                  <label className={"flex items-center gap-1"}>
                    <input
                      type="checkbox"
                      checked={cheats.viewNames}
                      onChange={() => setCheatsWithCookie({ ...cheats, viewNames: !cheats.viewNames })}
                    />
                    View Names Pregame
                  </label>
                  <label className={"flex items-center gap-1"}>
                    <input
                      type="checkbox"
                      checked={cheats.viewOccurrences}
                      onChange={() => setCheatsWithCookie({ ...cheats, viewOccurrences: !cheats.viewOccurrences })}
                    />
                    View Letter Occurences
                  </label>
                </div>
              </div>
              <p className="text-stone-700 text-xl mb-4">
                {channel ? `Hello ${channel}'s chat, type anything to join! (${filterChatters().length} have joined)` : 'Connecting...'}
              </p>
              <ul className="text-stone-600 mb-4 flex flex-wrap mx-96 gap-x-4 gap-y-2 max-h-[60vh] overflow-y-auto border border-stone-300 p-4 rounded">
                {filterChatters().map((chatter, index) => (
                  <li key={index} className={`px-1 py-2 rounded ${chatters[chatter].colour == "white" ? "text-black" : "text-white"} ${!cheats.viewNames && 'blur-sm'} hover:blur-0`}
                  style={{
                    backgroundColor: chatters[chatter].colour,
                    textShadow: chatters[chatter].colour == "white" ? "none" : "1px 1px 2px black",
                  }}>
                    {chatters[chatter].mod  && <img src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3" alt="Mod" className="inline-block w-4 h-4 mr-2" />}
                    {chatters[chatter].subscriber && <img src="https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3" alt="Subscriber" className="inline-block w-4 h-4 mr-2" />}
                    {chatter}
                  </li>
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