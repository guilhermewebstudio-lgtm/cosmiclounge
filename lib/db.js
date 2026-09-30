const { Pool } = require('pg');
const demoPhotos = require('./demo-photos');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: false },
  max: 5
});

pool.on('error', (err) => console.error('[db] erro no pool:', err.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  area INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  condition TEXT,
  asking_price INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'recebido',
  offer_price INTEGER,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  tipo TEXT NOT NULL,
  city TEXT NOT NULL,
  area INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  price INTEGER NOT NULL,
  description TEXT,
  features TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel',
  featured BOOLEAN NOT NULL DEFAULT false,
  demo BOOLEAN NOT NULL DEFAULT false,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS images_owner_idx ON images (owner_type, owner_id);
ALTER TABLE images ALTER COLUMN data DROP NOT NULL;
ALTER TABLE images ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS credit_name TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS credit_url TEXT;

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Apartamento',
  area INTEGER,
  weeks INTEGER,
  description TEXT,
  works TEXT,
  demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_flags (
  key TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const DEMO = [
  {
    title: 'T2 remodelado no coração de Benfica',
    tipo: 'Apartamento', city: 'Lisboa', area: 78, bedrooms: 2, bathrooms: 1, price: 285000, featured: true,
    description: 'Apartamento completamente remodelado pela nossa equipa, com cozinha aberta para a sala, luz natural durante todo o dia e acabamentos de qualidade. A poucos minutos do metro e do Parque Florestal de Monsanto.',
    features: 'Cozinha equipada, Janelas de vidro duplo, Ar condicionado, Pavimento em carvalho, Elétrica e canalizações novas'
  },
  {
    title: 'Moradia T4 com jardim em Cascais',
    tipo: 'Moradia', city: 'Cascais', area: 210, bedrooms: 4, bathrooms: 3, price: 890000, featured: true,
    description: 'Moradia isolada renovada de raiz, com jardim, piscina e garagem para dois carros. Suite no rés-do-chão, cozinha com ilha e zona de refeições exterior.',
    features: 'Piscina, Jardim, Garagem para 2 carros, Painéis solares, Suite no rés-do-chão'
  },
  {
    title: 'T1 moderno junto ao Parque das Nações',
    tipo: 'Apartamento', city: 'Lisboa', area: 52, bedrooms: 1, bathrooms: 1, price: 235000, featured: true,
    description: 'Apartamento renovado, ideal para primeira habitação ou investimento. Varanda com vista desafogada e lugar de estacionamento incluído.',
    features: 'Varanda, Estacionamento, Cozinha equipada, Classe energética B'
  },
  {
    title: 'Moradia T3 geminada em Almada',
    tipo: 'Moradia', city: 'Almada', area: 150, bedrooms: 3, bathrooms: 2, price: 395000, featured: true,
    description: 'Moradia geminada com quintal e arrumos, remodelada com isolamento térmico e caixilharia nova. Zona calma e bem servida de transportes.',
    features: 'Quintal, Isolamento térmico, Lareira, Arrumos, Caixilharia nova'
  },
  {
    title: 'T3 com varanda em Oeiras',
    tipo: 'Apartamento', city: 'Oeiras', area: 118, bedrooms: 3, bathrooms: 2, price: 465000, featured: false,
    description: 'Apartamento espaçoso com varanda corrida, suite e roupeiros embutidos. Prédio com elevador e garagem fechada.',
    features: 'Varanda corrida, Suite, Roupeiros embutidos, Garagem fechada, Elevador'
  },
  {
    title: 'T2 renovado em Cedofeita, Porto',
    tipo: 'Apartamento', city: 'Porto', area: 85, bedrooms: 2, bathrooms: 2, price: 320000, featured: false,
    description: 'Apartamento num prédio típico portuense, com tetos altos preservados e interiores totalmente renovados. Perto de restaurantes, galerias e transportes.',
    features: 'Tetos altos, Duas casas de banho, Pavimento em madeira, Cozinha equipada'
  }
];

const DEMO_PROJECTS = [
  {
    title: 'T2 em Benfica, de fachada degradada a casa de luz',
    city: 'Lisboa', tipo: 'Apartamento', area: 78, weeks: 9,
    description: 'Apartamento com trinta anos de desgaste e divisões pequenas. Abrimos a cozinha para a sala, refizemos a instalação elétrica e de águas e trocámos toda a caixilharia.',
    works: 'Cozinha aberta e equipada, Elétrica e canalização novas, Pavimento em carvalho, Janelas de vidro duplo, Pintura completa'
  },
  {
    title: 'Moradia em Cascais, jardim e piscina renovados',
    city: 'Cascais', tipo: 'Moradia', area: 210, weeks: 14,
    description: 'Moradia isolada com humidade e telhado em mau estado. Reabilitámos a cobertura, criámos uma suite no rés-do-chão e recuperámos o jardim com piscina.',
    works: 'Telhado novo, Suite no rés-do-chão, Piscina recuperada, Isolamento térmico, Painéis solares'
  },
  {
    title: 'T1 no Parque das Nações pronto para habitar',
    city: 'Lisboa', tipo: 'Apartamento', area: 52, weeks: 6,
    description: 'Pequeno apartamento com layout confuso. Redesenhámos a planta para ganhar arrumação e luz natural, e renovámos casa de banho e cozinha.',
    works: 'Nova planta, Casa de banho renovada, Cozinha nova, Roupeiros embutidos, Ar condicionado'
  }
];

// Fotografias de exemplo nos imóveis de exemplo que ainda não têm nenhuma
async function attachDemoPhotos() {
  const { rows } = await pool.query(
    `SELECT l.id, l.title FROM listings l
     WHERE l.demo = true AND NOT EXISTS (SELECT 1 FROM images i WHERE i.owner_type='listing' AND i.owner_id=l.id)`
  );
  for (const l of rows) {
    const list = demoPhotos.BY_TITLE[l.title];
    if (!list) continue;
    let pos = 0;
    for (const p of list) {
      await pool.query(
        `INSERT INTO images (owner_type, owner_id, mime, data, url, credit_name, credit_url, position)
         VALUES ('listing', $1, 'image/jpeg', NULL, $2, $3, $4, $5)`,
        [l.id, p.url, p.name, demoPhotos.creditUrl(p.user), pos++]
      );
    }
    console.log(`[db] fotografias de exemplo em "${l.title}"`);
  }
}

// Mais dois trabalhos de exemplo (inseridos uma única vez)
const DEMO_PROJECTS_V2 = [
  {
    title: 'Moradia em Almada, fachada e interiores recuperados',
    city: 'Almada', tipo: 'Moradia', area: 150, weeks: 13,
    description: 'Moradia geminada abandonada, com telhado danificado e fachada degradada. Recuperámos a estrutura, refizemos a cobertura e renovámos todos os interiores.',
    works: 'Fachada recuperada, Cobertura nova, Elétrica e canalização, Isolamento térmico, Quintal arranjado'
  },
  {
    title: 'T3 em Oeiras, sala escura transformada em espaço de luz',
    city: 'Oeiras', tipo: 'Apartamento', area: 118, weeks: 11,
    description: 'Apartamento com divisões pequenas e pouca luz natural. Abrimos paredes não estruturais, renovámos a caixilharia e criámos uma sala ampla ligada à zona de refeições.',
    works: 'Paredes abertas, Caixilharia nova, Pavimento novo, Iluminação LED, Pintura completa'
  }
];

// Fotografias de exemplo nos trabalhos de exemplo que ainda não têm antes/depois
async function attachDemoProjectPhotos() {
  const { rows } = await pool.query(
    `SELECT p.id, p.title FROM projects p
     WHERE p.demo = true AND NOT EXISTS (SELECT 1 FROM images i WHERE i.owner_type IN ('project_before','project_after') AND i.owner_id = p.id)`
  );
  for (const p of rows) {
    const d = demoPhotos.PROJECTS[p.title];
    if (!d) continue;
    for (const [kind, ph] of [['project_before', d.before], ['project_after', d.after]]) {
      await pool.query(
        `INSERT INTO images (owner_type, owner_id, mime, data, url, credit_name, credit_url, position)
         VALUES ($1, $2, 'image/jpeg', NULL, $3, $4, $5, 0)`,
        [kind, p.id, ph.url, ph.name, demoPhotos.creditUrl(ph.user)]
      );
    }
    console.log(`[db] antes/depois de exemplo em "${p.title}"`);
  }
}

async function init() {
  await pool.query(SCHEMA);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM listings');
  if (rows[0].n === 0) {
    for (const d of DEMO) {
      await pool.query(
        `INSERT INTO listings (title, tipo, city, area, bedrooms, bathrooms, price, description, features, featured, demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
        [d.title, d.tipo, d.city, d.area, d.bedrooms, d.bathrooms, d.price, d.description, d.features, d.featured]
      );
    }
    console.log('[db] imóveis de exemplo criados');
  }
  const pr = await pool.query('SELECT COUNT(*)::int AS n FROM projects');
  if (pr.rows[0].n === 0) {
    for (const d of DEMO_PROJECTS) {
      await pool.query(
        `INSERT INTO projects (title, city, tipo, area, weeks, description, works, demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [d.title, d.city, d.tipo, d.area, d.weeks, d.description, d.works]
      );
    }
    console.log('[db] trabalhos de exemplo criados');
  }
  const flag = await pool.query(`SELECT 1 FROM app_flags WHERE key = 'demo_projects_v2'`);
  if (!flag.rows.length) {
    for (const d of DEMO_PROJECTS_V2) {
      await pool.query(
        `INSERT INTO projects (title, city, tipo, area, weeks, description, works, demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [d.title, d.city, d.tipo, d.area, d.weeks, d.description, d.works]
      );
    }
    await pool.query(`INSERT INTO app_flags (key) VALUES ('demo_projects_v2')`);
    console.log('[db] mais trabalhos de exemplo criados');
  }
  await attachDemoPhotos();
  await attachDemoProjectPhotos();
}

module.exports = { pool, init };
