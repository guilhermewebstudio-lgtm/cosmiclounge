const { Pool } = require('pg');

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
}

module.exports = { pool, init };
