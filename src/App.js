import { useState, useCallback, useEffect, createRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { forceLink, forceManyBody } from 'd3-force-3d';
import SpriteText from 'three-spritetext';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import Confetti from 'react-confetti';
import './App.css';
import { Menu } from './Menu';
import { pickNextArticle, buildArticleGraphData } from './articleData'

const wikipediaBaseURL = 'https://en.wikipedia.org/wiki/';
const graphBackgroundColor = '#0d1117';
const linkColor = 'rgb(56,139,253)';
const centerNodeTextColor = '#c9d1d9';
const centerNodeBorderColor = '#8b949e';
const centerNodeBackgroundColor = '#30363d';
const normalNodeBackgroundColor = '#161b22';
const normalNodeTextColor = '#8b949e';
const normalNodeBorderColor = 'rgba(240,246,252,0.1)';

function App() {
  const [nextArticleData, setNextArticleData] = useState([]);
  const [articleHistory, setArticleHistory] = useState([]);
  const [articleGraphData, setArticleGraphData] = useState({ nodes: [], links: [] });
  const [openMenuSections, setOpenMenuSections] = useState([]);

  const [gameModeIsOn, setGameMode] = useState(false);
  const [guessIsCorrect, setGuessIsCorrect] = useState(false);

  const [isSettingNewCenter, setIsSettingNewCenter] = useState(false);
  const [latestGuess, setLatestGuess] = useState('');
  const [needsToPushToArticleHistory, setNeedsToPushToArticleHistory] = useState(false);
  const [shouldUpdateArticle, setShouldUpdateArticle] = useState(false);

  const [isLoading, setLoading] = useState(false);
  const [isErrored, setErrored] = useState(false);

  const fg = createRef();
  const location = useLocation();
  const navigate = useNavigate();

  // *** useCallback functions ***

  const fetchArticle = async (title) => {
    return await pickNextArticle(title);
  }

  useEffect(() => {
    console.log('entering shouldupdateArticle hook');
    if (shouldUpdateArticle) {
      setShouldUpdateArticle(false);
      setErrored(false);
      setLoading(true);
      fetchArticle()
        .then((articleData) => {
          console.log('navigating to article:', articleData[0]);
          navigate(articleData[0]);
        })
        .catch(() => {
          setErrored(true);
          setLoading(false);
        });
    }
  }, [shouldUpdateArticle, setErrored, setLoading, navigate]);

  const updateArticle = useCallback((articleName) => {
    if (articleName) {
      navigate(articleName);
    } else {
      setGuessIsCorrect(false);
      setLatestGuess('');
      setShouldUpdateArticle(true);
    }
  }, [navigate, setGuessIsCorrect, setShouldUpdateArticle]);

  const pushToArticleHistory = useCallback((articleTitle, shouldAdd) => {
    if (!articleTitle) {
      setArticleHistory([]);
    } else if (shouldAdd) {
      setArticleHistory([...articleHistory, articleTitle]);
    } else {
      setArticleHistory([articleTitle]);
    }
  }, [setArticleHistory, articleHistory]);

  const getDataForNewArticle = useCallback((articleTitle) => {
    const fetchGraphData = async (graphData, gameModeOn, guessCorrect) => {
      console.log('Game mode on:', gameModeOn);
      console.log('Guess is right:', guessCorrect)
      return await buildArticleGraphData(graphData, gameModeOn, guessCorrect);
    }
    fetchArticle(articleTitle)
      .then((articleData) => {
        setNextArticleData(articleData);
        console.log(gameModeIsOn);
        console.log('fetching graph data');
        fetchGraphData(articleData, gameModeIsOn, guessIsCorrect)
          .then((builtGraphData) => {
            setArticleGraphData(builtGraphData);
            setNeedsToPushToArticleHistory(true);
            setLoading(false);
          })
          .catch(() => {
            setErrored(true);
            setLoading(false);
          });
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  }, [
    guessIsCorrect,
    setNextArticleData,
    gameModeIsOn,
    setArticleGraphData, 
    setNeedsToPushToArticleHistory,
    setLoading,
    setErrored,
  ]);

  const updateGuess = useCallback((articleName) => {
    setLatestGuess(articleName);
    setNeedsToPushToArticleHistory(true);
    setOpenMenuSections([...openMenuSections, 1]);
  }, [setLatestGuess, setNeedsToPushToArticleHistory, openMenuSections, setOpenMenuSections]);

  const toggleGameMode = useCallback((val) => {
    if (val !== gameModeIsOn) {
      setGameMode(val);
    }
  }, [gameModeIsOn, setGameMode]);

  // *** useEffect ***

  // Check for correct guesses
  useEffect(() => {
    if (
      latestGuess !== '' &&
      nextArticleData.length > 0 &&
      latestGuess === nextArticleData[0]
    ) {
      setGuessIsCorrect(true)
    } else {
      setGuessIsCorrect(false)
    }
  }, [nextArticleData, latestGuess, setGuessIsCorrect]);

  // Update graph linking properties
  useEffect(() => {
    if (fg.current) {
      fg.current.d3Force('charge', forceManyBody().strength(-100))
      fg.current.d3Force('link', forceLink().distance(80));
    }
  // Suppress warning about fg (force graph reference) being a dependency; need to 
  // update it but not track every change to it
  //
  // eslint-disable-next-line
  }, [articleGraphData]);

  // Update article history if necessary
  useEffect(() => {
    if (needsToPushToArticleHistory) {
      setNeedsToPushToArticleHistory(false);
      if (isSettingNewCenter || latestGuess !== '') {
        setIsSettingNewCenter(false);
        pushToArticleHistory(isSettingNewCenter ? nextArticleData[0] : latestGuess, true);
      } else if (!gameModeIsOn) {
        pushToArticleHistory(nextArticleData[0], false);
      } else {
        pushToArticleHistory('');
      }
    }
  }, [
    isSettingNewCenter,
    setIsSettingNewCenter,
    pushToArticleHistory,
    needsToPushToArticleHistory,
    setNeedsToPushToArticleHistory,
    nextArticleData,
    latestGuess,
    gameModeIsOn
  ])

  // Retrieve article data at current URL hash path
  useEffect(() => {
    console.log('Pathname', location.pathname);
    if (!location.pathname || location.pathname === '/') {
      updateArticle('');
    } else { 
      getDataForNewArticle(location.pathname.slice(1));
    }
  }, [location.pathname, getDataForNewArticle, updateArticle]);

  // Start with random article when game mode is toggled
  useEffect(() => {
    if (gameModeIsOn) { 
      updateArticle('');
    }
  // eslint-disable-next-line
  }, [gameModeIsOn]);
                      
  // Refetch graph data if guess is correct
  useEffect(() => {
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, false, true);
    }
    if (guessIsCorrect) {
      fetchGraphData(nextArticleData)
        .then((builtGraphData) => {
          setArticleGraphData(builtGraphData);
        })
        .catch(() => {
          setErrored(true);
        });
    }
  }, [guessIsCorrect, nextArticleData, setArticleGraphData, setErrored]);

  // Show correct answer
  const showAnswer = useCallback(() => {
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, false, true);
    }
    fetchGraphData(nextArticleData)
      .then((builtGraphData) => {
        setArticleGraphData(builtGraphData);
      })
      .catch(() => {
        setErrored(true);
      });
  }, [nextArticleData, setArticleGraphData, setErrored]);

  return (
    <div className="app">
      {isLoading && 
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      }
      {isErrored &&
        <div className="error-dialog">
          <p className="text">
            Something went wrong when retrieving that data.
            Please pick a different article.
          </p>
        </div>
      }
      {guessIsCorrect &&
        <Confetti />
      }
      <Menu 
        openMenuSections={openMenuSections} 
        setOpenMenuSections={setOpenMenuSections}
        updateArticle={updateArticle} 
        nextArticleData={nextArticleData}
        articleHistory={articleHistory}
        setGameMode={toggleGameMode}
        gameModeIsOn={gameModeIsOn}
        updateGuess={updateGuess}
        showAnswer={showAnswer}
        guessIsCorrect={guessIsCorrect}
      />
      <div className="graph-container">
        <ForceGraph3D
          ref={fg}
          graphData={articleGraphData}
          showNavInfo={false}
          backgroundColor={graphBackgroundColor}
          nodeLabel={() => ''}
          linkWidth={1.2}
          linkOpacity={0.6}
          linkResolution={6}
          linkCurvature={0.15}
          linkDirectionalParticles={6}
          linkDirectionalParticleWidth={1.75}
          linkDirectionalParticleSpeed={0.0009}
          linkDirectionalParticleResolution={12}
          linkColor={() => linkColor}
          onNodeClick={(node, _) => {
            if (gameModeIsOn) {
              if (node.id === nextArticleData[0]) {
                setOpenMenuSections([...openMenuSections, 0]);
              } else {
                window.open(`${wikipediaBaseURL}${node.id}`, '_blank');
              }
            } else {
              if (node.id === nextArticleData[0]) {
                window.open(`${wikipediaBaseURL}${nextArticleData[0]}`, '_blank');
              } else {
                setIsSettingNewCenter(true);
                updateArticle(node.id);
              }
            }
          }}
          nodeThreeObject={node => {
            const textSprite = new SpriteText(`${node.name}`);
            textSprite.color = node.color || (node.id === nextArticleData[0] ? centerNodeTextColor : normalNodeTextColor);
            textSprite.backgroundColor = node.id === nextArticleData[0] ? centerNodeBackgroundColor : normalNodeBackgroundColor;
            textSprite.borderColor = node.id === nextArticleData[0] ? centerNodeBorderColor : normalNodeBorderColor;
            textSprite.fontFace = 'Georgia';
            textSprite.fontWeight = '400';
            textSprite.textHeight = 6;
            textSprite.borderWidth = 1;
            textSprite.borderRadius = 4;
            textSprite.padding = 8;
            textSprite.center.y = 1;
            const geometry = new THREE.SphereGeometry(2.5, 16, 8);
            const material = new THREE.MeshPhongMaterial({ color: linkColor });
            const sphere = new THREE.Mesh(geometry, material);
            const grouped = new THREE.Group();
            grouped.add(textSprite);
            grouped.add(sphere);
            return grouped;
          }} 
        />
      </div>
    </div>
  );
}

export default App;
