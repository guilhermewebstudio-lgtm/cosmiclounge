const express = require('express');
const { pool } = require('../lib/db');
const { clean, isEmail, toInt, rateLimit, TIPOS } = require('../lib/util');
const mail = require('../lib/mail');

const router = express.Router();

const BEFORE = `(SELECT id FROM images WHERE owner_type='project_before' AND owner_id=p.id ORDER BY id DESC LIMIT 1) AS before_id`;
const AFTER = `(SELECT id FROM images WHERE owner_type='project_after' AND owner_id=p.id ORDER BY id DESC LIMIT 1) AS after_id`;
const PHOTOS = `(SELECT COUNT(*)::int FROM images WHERE owner_type='listing' AND owner_id=l.id) AS photo_count`;
const COVER = `(SELECT id FROM images WHERE owner_type='listing' AND owner_id=l.id ORDER BY position, id LIMIT 1) AS cover_id`;

router.get('/', async (req, res, next) => {
  try {
    const { rows: featured } = await pool.query(
      `SELECT l.*, ${COVER}, ${PHOTOS} FROM listings l
       WHERE l.status IN ('disponivel','reservado')
       ORDER BY l.featured DESC, l.id DESC LIMIT 3`
    );
    const { rows: proj } = await pool.query(`SELECT p.*, ${BEFORE}, ${AFTER} FROM projects p ORDER BY p.id DESC LIMIT 1`);
    const { rows: cities } = await pool.query(
      `SELECT DISTINCT city FROM listings WHERE status IN ('disponivel','reservado') ORDER BY city`
    );
    res.render('home', { title: 'Venda a sua casa sem complicações', page: 'home', featured, project: proj[0] || null, cities, tipos: TIPOS, query: req.query });
  } catch (err) {
    next(err);
  }
});

router.get('/imoveis', async (req, res, next) => {
  try {
    const q = clean(req.query.q, 80);
    const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : '';
    const max = toInt(req.query.max);
    const quartos = toInt(req.query.quartos);
    const ordem = ['preco_asc', 'preco_desc', 'recentes'].includes(req.query.ordem) ? req.query.ordem : 'recentes';

    const where = [`l.status IN ('disponivel','reservado')`];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(l.city ILIKE $${params.length} OR l.title ILIKE $${params.length})`);
    }
    if (tipo) {
      params.push(tipo);
      where.push(`l.tipo = $${params.length}`);
    }
    if (max) {
      params.push(max);
      where.push(`l.price <= $${params.length}`);
    }
    if (quartos) {
      params.push(quartos);
      where.push(`l.bedrooms >= $${params.length}`);
    }
    const order = { preco_asc: 'l.price ASC', preco_desc: 'l.price DESC', recentes: 'l.id DESC' }[ordem];

    const { rows: listings } = await pool.query(
      `SELECT l.*, ${COVER}, ${PHOTOS} FROM listings l WHERE ${where.join(' AND ')} ORDER BY ${order}`,
      params
    );
    res.render('listings', {
      title: 'Imóveis remodelados',
      page: 'imoveis',
      listings,
      tipos: TIPOS,
      f: { q, tipo, max: max || '', quartos: quartos || '', ordem }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/imoveis/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT l.*, ${COVER}, ${PHOTOS} FROM listings l WHERE l.id = $1`, [req.params.id]);
    const listing = rows[0];
    if (!listing) return next();
    const { rows: images } = await pool.query(
      `SELECT id, credit_name, credit_url FROM images WHERE owner_type='listing' AND owner_id=$1 ORDER BY position, id`,
      [listing.id]
    );
    const { rows: related } = await pool.query(
      `SELECT l.*, ${COVER}, ${PHOTOS} FROM listings l
       WHERE l.id <> $1 AND l.status IN ('disponivel','reservado')
       ORDER BY (l.city = $2) DESC, l.id DESC LIMIT 3`,
      [listing.id, listing.city]
    );
    res.render('listing', {
      title: listing.title,
      desc: `${listing.tipo} em ${listing.city} — ${listing.area || ''} m². Imóvel remodelado pela CosmicLounge.`,
      page: 'imoveis',
      listing,
      images,
      related,
      features: (listing.features || '').split(',').map((s) => s.trim()).filter(Boolean)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/imoveis/:id(\\d+)/interesse', rateLimit('inq', 8, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    const listing = rows[0];
    if (!listing) return next();
    const data = {
      name: clean(req.body.name, 100),
      email: clean(req.body.email, 150),
      phone: clean(req.body.phone, 30),
      message: clean(req.body.message, 2000) || `Tenho interesse no imóvel "${listing.title}". Podem contactar-me para agendar uma visita?`
    };
    if (!data.name || !isEmail(data.email)) {
      req.session.flash = { type: 'error', text: 'Indique o seu nome e um email válido.' };
      return res.redirect(`/imoveis/${listing.id}#interesse`);
    }
    await pool.query(
      'INSERT INTO inquiries (listing_id, name, email, phone, message) VALUES ($1,$2,$3,$4,$5)',
      [listing.id, data.name, data.email, data.phone, data.message]
    );
    mail.inquiry(data, listing);
    req.session.flash = { type: 'ok', text: 'Pedido enviado! Entraremos em contacto consigo em breve.' };
    res.redirect(`/imoveis/${listing.id}#interesse`);
  } catch (err) {
    next(err);
  }
});

router.get('/trabalhos', async (req, res, next) => {
  try {
    const { rows: projects } = await pool.query(`SELECT p.*, ${BEFORE}, ${AFTER} FROM projects p ORDER BY p.id DESC`);
    res.render('projects', {
      title: 'Trabalhos realizados',
      desc: 'Veja o antes e o depois das casas que a CosmicLounge remodelou.',
      page: 'trabalhos',
      projects
    });
  } catch (err) {
    next(err);
  }
});

router.get('/sobre', (req, res) => {
  res.render('about', {
    title: 'Sobre nós',
    desc: 'Compramos imóveis, remodelamo-los e voltamos a colocá-los no mercado. Conheça a CosmicLounge.',
    page: 'sobre'
  });
});

router.get('/contacto', (req, res) => {
  res.render('contact', { title: 'Contacto', page: 'contacto', form: {} });
});

router.post('/contacto', rateLimit('contact', 6, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const data = {
      name: clean(req.body.name, 100),
      email: clean(req.body.email, 150),
      phone: clean(req.body.phone, 30),
      message: clean(req.body.message, 2000)
    };
    if (!data.name || !isEmail(data.email) || data.message.length < 5) {
      return res.status(400).render('contact', {
        title: 'Contacto',
        page: 'contacto',
        form: data,
        flash: { type: 'error', text: 'Preencha o nome, um email válido e a mensagem.' }
      });
    }
    await pool.query(
      'INSERT INTO inquiries (listing_id, name, email, phone, message) VALUES (NULL,$1,$2,$3,$4)',
      [data.name, data.email, data.phone, data.message]
    );
    mail.inquiry(data, null);
    req.session.flash = { type: 'ok', text: 'Mensagem enviada. Obrigado! Respondemos o mais depressa possível.' };
    res.redirect('/contacto');
  } catch (err) {
    next(err);
  }
});

// Imagens guardadas na base de dados
router.get('/img/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT mime, data, url FROM images WHERE id = $1', [req.params.id]);
    if (!rows[0]) return next();
    if (rows[0].url) {
      res.set('Cache-Control', 'public, max-age=86400');
      return res.redirect(302, rows[0].url);
    }
    res.set('Content-Type', rows[0].mime);
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.send(rows[0].data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
