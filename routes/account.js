const express = require('express');
const { pool } = require('../lib/db');
const { requireLogin } = require('../lib/auth');
const { upload, saveImages } = require('../lib/upload');
const { clean, toInt, TIPOS, CONDICOES } = require('../lib/util');
const mail = require('../lib/mail');

const router = express.Router();

router.get('/conta', requireLogin, async (req, res, next) => {
  try {
    const { rows: subs } = await pool.query(
      `SELECT s.*, (SELECT id FROM images WHERE owner_type='submission' AND owner_id=s.id ORDER BY position, id LIMIT 1) AS cover_id
       FROM submissions s WHERE user_id = $1 ORDER BY s.id DESC`,
      [req.session.user.id]
    );
    res.render('account', { title: 'A minha conta', page: 'conta', subs });
  } catch (err) {
    next(err);
  }
});

router.get('/vender', requireLogin, (req, res) => {
  res.render('sell', {
    title: 'Vender o meu imóvel',
    page: 'vender',
    tipos: TIPOS,
    condicoes: CONDICOES,
    form: {
      city: clean(req.query.cidade, 80),
      tipo: TIPOS.includes(req.query.tipo) ? req.query.tipo : ''
    }
  });
});

router.post('/vender', requireLogin, upload.array('fotos', 10), async (req, res, next) => {
  try {
    const b = req.body;
    const form = {
      tipo: TIPOS.includes(b.tipo) ? b.tipo : '',
      city: clean(b.city, 80),
      address: clean(b.address, 200),
      area: toInt(b.area),
      bedrooms: toInt(b.bedrooms),
      bathrooms: toInt(b.bathrooms),
      condition: CONDICOES.includes(b.condition) ? b.condition : '',
      asking_price: toInt(b.asking_price),
      description: clean(b.description, 3000)
    };
    if (!form.tipo || !form.city) {
      return res.status(400).render('sell', {
        title: 'Vender o meu imóvel',
        page: 'vender',
        tipos: TIPOS,
        condicoes: CONDICOES,
        form,
        flash: { type: 'error', text: 'Indique pelo menos o tipo de imóvel e a localidade.' }
      });
    }
    const { rows } = await pool.query(
      `INSERT INTO submissions (user_id, tipo, city, address, area, bedrooms, bathrooms, condition, asking_price, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.session.user.id, form.tipo, form.city, form.address, form.area, form.bedrooms, form.bathrooms, form.condition, form.asking_price, form.description]
    );
    const sub = rows[0];
    await saveImages('submission', sub.id, req.files);
    mail.submissionReceived(req.session.user, sub);
    req.session.flash = { type: 'ok', text: 'Pedido enviado! Vamos analisá-lo e responder-lhe em breve.' };
    res.redirect(`/conta/pedidos/${sub.id}`);
  } catch (err) {
    next(err);
  }
});

router.get('/conta/pedidos/:id(\\d+)', requireLogin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user.id]);
    if (!rows[0]) return next();
    const { rows: images } = await pool.query(
      `SELECT id FROM images WHERE owner_type='submission' AND owner_id=$1 ORDER BY position, id`,
      [rows[0].id]
    );
    res.render('submission', { title: `Pedido #${rows[0].id}`, page: 'conta', sub: rows[0], images });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
