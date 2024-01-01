import { DateTime } from 'luxon';
import retry from 'async-retry';
import wtf from 'wtf_wikipedia';
import axios from 'axios';

const wikiNavBaseURL = 'https://wikinav.wmcloud.org/api/v1/en/';
const nTopLinks = 12;
const nClues = 5;
const linkColor = 'rgb(56,139,253)';

export const getArticlePreview = async (articleName, setArticlePreview) => {
  const page = await wtf.fetch(articleName);
  const image = page?.images()?.[0]?.thumbnail();
  const text = page?.sentences()?.[0]?.text();
  const name = articleName;
  if (text) {
    setArticlePreview({ name, image, text });
  }
};

const getYearAndMonthForNMonthsAgo = (n) => {
  const monthNumber = DateTime.now().minus({ months: n }).month;
  const month = monthNumber > 9 ? monthNumber.toString() : `0${monthNumber.toString()}`
  const year = DateTime.now().minus({ months: n }).year.toString();
  return { year, month };
};

const filterClues = (clueResults) => {
  return clueResults.filter((result) => 
    result.title.indexOf('other-') !== 0 && 
    result.title !== 'Main_Page'
  ).slice(0, nClues);
};

const fetchClickstreamRetry = async (articleName) => {
  const month = getYearAndMonthForNMonthsAgo(3);
  try {
    const sourceResponse = await axios.get(`${wikiNavBaseURL}${articleName}/sources/${month.year}-${month.month}?limit=${nTopLinks}`);
    const destResponse = await axios.get(`${wikiNavBaseURL}${articleName}/destinations/${month.year}-${month.month}?limit=${nTopLinks}`);
    const sourceResults = filterClues(sourceResponse.data.results);
    const destResults = filterClues(destResponse.data.results);
    return [articleName, sourceResults, destResults];
  } catch (e) {
    throw Error(e.message);
  }
};

const fetchClickstream = async (articleName, isRandom) => {
  try {
    return await retry(
      async () => fetchClickstreamRetry(articleName),
      { retries: 1 }
    );
  } catch (e) {
    if (isRandom) {
      return await pickNextArticle();
    } else {
      throw Error(e.message);
    }
  }
}

const checkForRedirects = async (title) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&redirects&format=json&formatversion=2&origin=*`;
  const response = await axios.get(url);
  const redirectTarget = response.data.query?.redirects?.[0]?.to?.replaceAll(' ', '_');
  return redirectTarget || title;
};

export const buildArticleGraphData = async (articleData, centerIsBlank, centerIsBlue) => {
  const titles = new Set();
  titles.add(articleData[0]);
  let links = [];
  let nodes = [{
    id: articleData[0],
    name: centerIsBlank 
      ? articleData[0].replaceAll('_', ' ')[0] + '_______' 
      : articleData[0].replaceAll('_', ' '),
    color: centerIsBlue ? 'rgb(56,139,253)' : '',
  }];
  articleData[1].forEach((l) => {
    links.push({ source: l.title, target: articleData[0], color: linkColor });
  });
  articleData[2].forEach((l) => {
    links.push({ source: articleData[0], target: l.title, color: linkColor });
  });
  const firstLevelLinks = [...articleData[1], ...articleData[2]];
  await Promise.all(firstLevelLinks.map(async l => {
    if (!titles.has(l.title)) {
      titles.add(l.title);
      const prettyTitle = l.title.replaceAll('_', ' ')
      nodes.push({ id: l.title, name: prettyTitle });
      const newLinks = await fetchClickstream(l.title);
      newLinks[1].forEach((l2) => {
        links.push({ source: l2.title, target: l.title, color: linkColor });
      });
      newLinks[2].forEach((l2) => {
        links.push({ source: l.title, target: l2.title, color: linkColor });
      });
      const secondLevelLinks = [...newLinks[1], ...newLinks[2]];
      secondLevelLinks.forEach(l2 => {
        if (!titles.has(l2.title)) {
          titles.add(l2.title);
          const prettyTitle2 = l2.title.replaceAll('_', ' ')
          nodes.push({ id: l2.title, name: prettyTitle2 });
        }
      });
    }
  }));
  nodes.forEach((n) => {
    const e = links.filter((e) => e.source === n.id || e.target === n.id);
    if (e.length < 2) {
      links = links.filter((e) => e.source !== n.id && e.target !== n.id);
      nodes = nodes.filter((n2) => n2.id !== n.id);
    }
  });
  return { nodes, links };
};

const categories = [
  "People",
  "History",
  "Geography",
  "Arts",
  "Philosophy_and_religion",
  "Everyday_life",
  "Society_and_social sciences",
  "Biological_and_health_sciences",
  "Physical_sciences",
  "Technology",
  "Mathematics"
];
const nsfwTerms = [
  'sex',
  'condom',
  'erotic',
  'foreplay',
  'bdsm',
  'incest',
  'masturb',
  'orgasm',
  'orgy',
  'promisc',
  'prostitut',
  'age of consent',
  'virgin',
  'porn',
  'clitoris',
  'ovary',
  'penis',
  'testicle',
  'uterus',
  'vagina',
  'reproduction',
  'chlamydia',
  'gonorrhea',
  'herpes',
  'hiv/aids',
  'syphilis',
  'rape',
];

export const pickNextArticle = async (title) => {
  if (title) {
    const finalTitle = await checkForRedirects(title);
    return await fetchClickstream(finalTitle);
  } else {
    let allArticles = [];
    await Promise.all(categories.map(async (category) => {
      const url = 'https://en.wikipedia.org/wiki/Wikipedia:Vital_articles/Level/4/' + category;
      const categoryPage = await wtf.fetch(url);
      let links = categoryPage.links();
      links = links.filter(l => {
        return l.data.type === 'internal' && 
          l.data.page !== '' &&
          !nsfwTerms.some((term) => l.data.page.toLowerCase().includes(term)) &&
          !l.data.page.includes('Special') &&
          !l.data.page.includes('User') && 
          !l.data.page.includes('Wikipedia talk');
      });
      allArticles = [...allArticles, ...links];
    }));
    const randomIndex = Math.floor(Math.random() * allArticles.length);
    const randomArticleTitle = allArticles[randomIndex].data.page.replaceAll(' ', '_');
    return await fetchClickstream(randomArticleTitle, true);
  }
};