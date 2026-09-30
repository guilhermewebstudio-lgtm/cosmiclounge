// Fotografias de exemplo (Unsplash, licença gratuita) para os imóveis de exemplo.
// As fotos são carregadas diretamente do Unsplash; o crédito do fotógrafo aparece na galeria.
const U = (id) => `https://images.unsplash.com/photo-${id}?ixlib=rb-4.1.0&fm=jpg&fit=max&q=78&w=1400`;

const P = {
  lotus: ['Lotus Design N Print', 'lotusdnp'], prydumano: ['Prydumano Design', 'prydumanodesign'], zac: ['Zac Gudakov', 'zacgudakov'],
  pipcke: ['Pipcke', 'pipcke'], collov: ['Collov Home Design', 'collovhome'], spacejoy: ['Spacejoy', 'spacejoy'],
  stephen: ['Stephen Owen', 'stephenowen23'], anand: ['Anand Kumar', 'elathi'], frames: ['Frames For Your Heart', 'framesforyourheart'],
  medea: ['Medea Dzagnidze', 'medeadza'], francesca: ['Francesca Tosolini', 'fromitaly'], blake: ['Blake Woolwine', 'summitangel'],
  omar: ['Omar Shabana', 'shabna_ko'], isidore: ['Isidore Decamon', 'cdor'], murad: ['Murad Kerimli', 'frankkip'],
  poojan: ['Poojan Thanekar', 'poojanclicks'], masato: ['Masato Tsuchiya', 'masatogoodbye'], willian: ['Willian Reis', 'wriopomba'],
  alef: ['Alef Morais', 'alef_visuals'], tile: ['Tile Merchant Ireland', 'tilemerchant'], alpha: ['Alpha Perspective', 'alphaperspective'],
  skobe: ['Alex Skobe', 'alex_skobe'], helpstay: ['Help Stay', 'helpstay'], tapio: ['Tapio Haaja', 'tap5a']
};

const ph = (id, who) => ({ url: U(id), name: P[who][0], user: P[who][1] });

// A primeira fotografia de cada imóvel é a capa.
const BY_TITLE = {
  'T2 remodelado no coração de Benfica': [
    ph('1598928506311-c55ded91a20c', 'lotus'), ph('1722605090433-41d1183a792d', 'stephen'), ph('1616486029423-aaa4789e8c9a', 'spacejoy'),
    ph('1733426107854-ee00a25d72a7', 'murad'), ph('1776702879021-7875264157bf', 'alpha')
  ],
  'Moradia T4 com jardim em Cascais': [
    ph('1777115470083-950377731c61', 'willian'), ph('1724582586529-62622e50c0b3', 'prydumano'), ph('1671197244266-73129c97c096', 'medea'),
    ph('1651336259530-362bce65fffe', 'omar'), ph('1742134131017-44d377a611b1', 'poojan')
  ],
  'T1 moderno junto ao Parque das Nações': [
    ph('1628744876497-eb30460be9f6', 'zac'), ph('1628745277862-bc0b2d68c50c', 'zac'), ph('1600210491305-7396500b5b31', 'collov'),
    ph('1667550177753-52b318cd4d40', 'medea'), ph('1516069429726-51d80d545cbf', 'helpstay')
  ],
  'Moradia T3 geminada em Almada': [
    ph('1766603636562-531bb3e1dda8', 'alef'), ph('1600210492493-0946911123ea', 'collov'), ph('1512916194211-3f2b7f5f7de3', 'frames'),
    ph('1560448205-4d9b3e6bb6db', 'francesca'), ph('1633330948542-0b3bdeefcdb3', 'tile'), ph('1733425844220-feab971190ff', 'murad')
  ],
  'T3 com varanda em Oeiras': [
    ph('1600121848594-d8644e57abab', 'lotus'), ph('1639405069836-f82aa6dcb900', 'lotus'), ph('1603072387986-d6136328c664', 'blake'),
    ph('1646974400439-8472d58bb19e', 'masato'), ph('1711203605191-d879424e7ec2', 'skobe')
  ],
  'T2 renovado em Cedofeita, Porto': [
    ph('1705321963943-de94bb3f0dd3', 'pipcke'), ph('1631679706909-1844bbd07221', 'spacejoy'), ph('1725257928373-dc6d2ac7b145', 'anand'),
    ph('1722409196415-d9ad14ee9ec1', 'isidore'), ph('1541404421518-1bf8f79c9789', 'tapio')
  ]
};

const UTM = '?utm_source=cosmiclounge&utm_medium=referral';
const creditUrl = (user) => `https://unsplash.com/@${user}${UTM}`;

module.exports = { BY_TITLE, creditUrl };
