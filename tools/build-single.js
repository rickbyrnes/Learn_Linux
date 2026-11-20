/*
 * Builds linux-dojo.html: one self-contained file with all CSS and JS inlined.
 * Run with: node tools/build-single.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
const css = read('css/styles.css');
const scripts = ['js/terminal.js', 'js/lessons.js', 'js/app.js'].map(read);

html = html.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  '<style>\n' + css + '\n</style>'
);
scripts.forEach((code, i) => {
  const tag = '<script src="' + ['js/terminal.js', 'js/lessons.js', 'js/app.js'][i] + '"></script>';
  if (!html.includes(tag)) throw new Error('Could not find script tag: ' + tag);
  if (code.includes('</script')) throw new Error('Inline script contains a closing script tag');
  html = html.replace(tag, '<script>\n' + code + '\n</script>');
});

fs.writeFileSync(path.join(root, 'linux-dojo.html'), html);
console.log('Wrote linux-dojo.html (' + html.length + ' bytes)');
