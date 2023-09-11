const express = require('express');
const { postgraphile } = require('postgraphile');
const cors = require('cors')
const assert = require('assert');

if (process.env.ENV === 'prod') {
  const pg = require('pg')
  pg.defaults.ssl = true;
} else {
  require('dotenv').config();
}

const app = express();
app.use(cors());

function authentication(req, res, next) {
  try {
    const bearerHeader = req.headers['authorization'];
    const token = bearerHeader.split(' ')[1];
    assert.strictEqual(token, process.env.AUTH_TOKEN);
    next();
  } catch (err) {
    console.log('err:', err);
    res.sendStatus(403);
  }
}

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/graphql', authentication);

app.use(
  postgraphile(process.env.DATABASE_URL, 'public', {
    dynamicJson: true,
    watchPg: process.env.ENV === 'dev',
    subscriptions: false,
    live: false,
    graphiql: process.env.ENV === 'dev',
    disableQueryLog: process.env.ENV !== 'dev',
    enhanceGraphiql: process.env.ENV === 'dev',
    allowExplain: (req) => { return process.env.ENV === 'dev'; },
    enableQueryBatching: true,
    exportGqlSchemaPath: process.env.ENV === 'dev' ? 'schema.graphql' : null,
    showErrorStack: process.env.ENV === 'dev' ? 'json' : false,
    bodySizeLimit: '5MB',
    extendedErrors:
      process.env.ENV === 'dev' ? ['hint', 'detail', 'errcode'] : ['errcode'],
    graphileBuildOptions: {
      orderByNullsLast: true,
      connectionFilterRelations: true,
      connectionFilterComputedColumns: true,
      connectionFilterSetofFunctions: true
    },
    skipPlugins: [require('graphile-build').NodePlugin],
    appendPlugins: [
      require('@graphile-contrib/pg-simplify-inflector'),
      require('postgraphile-plugin-connection-filter'),
      require('@spacefill/postgraphile-plugin-unaccented-text-search-filter').default,
      require('@graphile-contrib/pg-order-by-related'),
      require('./pg-aggregates').default,
      require('postgraphile-plugin-many-create-update-delete').default
    ]
  })
);

app.listen(process.env.PORT);
