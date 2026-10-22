import {chromium,devices} from 'playwright';
import {createServer} from 'node:http';
import{readFileSync,existsSync}from'node:fs';
import{resolve,join,extname}from'node:path';
import{pathToFileURL}from'node:url';
import assert from 'node:assert/strict';
const root=resolve('dist');
const server=createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://x').pathname);if(name.endsWith('/'))name+='index.html';const file=join(root,name);if(!file.startsWith(root)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.woff':'font/woff','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const url='http://127.0.0.1:'+server.address().port+'/';
const problems=[];
async function start(page,target=url){
 page.on('pageerror',e=>problems.push(e.message));page.on('console',m=>{if(m.type()==='error')problems.push(m.text());});
 await page.goto(target);await page.waitForSelector('#new');await page.click('#new');await page.waitForFunction(()=>['cinematic','dialog'].includes(window.littleWorld.mode));
 await page.evaluate(()=>{const a=window.littleWorld.app;for(let i=0;i<8;i++){if(a.mode==='cinematic')a.finishCinematic();else if(a.mode==='dialog')document.querySelector('#dialog-next')?.click();else break;}a.state.seen.push('view-grass','view-puddle','view-wrapper','view-lamp');});
 await page.waitForFunction(()=>window.littleWorld.mode==='play');await page.waitForTimeout(700);
}
async function enter(page,id){
 await page.evaluate(id=>window.littleWorld.app.enterExpedition(id),id);
 await page.waitForFunction(id=>window.littleWorld.app.scene.isExpedition&&window.littleWorld.app.scene.site.id===id,id);
 await page.waitForTimeout(700);
 await page.evaluate(()=>{if(window.littleWorld.app.mode==='dialog')document.querySelector('#dialog-next').click();});
 await page.waitForFunction(()=>window.littleWorld.mode==='play'&&!window.littleWorld.app.scene.cameras.main.fadeEffect.isRunning);
}
try{
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();await start(page);
 // Enter through a real overworld entrance and keyboard action.
 await page.evaluate(()=>{const a=window.littleWorld.app;a.state.x=1260;a.state.y=660;a.scene.reset(a.state);a.scene.updateNear();});
 assert.equal(await page.evaluate(()=>window.littleWorld.app.scene.near?.expedition),'glass');await page.keyboard.press('e');await page.waitForFunction(()=>window.littleWorld.app.scene.isExpedition);await page.waitForTimeout(1000);await page.evaluate(()=>{if(window.littleWorld.app.mode==='dialog')document.querySelector('#dialog-next').click();});
 for(const [id,x,y]of [['glass',1100,700],['hollow',990,830],['creek',980,790],['canopy',1400,800]]){
  if(id!=='glass')await enter(page,id);
  await page.evaluate(([x,y])=>{const a=window.littleWorld.app;a.scene.state.x=x;a.scene.state.y=y;a.scene.reset();},[x,y]);
  await page.waitForFunction(()=>!window.littleWorld.app.scene.cameras.main.fadeEffect.isRunning);await page.waitForTimeout(1100);
  assert(await page.evaluate(()=>window.littleWorld.app.scene.player.texture.key.startsWith('visual-')),'hero atlas remains registered');
  assert(!(await page.locator('#hud').textContent()).includes('undefined'));
  await page.screenshot({path:'tmp/browser-horizon-'+id+'.jpg',type:'jpeg',quality:88});
  await page.click('#map-open');assert.equal(await page.evaluate(()=>window.littleWorld.mode),'map');await page.click('#close');
 }
 // Save, reload and resume from within the fourth local world.
 await page.evaluate(()=>window.littleWorld.app.save(false));await page.reload();await page.waitForSelector('#continue');await page.click('#continue');await page.waitForFunction(()=>window.littleWorld.app.scene.isExpedition);assert.equal(await page.evaluate(()=>window.littleWorld.app.scene.site.id),'canopy');
 await page.click('#diary-open');await page.click('[data-tab="expeditions"]');assert.equal(await page.locator('.exp-card').count(),4);await page.screenshot({path:'tmp/browser-expedition-journal.jpg',type:'jpeg',quality:85});await page.click('#close');
 for(const lang of ['kk','en','ru']){await page.evaluate(lang=>window.littleWorld.app.changeLanguage(lang),lang);assert(!(await page.locator('#hud').textContent()).includes('undefined'));}
 await context.close();
 // A portable file must include every new atlas and floor, with no HTTP fetch.
 const off=await browser.newContext({viewport:{width:1280,height:720}}),op=await off.newPage();await start(op,pathToFileURL(resolve('release/PLAY_OFFLINE.html')).href);await enter(op,'hollow');assert(await op.evaluate(()=>window.littleWorld.app.scene.textures.exists('horizon-floor3')));await off.close();
 const {defaultBrowserType,...phone}=devices['iPhone 13 landscape'];const mobile=await browser.newContext(phone),mp=await mobile.newPage();await start(mp);await enter(mp,'creek');assert(await mp.evaluate(()=>!document.querySelector('#touch').hidden));
 const before=await mp.evaluate(()=>window.littleWorld.app.scene.state.x);
 await mp.evaluate(()=>{window.littleWorld.app.joy={x:1,y:0};});await mp.waitForTimeout(1300);await mp.evaluate(()=>{window.littleWorld.app.joy={x:0,y:0};});const mobileState=await mp.evaluate(()=>({x:window.littleWorld.app.scene.state.x,mode:window.littleWorld.mode,active:window.littleWorld.app.scene.sys.isActive()}));console.log('MOBILE',before,mobileState);assert(mobileState.x>before+45);
 await mp.tap('#map-open');assert.equal(await mp.evaluate(()=>window.littleWorld.mode),'map');await mobile.close();
 assert.deepEqual(problems,[]);console.log('EXPEDITION BROWSER PASSED: four WebGL scenes, entrance E, maps, notebook, languages, reload, portable file, mobile movement and clean console.');
}finally{await browser.close();server.close();}
