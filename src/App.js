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
  const [currentArticleName, setCurrentArticleName] = useState('');
  const [currentArticleData, setCurrentArticleData] = useState([]);
  const [articleHistory, setArticleHistory] = useState([]);
  const [articleGraphData, setArticleGraphData] = useState({ nodes: [], links: [] });
  const [openMenuSections, setOpenMenuSections] = useState([]);

  const [gameModeIsOn, setGameMode] = useState(false);
  const [guessIsCorrect, setGuessIsCorrect] = useState(false);
  const [latestGuess, setLatestGuess] = useState('');

  const [isLoading, setLoading] = useState(false);
  const [isErrored, setErrored] = useState(false);

  const fg = createRef();
  const location = useLocation();
  const navigate = useNavigate();

  // *** useCallback functions ***

  const fetchArticle = async (title) => {
    return await pickNextArticle(title);
  }

  const pushToArticleHistory = useCallback((articleTitle) => {
    if (!articleTitle) {
      setArticleHistory([]);
    } else {
      setArticleHistory([...articleHistory, articleTitle]);
    }
  }, [setArticleHistory, articleHistory]);

  const updateGuess = useCallback((articleName) => {
    setLatestGuess(articleName);
    pushToArticleHistory(articleName);
    setOpenMenuSections([...openMenuSections, 1]);
  // eslint-disable-next-line
  }, [setLatestGuess, openMenuSections, setOpenMenuSections]);

  const toggleGameMode = useCallback((val) => {
    if (val !== gameModeIsOn) {
      setGameMode(val);
    }
  }, [gameModeIsOn, setGameMode]);

  const showAnswer = useCallback(() => {
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, false, true);
    }
    fetchGraphData(currentArticleData)
      .then((builtGraphData) => {
        setArticleGraphData(builtGraphData);
      })
      .catch(() => {
        setErrored(true);
      });
  }, [currentArticleData, setArticleGraphData, setErrored]);

  const setNewArticleData = useCallback((articleData) => {
    const fetchGraphData = async (graphData, gameModeOn, guessCorrect) => {
      return await buildArticleGraphData(graphData, gameModeOn, guessCorrect);
    }
    setCurrentArticleData(articleData);
    fetchGraphData(articleData, gameModeIsOn, guessIsCorrect)
      .then((builtGraphData) => {
        setArticleGraphData(builtGraphData);
        setLoading(false);
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  // eslint-disable-next-line
  }, [
    setCurrentArticleData,
    gameModeIsOn,
    guessIsCorrect,
    setArticleGraphData,
    setLoading,
    setErrored,
  ]);

  // Fetch random article on page open or game mode toggle
  const getRandomArticle = useCallback(() => {
    setGuessIsCorrect(false);
    setLatestGuess('');
    setErrored(false);
    setLoading(true);
    fetchArticle()
      .then((articleData) => {
        if (gameModeIsOn) {
          pushToArticleHistory('');
          setCurrentArticleName(articleData[0]);
          setNewArticleData(articleData);
        } else {
          // Show URL navigation in casual mode
          pushToArticleHistory(articleData[0]);
          navigate(articleData[0]);
        }
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  // eslint-disable-next-line
  }, [
    setGuessIsCorrect,
    setLatestGuess,
    setErrored,
    setLoading,
    gameModeIsOn,
    setNewArticleData,
    navigate,
  ]);

  const getDataForNewArticle = useCallback((articleTitle) => {
    fetchArticle(articleTitle)
      .then((articleData) => {
        setNewArticleData(articleData);
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  // eslint-disable-next-line
  }, [
    setNewArticleData,
    setLoading,
    setErrored,
  ]);

  // *** useEffect hooks ***

  // Retrieve article data at current URL hash path
  useEffect(() => {
    if (!currentArticleName && location.pathname) {
      if (location.pathname === '/') {
        getRandomArticle();
      } else {
        console.log('setting path name as article name');
        setCurrentArticleName(location.pathname.slice(1));
      }
    }
  }, [location.pathname, currentArticleName, getRandomArticle, setCurrentArticleName]);

  useEffect(() => {
    if (currentArticleName) {
      console.log('article name set, getting data');
      getDataForNewArticle(currentArticleName);
    }
  }, [currentArticleName, getDataForNewArticle]);

  // Fetch new article on game mode toggle
  // useEffect(() => {
  //   if (gameModeIsOn !== undefined && currentArticleName !== '') {
  //     setCurrentArticleData([]);
  //     setCurrentArticleName('');
  //     navigate('');
  //   }
  // // eslint-disable-next-line
  // }, [gameModeIsOn, currentArticleName, setCurrentArticleData, setCurrentArticleName]);

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

  // Check for correct guesses
  useEffect(() => {
    if (
      latestGuess !== '' &&
      currentArticleName !== '' &&
      latestGuess === currentArticleName
    ) {
      setGuessIsCorrect(true);
    }
  }, [currentArticleName, latestGuess, setGuessIsCorrect]);
                      
  // Refetch graph data if guess is correct
  useEffect(() => {
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, false, true);
    }
    if (guessIsCorrect) {
      fetchGraphData(currentArticleData)
        .then((builtGraphData) => {
          setArticleGraphData(builtGraphData);
        })
        .catch(() => {
          setErrored(true);
        });
    }
  }, [guessIsCorrect, currentArticleData, setArticleGraphData, setErrored]);

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
        currentArticleName={currentArticleName}
        articleHistory={articleHistory}
        setGameMode={toggleGameMode}
        gameModeIsOn={gameModeIsOn}
        updateGuess={updateGuess}
        showAnswer={showAnswer}
        guessIsCorrect={guessIsCorrect}
        pushToArticleHistory={pushToArticleHistory}
        setCurrentArticleData={setCurrentArticleData}
        setCurrentArticleName={setCurrentArticleName}
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
              if (node.id === currentArticleName) {
                setOpenMenuSections([...openMenuSections, 0]);
              } else {
                window.open(`${wikipediaBaseURL}${node.id}`, '_blank');
              }
            } else {
              if (node.id === currentArticleName) {
                window.open(`${wikipediaBaseURL}${currentArticleName}`, '_blank');
              } else {
                pushToArticleHistory(node.id);
                setCurrentArticleData([]);
                setCurrentArticleName('');
                navigate(node.id);
              }
            }
          }}
          nodeThreeObject={node => {
            const textSprite = new SpriteText(`${node.name}`);
            textSprite.color = node.color || (node.id === currentArticleName ? centerNodeTextColor : normalNodeTextColor);
            textSprite.backgroundColor = node.id === currentArticleName ? centerNodeBackgroundColor : normalNodeBackgroundColor;
            textSprite.borderColor = node.id === currentArticleName ? centerNodeBorderColor : normalNodeBorderColor;
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
