const express = require('express');
const { pool } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');
const { upload, saveImages } = require('../lib/upload');
const { clean, toInt, TIPOS, STATUS, STATUS_ORDER, euro } = require('../lib/util');
const mail = require('../lib/mail');

const router = express.Router();
router.use(requireAdmin);

const ALL_STATUS = [...STATUS_ORDER, 'recusado'];
const LISTING_STATUS = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' };

router.get('/', async (req, res, next) => {
  try {
    const filtro = ALL_STATUS.includes(req.query.estado) ? req.query.estado : '';
    const params = [];
    let where = '';
    if (filtro) {
      params.push(filtro);
      where = 'WHERE s.status = $1';
    }
    const { rows: subs } = await pool.query(
      `SELECT s.*, u.name AS user_name, u.email AS user_email
       FROM submissions s JOIN users u ON u.id = s.user_id ${where} ORDER BY s.id DESC LIMIT 100`,
      params
    );
    const { rows: counts } = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM submissions WHERE status IN ('recebido','em_analise')) AS por_tratar,
        (SELECT COUNT(*)::int FROM submissions) AS pedidos,
        (SELECT COUNT(*)::int FROM listings WHERE status <> 'vendido') AS imoveis,
        (SELECT COUNT(*)::int FROM inquiries WHERE handled = false) AS mensagens`
    );
    res.render('admin/dashboard', {
      title: 'Painel',
      page: 'admin',
      adminPage: 'pedidos',
      subs,
      counts: counts[0],
      filtro,
      allStatus: ALL_STATUS,
      STATUS
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pedidos/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return next();
    const { rows: images } = await pool.query(
      `SELECT id FROM images WHERE owner_type='submission' AND owner_id=$1 ORDER BY position, id`,
      [rows[0].id]
    );
    const { rows: published } = await pool.query('SELECT id, title FROM listings WHERE submission_id = $1', [rows[0].id]);
    res.render('admin/submission', {
      title: `Pedido #${rows[0].id}`,
      page: 'admin',
      adminPage: 'pedidos',
      sub: rows[0],
      images,
      published,
      allStatus: ALL_STATUS,
      STATUS
    });
  } catch (err) {
    next(err);
  }
});

router.post('/pedidos/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, u.name AS user_name, u.email AS user_email
       FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
      [req.params.id]
    );
    const sub = rows[0];
    if (!sub) return next();
    const status = ALL_STATUS.includes(req.body.status) ? req.body.status : sub.status;
    const offer = toInt(req.body.offer_price);
    const note = clean(req.body.admin_note, 2000);
    const notify = req.body.notify === '1';

    const { rows: upd } = await pool.query(
      `UPDATE submissions SET status=$1, offer_price=$2, admin_note=$3, updated_at=now() WHERE id=$4 RETURNING *`,
      [status, offer, note || null, sub.id]
    );
    const changed = status !== sub.status || offer !== sub.offer_price || (note || null) !== sub.admin_note;
    if (notify && changed) {
      mail.submissionUpdated({ name: sub.user_name, email: sub.user_email }, upd[0], STATUS[status], offer ? euro.format(offer) : '');
    }
    req.session.flash = { type: 'ok', text: notify ? 'Pedido atualizado e cliente notificado.' : 'Pedido atualizado.' };
    res.redirect(`/admin/pedidos/${sub.id}`);
  } catch (err) {
    next(err);
  }
});

// ---- Imóveis -------------------------------------------------------------

router.get('/imoveis', async (req, res, next) => {
  try {
    const { rows: listings } = await pool.query(
      `SELECT l.*, (SELECT id FROM images WHERE owner_type='listing' AND owner_id=l.id ORDER BY position, id LIMIT 1) AS cover_id
       FROM listings l ORDER BY l.id DESC`
    );
    res.render('admin/listings', { title: 'Imóveis', page: 'admin', adminPage: 'imoveis', listings, LISTING_STATUS });
  } catch (err) {
    next(err);
  }
});

router.get('/imoveis/novo', async (req, res, next) => {
  try {
    let form = { status: 'disponivel', featured: false };
    const from = toInt(req.query.pedido);
    if (from) {
      const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [from]);
      const s = rows[0];
      if (s) {
        form = {
          title: `${s.tipo} em ${s.city}`,
          tipo: s.tipo,
          city: s.city,
          area: s.area,
          bedrooms: s.bedrooms,
          bathrooms: s.bathrooms,
          description: '',
          features: '',
          status: 'disponivel',
          featured: false,
          submission_id: s.id
        };
      }
    }
    res.render('admin/listing-form', {
      title: 'Novo imóvel',
      page: 'admin',
      adminPage: 'imoveis',
      form,
      images: [],
      isNew: true,
      tipos: TIPOS,
      LISTING_STATUS
    });
  } catch (err) {
    next(err);
  }
});

function listingFromBody(b) {
  return {
    title: clean(b.title, 150),
    tipo: TIPOS.includes(b.tipo) ? b.tipo : 'Apartamento',
    city: clean(b.city, 80),
    area: toInt(b.area),
    bedrooms: toInt(b.bedrooms),
    bathrooms: toInt(b.bathrooms),
    price: toInt(b.price, 0),
    description: clean(b.description, 4000),
    features: clean(b.features, 800),
    status: Object.keys(LISTING_STATUS).includes(b.status) ? b.status : 'disponivel',
    featured: b.featured === '1',
    submission_id: toInt(b.submission_id)
  };
}

router.post('/imoveis', upload.array('fotos', 6), async (req, res, next) => {
  try {
    const d = listingFromBody(req.body);
    if (!d.title || !d.city || !d.price) {
      return res.status(400).render('admin/listing-form', {
        title: 'Novo imóvel',
        page: 'admin',
        adminPage: 'imoveis',
        form: d,
        images: [],
        isNew: true,
        tipos: TIPOS,
        LISTING_STATUS,
        flash: { type: 'error', text: 'Título, localidade e preço são obrigatórios.' }
      });
    }
    const { rows } = await pool.query(
      `INSERT INTO listings (title,tipo,city,area,bedrooms,bathrooms,price,description,features,status,featured,submission_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [d.title, d.tipo, d.city, d.area, d.bedrooms, d.bathrooms, d.price, d.description, d.features, d.status, d.featured, d.submission_id]
    );
    await saveImages('listing', rows[0].id, req.files);
    if (d.submission_id) {
      await pool.query(`UPDATE submissions SET status='a_venda', updated_at=now() WHERE id=$1`, [d.submission_id]);
    }
    req.session.flash = { type: 'ok', text: 'Imóvel publicado.' };
    res.redirect(`/admin/imoveis/${rows[0].id}`);
  } catch (err) {
    next(err);
  }
});

router.get('/imoveis/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return next();
    const { rows: images } = await pool.query(
      `SELECT id FROM images WHERE owner_type='listing' AND owner_id=$1 ORDER BY position, id`,
      [rows[0].id]
    );
    res.render('admin/listing-form', {
      title: 'Editar imóvel',
      page: 'admin',
      adminPage: 'imoveis',
      form: rows[0],
      images,
      isNew: false,
      tipos: TIPOS,
      LISTING_STATUS
    });
  } catch (err) {
    next(err);
  }
});

router.post('/imoveis/:id(\\d+)', upload.array('fotos', 6), async (req, res, next) => {
  try {
    const d = listingFromBody(req.body);
    const id = req.params.id;
    if (!d.title || !d.city || !d.price) {
      req.session.flash = { type: 'error', text: 'Título, localidade e preço são obrigatórios.' };
      return res.redirect(`/admin/imoveis/${id}`);
    }
    await pool.query(
      `UPDATE listings SET title=$1,tipo=$2,city=$3,area=$4,bedrooms=$5,bathrooms=$6,price=$7,description=$8,features=$9,status=$10,featured=$11
       WHERE id=$12`,
      [d.title, d.tipo, d.city, d.area, d.bedrooms, d.bathrooms, d.price, d.description, d.features, d.status, d.featured, id]
    );
    await saveImages('listing', id, req.files);
    req.session.flash = { type: 'ok', text: 'Imóvel guardado.' };
    res.redirect(`/admin/imoveis/${id}`);
  } catch (err) {
    next(err);
  }
});

router.post('/imoveis/:id(\\d+)/apagar', async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM images WHERE owner_type='listing' AND owner_id=$1`, [req.params.id]);
    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    req.session.flash = { type: 'ok', text: 'Imóvel apagado.' };
    res.redirect('/admin/imoveis');
  } catch (err) {
    next(err);
  }
});

router.post('/imagens/:id(\\d+)/apagar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM images WHERE id = $1 RETURNING owner_type, owner_id', [req.params.id]);
    const back = rows[0] && rows[0].owner_type === 'listing' ? `/admin/imoveis/${rows[0].owner_id}` : '/admin';
    res.redirect(back);
  } catch (err) {
    next(err);
  }
});

// ---- Mensagens -----------------------------------------------------------

router.get('/mensagens', async (req, res, next) => {
  try {
    const { rows: msgs } = await pool.query(
      `SELECT i.*, l.title AS listing_title FROM inquiries i LEFT JOIN listings l ON l.id = i.listing_id ORDER BY i.handled ASC, i.id DESC LIMIT 200`
    );
    res.render('admin/messages', { title: 'Mensagens', page: 'admin', adminPage: 'mensagens', msgs });
  } catch (err) {
    next(err);
  }
});

router.post('/mensagens/:id(\\d+)/tratada', async (req, res, next) => {
  try {
    await pool.query('UPDATE inquiries SET handled = NOT handled WHERE id = $1', [req.params.id]);
    res.redirect('/admin/mensagens');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
