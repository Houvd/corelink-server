'use strict';
const fs = require('fs');

// A bounded Pino destination. All ordinary I/O is asynchronous; no transport worker
// or unhandled error event can feed back into the uncaughtException logger.
function createDestination({ destination, name, report, maxBytes = 262144,
  retryDelayMs = 25, cooldownMs = 30000, maxRetries = 8, io = fs }) {
  const queue = [];
  let head = 0, bytes = 0, active = false, timer, fd = typeof destination === 'number' ? destination : null;
  let closed = false, failures = 0, pending, needsRecovery = false;
  const status = { destination: name, state: 'ready', queuedBytes: 0,
    retryCount: 0, droppedBytes: 0, writtenBytes: 0, lastError: null, recoveries: 0 };
  const later = (fn, ms) => { timer = setTimeout(() => { timer = null; fn(); }, ms); timer.unref(); };
  function done() {
    active = false; pending = null; failures = 0; status.state = 'ready'; pump();
  }
  function error(err, retry) {
    status.lastError = err.code || err.message;
    if (['EINTR', 'EAGAIN', 'EBUSY'].includes(err.code) && failures++ < maxRetries) {
      status.retryCount++; status.state = 'retrying'; needsRecovery = true;
      later(retry, Math.min(250, retryDelayMs * failures)); return;
    }
    // Discard this destination's pending data rather than grow an audio-delaying
    // queue. Other destinations continue, and a bounded probe will reopen it.
    status.droppedBytes += bytes; queue.length = 0; head = 0; bytes = 0;
    pending = null; active = false; status.state = 'backoff'; needsRecovery = true;
    report(err, `logging destination ${name}; retry in ${cooldownMs} ms`);
    if (fd !== null && typeof destination !== 'number') {
      const old = fd; fd = null; io.close(old, () => {});
    }
    later(() => { if (closed) return; status.state = 'ready'; failures = 0; pump(); }, cooldownMs);
  }
  function writePending() {
    if (closed) return;
    const remaining = pending.buffer.length - pending.offset;
    try {
      io.write(fd, pending.buffer, pending.offset, remaining, null, (err, written) => {
        if (closed) return;
        if (err) { error(err, writePending); return; }
        if (!(written > 0 && written <= remaining)) {
          const e = new Error('Log write made no progress'); e.code = 'EIO'; error(e, writePending); return;
        }
        if (needsRecovery) { status.recoveries++; needsRecovery = false; }
        status.state = 'writing'; failures = 0;
        pending.offset += written; bytes -= written; status.writtenBytes += written;
        if (pending.offset < pending.buffer.length) writePending(); else done();
      });
    } catch (err) { error(err, writePending); }
  }
  function opened() {
    if (closed) return;
    // Batch at most 64 KiB to limit callback/allocation overhead.
    const parts = []; let size = 0;
    while (head < queue.length && size < 65536) { const p = queue[head]; queue[head++] = null; parts.push(p); size += p.length; }
    if (head === queue.length) { queue.length = 0; head = 0; }
    else if (head > 1024) { queue.splice(0, head); head = 0; }
    pending = { buffer: parts.length === 1 ? parts[0] : Buffer.concat(parts, size), offset: 0 };
    writePending();
  }
  function open() {
    if (closed) return;
    try {
      io.open(destination, 'a', 0o600, (err, descriptor) => {
        if (closed) { if (!err) io.close(descriptor, () => {}); return; }
        if (err) { error(err, open); return; }
        fd = descriptor; failures = 0; opened();
      });
    } catch (err) { error(err, open); }
  }
  function pump() {
    if (closed || active || timer || head === queue.length) return;
    active = true; status.state = 'writing';
    if (fd === null) open(); else opened();
  }
  return {
    write(line) {
      const buffer = Buffer.isBuffer(line) ? line : Buffer.from(line);
      if (closed || status.state === 'backoff' || bytes + buffer.length > maxBytes) {
        status.droppedBytes += buffer.length; return false;
      }
      queue.push(buffer); bytes += buffer.length; pump(); return true;
    },
    getStatus() { return { ...status, queuedBytes: bytes }; },
    close() {
      closed = true; clearTimeout(timer); status.droppedBytes += bytes;
      bytes = 0; queue.length = 0; status.state = 'closed';
      if (fd !== null && typeof destination !== 'number') { const old = fd; fd = null; io.close(old, () => {}); }
    },
  };
}
module.exports = { createDestination };
