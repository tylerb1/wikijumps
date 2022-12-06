import Select from 'react-select/async';

export const ArticleSearch = ({ updateArticle, chosenArticleTitle }) => {
  const loadOptions = (value) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=prefixsearch&format=json&pssearch=${value}&origin=*`;
    return fetch(url)
      .then((response) => response.json())
      .then(data => data?.query?.prefixsearch);
  };

  return (
    <div className="go-to-article-container">
      <p className="text">Go to article:</p>
      <Select
        cacheOptions
        value={{ title: chosenArticleTitle.replaceAll('_', ' ') || ' ' }}
        getOptionLabel={(option) => option.title}
        getOptionValue={(option) => option.title.replaceAll(' ', '_')}
        loadOptions={loadOptions}
        onChange={(option) => updateArticle(option.title.replaceAll(' ', '_'))}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null,
        }}
        maxMenuHeight={400}
        menuPlacement='auto'
        menuPosition='fixed'
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              width: '180px',
              marginRight: '16px',
              fontFamily: 'Georgia'
            })
          }}
      />
    </div>
  );
};
