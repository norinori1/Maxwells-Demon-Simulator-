// Maxwell's Demon Simulator - SE ダウンロードスクリプト
// 使い方: node download_se.js
// 実行場所: プロジェクトルート (Maxwells-Demon-Simulator-)

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SOUNDS_DIR = path.join(__dirname, 'public', 'sounds');

const FILES = [
  {
    url:  'https://soundeffect-lab.info/sound/machine/mp3/giant-shutter1.mp3',
    name: 'se_valve_open.mp3',
    desc: '巨大シャッターが開く'
  },
  {
    url:  'https://soundeffect-lab.info/sound/machine/mp3/lever1.mp3',
    name: 'se_valve_close.mp3',
    desc: 'レバーを倒す'
  },
  {
    url:  'https://soundeffect-lab.info/sound/button/mp3/cursor3.mp3',
    name: 'se_ball_pass.mp3',
    desc: 'カーソル移動3(ピッ)'
  },
  {
    url:  'https://soundeffect-lab.info/sound/button/mp3/warning1.mp3',
    name: 'se_warning.mp3',
    desc: '警告音1'
  },
];

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Referer':    'https://soundeffect-lab.info/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.get(url, options, (res) => {
      // リダイレクト対応
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', () => { out.close(); resolve(); });
      out.on('error',  reject);
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log('📂 保存先:', SOUNDS_DIR);
  if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });

  let ok = 0;
  for (const f of FILES) {
    const dest = path.join(SOUNDS_DIR, f.name);
    process.stdout.write(`⬇  ${f.desc} → ${f.name} ... `);
    try {
      await download(f.url, dest);
      const size = fs.statSync(dest).size;
      console.log(`✅ (${(size/1024).toFixed(1)} KB)`);
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }
  console.log(`\n完了: ${ok}/${FILES.length} ファイル`);
}

main();
