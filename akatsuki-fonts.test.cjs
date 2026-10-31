// Every Japanese character the game can display must be in the bundled fonts.
const fs=require('fs'),path=require('path'),dir=__dirname;
const glyphs=new Set(fs.readFileSync(path.join(dir,'akatsuki-fonts/glyphs.txt'),'utf8'));
const text=['akatsuki.html','akatsuki.js','akatsuki-story.js','akatsuki-core.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('');
const missing=[...new Set([...text].filter(c=>c.codePointAt(0)>=0x3000&&!glyphs.has(c)))];
if(missing.length){console.error(`Fonts lack ${missing.length} character(s): ${missing.join('')}\nRebuild: python3 -I tools/subset-akatsuki-fonts.py FONT_DIR (see AKATSUKI.md).`);process.exit(1);}
const css=fs.readFileSync(path.join(dir,'akatsuki-fonts/akatsuki-fonts.css'),'utf8');
for(const file of css.match(/[a-z-]+\.woff2/g))if(!fs.existsSync(path.join(dir,'akatsuki-fonts',file))){console.error('Missing font file '+file);process.exit(1);}
console.log(`All ${new Set([...text].filter(c=>c.codePointAt(0)>=0x3000)).size} Japanese characters in the game text are covered by the bundled fonts.`);
