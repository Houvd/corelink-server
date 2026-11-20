'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createDestination } = require('../async-log-destination');
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn) {
  for (let i = 0; i < 300; i++) { if (fn()) return; await wait(5); }
  throw Error('Timed out waiting for log I/O');
}
async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'corelink-logger-'));
  const failures = [];
  try {
    // A partial UTF-8 write followed by EINTR must neither duplicate nor truncate.
    let calls = 0;
    const content = 'first é🎵 line\nsecond line\n';
    const io = { ...fs, write(fd, buffer, offset, length, position, cb) {
      if (++calls === 2) { const e = Error('interrupted'); e.code='EINTR'; setImmediate(() => cb(e)); }
      else fs.write(fd, buffer, offset, Math.min(length, 3), position, cb);
    } };
    const a = createDestination({destination:path.join(dir,'retry.log'),name:'retry',io,retryDelayMs:1,report:e=>failures.push(e)});
    a.write(content);
    await until(() => a.getStatus().writtenBytes === Buffer.byteLength(content));
    assert.strictEqual(fs.readFileSync(path.join(dir,'retry.log'),'utf8'),content);
    assert.strictEqual(a.getStatus().retryCount,1);assert.strictEqual(a.getStatus().recoveries,1);assert.strictEqual(failures.length,0);
    a.write('logging continues\n');await until(()=>a.getStatus().queuedBytes===0);a.close();
    console.log('PASS EINTR retry, partial UTF-8 writes and logging continuation');

    let available=false, attempts=0;
    const bad = { ...fs, write(...args) {
      attempts++;
      if(available)fs.write(...args);
      else {const e=Error('interrupted');e.code='EINTR';setImmediate(()=>args[args.length-1](e));}
    } };
    const b=createDestination({destination:path.join(dir,'backoff.log'),name:'backoff',io:bad,maxRetries:2,retryDelayMs:1,cooldownMs:200,maxBytes:256,report:e=>failures.push(e)});
    b.write('failure\n');await until(()=>b.getStatus().state==='backoff');assert.strictEqual(attempts,3);
    for(let i=0;i<10000;i++)b.write('discarded\n');
    assert.strictEqual(attempts,3);assert.strictEqual(b.getStatus().queuedBytes,0);assert(b.getStatus().droppedBytes>0);
    available=true;await until(()=>b.getStatus().state==='ready');b.write('recovered\n');await until(()=>b.getStatus().queuedBytes===0);
    assert.strictEqual(fs.readFileSync(path.join(dir,'backoff.log'),'utf8'),'recovered\n');assert.strictEqual(b.getStatus().recoveries,1);b.close();
    console.log('PASS repeated failures back off without retries per message and recover automatically');

    let release;
    const blocked={...fs,write(...args){release=()=>fs.write(...args);}};
    const c=createDestination({destination:path.join(dir,'bounded.log'),name:'bounded',io:blocked,maxBytes:64,report:e=>failures.push(e)});
    c.write('first\n');await until(()=>!!release);
    for(let i=0;i<1000;i++)c.write('another line\n');
    assert(c.getStatus().queuedBytes<=64);assert(c.getStatus().droppedBytes>0);c.close();release();
    console.log('PASS queue memory bounded while disk I/O is stalled');

    // Exercise Pino and two real files with a broken terminal in an isolated process.
    const child=spawnSync(process.execPath,['-e',`
      const fs=require('fs');const real=fs.write;
      fs.write=function(fd,...args){if(fd===1){const e=Error('closed terminal');e.code='EPIPE';setImmediate(()=>args[args.length-1](e));}else real.call(fs,fd,...args);};
      const {createLogger}=require(${JSON.stringify(path.resolve(__dirname,'../logger.js'))});
      const log=createLogger({logFile:true,logStdOut:true});
      log.info('file survives terminal failure');log.error('error file survives');
      setTimeout(()=>{const status=log.getStatus();if(status.destinations.find(d=>d.destination==='access file').writtenBytes===0)process.exit(2);log.close();process.exit(0)},300);
    `],{cwd:dir,encoding:'utf8',timeout:5000});
    assert.strictEqual(child.status,0,child.stderr);
    const access=fs.readdirSync(path.join(dir,'data')).find(n=>n.endsWith('.access.log'));
    const error=fs.readdirSync(path.join(dir,'data')).find(n=>n.endsWith('.error.log'));
    assert(fs.readFileSync(path.join(dir,'data',access),'utf8').includes('file survives terminal failure'));
    assert(fs.readFileSync(path.join(dir,'data',error),'utf8').includes('error file survives'));
    assert.strictEqual((child.stderr.match(/Corelink emergency/g)||[]).length,1);
    console.log('PASS failed stdout is isolated; access/error files and first failure report survive');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
