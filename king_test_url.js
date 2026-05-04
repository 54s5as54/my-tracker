const config = {
  n: 'Test User',
  p: '123',
  m: 'Ready...',
  u: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  i: 1,
};

function encodeConfig(cfg) {
  const json = JSON.stringify(cfg);
  // Same as browser: btoa(unescape(encodeURIComponent(json)))
  const latin1 = unescape(encodeURIComponent(json));
  return Buffer.from(latin1, 'binary').toString('base64');
}

const encoded = encodeConfig(config);
const baseUrl = 'file:///c:/Users/Ayaz%20Hussain%20Shah/Desktop/bulid/.vscode/Index.html';
const sessionParam = encodeURIComponent(encoded);

console.log(`${baseUrl}?session=${sessionParam}`);
