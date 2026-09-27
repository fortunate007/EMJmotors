/* =========================================================
   EMJ MOTORS LTD — full-stack car dealership platform
   Express + JSON file database + session admin auth + image
   uploads + full car taxonomy + sold tracking + WhatsApp CTA.
   Run with:  npm install && npm start
   ========================================================= */

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'emj2026';
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

/* ---------------- reference data ---------------- */
const MAKES = [
  'Toyota','Nissan','Mazda','Honda','Subaru','Suzuki','Mitsubishi','Isuzu','Daihatsu','Datsun',
  'Mercedes-Benz','BMW','Audi','Volkswagen','Porsche','Opel','Mini',
  'Ford','Chevrolet','GMC','Cadillac','Lincoln','Chrysler','Dodge','Jeep','Tesla','Buick',
  'Hyundai','Kia','Genesis',
  'Lexus','Infiniti','Acura',
  'Land Rover','Range Rover','Jaguar','Volvo','Peugeot','Renault','Citroen','Fiat','Alfa Romeo','Skoda','Seat',
  'Bentley','Rolls-Royce','Lamborghini','Ferrari','Aston Martin','Maserati',
  'Great Wall','Haval','BYD','Mahindra','Tata'
];
const BODY_TYPES = ['Sedan','SUV','Hatchback','Wagon','Pickup','Van','Minivan','Coupe','Convertible','Crossover','Truck'];
const CONDITIONS = ['Foreign Used','Locally Used','Brand New'];
const FUEL_TYPES = ['Petrol','Diesel','Hybrid','Electric'];
const DRIVETRAINS = ['FWD','RWD','AWD','4WD'];
const TRANSMISSIONS = ['Automatic','Manual'];

/* ---------------- tiny JSON "database" ---------------- */
const defaultSettings = {
  name: 'EMJ MOTORS LTD',
  tagline: 'PREMIUM IMPORTS • NAIROBI',
  phone1: '+254 799 566 458',
  phone2: '+254 727 073 958',
  wa: '254799566458',
  email: 'info@emjmotors.co.ke',
  address: 'Ngong Road, Kilimani, Nairobi',
  locShort: 'Ngong Road',
  about: "Nairobi's trusted dealer for foreign used cars. QISJ verified, 50% deposit, flexible balance.",
  colorGold: '#e8b923',
  colorBg: '#0b0b0c'
};

const sampleCars = [
  { id: 1, make: 'Toyota', model: 'Axio', year: 2015, price: 1450000, mileage: 65000, body: 'Sedan', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Petrol', drivetrain: 'FWD', color: 'White', desc: 'Well maintained, single owner, full service history. QISJ verified mileage and auction sheet available on request.', photos: [], sold: false },
  { id: 2, make: 'Nissan', model: 'X-Trail', year: 2016, price: 2350000, mileage: 58000, body: 'SUV', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Petrol', drivetrain: 'AWD', color: 'Silver', desc: 'Spacious family SUV, 4WD, clean interior, recently serviced.', photos: [], sold: false },
  { id: 3, make: 'Mazda', model: 'Demio', year: 2017, price: 1150000, mileage: 41000, body: 'Hatchback', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Petrol', drivetrain: 'FWD', color: 'Blue', desc: 'Fuel efficient, low mileage, ideal first car.', photos: [], sold: false },
  { id: 4, make: 'Toyota', model: 'Prado', year: 2018, price: 6800000, mileage: 72000, body: 'SUV', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Diesel', drivetrain: '4WD', color: 'Black', desc: 'Well kept TX-L trim, leather seats, sunroof, full service history.', photos: [], sold: true },
  { id: 5, make: 'Mercedes-Benz', model: 'C200', year: 2019, price: 5200000, mileage: 35000, body: 'Sedan', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Petrol', drivetrain: 'RWD', color: 'Grey', desc: 'AMG line, one owner, dealer serviced throughout.', photos: [], sold: false },
  { id: 6, make: 'Subaru', model: 'Forester', year: 2017, price: 2650000, mileage: 61000, body: 'Wagon', condition: 'Foreign Used', trans: 'Automatic', fuel: 'Petrol', drivetrain: 'AWD', color: 'Green', desc: 'Symmetrical AWD, great for upcountry runs, new tyres.', photos: [], sold: false }
];

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { cars: sampleCars, settings: defaultSettings, nextId: sampleCars.length + 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.settings) db.settings = defaultSettings;
  if (!db.nextId) db.nextId = (db.cars || []).reduce((m, c) => Math.max(m, c.id), 0) + 1;
  return db;
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ---------------- app setup ---------------- */
const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(session({
  secret: process.env.SESSION_SECRET || 'emj-motors-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 8);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

/* ---------------- auth routes ---------------- */
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && bcrypt.compareSync(password, passwordHash)) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Incorrect password' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get('/api/session', (req, res) => { res.json({ isAdmin: !!(req.session && req.session.isAdmin) }); });

/* ---------------- reference-data route ---------------- */
app.get('/api/meta', (req, res) => {
  res.json({ makes: MAKES, bodyTypes: BODY_TYPES, conditions: CONDITIONS, fuelTypes: FUEL_TYPES, drivetrains: DRIVETRAINS, transmissions: TRANSMISSIONS });
});

/* ---------------- settings routes ---------------- */
app.get('/api/settings', (req, res) => { res.json(loadDB().settings); });
app.put('/api/settings', requireAdmin, (req, res) => {
  const db = loadDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  res.json(db.settings);
});

/* ---------------- car routes ---------------- */
app.get('/api/cars', (req, res) => {
  const db = loadDB();
  let list = db.cars;
  const { make, body, condition, fuel, minPrice, maxPrice, q, sold, sort } = req.query;
  if (make) list = list.filter(c => c.make === make);
  if (body) list = list.filter(c => c.body === body);
  if (condition) list = list.filter(c => c.condition === condition);
  if (fuel) list = list.filter(c => c.fuel === fuel);
  if (minPrice) list = list.filter(c => c.price >= +minPrice);
  if (maxPrice) list = list.filter(c => c.price <= +maxPrice);
  if (sold === 'false') list = list.filter(c => !c.sold);
  if (sold === 'true') list = list.filter(c => c.sold);
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(c => (c.make + ' ' + c.model).toLowerCase().includes(needle));
  }
  if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
  if (sort === 'year_desc') list = [...list].sort((a, b) => b.year - a.year);
  if (sort === 'newest') list = [...list].sort((a, b) => b.id - a.id);
  res.json(list);
});

app.get('/api/cars/:id', (req, res) => {
  const car = loadDB().cars.find(c => c.id === +req.params.id);
  if (!car) return res.status(404).json({ error: 'Not found' });
  res.json(car);
});

app.post('/api/cars', requireAdmin, upload.array('photos', 12), (req, res) => {
  const db = loadDB();
  const b = req.body;
  const photos = (req.files || []).map(f => '/uploads/' + f.filename);
  const car = {
    id: db.nextId++,
    make: b.make || '', model: b.model || '',
    year: +b.year || new Date().getFullYear(),
    price: +b.price || 0,
    mileage: +b.mileage || 0,
    body: b.body || 'Sedan',
    condition: b.condition || 'Foreign Used',
    trans: b.trans || 'Automatic',
    fuel: b.fuel || 'Petrol',
    drivetrain: b.drivetrain || 'FWD',
    color: b.color || '',
    desc: b.desc || '',
    sold: b.sold === 'true' || b.sold === true,
    photos
  };
  db.cars.push(car);
  saveDB(db);
  res.json(car);
});

app.put('/api/cars/:id', requireAdmin, upload.array('photos', 12), (req, res) => {
  const db = loadDB();
  const idx = db.cars.findIndex(c => c.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const newPhotos = (req.files || []).map(f => '/uploads/' + f.filename);
  const car = db.cars[idx];
  Object.assign(car, {
    make: b.make ?? car.make, model: b.model ?? car.model,
    year: b.year ? +b.year : car.year,
    price: b.price ? +b.price : car.price,
    mileage: b.mileage ? +b.mileage : car.mileage,
    body: b.body ?? car.body,
    condition: b.condition ?? car.condition,
    trans: b.trans ?? car.trans,
    fuel: b.fuel ?? car.fuel,
    drivetrain: b.drivetrain ?? car.drivetrain,
    color: b.color ?? car.color,
    desc: b.desc ?? car.desc,
    sold: b.sold !== undefined ? (b.sold === 'true' || b.sold === true) : car.sold,
    photos: newPhotos.length ? newPhotos : car.photos
  });
  saveDB(db);
  res.json(car);
});

app.patch('/api/cars/:id/sold', requireAdmin, (req, res) => {
  const db = loadDB();
  const car = db.cars.find(c => c.id === +req.params.id);
  if (!car) return res.status(404).json({ error: 'Not found' });
  car.sold = !car.sold;
  saveDB(db);
  res.json(car);
});

app.delete('/api/cars/:id', requireAdmin, (req, res) => {
  const db = loadDB();
  const car = db.cars.find(c => c.id === +req.params.id);
  db.cars = db.cars.filter(c => c.id !== +req.params.id);
  saveDB(db);
  if (car) (car.photos || []).forEach(p => {
    const f = path.join(__dirname, p);
    fs.existsSync(f) && fs.unlinkSync(f);
  });
  res.json({ ok: true });
});

/* ---------------- frontend assets ---------------- */
const STYLE_CSS = `
:root{--bg:#0b0b0c;--bg2:#141416;--card:#1b1b1e;--gold:#e8b923;--gold2:#c99b16;--text:#f4f4f2;--muted:#a3a3a8;--line:#2a2a2d;--good:#3ecf6e;--bad:#e5534b;--light-bg:#f7f5ef;--wa:#25D366;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;}
h1,h2,h3{font-family:Arial Black,Arial,sans-serif;letter-spacing:.5px;}
a{color:inherit;text-decoration:none;} img{max-width:100%;display:block;} button{font-family:inherit;cursor:pointer;}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px;}
.gold{color:var(--gold);}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border-radius:999px;border:none;font-weight:700;font-size:14px;}
.btn-gold{background:var(--gold);color:#111;} .btn-gold:hover{background:var(--gold2);}
.btn-dark{background:#000;color:#fff;border:1px solid #333;}
.btn-outline{background:transparent;border:1px solid var(--gold);color:var(--gold);}
.btn-wa{background:var(--wa);color:#fff;}
header{position:sticky;top:0;z-index:50;background:#000;border-bottom:1px solid var(--line);}
header .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;flex-wrap:wrap;gap:10px;}
.brand{display:flex;align-items:center;gap:12px;}
.logo-circle{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#8a6a0d);display:flex;align-items:center;justify-content:center;font-weight:900;color:#111;flex-shrink:0;}
.brand h1{font-size:22px;} .brand .tag{font-size:11px;color:var(--gold);letter-spacing:2px;}
.call-btn{background:#fff;color:#000;border-radius:999px;padding:10px 18px;font-weight:700;display:flex;align-items:center;gap:8px;}
.hero{position:relative;min-height:60vh;display:flex;align-items:center;background:#111;}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.5));}
.hero .wrap{position:relative;z-index:2;padding-top:50px;padding-bottom:40px;}
.badge{display:inline-flex;align-items:center;gap:8px;background:rgba(232,185,35,.12);border:1px solid var(--gold);color:var(--gold);padding:8px 16px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:20px;}
.dot{width:8px;height:8px;border-radius:50%;background:var(--good);display:inline-block;}
.hero h2{font-size:50px;line-height:1.05;color:#fff;} .hero h2 .gold{display:block;font-size:50px;}
.hero p{max-width:560px;color:#d8d8d8;margin:18px 0 26px;font-size:16px;}
@media(max-width:700px){.hero h2,.hero h2 .gold{font-size:32px;}}
.filters{background:var(--card);border-radius:16px;padding:22px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr 1fr auto;gap:14px;align-items:end;margin-top:10px;}
@media(max-width:1100px){.filters{grid-template-columns:1fr 1fr 1fr;}}
@media(max-width:640px){.filters{grid-template-columns:1fr 1fr;}}
.field label{font-size:10.5px;letter-spacing:1.2px;color:var(--muted);font-weight:700;display:block;margin-bottom:7px;text-transform:uppercase;}
.field select,.field input{width:100%;padding:11px;border-radius:8px;border:1px solid var(--line);background:#fff;color:#111;font-size:13.5px;}
.filters .btn{padding:13px;white-space:nowrap;}
.filters-row2{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;align-items:center;}
.chk{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);}
section{padding:54px 0;}
.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:10px;}
.section-head h2{font-size:27px;} .view-all{font-size:13px;font-weight:700;text-decoration:underline;background:none;border:none;color:var(--text);cursor:pointer;}
.makes-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:14px;}
@media(max-width:1000px){.makes-grid{grid-template-columns:repeat(4,1fr);}}
@media(max-width:600px){.makes-grid{grid-template-columns:repeat(3,1fr);}}
.make-card{background:var(--card);border-radius:12px;padding:16px;text-align:left;border:1px solid var(--line);cursor:pointer;}
.make-card:hover{border-color:var(--gold);}
.make-avatar{width:38px;height:38px;border-radius:50%;background:#000;color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:900;margin-bottom:10px;font-size:14px;}
.make-card b{display:block;font-size:14px;} .make-card span{color:var(--muted);font-size:12px;}
.stock-badge{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);}
.cars-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
@media(max-width:900px){.cars-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.cars-grid{grid-template-columns:1fr;}}
.car-card{background:var(--card);border-radius:14px;overflow:hidden;border:1px solid var(--line);transition:.2s;position:relative;}
.car-card:hover{transform:translateY(-4px);border-color:var(--gold);}
.car-card.is-sold{opacity:.72;}
.car-img{position:relative;aspect-ratio:4/3;background:#222;overflow:hidden;} .car-img img{width:100%;height:100%;object-fit:cover;}
.car-tag{position:absolute;top:10px;left:10px;background:#000;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;}
.sold-ribbon{position:absolute;top:10px;right:10px;background:var(--bad);color:#fff;font-size:11px;font-weight:800;padding:5px 10px;border-radius:6px;letter-spacing:1px;}
.car-body{padding:16px;}
.car-title{font-size:16.5px;font-weight:800;margin-bottom:4px;}
.car-specs{font-size:12px;color:var(--muted);margin-bottom:10px;}
.car-price{color:var(--gold);font-size:19px;font-weight:900;margin-bottom:12px;}
.car-actions{display:flex;gap:8px;} .car-actions .btn{flex:1;padding:10px;font-size:12.5px;}
.no-cars{text-align:center;padding:60px 20px;color:var(--muted);background:var(--card);border-radius:16px;border:1px dashed var(--line);}
.trust{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.trust .wrap{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:32px 24px;}
@media(max-width:800px){.trust .wrap{grid-template-columns:1fr 1fr;}}
.trust-item{display:flex;gap:14px;align-items:center;}
.trust-ic{width:42px;height:42px;border-radius:10px;background:rgba(232,185,35,.12);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;}
.trust-item b{display:block;font-size:14.5px;} .trust-item span{color:var(--muted);font-size:12.5px;}
footer{background:#000;padding:46px 0 20px;}
.foot-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.2fr;gap:28px;margin-bottom:28px;}
@media(max-width:800px){.foot-grid{grid-template-columns:1fr 1fr;}}
.foot-grid h4{color:var(--gold);font-size:12.5px;letter-spacing:1.5px;margin-bottom:14px;}
.foot-grid p,.foot-grid a{display:block;color:var(--muted);font-size:13.5px;margin-bottom:9px;}
.foot-brand{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.foot-bottom{border-top:1px solid var(--line);padding-top:18px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;color:var(--muted);font-size:12.5px;}
.admin-link{color:var(--muted);font-size:12px;text-decoration:underline;background:none;border:none;cursor:pointer;}
.maps-embed{width:100%;height:190px;border:0;border-radius:12px;margin-top:6px;filter:grayscale(.3) contrast(1.1);}
.float-wa{position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;background:var(--wa);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.4);z-index:60;}
.wa-icon{width:28px;height:28px;fill:#fff;}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;align-items:center;justify-content:center;padding:20px;}
.modal-bg.open{display:flex;}
.modal{background:var(--light-bg);color:#111;border-radius:16px;max-width:760px;width:100%;max-height:88vh;overflow:auto;position:relative;}
.modal-close{position:absolute;top:14px;right:14px;background:#111;color:#fff;width:34px;height:34px;border-radius:50%;border:none;font-size:16px;z-index:2;}
.modal-gallery{display:flex;gap:6px;overflow-x:auto;padding:12px;} .modal-gallery img{width:150px;height:106px;object-fit:cover;border-radius:8px;flex-shrink:0;}
.modal-content{padding:0 26px 26px;} .modal-content h3{font-size:23px;margin-bottom:4px;}
.modal-sold{display:inline-block;background:var(--bad);color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px;margin-bottom:8px;letter-spacing:1px;}
.modal-price{color:var(--gold2);font-size:21px;font-weight:900;margin:8px 0 14px;}
.modal-specs{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0;font-size:13.5px;}
.modal-specs div{background:#efece2;padding:9px 12px;border-radius:8px;}
.modal-desc{font-size:13.5px;color:#333;margin-bottom:16px;white-space:pre-line;}
.modal-actions{display:flex;gap:10px;flex-wrap:wrap;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--good);color:#000;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;z-index:300;display:none;}
/* admin */
.gate-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;}
.gate-box{background:var(--card);padding:36px;border-radius:16px;width:320px;text-align:center;border:1px solid var(--line);}
.gate-box input{width:100%;padding:12px;border-radius:8px;border:1px solid var(--line);margin:16px 0;background:#111;color:#fff;}
.admin-header{background:#000;border-bottom:1px solid var(--line);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:20;flex-wrap:wrap;gap:10px;}
.admin-wrap{max-width:1120px;margin:0 auto;padding:28px 24px;}
.admin-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
@media(max-width:800px){.admin-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:520px){.admin-grid{grid-template-columns:1fr;}}
.admin-grid label{font-size:11.5px;color:var(--muted);display:block;margin-bottom:6px;font-weight:700;}
.admin-grid input,.admin-grid select,.admin-grid textarea{width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;margin-bottom:12px;}
.admin-grid textarea{grid-column:1/-1;min-height:80px;} .admin-grid .full{grid-column:1/-1;}
.thumb-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;} .thumb-row img{width:68px;height:54px;object-fit:cover;border-radius:6px;}
.admin-list{margin-top:34px;}
.admin-row{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;flex-wrap:wrap;}
.admin-row img{width:68px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;}
.admin-row .info{flex:1;min-width:160px;} .admin-row .info b{display:block;font-size:14px;} .admin-row .info span{color:var(--muted);font-size:12px;}
.admin-row .acts{display:flex;gap:8px;flex-wrap:wrap;}
.admin-row .acts button{padding:8px 12px;border-radius:6px;border:none;font-size:11.5px;font-weight:700;}
.icon-btn{padding:8px 14px;border-radius:8px;border:1px solid var(--line);background:transparent;color:#fff;font-size:13px;}
.pill-sold{background:var(--bad);color:#fff;font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;margin-left:8px;}
.chk-inline{display:flex;align-items:center;gap:8px;grid-column:1/-1;margin-bottom:12px;color:var(--muted);font-size:13px;}
`;

// SVG whatsapp glyph reused across pages
const WA_SVG = `<svg class="wa-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16.04 3C9.37 3 3.96 8.36 3.96 15c0 2.2.6 4.28 1.66 6.06L4 29l8.15-2.14a12.9 12.9 0 0 0 3.89.61c6.67 0 12.08-5.36 12.08-12S22.7 3 16.04 3zm0 21.9c-1.28 0-2.53-.24-3.7-.72l-.27-.1-4.84 1.27 1.3-4.72-.18-.29a9.83 9.83 0 0 1-1.53-5.34c0-5.46 4.46-9.9 9.96-9.9 5.5 0 9.96 4.44 9.96 9.9s-4.46 9.9-9.96 9.9zm5.46-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.47 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>`;

const PUBLIC_JS = `
function money(n){ return 'KSh ' + Number(n).toLocaleString(); }
function placeholderImg(make){
  const txt = encodeURIComponent(make || 'CAR');
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%23222'/><text x='50%' y='50%' fill='%23888' font-size='24' text-anchor='middle' dy='.3em' font-family='Arial'>"+txt+"</text></svg>";
}
const WA_ICON = ${JSON.stringify(WA_SVG)};
let SETTINGS = {}, CARS = [], META = {};

async function boot(){
  SETTINGS = await (await fetch('/api/settings')).json();
  META = await (await fetch('/api/meta')).json();
  applySettings(); populateFilters();
  await loadCars();
}
function applySettings(){
  document.documentElement.style.setProperty('--gold', SETTINGS.colorGold);
  document.documentElement.style.setProperty('--bg', SETTINGS.colorBg);
  document.getElementById('logoInitial').textContent = SETTINGS.name.charAt(0);
  document.querySelector('.brand h1').textContent = SETTINGS.name;
  document.querySelector('.tag').textContent = SETTINGS.tagline;
  const hp = document.getElementById('headerPhone');
  hp.href = 'tel:' + SETTINGS.phone1.replace(/\s/g,''); hp.innerHTML = '📞 ' + SETTINGS.phone1;
  document.getElementById('footLocationLine1').textContent = SETTINGS.locShort;
  document.getElementById('footPhoneWa').textContent = SETTINGS.phone1;
  document.getElementById('footAbout').textContent = SETTINGS.about;
  document.getElementById('footAddress').textContent = SETTINGS.address;
  const p1 = document.getElementById('footPhone1'); p1.textContent = SETTINGS.phone1; p1.href='tel:'+SETTINGS.phone1.replace(/\s/g,'');
  const p2 = document.getElementById('footPhone2'); p2.textContent = SETTINGS.phone2; p2.href='tel:'+SETTINGS.phone2.replace(/\s/g,'');
  const em = document.getElementById('footEmail'); em.textContent = SETTINGS.email; em.href='mailto:'+SETTINGS.email;
  document.getElementById('waFloat').href = 'https://wa.me/' + SETTINGS.wa;
  document.getElementById('waFloat').innerHTML = WA_ICON;
  const mapEl = document.getElementById('mapsEmbed');
  if(mapEl) mapEl.src = 'https://www.google.com/maps?q=' + encodeURIComponent(SETTINGS.address) + '&output=embed';
}
function populateFilters(){
  document.getElementById('fMake').innerHTML = '<option value="">All Makes</option>' + META.makes.map(m=>'<option>'+m+'</option>').join('');
  document.getElementById('fBody').innerHTML = '<option value="">All Body Types</option>' + META.bodyTypes.map(b=>'<option>'+b+'</option>').join('');
  document.getElementById('fCondition').innerHTML = '<option value="">All Conditions</option>' + META.conditions.map(c=>'<option>'+c+'</option>').join('');
  document.getElementById('fFuel').innerHTML = '<option value="">All Fuel Types</option>' + META.fuelTypes.map(f=>'<option>'+f+'</option>').join('');
}
function buildQuery(){
  const params = new URLSearchParams();
  const q = document.getElementById('fSearch').value.trim();
  const make = document.getElementById('fMake').value;
  const body = document.getElementById('fBody').value;
  const cond = document.getElementById('fCondition').value;
  const fuel = document.getElementById('fFuel').value;
  const minP = document.getElementById('fMinPrice').value;
  const maxP = document.getElementById('fMaxPrice').value;
  const sort = document.getElementById('fSort').value;
  const includeSold = document.getElementById('fIncludeSold').checked;
  if(q) params.set('q', q);
  if(make) params.set('make', make);
  if(body) params.set('body', body);
  if(cond) params.set('condition', cond);
  if(fuel) params.set('fuel', fuel);
  if(minP) params.set('minPrice', minP);
  if(maxP) params.set('maxPrice', maxP);
  if(sort) params.set('sort', sort);
  if(!includeSold) params.set('sold', 'false');
  return params.toString();
}
async function loadCars(){
  const qs = buildQuery();
  CARS = await (await fetch('/api/cars' + (qs?('?'+qs):''))).json();
  renderMakesStrip();
  renderCars(CARS);
}
async function applyFilters(){ await loadCars(); }
function resetFilters(){
  document.getElementById('fSearch').value='';
  document.getElementById('fMake').value='';
  document.getElementById('fBody').value='';
  document.getElementById('fCondition').value='';
  document.getElementById('fFuel').value='';
  document.getElementById('fMinPrice').value='';
  document.getElementById('fMaxPrice').value='';
  document.getElementById('fSort').value='';
  document.getElementById('fIncludeSold').checked=false;
  loadCars();
}
async function renderMakesStrip(){
  const all = await (await fetch('/api/cars?sold=false')).json();
  const counts = {};
  all.forEach(c => counts[c.make] = (counts[c.make]||0)+1);
  const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).slice(0,16);
  const grid = document.getElementById('makesGrid'); grid.innerHTML = '';
  top.forEach(make => {
    const div = document.createElement('div'); div.className='make-card';
    div.onclick = () => { document.getElementById('fMake').value = make; applyFilters(); window.scrollTo({top:document.getElementById('stockSection').offsetTop-70, behavior:'smooth'}); };
    div.innerHTML = '<div class="make-avatar">'+make.charAt(0)+'</div><b>'+make+'</b><span>'+counts[make]+' Car'+(counts[make]>1?'s':'')+'</span>';
    grid.appendChild(div);
  });
  document.getElementById('stockCountBadge').textContent = all.length + ' CARS IN STOCK';
}
function waLink(car){
  return 'https://wa.me/'+SETTINGS.wa+'?text='+encodeURIComponent('Hi, I am interested in the '+car.year+' '+car.make+' '+car.model+' listed at '+money(car.price));
}
function renderCars(list){
  const grid = document.getElementById('carsGrid'); grid.innerHTML='';
  document.getElementById('availableCount').textContent = list.length;
  if(!list.length){ grid.innerHTML = '<div class="no-cars" style="grid-column:1/-1;">No cars match your search. Try clearing filters or check back soon.</div>'; return; }
  list.forEach(car => {
    const img = (car.photos && car.photos[0]) ? car.photos[0] : placeholderImg(car.make);
    const div = document.createElement('div'); div.className='car-card' + (car.sold?' is-sold':'');
    div.innerHTML = '<div class="car-img"><span class="car-tag">'+car.condition+'</span>'+(car.sold?'<span class="sold-ribbon">SOLD</span>':'')+'<img src="'+img+'"></div>'+
      '<div class="car-body"><div class="car-title">'+car.year+' '+car.make+' '+car.model+'</div>'+
      '<div class="car-specs">'+(car.mileage? car.mileage.toLocaleString()+' km • ':'')+(car.trans||'')+' • '+car.body+' • '+(car.fuel||'')+'</div>'+
      '<div class="car-price">'+money(car.price)+'</div>'+
      '<div class="car-actions"><button class="btn btn-gold" onclick="openModal('+car.id+')">Details</button>'+
      '<a class="btn btn-wa" href="'+waLink(car)+'" target="_blank">'+WA_ICON+' WhatsApp</a></div></div>';
    grid.appendChild(div);
  });
}
function openModal(id){
  const car = CARS.find(c=>c.id===id); if(!car) return;
  document.getElementById('modalTitle').textContent = car.year+' '+car.make+' '+car.model;
  document.getElementById('modalSold').style.display = car.sold ? 'inline-block' : 'none';
  document.getElementById('modalPrice').textContent = money(car.price);
  document.getElementById('modalSpecs').innerHTML =
    '<div>Mileage: '+(car.mileage? car.mileage.toLocaleString()+' km':'N/A')+'</div>'+
    '<div>Transmission: '+(car.trans||'N/A')+'</div>'+
    '<div>Body: '+car.body+'</div>'+
    '<div>Condition: '+car.condition+'</div>'+
    '<div>Fuel: '+(car.fuel||'N/A')+'</div>'+
    '<div>Drivetrain: '+(car.drivetrain||'N/A')+'</div>'+
    '<div>Color: '+(car.color||'N/A')+'</div>'+
    '<div>Year: '+car.year+'</div>';
  document.getElementById('modalDesc').textContent = car.desc || '';
  const imgs = (car.photos && car.photos.length) ? car.photos : [placeholderImg(car.make)];
  document.getElementById('modalGallery').innerHTML = imgs.map(p=>'<img src="'+p+'">').join('');
  const waBtn = document.getElementById('modalWa');
  waBtn.href = waLink(car); waBtn.innerHTML = WA_ICON + ' WhatsApp Inquiry';
  document.getElementById('modalCall').href = 'tel:' + SETTINGS.phone1.replace(/\s/g,'');
  document.getElementById('carModal').classList.add('open');
}
function closeModal(){ document.getElementById('carModal').classList.remove('open'); }
boot();
`;

const ADMIN_JS = `
let SETTINGS = {}, CARS = [], META = {}, editingId = null;
function money(n){ return 'KSh ' + Number(n).toLocaleString(); }
function placeholderImg(make){
  const txt = encodeURIComponent(make || 'CAR');
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%23222'/><text x='50%' y='50%' fill='%23888' font-size='24' text-anchor='middle' dy='.3em' font-family='Arial'>"+txt+"</text></svg>";
}
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(window._tt); window._tt=setTimeout(()=>t.style.display='none',2200); }

async function boot(){
  const s = await (await fetch('/api/session')).json();
  if(!s.isAdmin){ document.getElementById('gate').style.display='flex'; document.getElementById('panel').style.display='none'; return; }
  document.getElementById('gate').style.display='none'; document.getElementById('panel').style.display='block';
  META = await (await fetch('/api/meta')).json();
  populateMeta();
  await loadAll();
}
function populateMeta(){
  document.getElementById('makesList').innerHTML = META.makes.map(m=>'<option value="'+m+'">').join('');
  document.getElementById('cBody').innerHTML = META.bodyTypes.map(b=>'<option>'+b+'</option>').join('');
  document.getElementById('cCondition').innerHTML = META.conditions.map(c=>'<option>'+c+'</option>').join('');
  document.getElementById('cFuel').innerHTML = META.fuelTypes.map(f=>'<option>'+f+'</option>').join('');
  document.getElementById('cDrivetrain').innerHTML = META.drivetrains.map(d=>'<option>'+d+'</option>').join('');
  document.getElementById('cTrans').innerHTML = META.transmissions.map(t=>'<option>'+t+'</option>').join('');
}
async function loadAll(){
  SETTINGS = await (await fetch('/api/settings')).json();
  CARS = await (await fetch('/api/cars')).json(); // no sold filter => returns every listing
  fillSettingsForm(); renderAdminList();
}
async function login(){
  const pw = document.getElementById('gatePw').value;
  const r = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pw})});
  if(r.ok){ document.getElementById('gate').style.display='none'; document.getElementById('panel').style.display='block';
    META = await (await fetch('/api/meta')).json(); populateMeta(); await loadAll(); }
  else showToast('Incorrect password');
}
async function logout(){ await fetch('/api/logout',{method:'POST'}); location.reload(); }

function fillSettingsForm(){
  document.getElementById('setName').value=SETTINGS.name;
  document.getElementById('setTagline').value=SETTINGS.tagline;
  document.getElementById('setPhone1').value=SETTINGS.phone1;
  document.getElementById('setWa').value=SETTINGS.wa;
  document.getElementById('setPhone2').value=SETTINGS.phone2;
  document.getElementById('setEmail').value=SETTINGS.email;
  document.getElementById('setAddress').value=SETTINGS.address;
  document.getElementById('setLocShort').value=SETTINGS.locShort;
  document.getElementById('setColorGold').value=SETTINGS.colorGold;
  document.getElementById('setColorBg').value=SETTINGS.colorBg;
  document.getElementById('setAbout').value=SETTINGS.about;
}
async function saveSettings(){
  const body = {
    name:val('setName'), tagline:val('setTagline'), phone1:val('setPhone1'),
    wa:val('setWa').replace(/\D/g,''), phone2:val('setPhone2'), email:val('setEmail'),
    address:val('setAddress'), locShort:val('setLocShort'), colorGold:val('setColorGold'),
    colorBg:val('setColorBg'), about:val('setAbout')
  };
  const r = await fetch('/api/settings', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  SETTINGS = await r.json();
  showToast('Settings saved');
}
function val(id){ return document.getElementById(id).value; }

function previewThumbs(e){
  const row = document.getElementById('thumbRow'); row.innerHTML='';
  Array.from(e.target.files).forEach(f=>{
    const reader = new FileReader();
    reader.onload = ev => { const img=document.createElement('img'); img.src=ev.target.result; row.appendChild(img); };
    reader.readAsDataURL(f);
  });
}
function clearCarForm(){
  ['cMake','cModel','cYear','cPrice','cMileage','cColor','cDesc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cPhotos').value='';
  document.getElementById('cSold').checked=false;
  document.getElementById('thumbRow').innerHTML='';
  editingId=null;
  document.getElementById('cancelEditBtn').style.display='none';
  document.getElementById('formTitle').textContent='Add New Car';
}
async function saveCar(){
  const make = val('cMake').trim(), model = val('cModel').trim();
  if(!make || !model){ showToast('Make and Model are required'); return; }
  const fd = new FormData();
  fd.append('make', make); fd.append('model', model);
  fd.append('year', val('cYear')); fd.append('price', val('cPrice')); fd.append('mileage', val('cMileage'));
  fd.append('body', val('cBody')); fd.append('condition', val('cCondition')); fd.append('trans', val('cTrans'));
  fd.append('fuel', val('cFuel')); fd.append('drivetrain', val('cDrivetrain')); fd.append('color', val('cColor'));
  fd.append('desc', val('cDesc')); fd.append('sold', document.getElementById('cSold').checked);
  Array.from(document.getElementById('cPhotos').files).forEach(f => fd.append('photos', f));

  let r;
  if(editingId){ r = await fetch('/api/cars/'+editingId, {method:'PUT', body:fd}); showToast('Car updated'); }
  else { r = await fetch('/api/cars', {method:'POST', body:fd}); showToast('Car added'); }
  await r.json();
  clearCarForm();
  await loadAll();
}
function editCar(id){
  const car = CARS.find(c=>c.id===id); if(!car) return;
  editingId = id;
  document.getElementById('formTitle').textContent='Edit Car';
  document.getElementById('cMake').value=car.make;
  document.getElementById('cModel').value=car.model;
  document.getElementById('cYear').value=car.year;
  document.getElementById('cPrice').value=car.price;
  document.getElementById('cMileage').value=car.mileage;
  document.getElementById('cBody').value=car.body;
  document.getElementById('cCondition').value=car.condition;
  document.getElementById('cTrans').value=car.trans;
  document.getElementById('cFuel').value=car.fuel||'Petrol';
  document.getElementById('cDrivetrain').value=car.drivetrain||'FWD';
  document.getElementById('cColor').value=car.color||'';
  document.getElementById('cDesc').value=car.desc;
  document.getElementById('cSold').checked=!!car.sold;
  document.getElementById('thumbRow').innerHTML = (car.photos||[]).map(p=>'<img src="'+p+'">').join('');
  document.getElementById('cancelEditBtn').style.display='inline-flex';
  window.scrollTo({top:0, behavior:'smooth'});
}
function cancelEdit(){ clearCarForm(); }
async function deleteCar(id){
  if(!confirm('Delete this listing?')) return;
  await fetch('/api/cars/'+id, {method:'DELETE'});
  showToast('Car deleted');
  await loadAll();
}
async function toggleSold(id){
  await fetch('/api/cars/'+id+'/sold', {method:'PATCH'});
  await loadAll();
}
function renderAdminList(){
  const wrap = document.getElementById('adminListing');
  document.getElementById('adminCount').textContent = CARS.length;
  wrap.innerHTML = '';
  CARS.slice().reverse().forEach(car => {
    const img = (car.photos && car.photos[0]) ? car.photos[0] : placeholderImg(car.make);
    const row = document.createElement('div'); row.className='admin-row';
    row.innerHTML = '<img src="'+img+'"><div class="info"><b>'+car.year+' '+car.make+' '+car.model+(car.sold?'<span class="pill-sold">SOLD</span>':'')+'</b><span>'+money(car.price)+' • '+car.condition+'</span></div>'+
      '<div class="acts"><button style="background:#333;color:#fff;" onclick="editCar('+car.id+')">Edit</button>'+
      '<button style="background:'+(car.sold?'#3ecf6e':'#c99b16')+';color:#111;" onclick="toggleSold('+car.id+')">'+(car.sold?'Mark Available':'Mark Sold')+'</button>'+
      '<button style="background:#c0392b;color:#fff;" onclick="deleteCar('+car.id+')">Delete</button></div>';
    wrap.appendChild(row);
  });
}
boot();
`;

function siteHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EMJ Motors Ltd — Premium Imports Nairobi</title>
<link rel="stylesheet" href="/style.css"></head><body>
<div id="site">
<header><div class="wrap"><div class="brand">
  <div class="logo-circle" id="logoInitial">E</div>
  <div><h1>EMJ MOTORS LTD</h1><div class="tag">PREMIUM IMPORTS • NAIROBI</div></div>
</div><a class="call-btn" id="headerPhone" href="tel:+254799566458">📞 +254 799 566 458</a></div></header>

<section class="hero"><div class="wrap">
  <div class="badge"><span class="dot"></span> <span id="stockCountBadge">0 CARS IN STOCK</span> • QISJ VERIFIED</div>
  <h2>DRIVE YOUR DREAM<span class="gold">TODAY IN NAIROBI</span></h2>
  <p>Foreign used premium imports with 50% deposit &amp; balance up to 24 months. Every unit QISJ verified mileage.</p>
  <div class="filters">
    <div class="field"><label>Search</label><input id="fSearch" placeholder="e.g. Toyota Axio"></div>
    <div class="field"><label>Make</label><select id="fMake"><option value="">All Makes</option></select></div>
    <div class="field"><label>Body Type</label><select id="fBody"><option value="">All Body Types</option></select></div>
    <div class="field"><label>Condition</label><select id="fCondition"><option value="">All Conditions</option></select></div>
    <div class="field"><label>Fuel</label><select id="fFuel"><option value="">All Fuel Types</option></select></div>
    <div class="field"><label>Sort</label>
      <select id="fSort"><option value="">Default</option><option value="newest">Newest First</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="year_desc">Year: Newest</option></select>
    </div>
    <button class="btn btn-gold" onclick="applyFilters()">🔍 SEARCH</button>
  </div>
  <div class="filters-row2">
    <div class="field" style="min-width:140px;"><label>Min Price (KSh)</label><input id="fMinPrice" type="number" placeholder="0"></div>
    <div class="field" style="min-width:140px;"><label>Max Price (KSh)</label><input id="fMaxPrice" type="number" placeholder="Any"></div>
    <label class="chk"><input type="checkbox" id="fIncludeSold" onchange="applyFilters()"> Include sold cars</label>
    <button class="view-all" onclick="resetFilters()">Reset filters</button>
  </div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><h2>BROWSE BY MAKE</h2></div>
  <div class="makes-grid" id="makesGrid"></div>
</div></section>

<section id="stockSection" style="padding-top:0;"><div class="wrap">
  <div class="section-head"><h2>CURRENT STOCK</h2><div class="stock-badge"><span class="dot"></span> <span id="availableCount">0</span> Showing</div></div>
  <div class="cars-grid" id="carsGrid"></div>
</div></section>

<section class="trust" style="padding:0;"><div class="wrap">
  <div class="trust-item"><div class="trust-ic">🛡️</div><div><b>QISJ Verified</b><span>Mileage &amp; Auction Sheet</span></div></div>
  <div class="trust-item"><div class="trust-ic">✅</div><div><b>50% Deposit</b><span>Balance 24 Months</span></div></div>
  <div class="trust-item"><div class="trust-ic">📍</div><div><b id="footLocationLine1">Ngong Road</b><span>Showroom</span></div></div>
  <div class="trust-item"><div class="trust-ic">📞</div><div><b id="footPhoneWa">0799 566 458</b><span>WhatsApp Anytime</span></div></div>
</div></section>

<footer><div class="wrap">
  <div class="foot-grid">
    <div><div class="foot-brand"><div class="logo-circle" style="width:40px;height:40px;">E</div>
      <div><b>EMJ MOTORS LTD</b><div style="color:var(--gold);font-size:11px;">PREMIUM IMPORTS</div></div></div>
      <p id="footAbout"></p></div>
    <div><h4>QUICK LINKS</h4><a href="#">Home</a><a href="#stockSection">Stock</a><a href="#">About Us</a><a href="#">How To Buy</a><a href="#">FAQ</a></div>
    <div><h4>CONTACT</h4><p id="footAddress"></p><a id="footPhone1" href="#"></a><a id="footPhone2" href="#"></a><a id="footEmail" href="#"></a></div>
    <div><h4>FIND US</h4><iframe id="mapsEmbed" class="maps-embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div>
  <div class="foot-bottom"><span>© 2026 EMJ Motors Ltd. All rights reserved. QISJ Verified Dealer.</span>
  <a class="admin-link" href="/admin">Admin Login</a></div>
</div></footer>
<a class="float-wa" id="waFloat" href="#" target="_blank"></a>
</div>

<div class="modal-bg" id="carModal"><div class="modal">
  <button class="modal-close" onclick="closeModal()">✕</button>
  <div class="modal-gallery" id="modalGallery"></div>
  <div class="modal-content">
    <span class="modal-sold" id="modalSold" style="display:none;">SOLD</span>
    <h3 id="modalTitle"></h3><div class="modal-price" id="modalPrice"></div>
    <div class="modal-specs" id="modalSpecs"></div><div class="modal-desc" id="modalDesc"></div>
    <div class="modal-actions">
      <a class="btn btn-wa" id="modalWa" target="_blank"></a>
      <a class="btn btn-dark" id="modalCall">📞 Call Dealer</a>
    </div>
  </div>
</div></div>
<div class="toast" id="toast"></div>
<script src="/app.js"></script>
</body></html>`;
}

function adminHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EMJ Motors — Admin</title><link rel="stylesheet" href="/style.css"></head><body>

<div id="gate" class="gate-wrap" style="display:none;">
  <div class="gate-box">
    <div class="logo-circle" style="margin:0 auto 14px;">E</div>
    <h3>Admin Login</h3>
    <input type="password" id="gatePw" placeholder="Enter admin password">
    <button class="btn btn-gold" style="width:100%;" onclick="login()">Enter</button>
    <div style="margin-top:14px;"><a class="admin-link" href="/">Back to site</a></div>
  </div>
</div>

<div id="panel" style="display:none;">
  <div class="admin-header">
    <div class="brand"><div class="logo-circle" style="width:36px;height:36px;">E</div><b>EMJ Admin Dashboard</b></div>
    <div style="display:flex;gap:10px;">
      <a class="icon-btn" href="/">🌐 View Site</a>
      <button class="icon-btn" onclick="logout()">🚪 Logout</button>
    </div>
  </div>
  <div class="admin-wrap">
    <h2 style="margin-bottom:6px;">Site Settings</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">Contact info, location and colours shown across the site.</p>
    <div class="admin-grid" style="margin-bottom:30px;">
      <div><label>Business Name</label><input id="setName"></div>
      <div><label>Tagline</label><input id="setTagline"></div>
      <div><label>Primary Phone</label><input id="setPhone1"></div>
      <div><label>WhatsApp Number (digits only)</label><input id="setWa"></div>
      <div><label>Secondary Phone</label><input id="setPhone2"></div>
      <div><label>Email</label><input id="setEmail"></div>
      <div><label>Address Line</label><input id="setAddress"></div>
      <div><label>Location Short</label><input id="setLocShort"></div>
      <div><label>Accent Colour</label><input id="setColorGold" type="color"></div>
      <div><label>Background Colour</label><input id="setColorBg" type="color"></div>
      <div class="full"><label>About Text</label><textarea id="setAbout"></textarea></div>
    </div>
    <button class="btn btn-gold" onclick="saveSettings()">💾 Save Settings</button>

    <h2 style="margin:40px 0 6px;" id="formTitle">Add New Car</h2>
    <div class="admin-grid">
      <div><label>Make</label><input id="cMake" list="makesList" placeholder="Toyota"><datalist id="makesList"></datalist></div>
      <div><label>Model</label><input id="cModel" placeholder="Axio"></div>
      <div><label>Year</label><input id="cYear" type="number" placeholder="2015"></div>
      <div><label>Price (KSh)</label><input id="cPrice" type="number" placeholder="1450000"></div>
      <div><label>Mileage (km)</label><input id="cMileage" type="number" placeholder="65000"></div>
      <div><label>Color</label><input id="cColor" placeholder="White"></div>
      <div><label>Body Type</label><select id="cBody"></select></div>
      <div><label>Condition</label><select id="cCondition"></select></div>
      <div><label>Transmission</label><select id="cTrans"></select></div>
      <div><label>Fuel Type</label><select id="cFuel"></select></div>
      <div><label>Drivetrain</label><select id="cDrivetrain"></select></div>
      <label class="chk-inline"><input type="checkbox" id="cSold"> Mark this car as SOLD</label>
      <div class="full"><label>Description</label><textarea id="cDesc" placeholder="Well maintained, single owner..."></textarea></div>
      <div class="full"><label>Photos (multiple)</label><input type="file" id="cPhotos" accept="image/*" multiple onchange="previewThumbs(event)"><div class="thumb-row" id="thumbRow"></div></div>
    </div>
    <button class="btn btn-gold" onclick="saveCar()">➕ Save Car</button>
    <button class="btn btn-outline" id="cancelEditBtn" style="display:none;" onclick="cancelEdit()">Cancel Edit</button>

    <div class="admin-list">
      <h2 style="margin-bottom:16px;">All Listings (<span id="adminCount">0</span>)</h2>
      <div id="adminListing"></div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script src="/admin.js"></script>
</body></html>`;
}

app.get('/style.css', (req, res) => { res.type('text/css').send(STYLE_CSS); });
app.get('/app.js', (req, res) => { res.type('application/javascript').send(PUBLIC_JS); });
app.get('/admin.js', (req, res) => { res.type('application/javascript').send(ADMIN_JS); });
app.get('/', (req, res) => res.send(siteHTML()));
app.get('/admin', (req, res) => res.send(adminHTML()));

app.listen(PORT, () => {
  console.log(`EMJ Motors running at http://localhost:${PORT}`);
  console.log(`Admin panel at   http://localhost:${PORT}/admin  (password: ${ADMIN_PASSWORD})`);
});
