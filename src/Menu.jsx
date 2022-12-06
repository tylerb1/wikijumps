import { useCallback } from 'react';
import { FaWikipediaW, FaHistory, FaInfo } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { IconContext } from 'react-icons';
import { ArticleSearch } from './ArticleSearch';

const iconColor = '#c9d1d9';
const menuIconSize = '0.75em';
const closeIconSize = '1.25em';

export const Menu = ({ 
  openMenuSections, 
  setOpenMenuSections, 
  updateArticle, 
  nextArticleData, 
  articleHistory 
}) => {
  const openMenuSection = useCallback((index) => {
    if (!openMenuSections.includes(index)) {
      setOpenMenuSections([...openMenuSections, index]);
    }
  }, [openMenuSections, setOpenMenuSections]);

  const closeMenuSection = useCallback((index) => {
    if (openMenuSections.includes(index)) {
      setOpenMenuSections(openMenuSections.filter((i) => i !== index));
    }
  }, [openMenuSections, setOpenMenuSections]);

  return (
    <div className="menu">
      <div
        className={'menu-section' + (openMenuSections.includes(0) ? '-is-open' : '')}
        onClick={() => openMenuSection(0)}
      >
        {openMenuSections.includes(0) 
          ? <>
              <div className="close-icon-container" onClick={() => closeMenuSection(0)}>
                <IconContext.Provider value={{ color: iconColor, size: closeIconSize }}>
                  <div><IoClose /></div>
                </IconContext.Provider>
              </div>
              <ArticleSearch
                updateArticle={updateArticle}
                chosenArticleTitle={nextArticleData[0] || ''}
              />
              <button
                className="control-button"
                onClick={() => updateArticle('')}
              >
                Random article
              </button>
            </>
          : <IconContext.Provider value={{ color: iconColor, size: menuIconSize }}>
              <div><FaWikipediaW /></div>
            </IconContext.Provider>
        }
      </div>

      <div
        className={'menu-section' + (openMenuSections.includes(1) ? '-is-open' : '')}
        onClick={() => openMenuSection(1)}
      >
        {openMenuSections.includes(1)
          ? <>
              <div className="close-icon-container" onClick={() => closeMenuSection(1)}>
                <IconContext.Provider value={{ color: iconColor, size: closeIconSize }}>
                  <div><IoClose /></div>
                </IconContext.Provider>
              </div>
              <p className="text history">Article history:</p>
              {articleHistory.map((a, index) => {
                return (
                  <p className='history-card' key={`${a}-${index}`}>{a.replaceAll("_", " ")}</p>
                );
              })}
            </>
          : <IconContext.Provider value={{ color: iconColor, size: menuIconSize }}>
              <div><FaHistory /></div>
            </IconContext.Provider>
        }
      </div>

      <div
        className={'menu-section' + (openMenuSections.includes(2) ? '-is-open' : '')}
        onClick={() => openMenuSection(2)}
      >
        {openMenuSections.includes(2)
          ? <>
              <div className="close-icon-container" onClick={() => closeMenuSection(2)}>
                <IconContext.Provider value={{ color: iconColor, size: closeIconSize }}>
                  <div><IoClose /></div>
                </IconContext.Provider>
              </div>
              <p className="text">
                <b>Controls</b><br /><br />
                Drag to rotate<br />
                Pinch or scroll to zoom<br />
                Click center article to visit it<br />
                Click other articles to center them<br /><br />

                <b>What everything means</b><br /><br />
                Two articles being connected means<br />
                people frequently go from one to the<br />
                other when browsing Wikipedia (and the<br />
                moving particles tell you which direction).<br />
                This data comes from 
                <a 
                  href='https://wikinav.toolforge.org/' 
                  target='_blank' 
                  rel="noreferrer"
                  style={{ color: 'rgb(56,139,253)', textDecoration: 'none' }}>
                  WikiNav
                </a>.
              </p>
            </>
          : <IconContext.Provider value={{ color: iconColor, size: menuIconSize }}>
              <div><FaInfo /></div>
            </IconContext.Provider>
        }
      </div>
    </div>
  );
};
