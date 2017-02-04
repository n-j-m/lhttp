const level = require('level');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const JSONStream = require('JSONStream');


module.exports = lhttp;


function getOpts (opts) {
  if (opts.limit) {
    opts.limit = Number(opts.limit);
  }
  return opts;
}

function lhttp (db, meta) {
  if (typeof db === 'string') {
    db = level(db);
  }

  const app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(morgan('dev'));


  app.get('/', (req, res) => res.redirect('meta'));


  app.get('/meta', (req, res) => res.json(meta));


  app.get('/data/:key', (req, res, next) => {
    db.get(req.params['key'], req.query, (err, value) => {
      if (err && err.name === 'NotFoundError') {
        res.status(404);
      }
      if (err) {
        return next(err);
      }
      res.json(value);
    });
  });


  app.post('/data/:key', (req, res, next) => {
    var chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      let body = chunks.join('');
      if (req.query.encoding === 'json' || req.query.valueEncoding === 'json') {
        body = JSON.parse(body);
      }
      db.put(req.params['key'], body, req.query, (err) => {
        if (err) return next(err);
        res.send('ok');
      });
    });

    db.put(req.params['key'], req.body, req.query, (err) => {
      if (err) return next(err);
      res.status(201).json(req.body);
    });
  });


  app.delete('/data/:key', (req, res, next) => {
    db.del(req.params['key'], req.query, (err) => {
      if (err) return next(err);
      res.send(204);
    });
  });


  app.get('/approximateSize/:from..:to', (req, res, next) => {
    db.approximateSize(req.params['from'], req.params['to'], (err, size) => {
      if (err) return next(err);
      res.json(size);
    });
  });

  app.get('/data', (req, res) => {
    const opts = getOpts(req.query);

    res.type('json');
    db.readStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.get('/rangs/:from..:to', (req, res) => {
    const opts = getOpts(req.query);
    opts.start = req.params['from'];
    opts.end = req.params['to'];

    res.type('json');
    db.createReadStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.get('/keys/:from..:to', (req, res) => {
    const opts = getOpts(req.query);
    opts.start = req.params['from'];
    opts.end = req.params['to'];

    res.type('json');
    db.createKeyStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.get('/keys', (req, res) => {
    const opts = getOpts(req.query);

    res.type('json');
    db.createKeyStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.get('/values/:from..:to', (req, res) => {
    const opts = getOpts(req.query);
    opts.start = req.params['from'];
    opts.end = req.params['to'];

    res.type('json');
    db.createValueStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.get('/values', (req, res) => {
    const opts = getOpts(req.query);

    res.type('json');
    db.createValueStream(opts)
      .pipe(JSONStream.stringify())
      .pipe(res);
  });


  app.post('/data', (req, res, next) => {
    const ops = [];

    db.batch(req.body, req.query, (err) => {
      if (err) return next(err);
      res.sendStatus(201);
    });
  });


  app.db = db;
  app.meta = meta;

  return app;
}