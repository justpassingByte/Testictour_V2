const https = require('https');
const fs = require('fs');

https.get('https://html.duckduckgo.com/html/?q=tft+17+background+1920x1080', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const match = body.match(/https:\/\/external-content\.duckduckgo\.com\/iu\/\?u=([^&\"'\s]+)/);
    if(match) {
        let imgUrl = decodeURIComponent(match[1]);
        if(imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        else if (imgUrl.startsWith('http:')) imgUrl = imgUrl.replace('http:', 'https:');
        
        console.log('Found URL:', imgUrl);
        https.get(imgUrl, (imgRes) => {
             const file = fs.createWriteStream('c:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/public/bg_tft17.jpg');
             imgRes.pipe(file);
             file.on('finish', () => console.log('Downloaded'));
        });
    } else {
        console.log('No matches found in duckduckgo response');
    }
  });
});
