import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:4000/api/dev/test-riot-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: 'Em Chè đi CKTG', tagLine: '3007', region: 'APAC' })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
