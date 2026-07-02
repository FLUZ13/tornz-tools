const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = (...parts) => path.join(root, 'src', ...parts);
const dist = (...parts) => path.join(root, 'dist', ...parts);

const fragments = [
  src('userscript-header.js'),
  src('core', 'app.js'),
  src('data', 'items.js'),
  src('core', 'state.js'),
  src('features', 'stocks.js'),
  src('data', 'gyms.js'),
  src('features', 'crimes.js'),
  src('features', 'item-market.js'),
  src('data', 'travel.js'),
  src('features', 'index.js'),
  src('core', 'storage.js'),
  src('core', 'http.js'),
  src('core', 'utils.js'),
  src('core', 'panel.js'),
  src('styles', 'panel.css'),
  src('core', 'panel-after-styles.js'),
  src('core', 'rendering.js'),
  src('features', 'faction.js'),
  src('features', 'item-market-ui.js'),
  src('features', 'crimes-ui.js'),
  src('features', 'travel.js'),
  src('features', 'missions.js'),
  src('features', 'bounties.js'),
  src('features', 'merits.js'),
  src('features', 'addiction.js'),
  src('features', 'gym.js'),
  src('features', 'casino.js'),
  src('features', 'faction-targets.js'),
  src('core', 'settings-guides.js'),
  src('features', 'stocks-ui.js'),
  src('core', 'events.js'),
  src('core', 'refresh.js'),
  src('features', 'bazaar.js'),
  src('core', 'init.js')
];

function readFragment(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n$/u, '');
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${content}\n`, 'utf8');
}

function copyDirectory(from, to, options = {}) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    const rel = path.relative(options.base || from, source).replace(/\\/g, '/');
    if (options.skip && options.skip(rel, entry)) continue;
    if (entry.isDirectory()) copyDirectory(source, target, { ...options, base: options.base || from });
    else fs.copyFileSync(source, target);
  }
}

const userscript = fragments.map(readFragment).join('\n');

writeFile(dist("TORN'z Tools.user.js"), userscript);
copyDirectory(path.join(root, 'chrome-extension'), dist('chrome-extension'), {
  skip: (rel) => rel === 'content/tornz-tools.js'
});
writeFile(dist('chrome-extension', 'content', 'tornz-tools.js'), userscript);

console.log(`Built dist/TORN'z Tools.user.js from ${fragments.length} source fragments.`);
console.log('Built dist/chrome-extension/.');
