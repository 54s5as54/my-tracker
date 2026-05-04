const fs = require('fs');

const config = {
  n: 'Test User',
  p: '123',
  m: 'Ready...',
  u: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  i: 1,
};

function encodeConfig(cfg) {
  const json = JSON.stringify(cfg);
  const latin1 = unescape(encodeURIComponent(json));
  return Buffer.from(latin1, 'binary').toString('base64');
}

const encoded = encodeConfig(config);
const baseUrl = 'file:///c:/Users/Ayaz%20Hussain%20Shah/Desktop/bulid/.vscode/Index.html';
const url = `${baseUrl}?session=${encodeURIComponent(encoded)}`;

fs.writeFileSync('tmp/king_test_url.txt', url, 'utf8');
console.log('Wrote tmp/king_test_url.txt');
