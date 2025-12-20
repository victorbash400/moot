// Test unpdf extraction
const { extractText } = require('unpdf');
const fs = require('fs');

async function test() {
    const testFile = '/Users/victorbash/projects/moot/moot/sample/excutorship.pdf';
    console.log('Testing with:', testFile);

    const buffer = fs.readFileSync(testFile);
    const uint8 = new Uint8Array(buffer);

    try {
        const result = await extractText(uint8);
        const text = String(result.text);
        console.log('SUCCESS! Extracted', text.length, 'characters');
        console.log('---First 500 chars---');
        console.log(text.slice(0, 500));
    } catch (err) {
        console.log('ERROR:', err.message);
    }
}

test();
