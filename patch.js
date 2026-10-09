const fs=require('fs');
if(!fs.existsSync('server.js')){console.error('server.js not found here. cd into the project folder first.');process.exit(1);}
let s=fs.readFileSync('server.js','utf8');
if(s.includes('uploadToCloud')){console.error('Already patched.');process.exit(1);}
const must=(c,m)=>{if(!c){console.error('PATCH FAILED, not found: '+m+'\nNothing was changed.');process.exit(1);}};
const rep=(a,b)=>{must(s.includes(a),a.slice(0,60));s=s.replace(a,()=>b);};

const NEWDB=[
"const {Pool}=require('pg');",
"const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});",
"const dbReady=pool.query('CREATE TABLE IF NOT EXISTS site_data (id int PRIMARY KEY, data jsonb NOT NULL)');",
"async function loadDB(){",
"  await dbReady;",
"  const r=await pool.query('SELECT data FROM site_data WHERE id=1');",
"  if(!r.rows.length){",
"    const i={cars:sampleCars,offers:sampleOffers,settings:defaultSettings,nextId:sampleCars.length+1,nextOfferId:sampleOffers.length+1};",
"    await pool.query('INSERT INTO site_data(id,data) VALUES(1,$1) ON CONFLICT (id) DO NOTHING',[JSON.stringify(i)]);",
"    return i;",
"  }",
"  const db=r.rows[0].data;",
"  if(!db.settings)db.settings=defaultSettings;",
"  if(!db.cars)db.cars=[];",
"  if(!db.offers)db.offers=sampleOffers;",
"  if(!db.nextId)db.nextId=db.cars.reduce((m,c)=>Math.max(m,c.id),0)+1;",
"  if(!db.nextOfferId)db.nextOfferId=db.offers.reduce((m,c)=>Math.max(m,c.id),0)+1;",
"  return db;",
"}",
"async function saveDB(db){await pool.query('INSERT INTO site_data(id,data) VALUES(1,$1) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data',[JSON.stringify(db)]);}",
""].join('\n');

const re=/function loadDB\(\)\{[\s\S]*?function saveDB\(db\)\{[^\n]*\n/;
must(re.test(s),'loadDB/saveDB block');
s=s.replace(re,()=>NEWDB);
s=s.replace(/(?<!function )loadDB\(\)/g,()=>'(await loadDB())');
s=s.replace(/(?<!function )saveDB\(db\)/g,()=>'await saveDB(db)');
s=s.replace(/\(rq,rs\)=>/g,()=>'async (rq,rs)=>');

const dre=/const storage=multer\.diskStorage\([^\n]*\n/;
must(dre.test(s),'multer.diskStorage line');
s=s.replace(dre,()=>'');
rep("const upload=multer({storage,limits:{fileSize:8*1024*1024}});",
["const cloudinary=require('cloudinary').v2;",
"const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});",
"const uploadToCloud=f=>new Promise((ok,no)=>cloudinary.uploader.upload_stream({folder:'emjmotors'},(e,r)=>e?no(e):ok(r.secure_url)).end(f.buffer));",
"process.on('unhandledRejection',e=>console.error('Unhandled:',e));"].join('\n'));
rep("const photos=(rq.files||[]).map(f=>'/uploads/'+f.filename);","const photos=await Promise.all((rq.files||[]).map(uploadToCloud));");
rep("const np=(rq.files||[]).map(f=>'/uploads/'+f.filename);","const np=await Promise.all((rq.files||[]).map(uploadToCloud));");
rep("image:rq.file?'/uploads/'+rq.file.filename:(b.imageUrl||'')","image:rq.file?await uploadToCloud(rq.file):(b.imageUrl||'')");
rep("if(rq.file)o.image='/uploads/'+rq.file.filename;","if(rq.file)o.image=await uploadToCloud(rq.file);");

fs.writeFileSync('server.js',s);
console.log('Patched OK. Backup is server.js.bak');