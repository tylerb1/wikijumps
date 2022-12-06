import { DateTime } from 'luxon';
import retry from 'async-retry';
import wtf from 'wtf_wikipedia';
import axios from 'axios';

const wikiNavBaseURL = 'https://wikinav.wmcloud.org/api/v1/en/';
const nTopLinks = 12;
const nClues = 5;
const linkColor = 'rgb(56,139,253)';

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
  const month = getYearAndMonthForNMonthsAgo(2);
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

const fetchClickstream = async (articleName) => {
  return await retry(
    async () => fetchClickstreamRetry(articleName),
    { retries: 3 }
  );
}

const checkForRedirects = async (title) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&redirects&format=json&formatversion=2&origin=*`;
  const response = await axios.get(url);
  const redirectTarget = response.data.query?.redirects?.[0]?.to?.replaceAll(' ', '_');
  return redirectTarget || title;
};

export const buildArticleGraphData = async (articleData) => {
  const titles = new Set();
  titles.add(articleData[0]);
  let links = [];
  let nodes = [{
    id: articleData[0],
    name: articleData[0].replaceAll('_', ' ')
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

export const pickNextArticle = async (title) => {
  if (title) {
    const finalTitle = await checkForRedirects(title);
    return await fetchClickstream(finalTitle);
  } else {
    let vitalArticles = await wtf.fetch('https://en.wikipedia.org/wiki/Wikipedia:Vital_articles/Level/2')
    const links = vitalArticles
      .links()
      .filter(l => 
        l.data.type === 'internal' && 
        !l.data.page.includes('User') && 
        !l.data.page.includes('Wikipedia talk')
      );
    // Pick random article on Vital Articles page to get links for
    const randomIndex = Math.floor(Math.random() * links.length);
    const randomArticleTitle = links[randomIndex].data.page.replaceAll(' ', '_');
    const randomArticleLinks = await fetchClickstream(randomArticleTitle);
    const allRandomArticleLinks = [...randomArticleLinks[1], ...randomArticleLinks[2]];

    // Pick random link from the chosen Vital Article so that the "random" 
    // article is a little more random
    const randIndex = Math.floor(Math.random() * allRandomArticleLinks.length);
    const randArticleTitle = allRandomArticleLinks[randIndex].title;
    return await fetchClickstream(randArticleTitle);
  }
};