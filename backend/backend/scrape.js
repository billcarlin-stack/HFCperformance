const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting headless browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log('Navigating to Hawthorn FC...');
    await page.goto('https://www.hawthornfc.com.au/teams/afl', { waitUntil: 'networkidle2' });
    
    console.log('Extracting players...');
    const players = await page.evaluate(() => {
        const items = document.querySelectorAll('.squad-list__item, .player-item');
        const results = [];
        
        items.forEach(item => {
            const nameEl = item.querySelector('.player-item__name, .u-hide-visually');
            const jumperEl = item.querySelector('.player-item__jumper-number');
            const imgEl = item.querySelector('img.player-item__drop-image, img');
            
            if (nameEl) {
                let name = nameEl.innerText.trim();
                let jumper = jumperEl ? parseInt(jumperEl.innerText.trim(), 10) : null;
                let photo = imgEl ? imgEl.src : null;
                
                if (photo && photo.includes('?v=')) {
                    photo = photo.split('?')[0];
                }
                
                results.push({ name, jumper, photo });
            }
        });
        
        return results;
    });
    
    console.log('Found ' + players.length + ' players.');
    
    // Deduplicate and clean up
    const uniquePlayers = [];
    const seen = new Set();
    players.forEach(p => {
        if (!seen.has(p.name) && p.name.length > 2 && p.photo) {
            seen.add(p.name);
            uniquePlayers.push(p);
        }
    });
    
    console.log('Unique valid players: ' + uniquePlayers.length);
    if(uniquePlayers.length > 0) {
        console.log(uniquePlayers.slice(0, 3));
    }

    fs.writeFileSync('hawthorn_roster.json', JSON.stringify(uniquePlayers, null, 2));
    await browser.close();
})();
