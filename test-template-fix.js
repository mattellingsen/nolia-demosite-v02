// Test the fixed template formatter context detection
const fs = require('fs');

// Create a simple test to verify the context detection fix
function testContextDetection() {
  console.log('🧪 Testing template context detection fix...');

  // Mock template with problematic placeholders
  const template = `Application Details

Organisation Name: [To be completed]
Application Reference: [To be completed]
Assessment Date: [To be completed]

Entity Type Confirmed: [Yes/No]
Financially viable for next 12 months: [Yes/No]

Recent R&D Activities: [Outline of recent R&D activities demonstrating active programme]

Assessment Decision: [APPROVE / DECLINE / CONDITIONAL APPROVAL]`;

  // Improved context extraction function (matching template-formatter.ts)
  function getPlaceholderContext(placeholder, template) {
    const placeholderIndex = template.indexOf(placeholder);
    if (placeholderIndex === -1) return '';

    // Get the line containing the placeholder plus one line before and after
    const lines = template.split('\n');
    let targetLineIndex = -1;
    let charCount = 0;

    // Find which line contains the placeholder
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= placeholderIndex) {
        targetLineIndex = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline
    }

    if (targetLineIndex === -1) return '';

    // Get context: previous line + current line + next line
    const startLine = Math.max(0, targetLineIndex - 1);
    const endLine = Math.min(lines.length - 1, targetLineIndex + 1);

    return lines.slice(startLine, endLine + 1).join(' ').toLowerCase();
  }

  // Test each problematic placeholder
  const placeholders = ['[To be completed]'];

  placeholders.forEach(placeholder => {
    const positions = [];
    let searchStart = 0;
    let pos;

    // Find all positions of this placeholder
    while ((pos = template.indexOf(placeholder, searchStart)) !== -1) {
      const context = getPlaceholderContext(placeholder, template);
      positions.push({
        position: pos,
        context: context.substring(0, 100) + (context.length > 100 ? '...' : ''),
        line: template.substring(0, pos).split('\n').length
      });
      searchStart = pos + 1;
    }

    console.log(`\n📍 Placeholder: ${placeholder}`);
    positions.forEach((item, index) => {
      // Get the exact line for this placeholder position
      const lines = template.split('\n');
      const currentLine = lines[item.line - 1] ? lines[item.line - 1].toLowerCase() : '';

      console.log(`  ${index + 1}. Line ${item.line}: "${currentLine}"`);

      // Apply the NEW exact line logic to determine what this should be
      if (currentLine.includes('organisation name') && !currentLine.includes('reference') && !currentLine.includes('date')) {
        console.log(`     ✅ Should be: BioSecurity Systems (Organization Name)`);
      } else if (currentLine.includes('application reference') || currentLine.includes('reference')) {
        console.log(`     ✅ Should be: 40D-20250922-A1B2C3 (Application Reference)`);
      } else if (currentLine.includes('assessment date') || (currentLine.includes('date') && !currentLine.includes('reference'))) {
        console.log(`     ✅ Should be: 22 September 2025 (Assessment Date)`);
      } else {
        console.log(`     ⚠️ Context unclear - would be: Information pending completion`);
      }
    });
  });
}

testContextDetection();