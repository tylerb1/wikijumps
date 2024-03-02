import { useState, useCallback, useEffect, createRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { forceLink, forceManyBody } from 'd3-force-3d';
import SpriteText from 'three-spritetext';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { IoClose } from 'react-icons/io5';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { IconContext } from 'react-icons';
import Confetti from 'react-confetti';
import './App.css';
import { Menu } from './Menu';
import { 
  getArticlePreview,
  pickNextArticle,
  buildArticleGraphData,
} from './articleData'

const wikipediaBaseURL = 'https://en.wikipedia.org/wiki/';
const graphBackgroundColor = '#0d1117';
const linkColor = 'rgb(56,139,253)';
const centerNodeTextColor = '#c9d1d9';
const centerNodeBorderColor = '#8b949e';
const centerNodeBackgroundColor = '#30363d';
const normalNodeBackgroundColor = '#161b22';
const normalNodeTextColor = '#8b949e';
const normalNodeBorderColor = 'rgba(240,246,252,0.1)';
const iconColor = '#c9d1d9';
const closeIconSize = '1.4em';

function App() {
  const [currentArticleName, setCurrentArticleName] = useState('');
  const [currentArticleData, setCurrentArticleData] = useState([]);
  const [articleHistory, setArticleHistory] = useState([]);
  const [articleGraphData, setArticleGraphData] = useState({ nodes: [], links: [] });
  const [openMenuSections, setOpenMenuSections] = useState([]);
  const [articlePreview, setArticlePreview] = useState({});

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

  const updateGuess = useCallback((articleName) => {
    setLatestGuess(articleName);
    setOpenMenuSections([...openMenuSections, 1]);
  }, [setLatestGuess, openMenuSections, setOpenMenuSections]);

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

  const setNamedArticleData = useCallback((articleData) => {
    const fetchGraphData = async (graphData, gameModeOn, guessCorrect) => {
      return await buildArticleGraphData(graphData, gameModeOn, guessCorrect);
    }
    fetchGraphData(articleData, gameModeIsOn, guessIsCorrect)
      .then((builtGraphData) => {
        setArticleGraphData(builtGraphData);
        setCurrentArticleData(articleData);
        setLoading(false);
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  }, [
    setCurrentArticleData,
    gameModeIsOn,
    guessIsCorrect,
    setArticleGraphData,
    setLoading,
    setErrored,
  ]);

  const getDataForNamedArticle = useCallback((articleTitle) => {
    fetchArticle(articleTitle)
      .then((articleData) => {
        setNamedArticleData(articleData);
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  }, [
    setNamedArticleData,
    setLoading,
    setErrored,
  ]);

  const getRandomArticle = useCallback(() => {
    setLoading(true);
    setArticleHistory([]);
    setArticlePreview({});
    fetchArticle()
      .then((articleData) => {
        setGuessIsCorrect(false);
        setLatestGuess('');
        if (gameModeIsOn) {
          setCurrentArticleName(articleData[0]);
        } else {
          navigate(articleData[0]);
        }
      })
      .catch(() => {
        setErrored(true);
        setLoading(false);
      });
  // eslint-disable-next-line
  }, [
    setArticleHistory,
    gameModeIsOn,
    setGuessIsCorrect,
    setLatestGuess,
    setErrored,
    setLoading,
    setCurrentArticleName,
  ]);

  const toggleGameMode = useCallback((val) => {
    setGameMode(val);
  }, [setGameMode]);

  // *** useEffect hooks ***

  // Retrieve article name when landing on page
  useEffect(() => {
    setErrored(false);
    setLoading(true);
    if (location.pathname === '/') {
      getRandomArticle();
    } else {
      setCurrentArticleName(decodeURI(location.pathname).slice(1));
    }
  // eslint-disable-next-line
  }, [
    location.pathname,
    setCurrentArticleName,
    setGuessIsCorrect,
    setLatestGuess,
    setErrored,
    setLoading,
  ]);

  // Fetch article data when new article name is available
  useEffect(() => {
    if (currentArticleName) {
      if (!gameModeIsOn) {
        setArticleHistory([...articleHistory, currentArticleName]);
      }
      getDataForNamedArticle(currentArticleName);
    }
  // eslint-disable-next-line
  }, [currentArticleName]);

  // Get new article when game mode toggled
  useEffect(() => {
    // Check to ensure toggle came from user, not initialization
    if (currentArticleData.length) {
      setCurrentArticleData([]);
      if (gameModeIsOn) {
        setCurrentArticleName('');
        navigate('');
      } else {
        getRandomArticle();
      }
    }
  // eslint-disable-next-line
  }, [
    setCurrentArticleData,
    gameModeIsOn,
    getRandomArticle,
    setCurrentArticleName,
  ]);

  // Add to guesses list when guess submitted
  useEffect(() => {
    if (latestGuess && gameModeIsOn) {
      setArticleHistory([...articleHistory, latestGuess]);
    }
  // eslint-disable-next-line
  }, [latestGuess, gameModeIsOn]);

  // Update graph linking properties
  useEffect(() => {
    if (fg.current) {
      fg.current.d3Force('charge', forceManyBody().strength(-100))
      fg.current.d3Force('link', forceLink().distance(80));
    }
  // eslint-disable-next-line
  }, [articleGraphData]);

  // Check for correct guess in game mode
  useEffect(() => {
    if (
      latestGuess !== '' &&
      currentArticleName !== '' &&
      latestGuess === currentArticleName
    ) {
      setGuessIsCorrect(true);
    }
  // eslint-disable-next-line
  }, [
    currentArticleName,
    latestGuess,
    setGuessIsCorrect,
  ]);
                      
  // Refetch graph data if guess is correct
  useEffect(() => {
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, false, true);
    }
    if (guessIsCorrect && gameModeIsOn) {
      fetchGraphData(currentArticleData)
        .then((builtGraphData) => {
          setArticleGraphData(builtGraphData);
        })
        .catch(() => {
          setErrored(true);
        });
    }
  // eslint-disable-next-line
  }, [
    guessIsCorrect,
    currentArticleData,
    setArticleGraphData,
    setErrored,
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
      {articlePreview.text &&
        <div className="preview-modal">
          <div 
            className="close-icon-container" 
            onClick={() => setArticlePreview({})}>
            <IconContext.Provider value={{ color: iconColor, size: closeIconSize }}>
              <div><IoClose /></div>
            </IconContext.Provider>
          </div>
          {articlePreview.image &&
            <img 
              className="image-preview" 
              src={articlePreview.image}
              alt={`Wikipedia thumbnail for ${articlePreview.name}`}
            />
          }
          <p style={{ margin: 0, fontSize: 14 }}>
            {articlePreview.text}
          </p>
          <div 
            className="article-preview-link" 
            onClick={() => window.open(`${wikipediaBaseURL}${articlePreview.name}`, '_blank')}
          >
            <IconContext.Provider value={{ color: linkColor, size: closeIconSize }}>
              <div><HiOutlineExternalLink /></div>
            </IconContext.Provider>
          </div>
        </div>
      }
      {currentArticleName && 
        <iframe 
          className="article-preview-iframe"
          width={'30%'} 
          height={'50%'} 
          title={currentArticleName} 
          src={`${wikipediaBaseURL}${currentArticleName}`}
        />
      }
      <Menu 
        openMenuSections={openMenuSections} 
        setOpenMenuSections={setOpenMenuSections}
        currentArticleName={currentArticleName}
        articleHistory={articleHistory}
        toggleGameMode={toggleGameMode}
        gameModeIsOn={gameModeIsOn}
        updateGuess={updateGuess}
        showAnswer={showAnswer}
        guessIsCorrect={guessIsCorrect}
        getRandomArticle={getRandomArticle}
        setArticleHistory={setArticleHistory}
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
                getArticlePreview(node.id, setArticlePreview);
              }
            } else {
              if (node.id === currentArticleName) {
                getArticlePreview(node.id, setArticlePreview);
              } else {
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
