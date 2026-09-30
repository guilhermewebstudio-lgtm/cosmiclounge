process.env.TZ = 'Europe/Lisbon';

const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool, init } = require('./lib/db');
const company = require('./lib/company');
const util = require('./lib/util');
const { ico } = require('./lib/icons');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Health check (usado pelo cron-job.org) — antes da sessão para não tocar na BD
app.get('/health', (req, res) => res.type('text').send('ok'));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '7d' : 0 }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.json({ limit: '100kb' }));

app.use(
  session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'dev-secret-mudar',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 14, httpOnly: true, sameSite: 'lax', secure: isProd }
  })
);

// Variáveis disponíveis em todas as views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.company = company;
  res.locals.util = util;
  res.locals.euro = util.euro;
  res.locals.ico = ico;
  res.locals.currentPath = req.path;
  res.locals.siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  next();
});

app.use(require('./routes/public'));
app.use(require('./routes/auth'));
app.use(require('./routes/account'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    code: 404,
    message: 'Esta página não existe ou já foi movida.'
  });
});

app.use((err, req, res, next) => {
  console.error('[erro]', err);
  if (res.headersSent) return;
  const isUpload = err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT');
  res.status(isUpload ? 400 : 500).render('error', {
    title: 'Ocorreu um erro',
    code: isUpload ? 400 : 500,
    message: isUpload
      ? 'Não foi possível carregar as fotografias. Use até 10 imagens de 3 MB cada.'
      : 'Algo correu mal do nosso lado. Tente novamente dentro de instantes.'
  });
});

const PORT = process.env.PORT || 3000;

init()
  .then(() => app.listen(PORT, () => console.log(`[cosmiclounge] a correr na porta ${PORT}`)))
  .catch((err) => {
    console.error('[db] falha ao iniciar:', err);
    process.exit(1);
  });
