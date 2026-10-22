import {chromium,devices} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve('dist'),catalog=JSON.parse(readFileSync('public/voice/index.json','utf8'));
const voiced=catalog.entries.find(e=>['ru','kk','en'].every(l=>e.files[l])&&e.id==='cine-prologue-0');
assert(voiced,'the opening must be voiced in all three languages');
const server=createServer((req,res)=>{
 let path=decodeURIComponent(new URL(req.url,'http://x').pathname);if(path.endsWith('/'))path+='index.html';
 const file=join(root,path);if(!file.startsWith(root)||!existsSync(file)||statSync(file).isDirectory()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.woff':'font/woff','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const url='http://127.0.0.1:'+server.address().port+'/',errors=[];
function watch(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
const speaking=page=>page.waitForFunction(()=>{const a=window.littleWorld?.app,c=a?.voice.current;return c?.sound.playing(c.playId)&&a.audio.speaking;});
const details=page=>page.evaluate(()=>{const a=window.littleWorld.app,c=a.voice.current;return{lang:c?.clip.lang,position:c?.sound.seek(c.playId),paused:c?.paused,ticket:a.voice.ticket,duck:a.audio.speaking,src:c?.sound._src.slice(0,30)};});
async function start(page,target=url){watch(page);await page.goto(target);await page.waitForSelector('#new');await page.click('#new');await speaking(page);}
try{
 const ctx=await browser.newContext({viewport:{width:1366,height:768}}),page=await ctx.newPage();await start(page);
 assert.equal((await details(page)).lang,'ru');await page.waitForTimeout(400);const before=await details(page);assert(before.position>.1);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await details(page);assert(paused.paused);assert(!paused.duck);await page.waitForTimeout(500);assert(Math.abs((await details(page)).position-paused.position)<.1);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await speaking(page);assert(!(await details(page)).paused);
 await page.click('#cine-replay');await speaking(page);assert((await details(page)).ticket>before.ticket);assert((await details(page)).position<1);
 for(const lang of ['en','kk','ru']){await page.click('#cinema [data-lang="'+lang+'"]');await speaking(page);assert.equal((await details(page)).lang,lang);}
 const shot=await page.evaluate(()=>({id:window.littleWorld.app.cineData.index,ticket:window.littleWorld.app.voice.ticket}));await page.click('#cine-next');await page.waitForFunction(old=>window.littleWorld.app.cineData.index>old,shot.id);assert((await details(page)).ticket>shot.ticket);await speaking(page);
 await page.click('#cine-skip');
 await page.evaluate(text=>{const a=window.littleWorld.app;if(a.mode==='dialog')a.closeDialog();a.dialog(['Голос','Дауыс','Voice'],text);},voiced.text);await speaking(page);
 await page.keyboard.press('r');await speaking(page);assert((await details(page)).position<1);
 await page.evaluate(()=>window.littleWorld.app.voice.toggle());assert.equal(await page.evaluate(()=>window.littleWorld.app.voice.current),null);assert(!(await details(page)).duck);
 await page.evaluate(()=>window.littleWorld.app.save(false));await page.reload();await page.waitForSelector('#continue');assert.equal(await page.evaluate(()=>window.littleWorld.app.state.settings.narration),false);
 await page.click('#continue');await page.evaluate(text=>{const a=window.littleWorld.app;if(a.mode==='cinematic')a.finishCinematic();if(a.mode==='dialog')a.closeDialog();a.dialog(['Голос','Дауыс','Voice'],text);},voiced.text);assert.equal(await page.evaluate(()=>window.littleWorld.app.voice.current),null);
 await page.evaluate(()=>window.littleWorld.app.voice.toggle());await speaking(page);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();const c=await caches.open(keys.find(k=>k.startsWith('little-world-')));return(await c.keys()).filter(r=>r.url.endsWith('.mp3')).length;});
 assert.equal(cached,Object.values(catalog.coverage).reduce((n,x)=>n+x,0));
 await ctx.setOffline(true);await page.reload();await page.waitForSelector('#continue');await page.click('#continue');await page.evaluate(text=>{const a=window.littleWorld.app;if(a.mode==='cinematic')a.finishCinematic();if(a.mode==='dialog')a.closeDialog();a.dialog(['Голос','Дауыс','Voice'],text);},voiced.text);await speaking(page);await ctx.close();
 const off=await browser.newContext(),op=await off.newPage();const fetched=[];op.on('request',r=>{if(/^https?:/.test(r.url()))fetched.push(r.url());});await start(op,pathToFileURL(resolve('release/PLAY_OFFLINE.html')).href);assert((await details(op)).src.startsWith('data:audio/mpeg'));assert.deepEqual(fetched,[]);await off.close();
 const {defaultBrowserType,...phone}=devices['iPhone 13 landscape'];const mobile=await browser.newContext(phone),mp=await mobile.newPage();watch(mp);await mp.goto(url);await mp.waitForSelector('#new');await mp.tap('#new');await speaking(mp);await mp.tap('#cine-replay');await speaking(mp);assert((await details(mp)).position<1);await mobile.close();
 assert.deepEqual(errors,[]);console.log('SPEECH BROWSER PASSED: decoded MP3, three languages, replay, skip, focus pause/resume, ducking, saved mute, offline cache, standalone file and mobile tap.');
}finally{await browser.close();server.close();}
