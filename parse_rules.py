#!/usr/bin/env python3
import re

# Read the markdown file
with open('procurement_rules_comprehensive.md', 'r') as f:
    content = f.read()

# Split into sections
sections = []
current_section = None
current_priority = None
rules = []

lines = content.split('\n')
i = 0

while i < len(lines):
    line = lines[i].strip()

    # Detect priority level headers
    if line.startswith('## **CRITICAL MANDATORY REQUIREMENTS**'):
        current_priority = 'critical'
    elif line.startswith('## **HIGH PRIORITY REQUIREMENTS**'):
        current_priority = 'high'
    elif line.startswith('## **IMPORTANT OPERATIONAL REQUIREMENTS**'):
        current_priority = 'important'
    elif line.startswith('## **DOCUMENT PRIORITIZATION METHODOLOGY**'):
        current_priority = 'info'

    # Detect section headers (### format)
    elif line.startswith('### **') and line.endswith('**'):
        if current_section and rules:
            sections.append({
                'title': current_section,
                'priority': current_priority,
                'rules': rules
            })
            rules = []
        current_section = line.replace('### **', '').replace('**', '')

    # Detect rule number
    elif re.match(r'^\*\*\d+\.', line):
        # Extract rule number and title
        match = re.match(r'^\*\*(\d+)\.\s+(.+)\*\*$', line)
        if match:
            rule_num = int(match.group(1))
            rule_title = match.group(2)

            # Get description (next line with - prefix)
            i += 1
            description = ''
            while i < len(lines) and lines[i].strip().startswith('-') and not lines[i].strip().startswith('- **Source'):
                desc_line = lines[i].strip()[1:].strip()
                if description:
                    description += ' '
                description += desc_line
                i += 1

            # Get source (line with - **Source**: prefix)
            source = ''
            if i < len(lines) and '- **Source**:' in lines[i]:
                source = lines[i].strip().replace('- **Source**:', '').strip()

            rules.append({
                'number': rule_num,
                'title': rule_title,
                'description': description,
                'source': source
            })

    i += 1

# Add last section
if current_section and rules:
    sections.append({
        'title': current_section,
        'priority': current_priority,
        'rules': rules
    })

# Generate TypeScript file
ts_content = '''// Procurement Rules Content - Parsed from procurement_rules_comprehensive.md
// This file contains ALL 190 procurement rules

export interface ProcurementRule {
    number: number;
    title: string;
    description: string;
    source: string;
}

export interface ProcurementSection {
    title: string;
    priority: 'critical' | 'high' | 'important' | 'info';
    rules: ProcurementRule[];
}

export const procurementRulesContent: ProcurementSection[] = [
'''

for section in sections:
    ts_content += f'''    {{
        title: "{section['title']}",
        priority: "{section['priority']}",
        rules: [
'''

    for rule in section['rules']:
        title_escaped = rule['title'].replace('"', '\\"').replace("'", "\\'")
        desc_escaped = rule['description'].replace('"', '\\"').replace("'", "\\'")
        source_escaped = rule['source'].replace('"', '\\"').replace("'", "\\'")

        ts_content += f'''            {{
                number: {rule['number']},
                title: "{title_escaped}",
                description: "{desc_escaped}",
                source: "{source_escaped}"
            }},
'''

    ts_content += '''        ]
    },
'''

ts_content += '''];
'''

# Write to file
with open('src/app/worldbankgroup-admin/knowledge-base/procurement-rules-content.ts', 'w') as f:
    f.write(ts_content)

print(f"✅ Generated TypeScript file with {len(sections)} sections and {sum(len(s['rules']) for s in sections)} total rules")
