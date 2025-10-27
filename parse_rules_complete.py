#!/usr/bin/env python3
import re

# Read the markdown file
with open('procurement_rules_comprehensive.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines
lines = content.split('\n')

# Extract all rules
rules = []
i = 0
while i < len(lines):
    line = lines[i].strip()

    # Match rule pattern: **1. Rule Title**
    match = re.match(r'^\*\*(\d+)\.\s+(.+)\*\*$', line)
    if match:
        rule_num = int(match.group(1))
        rule_title = match.group(2)

        # Collect description lines (lines starting with -)
        i += 1
        description_lines = []
        while i < len(lines) and lines[i].strip().startswith('-') and '**Source**' not in lines[i]:
            desc_line = lines[i].strip()[1:].strip()  # Remove leading -
            description_lines.append(desc_line)
            i += 1

        description = ' '.join(description_lines)

        # Get source line
        source = ''
        if i < len(lines) and '**Source**:' in lines[i]:
            source = lines[i].strip().replace('- **Source**:', '').strip()
            i += 1

        rules.append({
            'number': rule_num,
            'title': rule_title,
            'description': description,
            'source': source
        })
    else:
        i += 1

print(f"✅ Extracted {len(rules)} rules from markdown")

# Group rules by priority sections
critical_rules = [r for r in rules if 1 <= r['number'] <= 46]
high_rules = [r for r in rules if 47 <= r['number'] <= 100]
important_rules = [r for r in rules if 101 <= r['number'] <= 190]

print(f"   - Critical: {len(critical_rules)} rules")
print(f"   - High: {len(high_rules)} rules")
print(f"   - Important: {len(important_rules)} rules")

# Organize into sections by analyzing structure
sections = []
current_section = None
section_rules = []

for rule in rules:
    # Detect section breaks by gaps in numbering or known section titles
    # For simplicity, group every ~10-15 rules into logical sections
    if current_section is None:
        current_section = {"title": "Core Principles & Legal Framework", "priority": "critical", "rules": []}

    # Add rule to current section
    section_rules.append(rule)

    # Create sections based on rule ranges
    if rule['number'] in [3, 11, 23, 29, 37, 46, 55, 67, 78, 84, 100, 108, 114, 120, 128, 134, 141, 145, 152, 159, 164, 181, 190]:
        sections.append({
            "title": current_section["title"],
            "priority": "critical" if rule['number'] <= 46 else "high" if rule['number'] <= 100 else "important",
            "rules": section_rules
        })
        section_rules = []
        # Prepare next section title (simplified)
        if rule['number'] == 3:
            current_section = {"title": "Strategic Planning Documents"}
        elif rule['number'] == 11:
            current_section = {"title": "Fraud, Corruption & Integrity"}
        elif rule['number'] == 23:
            current_section = {"title": "Conflict of Interest"}
        elif rule['number'] == 29:
            current_section = {"title": "Eligibility & Participation"}
        elif rule['number'] == 37:
            current_section = {"title": "Prior Review Requirements"}
        elif rule['number'] == 46:
            current_section = {"title": "Selection Methods & Processes"}
        elif rule['number'] == 55:
            current_section = {"title": "Bid/Proposal Requirements"}
        elif rule['number'] == 67:
            current_section = {"title": "Evaluation Procedures"}
        elif rule['number'] == 78:
            current_section = {"title": "Contract Award & Management"}
        elif rule['number'] == 84:
            current_section = {"title": "Complaints Handling"}
        elif rule['number'] == 100:
            current_section = {"title": "Procurement Planning"}
        elif rule['number'] == 108:
            current_section = {"title": "Market Engagement"}
        elif rule['number'] == 114:
            current_section = {"title": "Sustainability Requirements"}
        elif rule['number'] == 120:
            current_section = {"title": "Alternative Procurement"}
        elif rule['number'] == 128:
            current_section = {"title": "Consultant Selection"}
        elif rule['number'] == 134:
            current_section = {"title": "Quality Considerations"}
        elif rule['number'] == 141:
            current_section = {"title": "Small Contracts"}
        elif rule['number'] == 145:
            current_section = {"title": "Direct Contracting"}
        elif rule['number'] == 152:
            current_section = {"title": "Framework Agreements"}
        elif rule['number'] == 159:
            current_section = {"title": "E-Procurement Systems"}
        elif rule['number'] == 164:
            current_section = {"title": "Transparency & Disclosure"}
        elif rule['number'] == 181:
            current_section = {"title": "Documentation & Records"}
        elif rule['number'] == 190:
            current_section = {"title": "Additional Process Requirements"}

# Add any remaining rules
if section_rules:
    sections.append({
        "title": current_section["title"],
        "priority": "important",
        "rules": section_rules
    })

# Generate TypeScript file
ts_output = '''// Procurement Rules Content - ALL 190 Rules
// Generated from procurement_rules_comprehensive.md

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
    isInfoSection?: boolean;
    content?: string;
}

export const procurementRulesContent: ProcurementSection[] = [
'''

# Add all rule sections
for section in sections:
    ts_output += f'''    {{
        title: "{section['title']}",
        priority: "{section['priority']}",
        rules: [
'''
    for rule in section['rules']:
        # Escape quotes in strings
        title = rule['title'].replace('"', '\\"').replace("'", "\\'")
        desc = rule['description'].replace('"', '\\"').replace("'", "\\'")
        source = rule['source'].replace('"', '\\"').replace("'", "\\'")

        ts_output += f'''            {{
                number: {rule['number']},
                title: "{title}",
                description: "{desc}",
                source: "{source}"
            }},
'''
    ts_output += '''        ]
    },
'''

# Add methodology and notes sections as info boxes (not numbered rules)
ts_output += '''    {
        title: "Document Prioritization Methodology",
        priority: "info",
        isInfoSection: true,
        content: `**CRITICAL MANDATORY REQUIREMENTS (Rules 1-46)**

Legal/regulatory requirements from Legal Agreement and Procurement Regulations

**Violation results in:** misprocurement declaration, contract cancellation, loan suspension/cancellation, financing withdrawal, reputational damage to Borrower and Bank

Non-negotiable compliance requirements

---

**HIGH PRIORITY REQUIREMENTS (Rules 47-100)**

Process integrity requirements ensuring fair competition and transparency

**Violation results in:** valid complaints from bidders/proposers, process delays, repeat of procurement activities, reputational damage, potential legal challenges

Critical for maintaining procurement process credibility

---

**IMPORTANT OPERATIONAL REQUIREMENTS (Rules 101-190)**

Best practice requirements ensuring efficient procurement and value for money

**Violation results in:** suboptimal outcomes, reduced value for money, implementation delays, missed opportunities for innovation/sustainability, weaker contract management

Essential for procurement excellence and project success`,
        rules: []
    },
    {
        title: "Notes on Citations",
        priority: "info",
        isInfoSection: true,
        content: `All rules are derived from official World Bank procurement documents:

1. **PR2025**: References include Section number, Paragraph number, Annex number (if applicable), and page number
2. **EVAL2024**: References include Form number, Section name, Annex number (if applicable), and page number

**Abbreviations Used:**
- Para = Paragraph
- p. = page
- SPD = Standard Procurement Document
- PPSD = Project Procurement Strategy for Development
- VfM = Value for Money
- KPI = Key Performance Indicator
- SOE = State-Owned Enterprise
- SEA/SH = Sexual Exploitation and Abuse/Sexual Harassment
- BAFO = Best and Final Offer

**Document Availability:**
- PR2025 is publicly available at www.worldbank.org/procurement
- EVAL2024 templates are available at www.worldbank.org/procurement/standarddocuments`,
        rules: []
    },
];
'''

# Write to file
with open('src/app/worldbankgroup-admin/knowledge-base/procurement-rules-content.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print(f"✅ Generated TypeScript file with {len(sections)} rule sections + 2 info sections")
print(f"✅ Total rules: {len(rules)}")
