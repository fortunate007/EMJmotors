const fs=require('fs');
if(!fs.existsSync('server.js')){console.error('server.js not found here. cd into the project folder first.');process.exit(1);}
let s=fs.readFileSync('server.js','utf8');
if(s.includes('createClient')){console.error('Already patched.');process.exit(1);}
const must=(c,m)=>{if(!c){console.error('PATCH FAILED, not found: '+m+'\nNothing was changed.');process.exit(1);}};

const NEWDB=[
"const {createClient}=require('@supabase/supabase-js');",
"if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');",
"const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});",
"const BUCKET='car-photos';",
"async function loadDB(){",
"  const {data,error}=await sb.from('site_data').select('data').eq('id',1).maybeSingle();",
"  if(error)throw error;",
"  if(!data){",
"    const i={cars:sampleCars,offers:sampleOffers,settings:defaultSettings,nextId:sampleCars.length+1,nextOfferId:sampleOffers.length+1};",
"    const r=await sb.from('site_data').upsert({id:1,data:i});",
"    if(r.error)throw r.error;",
"    return i;",
"  }",
"  const db=data.data;",
"  if(!db.settings)db.settings=defaultSettings;",
"  if(!db.cars)db.cars=[];",
"  if(!db.offers)db.offers=sampleOffers;",
"  if(!db.nextId)db.nextId=db.cars.reduce((m,c)=>Math.max(m,c.id),0)+1;",
"  if(!db.nextOfferId)db.nextOfferId=db.offers.reduce((m,c)=>Math.max(m,c.id),0)+1;",
"  return db;",
"}",
"async function saveDB(db){const {error}=await sb.from('site_data').upsert({id:1,data:db});if(error)throw error;}",
""].join('\n');

const NEWUP=[
"const uploadToCloud=async f=>{",
"  const name=Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(f.originalname||'').toLowerCase();",
"  const {error}=await sb.storage.from(BUCKET).upload(name,f.buffer,{contentType:f.mimetype,upsert:false});",
"  if(error)throw error;",
"  return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;",
"};",
""].join('\n');

const re=/const \{Pool[\s\S]*?async function saveDB\(db\)\{[^\n]*\n/;
must(re.test(s),'database block (Pool ... saveDB)');
s=s.replace(re,()=>NEWDB);
const ure=/const uploadToCloud=[^\n]*\n/;
must(ure.test(s),'uploadToCloud line');
s=s.replace(ure,()=>NEWUP);
s=s.replace(/const cloudinary=require\('cloudinary'\)\.v2;\n/,()=>'');
s=s.replace(/cloudinary\.config\([^\n]*\n/,()=>'');

fs.writeFileSync('server.js',s);
console.log('Patched OK. Backup is server.js.bak');