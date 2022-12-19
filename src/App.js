import { useState, useCallback, useEffect, createRef } from 'react';
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
  const [isLoading, setLoading] = useState(false);
  const [isErrored, setErrored] = useState(false);
  const [guessIsCorrect, setGuessIsCorrect] = useState(false);
  const fg = createRef();

  const updateArticle = useCallback((title, shouldContinueHistory, centerIsBlank, centerIsBlue, isNewGame) => {
    if (isNewGame) {
      setGuessIsCorrect(false);
    }
    const fetchArticle = async () => {
      return await pickNextArticle(title);
    }
    const fetchGraphData = async (graphData) => {
      return await buildArticleGraphData(graphData, centerIsBlank, centerIsBlue);
    }
    setErrored(false);
    setLoading(true);
    fetchArticle()
      .then((articleData) => {
        setNextArticleData(articleData);
        if (shouldContinueHistory) {
          setArticleHistory([...articleHistory, articleData[0]]);
        } else if (!centerIsBlank) {
          setArticleHistory([articleData[0]]);
        } else {
          setArticleHistory([]);
        }
        fetchGraphData(articleData)
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
  }, [
    articleHistory,
    setArticleGraphData, 
    setArticleHistory, 
    setNextArticleData
  ]);

  const updateGuess = useCallback((articleName) => {
    setArticleHistory([...articleHistory, articleName]);
    setOpenMenuSections([...openMenuSections, 1]);
  }, [articleHistory, setArticleHistory, openMenuSections, setOpenMenuSections]);

  // Initialize with random article on first render
  useEffect(() => {
    if (!nextArticleData.length) {
      updateArticle('');
    }
  }, [nextArticleData, updateArticle]);

  useEffect(() => {
    if (fg.current) {
      fg.current.d3Force('charge', forceManyBody().strength(-100))
      fg.current.d3Force('link', forceLink().distance(80));
    }
  // Suppress warning about fg (force graph reference) being a dependency; need to 
  // update it but not track every change to it
  // eslint-disable-next-line
  }, [articleGraphData]);

  // Update article if toggling game mode
  const toggleGameMode = useCallback((val) => {
    if (val !== gameModeIsOn) {
      setArticleHistory([]);
      setGameMode(val);
      updateArticle('', false, val);
    }
  }, [gameModeIsOn, setGameMode, updateArticle, setArticleHistory]);

  useEffect(() => {
    if (
      articleHistory.length > 0 && 
      nextArticleData.length > 0 &&
      gameModeIsOn && 
      articleHistory[articleHistory.length - 1] === nextArticleData[0]
    ) {
      setGuessIsCorrect(true)
    } else {
      setGuessIsCorrect(false)
    }
  }, [articleHistory, nextArticleData, gameModeIsOn]);

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
                updateArticle(node.id, true);
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
