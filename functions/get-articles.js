var faunadb = require('faunadb');

exports.handler = async function (event, context) {
  var q = faunadb.query;
  var client = new faunadb.Client({ secret: process.env.FAUNA_SECRET });  
  return client.query(
    q.Paginate(q.Collections())
  )
  .then((ret) => {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: ret }),
      headers: {
        "access-control-allow-origin": "https://namethatpage.netlify.app",
        //"access-control-allow-origin": "http://localhost:8888/",
      },
    };
  })
  .catch((err) => console.error(
    'Error: [%s] %s: %s',
    err.name,
    err.message,
    err.errors()[0].description,
  ))
}