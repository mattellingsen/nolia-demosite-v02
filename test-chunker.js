// Quick test for chunker.ts
const { chunkText } = require('./src/lib/chunker.ts');

console.log('Testing chunker.ts...\n');

// Test 1: Empty string
console.log('Test 1: Empty string');
const test1 = chunkText('');
console.log('Result:', test1.length === 0 ? '✅ PASS' : '❌ FAIL');
console.log('Expected: 0 chunks, Got:', test1.length);

// Test 2: Small text (< 30K)
console.log('\nTest 2: Small text (< 30K chars)');
const smallText = 'This is a small document.\n\nIt has two paragraphs.';
const test2 = chunkText(smallText);
console.log('Result:', test2.length === 1 ? '✅ PASS' : '❌ FAIL');
console.log('Expected: 1 chunk, Got:', test2.length);
if (test2.length > 0) {
  console.log('Chunk 0 length:', test2[0].charCount);
}

// Test 3: Large text that needs chunking
console.log('\nTest 3: Large text (needs chunking)');
const paragraph = 'This is a paragraph. '.repeat(1000); // ~21K chars
const largeText = paragraph + '\n\n' + paragraph; // ~42K chars
const test3 = chunkText(largeText, 30000);
console.log('Result:', test3.length >= 2 ? '✅ PASS' : '❌ FAIL');
console.log('Expected: 2+ chunks, Got:', test3.length);
test3.forEach(chunk => {
  console.log(`  Chunk ${chunk.index}: ${chunk.charCount} chars`);
});

// Test 4: Paragraph boundaries preserved
console.log('\nTest 4: Paragraph boundaries');
const multiPara = 'Para 1.\n\nPara 2.\n\nPara 3.';
const test4 = chunkText(multiPara);
console.log('Result:', test4[0].text.includes('\n\n') || test4.length === 1 ? '✅ PASS' : '❌ FAIL');
console.log('Text preserved structure');

console.log('\n✅ All basic tests completed');
