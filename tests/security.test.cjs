const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'leaflet.photon.js'), 'utf8');

test('Photon source is parseable JavaScript', () => {
  assert.doesNotThrow(() => new Function(code));
});

test('API-controlled labels, addresses and result details never use HTML sinks', () => {
  const unsafeAssignments = [...code.matchAll(/(?:title|detailsContainer|noresult|feedback)\.innerHTML\s*(?:=|\+=)/g)];
  assert.deepEqual(unsafeAssignments, []);
  for (const statement of [
    'title.textContent = feature.properties.label',
    'title.textContent = feature.properties.display_name',
    'title.textContent = feature.properties.name',
    'title.textContent = feature.properties.housenumber',
    'title.textContent +=',
    "detailsContainer.textContent = details.join(', ')",
    'noresult.textContent = this.options.noResultLabel',
    'feedback.textContent = this.options.feedbackLabel'
  ]) {
    assert.ok(code.includes(statement), 'expected safe rendering: ' + statement);
  }
});

test('remaining HTML assignment only clears the results container', () => {
  const assignments = code.match(/\.innerHTML\s*=/g) || [];
  assert.equal(assignments.length, 1);
  assert.ok(code.includes("this.resultsContainer.innerHTML = '';"));
});

test('feature properties use safe DOM-generated text instead of Autolinker HTML', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal((html.match(/renderSafePropertyValue\(/g) || []).length, 24);
  assert.doesNotMatch(html, /autolinker\.link\(/);
  assert.doesNotMatch(html, /<script src="js\/Autolinker\.min\.js"/);
  assert.match(html, /link\.textContent = match\[0\];/);
  assert.match(html, /container\.appendChild\(document\.createTextNode\(raw\.slice\(cursor\)\)\)/);
  // Browser smoke tests separately check this HTML page as actually parsed by Chromium.
});

test('no identity quote replacements mask a missing escaping step', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
  assert.equal((html.match(/\.replace\(\/'\/g,/g)||[]).length,0);
});
