const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomChunk(length = 5) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return out;
}

function generateEventCode() {
  return `EVT-${randomChunk(5)}`;
}

module.exports = { generateEventCode };
