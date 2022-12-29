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
  const [currentArticleData, setCurrentArticleData] = useState([]);
  const [articleHistory, setArticleHistory] = useState([]);
  const [articleGraphData, setArticleGraphData] = useState({ nodes: [], links: [] });
  const [openMenuSections, setOpenMenuSections] = useState([]);

  const [gameModeIsOn, setGameMode] = useState(false);
  const [guessIsCorrect, setGuessIsCorrect] = useState(false);

  const [latestGuess, setLatestGuess] = useState('');
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

  const updateArticle = useCallback((articleName) => {
    if (articleName) {
      navigate(articleName);
    } else {
      setShouldUpdateArticle(true);
    }
  }, [navigate, setShouldUpdateArticle]);

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
      return await buildArticleGraphData(graphData, gameModeOn, guessCorrect);
    }
    fetchArticle(articleTitle)
      .then((articleData) => {
        setCurrentArticleData(articleData);
        if (!gameModeIsOn) {
          pushToArticleHistory(articleData[0], false);
        }
        fetchGraphData(articleData, gameModeIsOn, guessIsCorrect)
          .then((builtGraphData) => {
            setArticleGraphData(builtGraphData);
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
  // eslint-disable-next-line
  }, [
    guessIsCorrect,
    setCurrentArticleData,
    gameModeIsOn,
    setArticleGraphData, 
    setLoading,
    setErrored,
  ]);

  const updateGuess = useCallback((articleName) => {
    setLatestGuess(articleName);
    pushToArticleHistory(articleName, true);
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

  // *** useEffect ***

  // Check for correct guesses
  useEffect(() => {
    if (
      latestGuess !== '' &&
      currentArticleData.length > 0 &&
      latestGuess === currentArticleData[0]
    ) {
      setGuessIsCorrect(true);
    }
  }, [currentArticleData, latestGuess, setGuessIsCorrect]);

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

  // Retrieve article data at current URL hash path
  useEffect(() => {
    if (!location.pathname || location.pathname === '/') {
      setShouldUpdateArticle(true);
    } else { 
      getDataForNewArticle(location.pathname.slice(1));
    }
  }, [location.pathname, getDataForNewArticle]);
                      
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

  // Fetch random article if we need to
  useEffect(() => {
    if (shouldUpdateArticle === true) {
      setShouldUpdateArticle(false);
      setGuessIsCorrect(false);
      setLatestGuess('');
      setErrored(false);
      setLoading(true);
      fetchArticle()
        .then((articleData) => {
          if (!gameModeIsOn) {
            pushToArticleHistory(articleData[0], false);
          }
          navigate(articleData[0]);
        })
        .catch(() => {
          setErrored(true);
          setLoading(false);
        });
    }
  // eslint-disable-next-line
  }, [
    shouldUpdateArticle,
    setShouldUpdateArticle,
    currentArticleData,
    gameModeIsOn,
    setErrored,
    setLoading,
    navigate,
    setGuessIsCorrect,
    setLatestGuess
  ]);

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
        currentArticleData={currentArticleData}
        articleHistory={articleHistory}
        setGameMode={toggleGameMode}
        gameModeIsOn={gameModeIsOn}
        updateGuess={updateGuess}
        showAnswer={showAnswer}
        guessIsCorrect={guessIsCorrect}
        setShouldUpdateArticle={setShouldUpdateArticle}
        pushToArticleHistory={pushToArticleHistory}
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
              if (node.id === currentArticleData[0]) {
                setOpenMenuSections([...openMenuSections, 0]);
              } else {
                window.open(`${wikipediaBaseURL}${node.id}`, '_blank');
              }
            } else {
              if (node.id === currentArticleData[0]) {
                window.open(`${wikipediaBaseURL}${currentArticleData[0]}`, '_blank');
              } else {
                setShouldUpdateArticle(false);
                pushToArticleHistory(node.id, true);
                setErrored(false);
                setLoading(true);
                updateArticle(node.id);
              }
            }
          }}
          nodeThreeObject={node => {
            const textSprite = new SpriteText(`${node.name}`);
            textSprite.color = node.color || (node.id === currentArticleData[0] ? centerNodeTextColor : normalNodeTextColor);
            textSprite.backgroundColor = node.id === currentArticleData[0] ? centerNodeBackgroundColor : normalNodeBackgroundColor;
            textSprite.borderColor = node.id === currentArticleData[0] ? centerNodeBorderColor : normalNodeBorderColor;
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
