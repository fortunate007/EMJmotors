/* ============ EMJ MOTORS LTD — v4.0 ============ */
const express=require('express'),session=require('express-session'),multer=require('multer'),bcrypt=require('bcryptjs'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'emj2026';
const DB_FILE=path.join(__dirname,'db.json');
const UPLOAD_DIR=path.join(__dirname,'uploads');
if(!fs.existsSync(UPLOAD_DIR))fs.mkdirSync(UPLOAD_DIR);

const MAKES=['Toyota','Nissan','Mazda','Honda','Subaru','Suzuki','Mitsubishi','Isuzu','Daihatsu','Datsun','Mercedes-Benz','BMW','Audi','Volkswagen','Porsche','Opel','Mini','Ford','Chevrolet','GMC','Cadillac','Lincoln','Chrysler','Dodge','Jeep','Tesla','Buick','Hyundai','Kia','Genesis','Lexus','Infiniti','Acura','Land Rover','Range Rover','Jaguar','Volvo','Peugeot','Renault','Citroen','Fiat','Alfa Romeo','Skoda','Seat','Bentley','Rolls-Royce','Lamborghini','Ferrari','Aston Martin','Maserati','Great Wall','Haval','BYD','Mahindra','Tata'];
const BODY_TYPES=['Sedan','SUV','Hatchback','Wagon','Pickup','Van','Minivan','Coupe','Convertible','Crossover','Truck'];
const CONDITIONS=['Brand New','Foreign Used','Locally Used','Import On Order'];
const FUEL_TYPES=['Petrol','Diesel','Hybrid','Electric'];
const DRIVETRAINS=['FWD','RWD','AWD','4WD'];
const TRANSMISSIONS=['Automatic','Manual'];

const defaultSettings={name:'EMJ MOTORS LTD',tagline:'SALES • IMPORTS • FINANCING • NAIROBI',phone1:'+254 799 566 458',phone2:'+254 727 073 958',wa:'254727073958',email:'info@emjmotors.co.ke',address:'Ngong Road, Kilimani, Nairobi',locShort:'Ngong Road',about:"Nairobi's full-service dealership — brand new, foreign used, locally used and custom imports on order. QISJ verified. Financing arranged.",colorGold:'#d4a017',colorBg:'#f8f7f3',facebook:'https://facebook.com/emjmotors',instagram:'https://instagram.com/emjmotors',tiktok:'https://tiktok.com/@emjmotors'};
const sampleCars=[
{id:1,make:'Toyota',model:'Axio',year:2015,price:1450000,mileage:65000,body:'Sedan',condition:'Foreign Used',trans:'Automatic',fuel:'Petrol',drivetrain:'FWD',color:'White',desc:'Well maintained, single owner, full service history. QISJ verified mileage and auction sheet available on request.',photos:[],sold:false},
{id:2,make:'Nissan',model:'X-Trail',year:2016,price:2350000,mileage:58000,body:'SUV',condition:'Foreign Used',trans:'Automatic',fuel:'Petrol',drivetrain:'AWD',color:'Silver',desc:'Spacious family SUV, 4WD, clean interior, recently serviced.',photos:[],sold:false},
{id:3,make:'Mazda',model:'Demio',year:2017,price:1150000,mileage:41000,body:'Hatchback',condition:'Foreign Used',trans:'Automatic',fuel:'Petrol',drivetrain:'FWD',color:'Blue',desc:'Fuel efficient, low mileage, ideal first car.',photos:[],sold:false},
{id:4,make:'Toyota',model:'Prado',year:2018,price:6800000,mileage:72000,body:'SUV',condition:'Foreign Used',trans:'Automatic',fuel:'Diesel',drivetrain:'4WD',color:'Black',desc:'Well kept TX-L trim, leather seats, sunroof, full service history.',photos:[],sold:true},
{id:5,make:'Mercedes-Benz',model:'C200',year:2019,price:5200000,mileage:35000,body:'Sedan',condition:'Foreign Used',trans:'Automatic',fuel:'Petrol',drivetrain:'RWD',color:'Grey',desc:'AMG line, one owner, dealer serviced throughout.',photos:[],sold:false},
{id:6,make:'Subaru',model:'Forester',year:2017,price:2650000,mileage:61000,body:'Wagon',condition:'Foreign Used',trans:'Automatic',fuel:'Petrol',drivetrain:'AWD',color:'Green',desc:'Symmetrical AWD, great for upcountry runs, new tyres.',photos:[],sold:false}];
const sampleOffers=[
{id:1,title:'Free QISJ Mileage Verification',badge:'LIMITED TIME',description:'Book any foreign used vehicle this month and get free QISJ mileage verification worth KSh 15,000.',ctaText:'Claim Offer',ctaLink:'https://wa.me/254727073958',image:'',expiry:'',active:true,order:1},
{id:2,title:'0% Interest for 3 Months',badge:'HOT DEAL',description:'Pay 50% deposit and enjoy zero interest on your balance for the first three months.',ctaText:'Learn How',ctaLink:'/how-to-buy',image:'',expiry:'',active:true,order:2},
{id:3,title:'Free First Service',badge:'NEW',description:'Every vehicle purchased this quarter comes with a complimentary first service.',ctaText:'Book Now',ctaLink:'https://wa.me/254727073958',image:'',expiry:'',active:true,order:3}];

function loadDB(){
  if(!fs.existsSync(DB_FILE)){const i={cars:sampleCars,offers:sampleOffers,settings:defaultSettings,nextId:sampleCars.length+1,nextOfferId:sampleOffers.length+1};fs.writeFileSync(DB_FILE,JSON.stringify(i,null,2));return i;}
  const db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
  if(!db.settings)db.settings=defaultSettings;
  if(!db.cars)db.cars=[];
  if(!db.offers)db.offers=sampleOffers;
  if(!db.nextId)db.nextId=db.cars.reduce((m,c)=>Math.max(m,c.id),0)+1;
  if(!db.nextOfferId)db.nextOfferId=db.offers.reduce((m,c)=>Math.max(m,c.id),0)+1;
  return db;
}
function saveDB(db){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}

const app=express();
app.use(express.json());
app.use('/uploads',express.static(UPLOAD_DIR));
app.use(session({secret:process.env.SESSION_SECRET||'emj-secret',resave:false,saveUninitialized:false,cookie:{maxAge:1000*60*60*8}}));
const passwordHash=bcrypt.hashSync(ADMIN_PASSWORD,8);
function requireAdmin(rq,rs,nx){if(rq.session&&rq.session.isAdmin)return nx();return rs.status(401).json({error:'Not authenticated'});}
const storage=multer.diskStorage({destination:(rq,f,cb)=>cb(null,UPLOAD_DIR),filename:(rq,f,cb)=>cb(null,Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(f.originalname))});
const upload=multer({storage,limits:{fileSize:8*1024*1024}});

app.post('/api/login',(rq,rs)=>{const{password}=rq.body||{};if(password&&bcrypt.compareSync(password,passwordHash)){rq.session.isAdmin=true;return rs.json({ok:true});}rs.status(401).json({error:'Incorrect password'});});
app.post('/api/logout',(rq,rs)=>{rq.session.destroy(()=>rs.json({ok:true}));});
app.get('/api/session',(rq,rs)=>{rs.json({isAdmin:!!(rq.session&&rq.session.isAdmin)});});
app.get('/api/meta',(rq,rs)=>rs.json({makes:MAKES,bodyTypes:BODY_TYPES,conditions:CONDITIONS,fuelTypes:FUEL_TYPES,drivetrains:DRIVETRAINS,transmissions:TRANSMISSIONS}));
app.get('/api/settings',(rq,rs)=>rs.json(loadDB().settings));
app.put('/api/settings',requireAdmin,(rq,rs)=>{const db=loadDB();db.settings={...db.settings,...rq.body};saveDB(db);rs.json(db.settings);});

app.get('/api/cars',(rq,rs)=>{
  const db=loadDB();let l=db.cars;
  const{make,body,condition,fuel,minPrice,maxPrice,q,sold,sort}=rq.query;
  if(make)l=l.filter(c=>c.make===make);
  if(body)l=l.filter(c=>c.body===body);
  if(condition)l=l.filter(c=>c.condition===condition);
  if(fuel)l=l.filter(c=>c.fuel===fuel);
  if(minPrice)l=l.filter(c=>c.price>=+minPrice);
  if(maxPrice)l=l.filter(c=>c.price<=+maxPrice);
  if(sold==='false')l=l.filter(c=>!c.sold);
  if(sold==='true')l=l.filter(c=>c.sold);
  if(q){const n=q.toLowerCase();l=l.filter(c=>(c.make+' '+c.model).toLowerCase().includes(n));}
  if(sort==='price_asc')l=[...l].sort((a,b)=>a.price-b.price);
  if(sort==='price_desc')l=[...l].sort((a,b)=>b.price-a.price);
  if(sort==='year_desc')l=[...l].sort((a,b)=>b.year-a.year);
  if(sort==='newest')l=[...l].sort((a,b)=>b.id-a.id);
  rs.json(l);
});
app.get('/api/cars/:id',(rq,rs)=>{const c=loadDB().cars.find(x=>x.id===+rq.params.id);if(!c)return rs.status(404).json({error:'Not found'});rs.json(c);});
app.post('/api/cars',requireAdmin,upload.array('photos',12),(rq,rs)=>{const db=loadDB(),b=rq.body;const photos=(rq.files||[]).map(f=>'/uploads/'+f.filename);const car={id:db.nextId++,make:b.make||'',model:b.model||'',year:+b.year||new Date().getFullYear(),price:+b.price||0,mileage:+b.mileage||0,body:b.body||'Sedan',condition:b.condition||'Foreign Used',trans:b.trans||'Automatic',fuel:b.fuel||'Petrol',drivetrain:b.drivetrain||'FWD',color:b.color||'',desc:b.desc||'',sold:b.sold==='true'||b.sold===true,photos};db.cars.push(car);saveDB(db);rs.json(car);});
app.put('/api/cars/:id',requireAdmin,upload.array('photos',12),(rq,rs)=>{const db=loadDB();const i=db.cars.findIndex(c=>c.id===+rq.params.id);if(i===-1)return rs.status(404).json({error:'Not found'});const b=rq.body;const np=(rq.files||[]).map(f=>'/uploads/'+f.filename);const c=db.cars[i];Object.assign(c,{make:b.make??c.make,model:b.model??c.model,year:b.year?+b.year:c.year,price:b.price?+b.price:c.price,mileage:b.mileage?+b.mileage:c.mileage,body:b.body??c.body,condition:b.condition??c.condition,trans:b.trans??c.trans,fuel:b.fuel??c.fuel,drivetrain:b.drivetrain??c.drivetrain,color:b.color??c.color,desc:b.desc??c.desc,sold:b.sold!==undefined?(b.sold==='true'||b.sold===true):c.sold,photos:np.length?np:c.photos});saveDB(db);rs.json(c);});
app.patch('/api/cars/:id/sold',requireAdmin,(rq,rs)=>{const db=loadDB();const c=db.cars.find(x=>x.id===+rq.params.id);if(!c)return rs.status(404).json({error:'Not found'});c.sold=!c.sold;saveDB(db);rs.json(c);});
app.delete('/api/cars/:id',requireAdmin,(rq,rs)=>{const db=loadDB();const c=db.cars.find(x=>x.id===+rq.params.id);db.cars=db.cars.filter(x=>x.id!==+rq.params.id);saveDB(db);if(c)(c.photos||[]).forEach(p=>{const f=path.join(__dirname,p);if(fs.existsSync(f))fs.unlinkSync(f);});rs.json({ok:true});});

app.get('/api/offers',(rq,rs)=>{rs.json(loadDB().offers.filter(o=>o.active).sort((a,b)=>(a.order||0)-(b.order||0)));});
app.get('/api/offers/all',requireAdmin,(rq,rs)=>{rs.json(loadDB().offers.slice().sort((a,b)=>(a.order||0)-(b.order||0)));});
app.post('/api/offers',requireAdmin,upload.single('image'),(rq,rs)=>{const db=loadDB(),b=rq.body;const o={id:db.nextOfferId++,title:b.title||'',badge:b.badge||'',description:b.description||'',ctaText:b.ctaText||'Learn More',ctaLink:b.ctaLink||'/contact',image:rq.file?'/uploads/'+rq.file.filename:(b.imageUrl||''),expiry:b.expiry||'',active:b.active==='true'||b.active===true,order:+b.order||0};db.offers.push(o);saveDB(db);rs.json(o);});
app.put('/api/offers/:id',requireAdmin,upload.single('image'),(rq,rs)=>{const db=loadDB();const o=db.offers.find(x=>x.id===+rq.params.id);if(!o)return rs.status(404).json({error:'Not found'});const b=rq.body;Object.assign(o,{title:b.title??o.title,badge:b.badge??o.badge,description:b.description??o.description,ctaText:b.ctaText??o.ctaText,ctaLink:b.ctaLink??o.ctaLink,expiry:b.expiry??o.expiry,active:b.active!==undefined?(b.active==='true'||b.active===true):o.active,order:b.order?+b.order:o.order});if(rq.file)o.image='/uploads/'+rq.file.filename;else if(b.imageUrl!==undefined)o.image=b.imageUrl;saveDB(db);rs.json(o);});
app.patch('/api/offers/:id/toggle',requireAdmin,(rq,rs)=>{const db=loadDB();const o=db.offers.find(x=>x.id===+rq.params.id);if(!o)return rs.status(404).json({error:'Not found'});o.active=!o.active;saveDB(db);rs.json(o);});
app.delete('/api/offers/:id',requireAdmin,(rq,rs)=>{const db=loadDB();const o=db.offers.find(x=>x.id===+rq.params.id);db.offers=db.offers.filter(x=>x.id!==+rq.params.id);saveDB(db);if(o&&o.image&&o.image.startsWith('/uploads/')){const f=path.join(__dirname,o.image);if(fs.existsSync(f))fs.unlinkSync(f);}rs.json({ok:true});});

/* ============ STYLES ============ */
const STYLE_CSS=`
:root{--bg:#f8f7f3;--bg-soft:#f1efe8;--card:#fff;--text:#16161a;--text-soft:#3a3a42;--muted:#6b6b73;--line:#e5e2d9;--line-soft:#f0ede4;--gold:#d4a017;--gold2:#b8880f;--gold-soft:rgba(212,160,23,.10);--dark:#14141a;--dark2:#1f1f28;--good:#16a34a;--bad:#dc2626;--wa:#25D366;--shadow-sm:0 1px 3px rgba(0,0,0,.05);--shadow-md:0 4px 16px rgba(0,0,0,.06);--shadow-lg:0 12px 32px rgba(0,0,0,.08);}
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;}
h1,h2,h3,h4{font-family:'Arial Black',Arial,sans-serif;letter-spacing:-.01em;font-weight:900;line-height:1.15;}
a{color:inherit;text-decoration:none;}
button{font-family:inherit;cursor:pointer;}
img{max-width:100%;display:block;}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px;}
.gold{color:var(--gold);}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:999px;border:none;font-weight:700;font-size:14px;transition:all .2s;white-space:nowrap;}
.btn-gold{background:var(--gold);color:#fff;}.btn-gold:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 6px 16px rgba(212,160,23,.35);}
.btn-dark{background:var(--dark);color:#fff;}.btn-dark:hover{background:var(--dark2);}
.btn-outline{background:transparent;border:1.5px solid var(--gold);color:var(--gold);}.btn-outline:hover{background:var(--gold);color:#fff;}
.btn-wa{background:var(--wa);color:#fff;}.btn-wa:hover{filter:brightness(.94);}
.wa-icon{width:18px;height:18px;fill:currentColor;vertical-align:middle;}
.top-ticker{background:var(--dark);color:#fff;font-size:13px;font-weight:600;height:44px;overflow:hidden;position:relative;}
.ticker-content{position:relative;max-width:1240px;margin:0 auto;padding:0 24px;height:44px;}
.ticker-item{position:absolute;left:24px;top:50%;transform:translateY(-50%) translateX(-12px);opacity:0;transition:all .55s cubic-bezier(.4,0,.2,1);pointer-events:none;white-space:nowrap;display:flex;align-items:center;gap:10px;}
.ticker-item.active{opacity:1;transform:translateY(-50%) translateX(0);pointer-events:auto;}
.ticker-item a{color:#fff;display:inline-flex;align-items:center;gap:8px;font-weight:600;transition:.2s;}
.ticker-item a:hover{color:var(--gold);}
.ticker-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);display:inline-block;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@media(max-width:600px){.top-ticker{font-size:12px;height:40px;}.ticker-content{height:40px;}}
header{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line);}
.header-inner{display:flex;align-items:center;gap:14px;padding:14px 24px;}
.menu-btn{background:#fff;border:1.5px solid var(--line);color:var(--text);width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;padding:0;transition:all .2s;flex-shrink:0;box-shadow:var(--shadow-sm);}
.menu-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-soft);}
.brand{display:flex;align-items:center;gap:12px;}
.logo-circle{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(212,160,23,.28);}
.brand h1{font-size:19px;letter-spacing:1px;color:var(--text);}
.brand .tag{font-size:10px;color:var(--gold);letter-spacing:2.5px;font-weight:800;margin-top:1px;}
.call-btn{background:var(--dark);color:#fff;border-radius:999px;padding:11px 20px;font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;margin-left:auto;transition:.2s;}
.call-btn:hover{background:var(--gold);}
@media(max-width:700px){.brand h1{font-size:16px;}.brand .tag{font-size:9px;letter-spacing:2px;}.call-btn{padding:10px 14px;font-size:12px;}.call-btn span.lbl{display:none;}.logo-circle{width:42px;height:42px;font-size:16px;}}
@media(max-width:400px){.brand .tag{display:none;}}
.hero{background:#14141a url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=80') center/cover no-repeat;padding:120px 0 100px;position:relative;overflow:hidden;min-height:72vh;display:flex;align-items:center;}
.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(95deg,rgba(10,10,14,.90) 0%,rgba(10,10,14,.62) 50%,rgba(10,10,14,.28) 100%);z-index:1;pointer-events:none;}
.hero::after{display:none;}
.hero .wrap{position:relative;z-index:2;}
.badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;font-weight:700;margin-bottom:22px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
.dot{width:8px;height:8px;border-radius:50%;background:var(--good);display:inline-block;animation:pulse 2s infinite;}
.hero h2{font-size:56px;line-height:1.03;color:#fff;margin-bottom:18px;text-shadow:0 2px 24px rgba(0,0,0,.4);}
.hero h2 .gold{display:block;color:var(--gold);}
.hero p{max-width:640px;color:rgba(255,255,255,.90);margin-bottom:28px;font-size:16px;line-height:1.65;}
@media(max-width:700px){.hero{padding:48px 0 40px;}.hero h2{font-size:34px;}.hero p{font-size:14.5px;}}
.filters{background:#fff;border-radius:16px;padding:22px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr 1fr auto;gap:14px;align-items:end;margin-top:10px;border:1px solid var(--line);box-shadow:var(--shadow-md);}
@media(max-width:1100px){.filters{grid-template-columns:1fr 1fr 1fr;}}
@media(max-width:640px){.filters{grid-template-columns:1fr 1fr;}}
.field label{font-size:10.5px;letter-spacing:1.2px;color:var(--muted);font-weight:800;display:block;margin-bottom:7px;text-transform:uppercase;}
.field select,.field input{width:100%;padding:12px;border-radius:9px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);font-size:13.5px;font-family:inherit;transition:.2s;}
.field select:focus,.field input:focus{outline:none;border-color:var(--gold);background:#fff;}
.filters .btn{padding:13px 20px;}
.filters-row2{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;align-items:end;}
.chk{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-soft);font-weight:600;cursor:pointer;}
.view-all{font-size:13px;font-weight:700;text-decoration:underline;background:none;border:none;color:var(--gold);cursor:pointer;}
section{padding:60px 0;}
.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;flex-wrap:wrap;gap:10px;}
.section-head h2{font-size:28px;color:var(--text);}
.stock-badge{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);font-weight:600;}
.makes-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:14px;}
@media(max-width:1000px){.makes-grid{grid-template-columns:repeat(4,1fr);}}
@media(max-width:600px){.makes-grid{grid-template-columns:repeat(3,1fr);gap:10px;}}
.make-card{background:#fff;border-radius:14px;padding:16px;text-align:left;border:1.5px solid var(--line);cursor:pointer;transition:all .2s;}
.make-card:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:var(--shadow-md);}
.make-avatar{width:40px;height:40px;border-radius:50%;background:var(--gold-soft);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-weight:900;margin-bottom:10px;font-size:15px;}
.make-card b{display:block;font-size:14px;color:var(--text);}
.make-card span{color:var(--muted);font-size:12px;}
.cars-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
@media(max-width:900px){.cars-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.cars-grid{grid-template-columns:1fr;gap:18px;}}
.car-card{background:#fff;border-radius:16px;overflow:hidden;border:1.5px solid var(--line);transition:all .25s;position:relative;}
.car-card:hover{transform:translateY(-5px);border-color:var(--gold);box-shadow:var(--shadow-lg);}
.car-card.is-sold{opacity:.72;}
.car-img{position:relative;aspect-ratio:4/3;background:var(--bg-soft);overflow:hidden;}
.car-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.car-card:hover .car-img img{transform:scale(1.05);}
.car-tag{position:absolute;top:12px;left:12px;background:rgba(20,20,26,.9);color:#fff;font-size:10.5px;font-weight:800;padding:6px 10px;border-radius:7px;letter-spacing:1px;text-transform:uppercase;backdrop-filter:blur(6px);}
.sold-ribbon{position:absolute;top:12px;right:12px;background:var(--bad);color:#fff;font-size:10.5px;font-weight:900;padding:6px 10px;border-radius:7px;letter-spacing:1.5px;}
.car-body{padding:18px;}
.car-title{font-size:17px;font-weight:900;margin-bottom:5px;color:var(--text);}
.car-specs{font-size:12.5px;color:var(--muted);margin-bottom:12px;line-height:1.5;}
.car-price{color:var(--gold2);font-size:20px;font-weight:900;margin-bottom:14px;letter-spacing:-.02em;}
.car-actions{display:flex;gap:8px;}
.car-actions .btn{flex:1;padding:10px;font-size:12.5px;}
.no-cars{text-align:center;padding:70px 20px;color:var(--muted);background:#fff;border-radius:16px;border:2px dashed var(--line);}
.trust{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.trust .wrap{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:36px 24px;}
@media(max-width:800px){.trust .wrap{grid-template-columns:1fr 1fr;gap:20px;}}
.trust-item{display:flex;gap:14px;align-items:center;}
.trust-ic{width:46px;height:46px;border-radius:12px;background:var(--gold-soft);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.trust-item b{display:block;font-size:14.5px;color:var(--text);}
.trust-item span{color:var(--muted);font-size:12.5px;}
.services-section{background:linear-gradient(180deg,#fff 0%,var(--bg-soft) 100%);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.services-head{text-align:center;margin-bottom:42px;}
.services-head .kicker{font-size:12px;letter-spacing:3px;color:var(--gold);font-weight:800;text-transform:uppercase;margin-bottom:12px;}
.services-head h2{font-size:36px;margin-bottom:10px;color:var(--text);}
.services-head p{color:var(--muted);max-width:620px;margin:0 auto;font-size:15px;}
@media(max-width:700px){.services-head h2{font-size:26px;}}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
@media(max-width:900px){.services-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:560px){.services-grid{grid-template-columns:1fr;}}
.service-card{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:28px;transition:all .25s;position:relative;overflow:hidden;}
.service-card::before{content:"";position:absolute;top:0;left:0;width:100%;height:4px;background:linear-gradient(90deg,var(--gold),var(--gold2));transform:scaleX(0);transform-origin:left;transition:transform .3s;}
.service-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--gold);}
.service-card:hover::before{transform:scaleX(1);}
.service-icon{width:56px;height:56px;border-radius:14px;background:var(--gold-soft);display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px;}
.service-card h3{font-size:18px;margin-bottom:10px;color:var(--text);}
.service-card p{color:var(--muted);font-size:13.5px;line-height:1.7;}
footer{background:var(--dark);padding:54px 0 24px;color:#e8e8ec;}
.foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:32px;margin-bottom:32px;}
@media(max-width:800px){.foot-grid{grid-template-columns:1fr 1fr;gap:24px;}}
.foot-grid h4{color:var(--gold);font-size:11.5px;letter-spacing:2px;margin-bottom:16px;text-transform:uppercase;}
.foot-grid p,.foot-grid a{display:block;color:#a3a3ab;font-size:13.5px;margin-bottom:10px;transition:.2s;}
.foot-grid a:hover{color:var(--gold);}
.foot-brand{display:flex;gap:12px;align-items:center;margin-bottom:16px;}
.foot-brand b{color:#fff;font-size:15px;}
.foot-brand .logo-circle{width:44px;height:44px;font-size:17px;}
.foot-bottom{border-top:1px solid #2a2a32;padding-top:22px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;color:#7a7a83;font-size:12.5px;}
.maps-embed{width:100%;height:190px;border:0;border-radius:12px;margin-top:6px;filter:grayscale(.2) contrast(1.05);}
.float-wa{position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;background:var(--wa);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(37,211,102,.45);z-index:55;transition:.25s;}
.float-wa:hover{transform:scale(1.08);}
.float-wa svg{width:30px;height:30px;fill:#fff;}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(20,20,26,.78);backdrop-filter:blur(6px);z-index:100;align-items:center;justify-content:center;padding:20px;}
.modal-bg.open{display:flex;}
.modal{background:#fff;color:var(--text);border-radius:20px;max-width:780px;width:100%;max-height:88vh;overflow:auto;position:relative;box-shadow:0 24px 64px rgba(0,0,0,.3);}
.modal-close{position:absolute;top:16px;right:16px;background:var(--dark);color:#fff;width:38px;height:38px;border-radius:50%;border:none;font-size:16px;z-index:2;transition:.2s;display:flex;align-items:center;justify-content:center;}
.modal-close:hover{background:var(--gold);transform:rotate(90deg);}
.modal-gallery{display:flex;gap:8px;overflow-x:auto;padding:16px;background:var(--bg-soft);}
.modal-gallery img{width:160px;height:112px;object-fit:cover;border-radius:10px;flex-shrink:0;}
.modal-content{padding:0 28px 28px;}
.modal-content h3{font-size:24px;margin-bottom:6px;color:var(--text);}
.modal-sold{display:inline-block;background:var(--bad);color:#fff;font-size:11px;font-weight:900;padding:5px 12px;border-radius:8px;margin-bottom:10px;letter-spacing:1.5px;}
.modal-price{color:var(--gold2);font-size:24px;font-weight:900;margin:8px 0 16px;}
.modal-specs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;font-size:13.5px;}
.modal-specs div{background:var(--bg-soft);padding:11px 14px;border-radius:10px;border:1px solid var(--line-soft);}
.modal-specs div b{color:var(--muted);font-size:11px;display:block;letter-spacing:1px;font-weight:800;text-transform:uppercase;margin-bottom:2px;}
.modal-desc{font-size:14px;color:var(--text-soft);margin-bottom:18px;white-space:pre-line;line-height:1.7;}
.modal-actions{display:flex;gap:10px;flex-wrap:wrap;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--good);color:#fff;padding:13px 24px;border-radius:999px;font-weight:700;font-size:14px;z-index:300;display:none;box-shadow:0 10px 30px rgba(22,163,74,.4);}
.page-header{background:#14141a url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=2000&q=80') center/cover no-repeat;padding:100px 0 80px;border-bottom:1px solid var(--line);position:relative;overflow:hidden;min-height:52vh;display:flex;align-items:center;}
.page-header::before{content:"";position:absolute;inset:0;background:linear-gradient(95deg,rgba(10,10,14,.88) 0%,rgba(10,10,14,.60) 50%,rgba(10,10,14,.25) 100%);z-index:1;}
.page-header .wrap{position:relative;z-index:2;}
.page-header h1{font-size:40px;color:#fff;margin-bottom:10px;text-shadow:0 2px 20px rgba(0,0,0,.45);}
.page-header p{color:rgba(255,255,255,.88);max-width:680px;font-size:15px;line-height:1.7;}
.page-header .crumb{color:var(--gold);font-size:11.5px;letter-spacing:3px;font-weight:800;text-transform:uppercase;margin-bottom:12px;text-shadow:0 1px 8px rgba(0,0,0,.5);}
@media(max-width:700px){.page-header{padding:40px 0 32px;}.page-header h1{font-size:28px;}}
.content-section{padding:50px 0;}
.content-block{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:32px;margin-bottom:20px;box-shadow:var(--shadow-sm);}
.content-block h2{color:var(--text);margin-bottom:16px;font-size:22px;position:relative;padding-left:18px;}
.content-block h2::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:4px;background:linear-gradient(180deg,var(--gold),var(--gold2));border-radius:2px;}
.content-block h3{color:var(--text);margin:18px 0 8px;font-size:17px;}
.content-block p{color:var(--text-soft);margin-bottom:14px;line-height:1.8;font-size:15px;}
.content-block ul{color:var(--text-soft);padding-left:22px;margin-bottom:14px;}
.content-block ul li{margin-bottom:9px;font-size:15px;line-height:1.7;}
.content-block strong{color:var(--text);font-weight:800;}
.pull-quote{border-left:4px solid var(--gold);padding:16px 22px;background:var(--gold-soft);border-radius:8px;font-style:italic;color:var(--text-soft);margin:18px 0;font-size:15.5px;line-height:1.75;}
.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
@media(max-width:800px){.steps-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:520px){.steps-grid{grid-template-columns:1fr;}}
.step-card{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:26px;transition:.25s;}
.step-card:hover{transform:translateY(-4px);border-color:var(--gold);box-shadow:var(--shadow-md);}
.step-num{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;margin-bottom:16px;box-shadow:0 6px 16px rgba(212,160,23,.32);}
.step-card h3{margin-bottom:8px;font-size:16px;color:var(--text);}
.step-card p{color:var(--muted);font-size:13.5px;line-height:1.75;}
.faq-item{background:#fff;border:1.5px solid var(--line);border-radius:12px;margin-bottom:12px;overflow:hidden;transition:.2s;}
.faq-item:hover{border-color:var(--gold);}
.faq-q{padding:20px 24px;cursor:pointer;font-weight:800;display:flex;justify-content:space-between;align-items:center;font-size:15px;gap:14px;color:var(--text);}
.faq-a{padding:0 24px;max-height:0;overflow:hidden;transition:all .35s ease;color:var(--text-soft);font-size:14.5px;line-height:1.8;}
.faq-item.open .faq-a{max-height:700px;padding:0 24px 22px;}
.faq-item.open .faq-q{color:var(--gold2);}
.faq-q .plus{transition:transform .35s;color:var(--gold);font-size:22px;flex-shrink:0;font-weight:400;line-height:1;}
.faq-item.open .faq-q .plus{transform:rotate(135deg);}
.contact-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:26px;}
@media(max-width:800px){.contact-grid{grid-template-columns:1fr;}}
.contact-info-list{display:flex;flex-direction:column;gap:14px;}
.contact-info-item{display:flex;gap:16px;align-items:flex-start;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:20px;transition:.2s;}
.contact-info-item:hover{border-color:var(--gold);transform:translateX(4px);}
.contact-info-item .ic{width:48px;height:48px;border-radius:12px;background:var(--gold-soft);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;}
.contact-info-item b{display:block;margin-bottom:4px;color:var(--text);font-size:14px;}
.contact-info-item span,.contact-info-item a{color:var(--text-soft);font-size:14px;word-break:break-word;}
.contact-info-item a:hover{color:var(--gold);}
.contact-form{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:30px;box-shadow:var(--shadow-md);}
.contact-form h2{margin-bottom:20px;font-size:20px;color:var(--text);}
.contact-form label{display:block;font-size:11.5px;color:var(--muted);font-weight:800;letter-spacing:1.5px;margin-bottom:7px;text-transform:uppercase;}
.contact-form input,.contact-form textarea{width:100%;padding:13px 15px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);font-size:14px;margin-bottom:16px;font-family:inherit;transition:.2s;}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:var(--gold);background:#fff;}
.contact-form textarea{min-height:130px;resize:vertical;}
.offer-banner{background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 100%);color:#fff;padding:36px;border-radius:18px;text-align:center;margin-bottom:34px;box-shadow:0 12px 32px rgba(212,160,23,.28);}
.offer-banner h2{font-size:32px;margin-bottom:8px;letter-spacing:1px;color:#fff;}
.offer-banner p{font-size:15px;font-weight:700;opacity:.95;}
@media(max-width:600px){.offer-banner{padding:26px 20px;}.offer-banner h2{font-size:22px;}}
.offers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;}
@media(max-width:800px){.offers-grid{grid-template-columns:1fr;}}
.offer-card{background:#fff;border:1.5px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s;display:flex;flex-direction:column;}
.offer-card:hover{transform:translateY(-5px);border-color:var(--gold);box-shadow:var(--shadow-lg);}
.offer-img{aspect-ratio:16/9;overflow:hidden;background:var(--bg-soft);}
.offer-img img{width:100%;height:100%;object-fit:cover;}
.offer-body{padding:26px;flex:1;display:flex;flex-direction:column;}
.offer-badge{display:inline-block;background:var(--gold);color:#fff;font-size:10.5px;font-weight:900;padding:5px 12px;border-radius:999px;letter-spacing:1.5px;margin-bottom:14px;align-self:flex-start;}
.offer-body h3{font-size:20px;margin-bottom:12px;color:var(--text);}
.offer-body p{color:var(--text-soft);font-size:14px;line-height:1.7;margin-bottom:16px;flex:1;}
.offer-expiry{font-size:12.5px;color:var(--bad);font-weight:700;margin-bottom:14px;}
.auth-tabs{display:flex;background:#fff;border-radius:14px 14px 0 0;border:1.5px solid var(--line);border-bottom:none;overflow:hidden;max-width:540px;margin:0 auto;}
.auth-tab{flex:1;padding:15px;text-align:center;font-weight:800;cursor:pointer;background:transparent;border:none;color:var(--muted);font-size:13.5px;letter-spacing:1.5px;transition:.2s;}
.auth-tab.active{background:var(--gold);color:#fff;}
.auth-form{background:#fff;border:1.5px solid var(--line);border-radius:0 0 14px 14px;padding:30px;max-width:540px;margin:0 auto;box-shadow:var(--shadow-md);}
.auth-form label{display:block;font-size:11.5px;color:var(--muted);margin-bottom:7px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;}
.auth-form input{width:100%;padding:13px 15px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:16px;font-size:14px;font-family:inherit;}
.auth-form input:focus{outline:none;border-color:var(--gold);background:#fff;}
.auth-form .btn{width:100%;padding:15px;}
.auth-foot{text-align:center;margin-top:20px;font-size:13px;color:var(--muted);}
.auth-foot a{color:var(--gold);text-decoration:underline;font-weight:700;}
.sidebar-overlay{position:fixed;inset:0;background:rgba(20,20,26,.55);backdrop-filter:blur(4px);z-index:90;opacity:0;visibility:hidden;transition:all .3s ease;}
.sidebar-overlay.open{opacity:1;visibility:visible;}
.sidebar{position:fixed;top:0;left:0;width:360px;max-width:88vw;height:100vh;background:#fff;color:var(--text);z-index:100;transform:translateX(-100%);transition:transform .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:6px 0 32px rgba(0,0,0,.18);}
.sidebar.open{transform:translateX(0);}
.sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:22px 22px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#fff,var(--bg-soft));}
.sidebar-header .brand{display:flex;align-items:center;gap:12px;}
.sidebar-header .brand h1{font-size:15px;color:var(--text);letter-spacing:1.5px;margin:0;}
.sidebar-header .logo-circle{width:42px;height:42px;font-size:16px;}
.close-btn{background:var(--dark);color:#fff;border:none;width:40px;height:40px;border-radius:50%;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;}
.close-btn:hover{background:var(--gold);transform:rotate(90deg);}
.sidebar-nav{flex:1;overflow-y:auto;padding:8px 0;}
.sidebar-nav a{display:flex;align-items:center;justify-content:space-between;padding:17px 24px;font-size:15px;font-weight:700;color:var(--text);border-bottom:1px solid var(--line-soft);transition:all .2s;}
.sidebar-nav a:hover{background:var(--gold-soft);padding-left:30px;color:var(--gold2);}
.sidebar-nav a span{color:var(--muted);font-size:20px;line-height:1;transition:.2s;}
.sidebar-nav a:hover span{color:var(--gold);transform:translateX(4px);}
.sidebar-footer{padding:20px 22px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);text-align:center;background:var(--bg-soft);}
.sidebar-footer a{color:var(--gold);text-decoration:underline;}
.gate-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);}
.gate-box{background:#fff;padding:40px;border-radius:18px;width:340px;text-align:center;border:1.5px solid var(--line);box-shadow:var(--shadow-lg);}
.gate-box input{width:100%;padding:13px;border-radius:10px;border:1.5px solid var(--line);margin:18px 0;background:var(--bg);color:var(--text);font-family:inherit;}
.gate-box input:focus{outline:none;border-color:var(--gold);background:#fff;}
.admin-header{background:#fff;border-bottom:1px solid var(--line);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:20;flex-wrap:wrap;gap:10px;box-shadow:var(--shadow-sm);}
.admin-header .brand b{color:var(--text);font-size:15px;}
.admin-wrap{max-width:1140px;margin:0 auto;padding:32px 24px;}
.admin-section{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:28px;margin-bottom:26px;box-shadow:var(--shadow-sm);}
.admin-section h2{margin-bottom:8px;font-size:22px;color:var(--text);}
.admin-section .sub{color:var(--muted);font-size:13px;margin-bottom:20px;}
.admin-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
@media(max-width:800px){.admin-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:520px){.admin-grid{grid-template-columns:1fr;}}
.admin-grid label{font-size:11.5px;color:var(--muted);display:block;margin-bottom:6px;font-weight:800;letter-spacing:1px;text-transform:uppercase;}
.admin-grid input,.admin-grid select,.admin-grid textarea{width:100%;padding:11px 13px;border-radius:9px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:14px;font-family:inherit;font-size:14px;}
.admin-grid input:focus,.admin-grid select:focus,.admin-grid textarea:focus{outline:none;border-color:var(--gold);background:#fff;}
.admin-grid textarea{grid-column:1/-1;min-height:88px;}
.admin-grid .full{grid-column:1/-1;}
.thumb-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.thumb-row img{width:72px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);}
.admin-row{display:flex;gap:16px;align-items:center;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px;flex-wrap:wrap;transition:.2s;}
.admin-row:hover{border-color:var(--gold);}
.admin-row img{width:78px;height:60px;object-fit:cover;border-radius:9px;flex-shrink:0;background:var(--bg-soft);}
.admin-row .info{flex:1;min-width:180px;}
.admin-row .info b{display:block;font-size:14.5px;color:var(--text);}
.admin-row .info span{color:var(--muted);font-size:12.5px;}
.admin-row .acts{display:flex;gap:8px;flex-wrap:wrap;}
.admin-row .acts button{padding:9px 14px;border-radius:8px;border:none;font-size:12px;font-weight:700;transition:.2s;}
.admin-row .acts button:hover{transform:translateY(-1px);}
.icon-btn{padding:9px 15px;border-radius:9px;border:1.5px solid var(--line);background:#fff;color:var(--text);font-size:13px;font-weight:700;transition:.2s;}
.icon-btn:hover{border-color:var(--gold);color:var(--gold);}
.pill-sold{background:var(--bad);color:#fff;font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px;margin-left:8px;letter-spacing:1px;}
.pill-active{background:var(--good);color:#fff;font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px;margin-left:8px;letter-spacing:1px;}
.pill-off{background:var(--muted);color:#fff;font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px;margin-left:8px;letter-spacing:1px;}
.chk-inline{display:flex;align-items:center;gap:10px;grid-column:1/-1;margin-bottom:14px;color:var(--text-soft);font-size:13.5px;font-weight:600;cursor:pointer;}
.foot-social{display:flex;gap:10px;margin-top:16px;}
.foot-social a{width:40px;height:40px;border-radius:11px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#fff;transition:.2s;margin-bottom:0;}
.foot-social a:hover{background:var(--gold);border-color:var(--gold);transform:translateY(-3px);}
.foot-social a svg{width:18px;height:18px;fill:currentColor;}
.sidebar-social{display:flex;gap:10px;justify-content:center;margin-bottom:14px;}
.sidebar-social a{width:40px;height:40px;border-radius:50%;background:#fff;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--text);transition:.2s;}
.sidebar-social a:hover{background:var(--gold);color:#fff;border-color:var(--gold);transform:translateY(-2px);}
.sidebar-social a svg{width:17px;height:17px;fill:currentColor;}
.contact-social{display:flex;gap:10px;margin-top:20px;}
.contact-social a{width:44px;height:44px;border-radius:12px;background:#fff;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--text);transition:.2s;}
.contact-social a:hover{background:var(--gold);color:#fff;border-color:var(--gold);transform:translateY(-3px);}
.contact-social a svg{width:20px;height:20px;fill:currentColor;}
.offer-social{display:flex;gap:10px;justify-content:center;margin-top:18px;position:relative;z-index:2;}
.offer-social a{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;color:#fff;transition:.2s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
.offer-social a:hover{background:#fff;color:var(--gold);border-color:#fff;transform:translateY(-3px);}
.offer-social a svg{width:20px;height:20px;fill:currentColor;}
`;
const WA_SVG='<svg class="wa-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16.04 3C9.37 3 3.96 8.36 3.96 15c0 2.2.6 4.28 1.66 6.06L4 29l8.15-2.14a12.9 12.9 0 0 0 3.89.61c6.67 0 12.08-5.36 12.08-12S22.7 3 16.04 3zm0 21.9c-1.28 0-2.53-.24-3.7-.72l-.27-.1-4.84 1.27 1.3-4.72-.18-.29a9.83 9.83 0 0 1-1.53-5.34c0-5.46 4.46-9.9 9.96-9.9 5.5 0 9.96 4.44 9.96 9.9s-4.46 9.9-9.96 9.9zm5.46-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.47 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>';

/* ============ PUBLIC JS ============ */
const PUBLIC_JS=`
function money(n){return 'KSh '+Number(n).toLocaleString();}
function placeholderImg(make){const t=encodeURIComponent(make||'CAR');return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%23f0ede4'/><text x='50%' y='50%' fill='%23a89f88' font-size='24' text-anchor='middle' dy='.3em' font-family='Arial'>"+t+"</text></svg>";}
const WA_ICON=${JSON.stringify(WA_SVG)};
const SVG_FB='<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const SVG_IG='<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
const SVG_TT='<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>';
let SETTINGS={},CARS=[],META={};
function initTicker(){const items=document.querySelectorAll('.ticker-item');if(!items.length)return;let i=0;setInterval(()=>{items[i].classList.remove('active');i=(i+1)%items.length;items[i].classList.add('active');},3800);}
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').classList.add('open');document.body.style.overflow='hidden';}
function closeSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebarOverlay');if(s)s.classList.remove('open');if(o)o.classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSidebar();});
function showToast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(window._tt);window._tt=setTimeout(()=>t.style.display='none',2600);}
async function boot(){
  try{
    SETTINGS=await(await fetch('/api/settings')).json();
    META=await(await fetch('/api/meta')).json();
    applySettings();initTicker();
    if(document.getElementById('fMake'))populateFilters();
    if(document.getElementById('makesGrid'))await renderMakesStrip();
    if(document.getElementById('carsGrid'))await loadCars();
    if(document.getElementById('offersGrid'))await loadOffers();
    if(document.querySelectorAll('.faq-q').length)initFAQ();
  }catch(e){console.error(e);}
}
function applySettings(){
  document.documentElement.style.setProperty('--gold',SETTINGS.colorGold);
  const li=document.getElementById('logoInitial');if(li)li.textContent=SETTINGS.name.charAt(0);
  const bh=document.querySelector('header .brand h1');if(bh)bh.textContent=SETTINGS.name;
  const tg=document.querySelector('header .tag');if(tg)tg.textContent=SETTINGS.tagline;
  const sb=document.getElementById('sidebarBrandName');if(sb)sb.textContent=SETTINGS.name;
  const hp=document.getElementById('headerPhone');if(hp){hp.href='tel:'+SETTINGS.phone1.replace(/\\s/g,'');hp.innerHTML='📞 <span class="lbl">'+SETTINGS.phone1+'</span>';}
  const tp=document.getElementById('tickPhone');if(tp){tp.href='tel:'+SETTINGS.phone1.replace(/\\s/g,'');tp.innerHTML='📞 Call: '+SETTINGS.phone1;}
  const tw=document.getElementById('tickWa');if(tw){tw.href='https://wa.me/'+SETTINGS.wa;tw.innerHTML='💬 WhatsApp: '+SETTINGS.phone2;}
  const te=document.getElementById('tickEmail');if(te){te.href='mailto:'+SETTINGS.email;te.innerHTML='✉️ '+SETTINGS.email;}
  const ta=document.getElementById('tickAddr');if(ta){ta.href='/contact';ta.innerHTML='📍 '+SETTINGS.address;}
  const fl=document.getElementById('footLocationLine1');if(fl)fl.textContent=SETTINGS.locShort;
  const fp=document.getElementById('footPhoneWa');if(fp)fp.textContent=SETTINGS.phone1;
  const fa=document.getElementById('footAbout');if(fa)fa.textContent=SETTINGS.about;
  const fad=document.getElementById('footAddress');if(fad)fad.textContent=SETTINGS.address;
  const fbn=document.getElementById('footBrandName');if(fbn)fbn.textContent=SETTINGS.name;
  const p1=document.getElementById('footPhone1');if(p1){p1.textContent='📞 '+SETTINGS.phone1;p1.href='tel:'+SETTINGS.phone1.replace(/\\s/g,'');}
  const p2=document.getElementById('footPhone2');if(p2){p2.textContent='💬 '+SETTINGS.phone2;p2.href='https://wa.me/'+SETTINGS.wa;}
  const em=document.getElementById('footEmail');if(em){em.textContent='✉️ '+SETTINGS.email;em.href='mailto:'+SETTINGS.email;}
  const wf=document.getElementById('waFloat');if(wf){wf.href='https://wa.me/'+SETTINGS.wa;wf.innerHTML=WA_ICON;}
  const mapEl=document.getElementById('mapsEmbed');if(mapEl)mapEl.src='https://www.google.com/maps?q='+encodeURIComponent(SETTINGS.address)+'&output=embed';
  const cp=document.getElementById('cPhone1');if(cp)cp.innerHTML='<a href="tel:'+SETTINGS.phone1.replace(/\\s/g,'')+'">'+SETTINGS.phone1+'</a>';
  const cw=document.getElementById('cWa');if(cw)cw.innerHTML='<a href="https://wa.me/'+SETTINGS.wa+'" target="_blank">'+SETTINGS.phone2+'</a>';
  const ce=document.getElementById('cEmail');if(ce)ce.innerHTML='<a href="mailto:'+SETTINGS.email+'">'+SETTINGS.email+'</a>';
  const ca=document.getElementById('cAddress');if(ca)ca.textContent=SETTINGS.address;
  [['ctFb',SETTINGS.facebook,SVG_FB],['ctIg',SETTINGS.instagram,SVG_IG],['ctTt',SETTINGS.tiktok,SVG_TT],['ofFb',SETTINGS.facebook,SVG_FB],['ofIg',SETTINGS.instagram,SVG_IG],['ofTt',SETTINGS.tiktok,SVG_TT]].forEach(function(item){var el=document.getElementById(item[0]);if(el){el.href=item[1]||'#';el.innerHTML=item[2];}});
  [['ftFb',SETTINGS.facebook,SVG_FB],['ftIg',SETTINGS.instagram,SVG_IG],['ftTt',SETTINGS.tiktok,SVG_TT],['sbFb',SETTINGS.facebook,SVG_FB],['sbIg',SETTINGS.instagram,SVG_IG],['sbTt',SETTINGS.tiktok,SVG_TT]].forEach(function(item){var el=document.getElementById(item[0]);if(el){el.href=item[1]||'#';el.innerHTML=item[2];}});
  const tsc=document.getElementById('tickSocial');if(tsc){tsc.href=SETTINGS.instagram||SETTINGS.facebook||SETTINGS.tiktok||'#';}
}
function populateFilters(){
  const fm=document.getElementById('fMake');if(fm)fm.innerHTML='<option value="">All Makes</option>'+META.makes.map(m=>'<option>'+m+'</option>').join('');
  const fb=document.getElementById('fBody');if(fb)fb.innerHTML='<option value="">All Body Types</option>'+META.bodyTypes.map(b=>'<option>'+b+'</option>').join('');
  const fc=document.getElementById('fCondition');if(fc)fc.innerHTML='<option value="">All Conditions</option>'+META.conditions.map(c=>'<option>'+c+'</option>').join('');
  const ff=document.getElementById('fFuel');if(ff)ff.innerHTML='<option value="">All Fuel Types</option>'+META.fuelTypes.map(f=>'<option>'+f+'</option>').join('');
}
function buildQuery(){
  const p=new URLSearchParams();
  const g=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const q=g('fSearch').trim(),make=g('fMake'),body=g('fBody'),cond=g('fCondition'),fuel=g('fFuel'),minP=g('fMinPrice'),maxP=g('fMaxPrice'),sort=g('fSort');
  const is=document.getElementById('fIncludeSold');const inc=is?is.checked:false;
  if(q)p.set('q',q);if(make)p.set('make',make);if(body)p.set('body',body);if(cond)p.set('condition',cond);if(fuel)p.set('fuel',fuel);
  if(minP)p.set('minPrice',minP);if(maxP)p.set('maxPrice',maxP);if(sort)p.set('sort',sort);
  if(!inc)p.set('sold','false');
  return p.toString();
}
async function loadCars(){const qs=buildQuery();CARS=await(await fetch('/api/cars'+(qs?'?'+qs:''))).json();renderCars(CARS);}
async function applyFilters(){await loadCars();}
function resetFilters(){['fSearch','fMake','fBody','fCondition','fFuel','fMinPrice','fMaxPrice','fSort'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const is=document.getElementById('fIncludeSold');if(is)is.checked=false;loadCars();}
async function renderMakesStrip(){
  const all=await(await fetch('/api/cars?sold=false')).json();
  const counts={};all.forEach(c=>counts[c.make]=(counts[c.make]||0)+1);
  const top=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).slice(0,16);
  const grid=document.getElementById('makesGrid');if(!grid)return;grid.innerHTML='';
  top.forEach(make=>{const d=document.createElement('div');d.className='make-card';d.onclick=()=>{const fm=document.getElementById('fMake');if(fm)fm.value=make;applyFilters();const ss=document.getElementById('stockSection');if(ss)window.scrollTo({top:ss.offsetTop-90,behavior:'smooth'});};d.innerHTML='<div class="make-avatar">'+make.charAt(0)+'</div><b>'+make+'</b><span>'+counts[make]+' Car'+(counts[make]>1?'s':'')+'</span>';grid.appendChild(d);});
  const scb=document.getElementById('stockCountBadge');if(scb)scb.textContent=all.length+' CARS IN STOCK';
  const ac=document.getElementById('availableCount');if(ac)ac.textContent=all.length;
}
function waLink(car){return 'https://wa.me/'+SETTINGS.wa+'?text='+encodeURIComponent('Hi EMJ Motors, I am interested in the '+car.year+' '+car.make+' '+car.model+' listed at '+money(car.price));}
function renderCars(list){
  const grid=document.getElementById('carsGrid');if(!grid)return;grid.innerHTML='';
  const ac=document.getElementById('availableCount');if(ac)ac.textContent=list.length;
  if(!list.length){grid.innerHTML='<div class="no-cars" style="grid-column:1/-1;">No cars match your search. Try clearing filters or check back soon.</div>';return;}
  list.forEach(car=>{
    const img=(car.photos&&car.photos[0])?car.photos[0]:placeholderImg(car.make);
    const d=document.createElement('div');d.className='car-card'+(car.sold?' is-sold':'');
    d.innerHTML='<div class="car-img"><span class="car-tag">'+car.condition+'</span>'+(car.sold?'<span class="sold-ribbon">SOLD</span>':'')+'<img src="'+img+'"></div>'+
    '<div class="car-body"><div class="car-title">'+car.year+' '+car.make+' '+car.model+'</div>'+
    '<div class="car-specs">'+(car.mileage?car.mileage.toLocaleString()+' km • ':'')+(car.trans||'')+' • '+car.body+' • '+(car.fuel||'')+'</div>'+
    '<div class="car-price">'+money(car.price)+'</div>'+
    '<div class="car-actions"><button class="btn btn-gold" onclick="openModal('+car.id+')">Details</button>'+
    '<a class="btn btn-wa" href="'+waLink(car)+'" target="_blank">'+WA_ICON+' WhatsApp</a></div></div>';
    grid.appendChild(d);
  });
}
function openModal(id){
  const car=CARS.find(c=>c.id===id);if(!car)return;
  document.getElementById('modalTitle').textContent=car.year+' '+car.make+' '+car.model;
  document.getElementById('modalSold').style.display=car.sold?'inline-block':'none';
  document.getElementById('modalPrice').textContent=money(car.price);
  document.getElementById('modalSpecs').innerHTML=
    '<div><b>Mileage</b>'+(car.mileage?car.mileage.toLocaleString()+' km':'N/A')+'</div>'+
    '<div><b>Transmission</b>'+(car.trans||'N/A')+'</div>'+
    '<div><b>Body</b>'+(car.body||'N/A')+'</div>'+
    '<div><b>Condition</b>'+(car.condition||'N/A')+'</div>'+
    '<div><b>Fuel</b>'+(car.fuel||'N/A')+'</div>'+
    '<div><b>Drivetrain</b>'+(car.drivetrain||'N/A')+'</div>'+
    '<div><b>Color</b>'+(car.color||'N/A')+'</div>'+
    '<div><b>Year</b>'+(car.year||'N/A')+'</div>';
  document.getElementById('modalDesc').textContent=car.desc||'';
  const imgs=(car.photos&&car.photos.length)?car.photos:[placeholderImg(car.make)];
  document.getElementById('modalGallery').innerHTML=imgs.map(p=>'<img src="'+p+'">').join('');
  const wa=document.getElementById('modalWa');wa.href=waLink(car);wa.innerHTML=WA_ICON+' WhatsApp';
  document.getElementById('modalCall').href='tel:'+SETTINGS.phone1.replace(/\\s/g,'');
  document.getElementById('carModal').classList.add('open');
}
function closeModal(){document.getElementById('carModal').classList.remove('open');}
async function loadOffers(){
  const grid=document.getElementById('offersGrid');if(!grid)return;
  const offers=await(await fetch('/api/offers')).json();
  if(!offers.length){grid.innerHTML='<div class="no-cars" style="grid-column:1/-1;">No active offers right now. Follow us on WhatsApp for instant updates.</div>';return;}
  grid.innerHTML=offers.map(o=>{
    const isExt=o.ctaLink&&o.ctaLink.startsWith('http');
    return '<div class="offer-card">'+
    (o.image?'<div class="offer-img"><img src="'+o.image+'"></div>':'')+
    '<div class="offer-body">'+
    (o.badge?'<span class="offer-badge">'+o.badge+'</span>':'')+
    '<h3>'+o.title+'</h3><p>'+o.description+'</p>'+
    (o.expiry?'<div class="offer-expiry">⏳ Valid until '+o.expiry+'</div>':'')+
    '<a class="btn btn-gold" href="'+o.ctaLink+'" '+(isExt?'target="_blank"':'')+'>'+o.ctaText+' →</a></div></div>';
  }).join('');
}
function initFAQ(){document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));}
function sendContactForm(e){e.preventDefault();const n=document.getElementById('cfName').value.trim(),p=document.getElementById('cfPhone').value.trim(),m=document.getElementById('cfMessage').value.trim();const t='Hi EMJ Motors, my name is '+n+'. Phone: '+p+'. Message: '+m;window.open('https://wa.me/'+SETTINGS.wa+'?text='+encodeURIComponent(t),'_blank');showToast('Opening WhatsApp...');}
function switchAuthTab(tab){document.querySelectorAll('.auth-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));const lf=document.getElementById('loginForm'),rf=document.getElementById('registerForm');if(lf)lf.style.display=tab==='login'?'block':'none';if(rf)rf.style.display=tab==='register'?'block':'none';}
function authSubmit(e,type){e.preventDefault();showToast((type==='login'?'Login':'Registration')+' coming soon — please contact us on WhatsApp.');}
boot();
`;

/* ============ ADMIN JS ============ */
const ADMIN_JS=`
let SETTINGS={},CARS=[],OFFERS=[],META={},editingId=null,editingOfferId=null;
function money(n){return 'KSh '+Number(n).toLocaleString();}
function placeholderImg(make){const t=encodeURIComponent(make||'CAR');return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%23f0ede4'/><text x='50%' y='50%' fill='%23a89f88' font-size='24' text-anchor='middle' dy='.3em' font-family='Arial'>"+t+"</text></svg>";}
function showToast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';clearTimeout(window._tt);window._tt=setTimeout(()=>t.style.display='none',2400);}
function val(id){return document.getElementById(id).value;}
async function boot(){
  const s=await(await fetch('/api/session')).json();
  if(!s.isAdmin){document.getElementById('gate').style.display='flex';document.getElementById('panel').style.display='none';return;}
  document.getElementById('gate').style.display='none';document.getElementById('panel').style.display='block';
  META=await(await fetch('/api/meta')).json();populateMeta();await loadAll();
}
function populateMeta(){
  document.getElementById('makesList').innerHTML=META.makes.map(m=>'<option value="'+m+'">').join('');
  document.getElementById('cBody').innerHTML=META.bodyTypes.map(b=>'<option>'+b+'</option>').join('');
  document.getElementById('cCondition').innerHTML=META.conditions.map(c=>'<option>'+c+'</option>').join('');
  document.getElementById('cFuel').innerHTML=META.fuelTypes.map(f=>'<option>'+f+'</option>').join('');
  document.getElementById('cDrivetrain').innerHTML=META.drivetrains.map(d=>'<option>'+d+'</option>').join('');
  document.getElementById('cTrans').innerHTML=META.transmissions.map(t=>'<option>'+t+'</option>').join('');
}
async function loadAll(){
  SETTINGS=await(await fetch('/api/settings')).json();
  CARS=await(await fetch('/api/cars')).json();
  OFFERS=await(await fetch('/api/offers/all')).json();
  fillSettingsForm();renderAdminList();renderOfferList();
}
async function login(){
  const pw=document.getElementById('gatePw').value;
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(r.ok){document.getElementById('gate').style.display='none';document.getElementById('panel').style.display='block';
    META=await(await fetch('/api/meta')).json();populateMeta();await loadAll();}
  else showToast('Incorrect password');
}
async function logout(){await fetch('/api/logout',{method:'POST'});location.href='/';}
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
  document.getElementById('setAbout').value=SETTINGS.about;
  document.getElementById('setFb').value=SETTINGS.facebook||'';
  document.getElementById('setIg').value=SETTINGS.instagram||'';
  document.getElementById('setTt').value=SETTINGS.tiktok||'';
}
async function saveSettings(){
  const body={name:val('setName'),tagline:val('setTagline'),phone1:val('setPhone1'),
    wa:val('setWa').replace(/\\D/g,''),phone2:val('setPhone2'),email:val('setEmail'),
    address:val('setAddress'),locShort:val('setLocShort'),colorGold:val('setColorGold'),about:val('setAbout'),facebook:val('setFb'),instagram:val('setIg'),tiktok:val('setTt')};
  const r=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  SETTINGS=await r.json();showToast('Settings saved');
}
function previewThumbs(e){const row=document.getElementById('thumbRow');row.innerHTML='';Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>{const img=document.createElement('img');img.src=ev.target.result;row.appendChild(img);};r.readAsDataURL(f);});}
function clearCarForm(){
  ['cMake','cModel','cYear','cPrice','cMileage','cColor','cDesc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cPhotos').value='';document.getElementById('cSold').checked=false;
  document.getElementById('thumbRow').innerHTML='';editingId=null;
  document.getElementById('cancelEditBtn').style.display='none';
  document.getElementById('formTitle').textContent='Add New Car';
}
async function saveCar(){
  const make=val('cMake').trim(),model=val('cModel').trim();
  if(!make||!model){showToast('Make and Model required');return;}
  const fd=new FormData();
  fd.append('make',make);fd.append('model',model);
  fd.append('year',val('cYear'));fd.append('price',val('cPrice'));fd.append('mileage',val('cMileage'));
  fd.append('body',val('cBody'));fd.append('condition',val('cCondition'));fd.append('trans',val('cTrans'));
  fd.append('fuel',val('cFuel'));fd.append('drivetrain',val('cDrivetrain'));fd.append('color',val('cColor'));
  fd.append('desc',val('cDesc'));fd.append('sold',document.getElementById('cSold').checked);
  Array.from(document.getElementById('cPhotos').files).forEach(f=>fd.append('photos',f));
  if(editingId){await fetch('/api/cars/'+editingId,{method:'PUT',body:fd});showToast('Car updated');}
  else{await fetch('/api/cars',{method:'POST',body:fd});showToast('Car added');}
  clearCarForm();await loadAll();
}
function editCar(id){
  const car=CARS.find(c=>c.id===id);if(!car)return;editingId=id;
  document.getElementById('formTitle').textContent='Edit Car';
  document.getElementById('cMake').value=car.make;document.getElementById('cModel').value=car.model;
  document.getElementById('cYear').value=car.year;document.getElementById('cPrice').value=car.price;
  document.getElementById('cMileage').value=car.mileage;document.getElementById('cBody').value=car.body;
  document.getElementById('cCondition').value=car.condition;document.getElementById('cTrans').value=car.trans;
  document.getElementById('cFuel').value=car.fuel||'Petrol';document.getElementById('cDrivetrain').value=car.drivetrain||'FWD';
  document.getElementById('cColor').value=car.color||'';document.getElementById('cDesc').value=car.desc;
  document.getElementById('cSold').checked=!!car.sold;
  document.getElementById('thumbRow').innerHTML=(car.photos||[]).map(p=>'<img src="'+p+'">').join('');
  document.getElementById('cancelEditBtn').style.display='inline-flex';
  window.scrollTo({top:document.getElementById('carFormSection').offsetTop-20,behavior:'smooth'});
}
function cancelEdit(){clearCarForm();}
async function deleteCar(id){if(!confirm('Delete this listing?'))return;await fetch('/api/cars/'+id,{method:'DELETE'});showToast('Car deleted');await loadAll();}
async function toggleSold(id){await fetch('/api/cars/'+id+'/sold',{method:'PATCH'});await loadAll();}
function renderAdminList(){
  const wrap=document.getElementById('adminListing');
  document.getElementById('adminCount').textContent=CARS.length;
  wrap.innerHTML='';
  CARS.slice().reverse().forEach(car=>{
    const img=(car.photos&&car.photos[0])?car.photos[0]:placeholderImg(car.make);
    const row=document.createElement('div');row.className='admin-row';
    row.innerHTML='<img src="'+img+'"><div class="info"><b>'+car.year+' '+car.make+' '+car.model+(car.sold?'<span class="pill-sold">SOLD</span>':'')+'</b><span>'+money(car.price)+' • '+car.condition+'</span></div>'+
    '<div class="acts"><button style="background:#14141a;color:#fff;" onclick="editCar('+car.id+')">Edit</button>'+
    '<button style="background:'+(car.sold?'#16a34a':'#d4a017')+';color:#fff;" onclick="toggleSold('+car.id+')">'+(car.sold?'Mark Available':'Mark Sold')+'</button>'+
    '<button style="background:#dc2626;color:#fff;" onclick="deleteCar('+car.id+')">Delete</button></div>';
    wrap.appendChild(row);
  });
}
function clearOfferForm(){
  ['oTitle','oBadge','oDescription','oCtaText','oCtaLink','oExpiry','oOrder'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('oImage').value='';document.getElementById('oActive').checked=true;
  document.getElementById('oCtaLink').value='https://wa.me/254727073958';
  document.getElementById('oCtaText').value='Claim Offer';
  editingOfferId=null;
  document.getElementById('offerFormTitle').textContent='Add New Offer';
  document.getElementById('cancelOfferEditBtn').style.display='none';
}
async function saveOffer(){
  const title=val('oTitle').trim();if(!title){showToast('Title is required');return;}
  const fd=new FormData();
  fd.append('title',title);fd.append('badge',val('oBadge'));fd.append('description',val('oDescription'));
  fd.append('ctaText',val('oCtaText'));fd.append('ctaLink',val('oCtaLink'));
  fd.append('expiry',val('oExpiry'));fd.append('order',val('oOrder')||'0');
  fd.append('active',document.getElementById('oActive').checked);
  const img=document.getElementById('oImage').files[0];if(img)fd.append('image',img);
  if(editingOfferId){await fetch('/api/offers/'+editingOfferId,{method:'PUT',body:fd});showToast('Offer updated');}
  else{await fetch('/api/offers',{method:'POST',body:fd});showToast('Offer added');}
  clearOfferForm();await loadAll();
}
function editOffer(id){
  const o=OFFERS.find(x=>x.id===id);if(!o)return;editingOfferId=id;
  document.getElementById('offerFormTitle').textContent='Edit Offer';
  document.getElementById('oTitle').value=o.title;document.getElementById('oBadge').value=o.badge||'';
  document.getElementById('oDescription').value=o.description;document.getElementById('oCtaText').value=o.ctaText||'';
  document.getElementById('oCtaLink').value=o.ctaLink||'';document.getElementById('oExpiry').value=o.expiry||'';
  document.getElementById('oOrder').value=o.order||0;
  document.getElementById('oActive').checked=!!o.active;
  document.getElementById('cancelOfferEditBtn').style.display='inline-flex';
  window.scrollTo({top:document.getElementById('offerFormSection').offsetTop-20,behavior:'smooth'});
}
function cancelOfferEdit(){clearOfferForm();}
async function deleteOffer(id){if(!confirm('Delete this offer?'))return;await fetch('/api/offers/'+id,{method:'DELETE'});showToast('Offer deleted');await loadAll();}
async function toggleOffer(id){await fetch('/api/offers/'+id+'/toggle',{method:'PATCH'});await loadAll();}
function renderOfferList(){
  const wrap=document.getElementById('offersListing');
  document.getElementById('offersCount').textContent=OFFERS.length;
  wrap.innerHTML='';
  if(!OFFERS.length){wrap.innerHTML='<div style="color:#6b6b73;padding:20px;text-align:center;font-size:14px;">No offers yet. Add your first one above.</div>';return;}
  OFFERS.forEach(o=>{
    const row=document.createElement('div');row.className='admin-row';
    row.innerHTML=(o.image?'<img src="'+o.image+'">':'<div style="width:78px;height:60px;border-radius:9px;background:#f0ede4;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🎁</div>')+
    '<div class="info"><b>'+o.title+(o.active?'<span class="pill-active">ACTIVE</span>':'<span class="pill-off">OFF</span>')+'</b><span>'+(o.badge?o.badge+' • ':'')+(o.expiry?'Valid until '+o.expiry:'No expiry')+'</span></div>'+
    '<div class="acts"><button style="background:#14141a;color:#fff;" onclick="editOffer('+o.id+')">Edit</button>'+
    '<button style="background:'+(o.active?'#6b6b73':'#16a34a')+';color:#fff;" onclick="toggleOffer('+o.id+')">'+(o.active?'Deactivate':'Activate')+'</button>'+
    '<button style="background:#dc2626;color:#fff;" onclick="deleteOffer('+o.id+')">Delete</button></div>';
    wrap.appendChild(row);
  });
}
clearOfferForm();boot();
`;

/* ============ SIDEBAR / TICKER / MODAL ============ */
const SIDEBAR_HTML=`
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="brand"><div class="logo-circle">E</div><h1 id="sidebarBrandName">EMJ MOTORS</h1></div>
    <button class="close-btn" onclick="closeSidebar()" aria-label="Close">✕</button>
  </div>
  <nav class="sidebar-nav">
    <a href="/">Home <span>›</span></a>
    <a href="/products">Products <span>›</span></a>
    <a href="/about">About Us <span>›</span></a>
    <a href="/how-to-buy">How To Buy <span>›</span></a>
    <a href="/offers">Special Offers <span>›</span></a>
    <a href="/faq">FAQ <span>›</span></a>
    <a href="/contact">Contact Us <span>›</span></a>
    <a href="/qisj">QISJ Mileage Verification <span>›</span></a>
    <a href="/login">Login | Register <span>›</span></a>
  </nav>
  <div class="sidebar-footer"><div class="sidebar-social"><a id="sbFb" href="#" target="_blank" aria-label="Facebook"></a><a id="sbIg" href="#" target="_blank" aria-label="Instagram"></a><a id="sbTt" href="#" target="_blank" aria-label="TikTok"></a></div><div>© 2026 EMJ Motors Ltd · <a href="/admin">Admin</a></div></div>
</aside>`;

const TICKER_HTML=`
<div class="top-ticker"><div class="ticker-content">
  <div class="ticker-item active"><span class="ticker-dot"></span><a href="/offers">✨ We Make Your Dreams Drive</a></div>
  <div class="ticker-item"><a id="tickPhone" href="tel:+254799566458">📞 Call: +254 799 566 458</a></div>
  <div class="ticker-item"><a id="tickWa" href="https://wa.me/254727073958" target="_blank">💬 WhatsApp: +254 727 073 958</a></div>
  <div class="ticker-item"><a id="tickEmail" href="mailto:info@emjmotors.co.ke">✉️ info@emjmotors.co.ke</a></div>
  <div class="ticker-item"><a id="tickSocial" href="#" target="_blank">📱 Follow us @emjmotors</a></div>
  <div class="ticker-item"><a id="tickAddr" href="/contact">📍 Ngong Road, Kilimani, Nairobi</a></div>
</div></div>`;

const CAR_MODAL_HTML=`
<div class="modal-bg" id="carModal"><div class="modal">
  <button class="modal-close" onclick="closeModal()">✕</button>
  <div class="modal-gallery" id="modalGallery"></div>
  <div class="modal-content">
    <span class="modal-sold" id="modalSold" style="display:none;">SOLD</span>
    <h3 id="modalTitle"></h3><div class="modal-price" id="modalPrice"></div>
    <div class="modal-specs" id="modalSpecs"></div><div class="modal-desc" id="modalDesc"></div>
    <div class="modal-actions"><a class="btn btn-wa" id="modalWa" target="_blank"></a><a class="btn btn-dark" id="modalCall">📞 Call Dealer</a></div>
  </div>
</div></div>`;

function layout(pageTitle,content){
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="EMJ Motors Ltd — Nairobi's full-service car dealership. Brand new, foreign used, locally used and custom imports.">
<title>${pageTitle} — EMJ Motors Ltd</title>
<link rel="stylesheet" href="/style.css"></head><body>
<div id="site">
${TICKER_HTML}
<header><div class="header-inner wrap">
  <button class="menu-btn" onclick="openSidebar()" aria-label="Open menu">☰</button>
  <div class="brand"><div class="logo-circle" id="logoInitial">E</div>
    <div><h1>EMJ MOTORS LTD</h1><div class="tag">SALES • IMPORTS • FINANCING</div></div>
  </div>
  <a class="call-btn" id="headerPhone" href="tel:+254799566458">📞 <span class="lbl">+254 799 566 458</span></a>
</div></header>
${content}
<footer><div class="wrap">
  <div class="foot-grid">
    <div><div class="foot-brand"><div class="logo-circle">E</div>
      <div><b id="footBrandName">EMJ MOTORS LTD</b><div style="color:var(--gold);font-size:11px;letter-spacing:2px;">SALES • IMPORTS • FINANCING</div></div>
    </div><p id="footAbout"></p><div class="foot-social"><a id="ftFb" href="#" target="_blank" aria-label="Facebook"></a><a id="ftIg" href="#" target="_blank" aria-label="Instagram"></a><a id="ftTt" href="#" target="_blank" aria-label="TikTok"></a></div></div>
    <div><h4>Explore</h4>
      <a href="/">Home</a><a href="/products">Stock</a><a href="/about">About Us</a>
      <a href="/how-to-buy">How To Buy</a><a href="/offers">Special Offers</a>
      <a href="/faq">FAQ</a><a href="/qisj">QISJ Verification</a>
    </div>
    <div><h4>Contact</h4>
      <p id="footAddress"></p>
      <a id="footPhone1" href="#"></a>
      <a id="footPhone2" href="#" target="_blank"></a>
      <a id="footEmail" href="#"></a>
    </div>
    <div><h4>Find Us</h4>
      <iframe id="mapsEmbed" class="maps-embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>
  <div class="foot-bottom"><span>© 2026 EMJ Motors Ltd. All rights reserved.</span><span>We make your dreams drive.</span></div>
</div></footer>
<a class="float-wa" id="waFloat" href="#" target="_blank" aria-label="WhatsApp"></a>
</div>
${SIDEBAR_HTML}
<div class="toast" id="toast"></div>
<script src="/app.js"></script>
</body></html>`;
}

/* ============ PAGE BUILDERS ============ */
function pageHeader(crumb,title,subtitle){
  return `<div class="page-header"><div class="wrap">
  <div class="crumb">${crumb}</div><h1>${title}</h1><p>${subtitle}</p>
  </div></div>`;
}
function servicesSection(){
  return `
<section class="services-section"><div class="wrap">
  <div class="services-head">
    <div class="kicker">What We Do For You</div>
    <h2>More Than Just Selling Cars</h2>
    <p>From sourcing the perfect vehicle to financing it, verifying it and supporting you after — we handle every step.</p>
  </div>
  <div class="services-grid">
    <div class="service-card"><div class="service-icon">🌍</div><h3>Importing For You</h3><p>Sourcing your dream car directly from Japan, the UK, Dubai and Singapore. We handle auction, shipping, clearing and delivery — you just pick the car.</p></div>
    <div class="service-card"><div class="service-icon">💰</div><h3>Arranging Financing</h3><p>Partnered with Kenya's top banks and SACCOs. We help you get approved fast at competitive rates — including asset finance and logbook loans.</p></div>
    <div class="service-card"><div class="service-icon">🛡️</div><h3>QISJ Verification</h3><p>Independent mileage verification and original auction sheets on every foreign unit. No tampering. No surprises. Ever.</p></div>
    <div class="service-card"><div class="service-icon">🔄</div><h3>Trade-In Valuation</h3><p>Get an instant, fair value for your current car and offset it directly against your new one. Same-day valuation on WhatsApp.</p></div>
    <div class="service-card"><div class="service-icon">📋</div><h3>Logbook &amp; Insurance</h3><p>We handle NTSA transfer, KRA paperwork and connect you with the best insurance partners for comprehensive cover.</p></div>
    <div class="service-card"><div class="service-icon">🔧</div><h3>After-Sale Support</h3><p>Service partners, spare parts sourcing and roadside assistance long after you drive off the lot. We stay with you.</p></div>
  </div>
</div></section>`;
}
function homeContent(){
  return `
<section class="hero"><div class="wrap">
  <div class="badge"><span class="dot"></span> <span id="stockCountBadge">0 CARS IN STOCK</span> • BRAND NEW • FOREIGN USED • LOCAL USED • IMPORTS</div>
  <h2>DRIVE YOUR DREAM<span class="gold">TODAY IN NAIROBI</span></h2>
  <p>Brand new. Foreign used. Locally used. We import on order, arrange financing, verify mileage, and stand behind every vehicle we sell. Every car, every day — QISJ verified where applicable.</p>
  <div class="filters">
    <div class="field"><label>Search</label><input id="fSearch" placeholder="e.g. Toyota Axio"></div>
    <div class="field"><label>Make</label><select id="fMake"><option value="">All Makes</option></select></div>
    <div class="field"><label>Body Type</label><select id="fBody"><option value="">All Body Types</option></select></div>
    <div class="field"><label>Condition</label><select id="fCondition"><option value="">All Conditions</option></select></div>
    <div class="field"><label>Fuel</label><select id="fFuel"><option value="">All Fuel Types</option></select></div>
    <div class="field"><label>Sort</label><select id="fSort"><option value="">Default</option><option value="newest">Newest First</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="year_desc">Year: Newest</option></select></div>
    <button class="btn btn-gold" onclick="applyFilters()">🔍 SEARCH</button>
  </div>
  <div class="filters-row2">
    <div class="field" style="min-width:150px;"><label>Min Price (KSh)</label><input id="fMinPrice" type="number" placeholder="0"></div>
    <div class="field" style="min-width:150px;"><label>Max Price (KSh)</label><input id="fMaxPrice" type="number" placeholder="Any"></div>
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
${servicesSection()}
<section class="trust" style="padding:0;"><div class="wrap">
  <div class="trust-item"><div class="trust-ic">🛡️</div><div><b>QISJ Verified</b><span>Mileage &amp; Auction Sheet</span></div></div>
  <div class="trust-item"><div class="trust-ic">✅</div><div><b>50% Deposit</b><span>Balance 24 Months</span></div></div>
  <div class="trust-item"><div class="trust-ic">🌍</div><div><b>We Import For You</b><span>Japan · UK · Dubai</span></div></div>
  <div class="trust-item"><div class="trust-ic">💰</div><div><b>Financing Arranged</b><span>Banks &amp; SACCOs</span></div></div>
</div></section>
<section><div class="wrap" style="text-align:center;">
  <h2 style="font-size:32px;margin-bottom:14px;">Ready To Find Your Dream Car?</h2>
  <p style="color:var(--muted);max-width:560px;margin:0 auto 24px;font-size:15px;">Message us on WhatsApp with what you're looking for — we'll find it, verify it, finance it and deliver it.</p>
  <a class="btn btn-wa" href="https://wa.me/254727073958" target="_blank" style="padding:15px 28px;font-size:15px;">💬 Chat With Us Now</a>
</div></section>
${CAR_MODAL_HTML}`;
}
function productsContent(){
  return `
${pageHeader('Shop','Our Products','Brand new, foreign used, locally used and custom imports on order. Use the filters to narrow down your perfect match.')}
<section style="padding-top:30px;"><div class="wrap">
  <div class="filters">
    <div class="field"><label>Search</label><input id="fSearch" placeholder="e.g. Toyota Axio"></div>
    <div class="field"><label>Make</label><select id="fMake"><option value="">All Makes</option></select></div>
    <div class="field"><label>Body Type</label><select id="fBody"><option value="">All Body Types</option></select></div>
    <div class="field"><label>Condition</label><select id="fCondition"><option value="">All Conditions</option></select></div>
    <div class="field"><label>Fuel</label><select id="fFuel"><option value="">All Fuel Types</option></select></div>
    <div class="field"><label>Sort</label><select id="fSort"><option value="">Default</option><option value="newest">Newest First</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="year_desc">Year: Newest</option></select></div>
    <button class="btn btn-gold" onclick="applyFilters()">🔍 SEARCH</button>
  </div>
  <div class="filters-row2">
    <div class="field" style="min-width:150px;"><label>Min Price (KSh)</label><input id="fMinPrice" type="number" placeholder="0"></div>
    <div class="field" style="min-width:150px;"><label>Max Price (KSh)</label><input id="fMaxPrice" type="number" placeholder="Any"></div>
    <label class="chk"><input type="checkbox" id="fIncludeSold" onchange="applyFilters()"> Include sold cars</label>
    <button class="view-all" onclick="resetFilters()">Reset filters</button>
  </div>
</div></section>
<section style="padding-top:0;"><div class="wrap">
  <div class="section-head"><h2>AVAILABLE VEHICLES</h2><div class="stock-badge"><span class="dot"></span> <span id="availableCount">0</span> Showing</div></div>
  <div class="cars-grid" id="carsGrid"></div>
</div></section>
${CAR_MODAL_HTML}`;
}
function aboutContent(){
  return `
${pageHeader('Company','About EMJ Motors','We are a full-service dealership — not a used-car lot. We sell, import, finance and support every kind of vehicle, for every kind of driver.')}
<section class="content-section"><div class="wrap">
  <div class="content-block">
    <h2>Our Vision</h2>
    <p>To be East Africa's most trusted automotive partner — the one place where buying a car feels as good as driving one. We exist to remove every ounce of friction, doubt and pressure from the car-buying journey.</p>
    <div class="pull-quote">"A great car dealer doesn't sell cars. They solve mobility. They match people to the right machine for their life, their budget and their dreams."</div>
  </div>
  <div class="content-block">
    <h2>What We Actually Do</h2>
    <p>Most people think a car dealer just parks cars on a lot and waits. That's not us. Here's what a modern, professional dealership should — and does — do:</p>
    <ul>
      <li><strong>We source.</strong> We scan auction houses in Japan, the UK, Dubai and Singapore to find the exact trim, colour and year you want.</li>
      <li><strong>We import.</strong> We handle shipping, clearing, duty, NTSA registration and delivery — you never touch a single customs form.</li>
      <li><strong>We verify.</strong> Every foreign vehicle is QISJ mileage verified. We hand you the original auction sheet. No rolled-back odometers, no hidden accidents.</li>
      <li><strong>We finance.</strong> Through our bank and SACCO partners we arrange asset finance, logbook loans and 50/50 payment plans.</li>
      <li><strong>We trade.</strong> We value your current car fairly and offset it against your new one — same day.</li>
      <li><strong>We protect.</strong> Insurance partners, extended warranties, roadside assistance and service packages that follow you long after purchase.</li>
      <li><strong>We stay.</strong> Spare parts, servicing referrals, resale support — a real dealer is a relationship, not a transaction.</li>
    </ul>
  </div>
  <div class="content-block">
    <h2>What We Believe A Dealer Should Always Do</h2>
    <ul>
      <li><strong>Tell the truth first.</strong> Every scratch, every accident, every service gap — disclosed upfront. If we wouldn't buy it, we won't sell it.</li>
      <li><strong>Show the price.</strong> One price. No hidden "handling", "clearing" or "logistics" fees added at the last minute.</li>
      <li><strong>Let the customer inspect.</strong> Bring your own mechanic. Bring your uncle who "knows cars". We welcome it.</li>
      <li><strong>Stand behind the sale.</strong> If something goes wrong in the first 30 days that we caused, we make it right.</li>
      <li><strong>Respect the buyer's time.</strong> No pushy sales, no endless "let me talk to my manager". Clear answers, fast.</li>
      <li><strong>Give back.</strong> Support the local community, employ locally, and mentor young mechanics and salespeople.</li>
    </ul>
  </div>
  <div class="content-block">
    <h2>Why Nairobi Trusts EMJ</h2>
    <ul>
      <li><strong>Every vehicle type.</strong> Brand new, foreign used, locally used, or custom imports — we cover all four.</li>
      <li><strong>Every price point.</strong> From a KSh 900,000 first car to an KSh 15M luxury SUV. No customer is too small.</li>
      <li><strong>Every step handled.</strong> Sourcing, importing, financing, verifying, insuring, servicing.</li>
      <li><strong>Every time, on time.</strong> We quote a delivery date and we keep it.</li>
    </ul>
  </div>
  <div class="content-block">
    <h2>Our Promise</h2>
    <p>You will never leave EMJ Motors feeling rushed, confused or cheated. You will leave with the right car, at the right price, with the right paperwork — and a WhatsApp number you can actually use when you need something.</p>
  </div>
</div></section>`;
}
function howToBuyContent(){
  return `
${pageHeader('Guide','How To Buy','A simple 6-step process from browsing to driving away in your new car.')}
<section class="content-section"><div class="wrap">
  <div class="steps-grid">
    <div class="step-card"><div class="step-num">1</div><h3>Browse Our Stock</h3><p>Explore our online inventory or visit our Ngong Road showroom to see the cars in person.</p></div>
    <div class="step-card"><div class="step-num">2</div><h3>Inquire via WhatsApp</h3><p>Message us on WhatsApp for the specific car you like. We respond within minutes with photos, video and details.</p></div>
    <div class="step-card"><div class="step-num">3</div><h3>Schedule Inspection</h3><p>Book a viewing at our showroom. Bring your own mechanic or use our recommended partner for an independent check.</p></div>
    <div class="step-card"><div class="step-num">4</div><h3>QISJ Verification</h3><p>Receive the QISJ mileage verification report and auction sheet — confirming the car's true history.</p></div>
    <div class="step-card"><div class="step-num">5</div><h3>Pay 50% Deposit</h3><p>Once you're happy, pay a 50% deposit via M-Pesa or bank transfer to reserve the vehicle.</p></div>
    <div class="step-card"><div class="step-num">6</div><h3>Drive Away</h3><p>Take delivery immediately with the balance payable over up to 24 months — no interest for the first 3 months.</p></div>
  </div>
  <div class="content-block" style="margin-top:26px;">
    <h2>Documents You'll Need</h2>
    <ul><li>National ID or Passport</li><li>KRA PIN certificate</li><li>Proof of address (utility bill or bank statement)</li><li>Payment via M-Pesa or bank transfer</li></ul>
  </div>
  <div class="content-block">
    <h2>Want Us To Import For You?</h2>
    <p>If the car you want isn't in our stock, we'll import it. Tell us the make, model, year, trim, colour and budget — we'll send you options from Japanese, UK, Dubai and Singapore auctions within 48 hours.</p>
    <p style="margin-top:14px;"><a href="https://wa.me/254727073958?text=Hi%20EMJ%20Motors%2C%20I'd%20like%20to%20import%20a%20car" target="_blank" class="btn btn-wa">💬 Request An Import Quote</a></p>
  </div>
  <div class="content-block">
    <h2>Need Financing?</h2>
    <p>We work with Kenya's leading banks and SACCOs to arrange asset finance and logbook loans. Send us your ID and 6 months of bank statements and we'll shop the best rate for you.</p>
  </div>
</div></section>`;
}
function offersContent(){
  return `
${pageHeader('Deals','Special Offers','Limited-time deals on selected vehicles and services from EMJ Motors.')}
<section style="padding-top:34px;"><div class="wrap">
  <div class="offer-banner"><h2>🔥 LIMITED TIME DEALS</h2><p>Ask about our interest-free 3-month balance plan on any vehicle below</p>
  <div class="offer-social">
    <a id="ofFb" href="#" target="_blank" aria-label="Facebook"></a>
    <a id="ofIg" href="#" target="_blank" aria-label="Instagram"></a>
    <a id="ofTt" href="#" target="_blank" aria-label="TikTok"></a>
  </div>
  </div>
  <div class="offers-grid" id="offersGrid"></div>
  <div class="section-head" style="margin-top:50px;"><h2>FEATURED STOCK</h2><div class="stock-badge"><span class="dot"></span> <span id="availableCount">0</span> Showing</div></div>
  <div class="cars-grid" id="carsGrid"></div>
</div></section>
${CAR_MODAL_HTML}`;
}
function faqContent(){
  return `
${pageHeader('Support','Frequently Asked Questions','Answers to the questions our customers ask most.')}
<section class="content-section"><div class="wrap" style="max-width:820px;">
  <div class="faq-item"><div class="faq-q">Do you sell brand new cars?<span class="plus">+</span></div><div class="faq-a">Yes. We stock brand new units and can also order specific brand new models to your exact specification. In addition we sell foreign used, locally used and custom imports on order — every vehicle type under one roof.</div></div>
  <div class="faq-item"><div class="faq-q">Can you import a car for me?<span class="plus">+</span></div><div class="faq-a">Absolutely — importing is one of our specialties. Tell us the exact make, model, year, trim and colour you want, and we'll source it from Japan, the UK, Dubai or Singapore. We handle the auction, shipping, clearing and delivery.</div></div>
  <div class="faq-item"><div class="faq-q">Do you arrange financing?<span class="plus">+</span></div><div class="faq-a">Yes. We partner with Kenya's leading banks and SACCOs to arrange asset finance and logbook loans. We also offer in-house 50% deposit + up to 24-month balance plans.</div></div>
  <div class="faq-item"><div class="faq-q">Do you accept trade-ins?<span class="plus">+</span></div><div class="faq-a">Yes — bring your current vehicle for valuation and we'll offset its value against your purchase. WhatsApp us photos and details for a same-day estimate.</div></div>
  <div class="faq-item"><div class="faq-q">What is QISJ mileage verification?<span class="plus">+</span></div><div class="faq-a">QISJ (Quality Inspection Services Japan) is an independent body that verifies the mileage and history of imported vehicles. Every foreign used car we sell comes with a QISJ certificate confirming the odometer has not been tampered with.</div></div>
  <div class="faq-item"><div class="faq-q">What is your payment plan?<span class="plus">+</span></div><div class="faq-a">We require a 50% deposit to secure a vehicle. The balance can be paid over up to 24 months with 0% interest for the first 3 months. Custom plans available — talk to us.</div></div>
  <div class="faq-item"><div class="faq-q">Can I bring my own mechanic for inspection?<span class="plus">+</span></div><div class="faq-a">Yes — and we encourage it. Independent inspection is welcome at our showroom during business hours. We'll give you all the time you need.</div></div>
  <div class="faq-item"><div class="faq-q">Do you deliver outside Nairobi?<span class="plus">+</span></div><div class="faq-a">Yes. We deliver countrywide. Free within Nairobi, charged at cost for upcountry destinations.</div></div>
  <div class="faq-item"><div class="faq-q">Is there a warranty?<span class="plus">+</span></div><div class="faq-a">Yes. We offer a 3-month engine and gearbox warranty on selected vehicles (disclosed on each listing). Extended warranties available on request.</div></div>
  <div class="faq-item"><div class="faq-q">How do I know the mileage is real?<span class="plus">+</span></div><div class="faq-a">Every foreign used vehicle comes with a QISJ mileage verification report and the original Japanese auction sheet. You can verify the QISJ certificate number independently on the QISJ portal.</div></div>
</div></section>`;
}
function contactContent(){
  return `
${pageHeader('Get in Touch','Contact Us','Visit our showroom, call us, or message us on WhatsApp — we\'re here to help.')}
<section class="content-section"><div class="wrap">
  <div class="contact-grid">
    <div class="contact-info-list">
      <div class="contact-info-item"><div class="ic">📞</div><div><b>Call Us</b><span id="cPhone1"></span></div></div>
      <div class="contact-info-item"><div class="ic">💬</div><div><b>WhatsApp</b><span id="cWa"></span></div></div>
      <div class="contact-info-item"><div class="ic">✉️</div><div><b>Email</b><span id="cEmail"></span></div></div>
      <div class="contact-info-item"><div class="ic">📍</div><div><b>Showroom</b><span id="cAddress">Ngong Road, Kilimani, Nairobi</span></div></div>
      <div class="contact-info-item"><div class="ic">🕐</div><div><b>Business Hours</b><span>Mon–Sat: 8:30 AM – 6:00 PM<br>Sunday: By appointment</span></div></div>
      <div class="contact-social">
        <a id="ctFb" href="#" target="_blank" aria-label="Facebook"></a>
        <a id="ctIg" href="#" target="_blank" aria-label="Instagram"></a>
        <a id="ctTt" href="#" target="_blank" aria-label="TikTok"></a>
      </div>
    </div>
    <form class="contact-form" onsubmit="sendContactForm(event)">
      <h2>Send us a message</h2>
      <label>Your Name</label><input id="cfName" required placeholder="John Doe">
      <label>Phone Number</label><input id="cfPhone" required placeholder="07XX XXX XXX">
      <label>Message</label><textarea id="cfMessage" required placeholder="I'm interested in the Toyota Axio..."></textarea>
      <button type="submit" class="btn btn-wa" style="width:100%;">💬 Send via WhatsApp</button>
    </form>
  </div>
  <div style="margin-top:32px;"><iframe id="mapsEmbed" class="maps-embed" style="height:340px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
</div></section>`;
}
function qisjContent(){
  return `
${pageHeader('Trust','QISJ Mileage Verification','Every foreign used car we sell comes with verified mileage — guaranteed.')}
<section class="content-section"><div class="wrap" style="max-width:900px;">
  <div class="content-block"><h2>What is QISJ?</h2><p><strong>QISJ</strong> stands for <em>Quality Inspection Services Japan</em> — an independent vehicle inspection authority based in Japan. QISJ inspects vehicles before export and issues a certificate confirming the vehicle's actual mileage, condition and history.</p></div>
  <div class="content-block"><h2>Why It Matters</h2><p>Mileage tampering is a real problem in the used-car market. Odometer rollbacks can hide worn-out engines, accident history and deferred maintenance. A QISJ certificate removes all doubt.</p>
    <ul><li>Independent, third-party verification</li><li>Confirms mileage at time of export from Japan</li><li>Cross-referenced with the original Japanese auction sheet</li><li>Accepted by banks, insurers and reputable mechanics</li></ul>
  </div>
  <div class="content-block"><h2>How It Works</h2><p>When a vehicle arrives at our showroom, we hand over the QISJ certificate along with the auction sheet. You can independently verify the QISJ certificate number through the official QISJ portal.</p></div>
  <div class="content-block"><h2>Our Commitment</h2><p>Every foreign used vehicle we sell is QISJ verified. No exceptions. If a car's mileage can't be verified, we don't sell it. Simple as that.</p><p style="margin-top:14px;"><a href="/products" class="btn btn-gold">Browse Verified Stock →</a></p></div>
  <div class="content-block"><h2>Want to verify a specific car?</h2><p>Message us on WhatsApp with the vehicle details and we'll send you the QISJ certificate PDF and auction sheet for that unit.</p><p style="margin-top:14px;"><a href="https://wa.me/254727073958" target="_blank" class="btn btn-wa">💬 Verify on WhatsApp</a></p></div>
</div></section>`;
}
function loginContent(){
  return `
${pageHeader('Account','Login / Register','Sign in to save favourites, track inquiries and get personalised offers.')}
<section class="content-section"><div class="wrap">
  <div class="auth-tabs">
    <button class="auth-tab active" data-tab="login" onclick="switchAuthTab('login')">LOGIN</button>
    <button class="auth-tab" data-tab="register" onclick="switchAuthTab('register')">REGISTER</button>
  </div>
  <form class="auth-form" id="loginForm" onsubmit="authSubmit(event,'login')">
    <label>Email</label><input type="email" placeholder="you@example.com" required>
    <label>Password</label><input type="password" placeholder="••••••••" required>
    <button type="submit" class="btn btn-gold">Sign In</button>
    <div class="auth-foot">Forgot password? <a href="/contact">Contact us</a></div>
  </form>
  <form class="auth-form" id="registerForm" style="display:none;" onsubmit="authSubmit(event,'register')">
    <label>Full Name</label><input type="text" placeholder="John Doe" required>
    <label>Email</label><input type="email" placeholder="you@example.com" required>
    <label>Phone</label><input type="tel" placeholder="07XX XXX XXX" required>
    <label>Password</label><input type="password" placeholder="Create a password" required>
    <button type="submit" class="btn btn-gold">Create Account</button>
    <div class="auth-foot">Already have an account? <a href="#" onclick="switchAuthTab('login');return false;">Login</a></div>
  </form>
  <div style="text-align:center;margin-top:26px;font-size:13px;color:var(--muted);">Dealer / staff? <a href="/admin" style="color:var(--gold);text-decoration:underline;">Admin access →</a></div>
</div></section>`;
}
function adminHTML(){
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EMJ Motors — Admin</title><link rel="stylesheet" href="/style.css"></head><body>
<div id="gate" class="gate-wrap" style="display:none;">
  <div class="gate-box">
    <div class="logo-circle" style="margin:0 auto 14px;">E</div>
    <h3>Admin Login</h3>
    <input type="password" id="gatePw" placeholder="Enter admin password">
    <button class="btn btn-gold" style="width:100%;" onclick="login()">Enter</button>
    <div style="margin-top:14px;"><a href="/" style="color:var(--muted);font-size:12px;text-decoration:underline;">Back to site</a></div>
  </div>
</div>
<div id="panel" style="display:none;">
  <div class="admin-header">
    <div class="brand"><div class="logo-circle" style="width:36px;height:36px;">E</div><b>EMJ Admin Dashboard</b></div>
    <div style="display:flex;gap:10px;"><a class="icon-btn" href="/">🌐 View Site</a><button class="icon-btn" onclick="logout()">🚪 Logout</button></div>
  </div>
  <div class="admin-wrap">
    <div class="admin-section">
      <h2>Site Settings</h2>
      <p class="sub">Contact info, location and colours shown across the site.</p>
      <div class="admin-grid">
        <div><label>Business Name</label><input id="setName"></div>
        <div><label>Tagline</label><input id="setTagline"></div>
        <div><label>Primary Phone</label><input id="setPhone1"></div>
        <div><label>WhatsApp (digits only)</label><input id="setWa"></div>
        <div><label>Secondary Phone</label><input id="setPhone2"></div>
        <div><label>Email</label><input id="setEmail"></div>
        <div><label>Address</label><input id="setAddress"></div>
        <div><label>Location Short</label><input id="setLocShort"></div>
        <div><label>Accent Colour</label><input id="setColorGold" type="color"></div>
        <div><label>Facebook URL</label><input id="setFb" placeholder="https://facebook.com/..."></div>
        <div><label>Instagram URL</label><input id="setIg" placeholder="https://instagram.com/..."></div>
        <div><label>TikTok URL</label><input id="setTt" placeholder="https://tiktok.com/@..."></div>
        <div class="full"><label>About Text</label><textarea id="setAbout"></textarea></div>
      </div>
      <button class="btn btn-gold" onclick="saveSettings()">💾 Save Settings</button>
    </div>

    <div class="admin-section" id="offerFormSection">
      <h2 id="offerFormTitle">Add New Offer</h2>
      <p class="sub">Create promotional banners that appear on the Special Offers page.</p>
      <div class="admin-grid">
        <div><label>Title</label><input id="oTitle" placeholder="Free QISJ Verification"></div>
        <div><label>Badge (optional)</label><input id="oBadge" placeholder="LIMITED TIME / HOT DEAL / NEW"></div>
        <div><label>Order</label><input id="oOrder" type="number" placeholder="1"></div>
        <div><label>Expiry Date (optional)</label><input id="oExpiry" placeholder="2026-12-31"></div>
        <div><label>CTA Text</label><input id="oCtaText" placeholder="Claim Offer"></div>
        <div><label>CTA Link</label><input id="oCtaLink" placeholder="https://wa.me/... or /contact"></div>
        <div class="full"><label>Description</label><textarea id="oDescription" placeholder="Book any foreign used vehicle this month and get free QISJ verification..."></textarea></div>
        <div class="full"><label>Banner Image (optional)</label><input type="file" id="oImage" accept="image/*"></div>
        <label class="chk-inline"><input type="checkbox" id="oActive" checked> Active (show on site)</label>
      </div>
      <button class="btn btn-gold" onclick="saveOffer()">➕ Save Offer</button>
      <button class="btn btn-outline" id="cancelOfferEditBtn" style="display:none;" onclick="cancelOfferEdit()">Cancel Edit</button>
    </div>

    <div class="admin-section">
      <h2>All Offers (<span id="offersCount">0</span>)</h2>
      <div id="offersListing"></div>
    </div>

    <div class="admin-section" id="carFormSection">
      <h2 id="formTitle">Add New Car</h2>
      <p class="sub">Add vehicles to your stock. Upload up to 12 photos per listing.</p>
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
    </div>

    <div class="admin-section">
      <h2>All Listings (<span id="adminCount">0</span>)</h2>
      <div id="adminListing"></div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script src="/admin.js"></script>
</body></html>`;
}

/* ============ ROUTES ============ */
app.get('/style.css',(rq,rs)=>{rs.type('text/css').send(STYLE_CSS);});
app.get('/app.js',(rq,rs)=>{rs.type('application/javascript').send(PUBLIC_JS);});
app.get('/admin.js',(rq,rs)=>{rs.type('application/javascript').send(ADMIN_JS);});
app.get('/',(rq,rs)=>rs.send(layout('Home',homeContent())));
app.get('/products',(rq,rs)=>rs.send(layout('Products',productsContent())));
app.get('/about',(rq,rs)=>rs.send(layout('About Us',aboutContent())));
app.get('/how-to-buy',(rq,rs)=>rs.send(layout('How To Buy',howToBuyContent())));
app.get('/offers',(rq,rs)=>rs.send(layout('Special Offers',offersContent())));
app.get('/faq',(rq,rs)=>rs.send(layout('FAQ',faqContent())));
app.get('/contact',(rq,rs)=>rs.send(layout('Contact Us',contactContent())));
app.get('/qisj',(rq,rs)=>rs.send(layout('QISJ Verification',qisjContent())));
app.get('/login',(rq,rs)=>rs.send(layout('Login / Register',loginContent())));
app.get('/admin',(rq,rs)=>rs.send(adminHTML()));

app.listen(PORT,()=>{
  console.log('EMJ Motors is running.');
});
