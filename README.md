<img width="444" alt="Screenshot 2022-12-06 at 10 57 46 AM" src="https://user-images.githubusercontent.com/16053305/206032613-ed67b49c-cb44-46df-b444-3a7b5777e0e5.png">

[Live demo](https://www.wikijumps.com)

If you like this project, consider sponsoring it and/or donating on my [Ko-fi page](https://ko-fi.com/tylerb1).

## What it is

For any Wikipedia article, Wikijumps shows a 3D graph of that article’s most popular (frequently clicked) links to other articles, and some of their highly-related nearby neighbors. 

More specifically, two articles being linked means that Wikipedia users frequently travel between them, in whichever direction(s) the little blue particles are going. Data for this comes from [WikiNav](wikinav.toolforge.org).

You can specify an article, have a random(ish) article picked, and view your recent article-viewing history.

## How to use it

- Pinch or scroll to zoom
- Drag to rotate
- Click center article to visit it on Wikipedia
- Click a non-center article to make it the center article

## How to run it locally

- Pull the code
- `cd` into its folder
- Run `npm install`
- Run `npm start`

## Ideas for additions

### UI + UX
- Hover state (and/or article preview) over text labels
- Make recent article history interactive, allow branching
- Make labels “move out of the way” of links better, e.g. update position of labels on each animation frame in way that geometrically minimizes intersections with link paths
- Represent strength of article connections with directional particles (e.g. width, speed)
- Let user specify how many top connections from central article should be shown at a time
- Links touch one side of node if sources, other side if targets
- Menu CSS animations

### General
- Add ability to save browsing history long-term
- Add additional game difficulties or modes, e.g. players have to find path from article A to article B
- Add real-time functionality, e.g. user chat, collaboration
- Accessibility & internationalization
- Expose an API/npm library

### Data Science 
- Automatic pathfinding from article A to B based on semantic similarity between articles

## Acknowledgements

Huge thanks to:
- Wikipedia
- Wikinav
- React
- d3
- Three
- @vasturiano (react-force-graph, d3-force-3d, three-spritetext)
- wtf_wikipedia
- axios
- luxon
- async-retry
- react-select
- react-icons
