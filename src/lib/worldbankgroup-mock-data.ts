/**
 * Mock Data Generator for WorldBankGroup Fake Demo
 *
 * Generates dummy analysis data to simulate AI processing without actually
 * calling Claude API or performing OpenSearch embeddings.
 */

export const mockPolicyDocumentAnalysis = () => ({
  policyRules: [
    {
      rule: "All procurement activities must follow competitive bidding principles",
      scope: "Applies to all procurement over $10,000",
      category: "Competitive Bidding"
    },
    {
      rule: "Conflict of interest must be declared and documented",
      scope: "All procurement staff and evaluators",
      category: "Ethics & Governance"
    }
  ],
  requirements: [
    {
      type: "Documentation",
      description: "Maintain complete audit trail of procurement decisions",
      mandatory: true
    },
    {
      type: "Approval",
      description: "Procurement over $50,000 requires senior management approval",
      mandatory: true
    }
  ],
  complianceChecks: [
    {
      check: "Verify vendor is not on excluded parties list",
      category: "Legal Compliance"
    },
    {
      check: "Ensure fair and equal treatment of all bidders",
      category: "Ethical Standards"
    }
  ],
  thresholds: [
    {
      type: "Monetary",
      value: "$10,000",
      triggerAction: "Requires competitive bidding process"
    },
    {
      type: "Monetary",
      value: "$50,000",
      triggerAction: "Requires senior management approval"
    }
  ],
  procedures: [
    {
      name: "Competitive Bidding Process",
      steps: [
        "Define requirements and specifications",
        "Publish procurement notice",
        "Receive and register bids",
        "Evaluate bids against criteria",
        "Award contract to best-value bidder"
      ]
    }
  ],
  exceptions: [
    {
      exception: "Emergency procurement may bypass normal timelines",
      conditions: "Only in documented emergency situations with appropriate approvals"
    }
  ],
  keyTerms: [
    {
      term: "Best Value",
      definition: "Selection based on combination of price, quality, and other factors"
    },
    {
      term: "Competitive Bidding",
      definition: "Process where multiple vendors submit proposals for evaluation"
    }
  ],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'POLICY_DOCUMENT',
    generatedAt: new Date().toISOString()
  }
});

export const mockProcurementRuleAnalysis = () => ({
  rules: [
    {
      ruleId: "PR-001",
      title: "Vendor Pre-qualification",
      description: "All vendors must be pre-qualified before bid submission",
      conditions: ["Procurement over $25,000", "New vendor relationships"],
      actions: ["Submit vendor qualification forms", "Provide financial statements", "Submit references"],
      severity: "mandatory"
    },
    {
      ruleId: "PR-002",
      title: "Three-Quote Minimum",
      description: "Obtain minimum three competitive quotes",
      conditions: ["Procurement between $10,000-$50,000"],
      actions: ["Solicit quotes from at least 3 vendors", "Document quote comparison"],
      severity: "mandatory"
    }
  ],
  prohibitions: [
    {
      what: "Splitting contracts to avoid approval thresholds",
      exceptions: "None - this is strictly prohibited"
    },
    {
      what: "Accepting gifts or hospitality from vendors during procurement process",
      exceptions: "Promotional items under $25 value"
    }
  ],
  approvalRequirements: [
    {
      trigger: "Procurement $10,000-$50,000",
      approver: "Department Manager",
      timeline: "Within 5 business days"
    },
    {
      trigger: "Procurement over $50,000",
      approver: "Senior Management & Procurement Committee",
      timeline: "Within 10 business days"
    }
  ],
  documentationRequirements: [
    {
      trigger: "All procurements over $10,000",
      documents: [
        "Procurement requisition form",
        "Vendor quotes or bids",
        "Evaluation matrix",
        "Approval documentation"
      ]
    }
  ],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'PROCUREMENT_RULE',
    generatedAt: new Date().toISOString()
  }
});

export const mockComplianceStandardAnalysis = () => ({
  standards: [
    {
      standardId: "CS-001",
      title: "Vendor Eligibility Verification",
      description: "All vendors must be verified against exclusion lists before contract award",
      category: "Legal Compliance",
      mandatory: true
    },
    {
      standardId: "CS-002",
      title: "Procurement Documentation Retention",
      description: "All procurement records must be retained for minimum 7 years",
      category: "Record Keeping",
      mandatory: true
    }
  ],
  checklists: [
    {
      checklistName: "Pre-Award Compliance Check",
      items: [
        { item: "Vendor not on excluded parties list", required: true },
        { item: "Vendor qualifications verified", required: true },
        { item: "Conflict of interest declarations obtained", required: true },
        { item: "Price reasonableness assessment completed", required: true }
      ]
    }
  ],
  certifications: [
    {
      certification: "No Conflict of Interest Certification",
      when: "All procurement evaluators before evaluation begins",
      who: "Each evaluation panel member"
    },
    {
      certification: "Vendor Eligibility Certification",
      when: "Before contract award",
      who: "Procurement officer"
    }
  ],
  auditRequirements: [
    {
      what: "Compliance with procurement procedures",
      frequency: "Annual internal audit",
      by: "Internal Audit Department"
    },
    {
      what: "High-value procurement review",
      frequency: "For all contracts over $100,000",
      by: "External auditors"
    }
  ],
  penalties: [
    {
      violation: "Failure to follow competitive bidding procedures",
      penalty: "Procurement invalidation and potential disciplinary action"
    },
    {
      violation: "Undisclosed conflict of interest",
      penalty: "Contract termination and possible legal action"
    }
  ],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'COMPLIANCE_STANDARD',
    generatedAt: new Date().toISOString()
  }
});

export const mockProcurementTemplateAnalysis = () => ({
  templateType: "Vendor Evaluation Matrix",
  sections: [
    {
      sectionName: "Technical Evaluation",
      description: "Assessment of vendor's technical capabilities and proposed solution"
    },
    {
      sectionName: "Financial Evaluation",
      description: "Analysis of pricing and cost structure"
    },
    {
      sectionName: "Vendor Qualifications",
      description: "Review of vendor experience and capacity"
    }
  ],
  requiredFields: [
    {
      fieldName: "Vendor Name",
      type: "text",
      description: "Legal name of the vendor organization"
    },
    {
      fieldName: "Total Score",
      type: "number",
      description: "Aggregate score from all evaluation criteria"
    },
    {
      fieldName: "Recommendation",
      type: "text",
      description: "Evaluator's recommendation (Award/Do Not Award)"
    }
  ],
  placeholders: [
    {
      placeholder: "[Procurement Title]",
      description: "Insert the specific procurement project name"
    },
    {
      placeholder: "[Date]",
      description: "Date of evaluation"
    },
    {
      placeholder: "[Evaluator Name]",
      description: "Name of the person conducting the evaluation"
    }
  ],
  instructions: [
    "Complete all sections of the evaluation matrix",
    "Score each criterion on the defined scale",
    "Provide written justification for scores",
    "Obtain required approvals before finalizing"
  ],
  rawTemplateContent: "Mock template content would be stored here in actual implementation",
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'PROCUREMENT_TEMPLATE',
    generatedAt: new Date().toISOString()
  }
});

// Combined mock analysis for all document types in a base
export const mockBaseAnalysis = () => ({
  policyDocumentAnalysis: mockPolicyDocumentAnalysis(),
  procurementRuleAnalysis: mockProcurementRuleAnalysis(),
  complianceStandardAnalysis: mockComplianceStandardAnalysis(),
  procurementTemplateAnalysis: mockProcurementTemplateAnalysis()
});

// Mock analysis for project-specific documents
export const mockApplicationFormAnalysis = () => ({
  formStructure: {
    sections: ["Vendor Information", "Technical Proposal", "Financial Proposal", "References"],
    requiredFields: ["Company Name", "Tax ID", "Proposed Solution", "Pricing"],
    optionalFields: ["Certifications", "Past Performance"]
  },
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'APPLICATION_FORM',
    generatedAt: new Date().toISOString()
  }
});

export const mockSelectionCriteriaAnalysis = () => ({
  criteria: [
    {
      criterion: "Technical Capability",
      weight: 40,
      description: "Vendor's technical expertise and proposed solution quality"
    },
    {
      criterion: "Price Competitiveness",
      weight: 30,
      description: "Value for money and cost reasonableness"
    },
    {
      criterion: "Experience & Track Record",
      weight: 20,
      description: "Relevant past performance and project experience"
    },
    {
      criterion: "Delivery Timeline",
      weight: 10,
      description: "Ability to meet required delivery schedule"
    }
  ],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'SELECTION_CRITERIA',
    generatedAt: new Date().toISOString()
  }
});

export const mockGoodExamplesAnalysis = () => ({
  examples: [
    {
      exampleType: "Strong Technical Proposal",
      highlights: ["Clear solution architecture", "Detailed implementation plan", "Risk mitigation strategies"],
      score: "85/100"
    },
    {
      exampleType: "Comprehensive Vendor Qualifications",
      highlights: ["Relevant certifications", "Strong client references", "Proven track record"],
      score: "90/100"
    }
  ],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'GOOD_EXAMPLES',
    generatedAt: new Date().toISOString()
  }
});

export const mockOutputTemplatesAnalysis = () => ({
  templateType: "Evaluation Summary Report",
  sections: ["Executive Summary", "Detailed Scoring", "Recommendation", "Approvals"],
  metadata: {
    analysisMode: 'MOCK_DATA',
    documentType: 'OUTPUT_TEMPLATES',
    generatedAt: new Date().toISOString()
  }
});

// Combined mock analysis for project documents
export const mockProjectAnalysis = () => ({
  applicationFormAnalysis: mockApplicationFormAnalysis(),
  selectionCriteriaAnalysis: mockSelectionCriteriaAnalysis(),
  goodExamplesAnalysis: mockGoodExamplesAnalysis(),
  outputTemplatesAnalysis: mockOutputTemplatesAnalysis()
});

// Real mock assessment based on Cathlab Equipment Technical Evaluation Report
export const mockAssessmentOutput = () => ({
  summary: {
    overallAssessment: "REQUIRES MAJOR REVISION",
    overallCompliance: "Non-Compliant - Major Issues Identified",
    complianceScore: 42,
    criticalIssues: 8,
    majorIssues: 10,
    minorIssues: 5,
    procurementDetails: {
      procurementOf: "Cathlab Equipment (4 Lots - Single Plane and Biplane)",
      rfbNumber: "ID-PMU SIHREN-395529-GO-RFB",
      project: "Indonesia Health Systems Strengthening Project (IBRD 9626-ID)",
      purchaser: "Directorate General of Health Services, Ministry of Health, Republic of Indonesia",
      country: "Indonesia",
      evaluationDate: "September 17, 2024"
    },
    keyConclusion: "The Technical Evaluation Report contains 8 Critical Issues, 10 Major Issues, and 5 Minor Issues that must be addressed before Bank No-Objection can be granted. While the evaluation demonstrates structured methodology and comprehensive documentation in certain areas, there are fundamental procedural deficiencies, inconsistent application of qualification criteria, inadequate justification for rejections, missing mandatory documentation, and potential violations of World Bank procurement principles that compromise the integrity of this evaluation."
  },
  mostSeriousConcern: {
    title: "Application of Undocumented Minimum Technical Score Threshold",
    description: "The evaluation appears to apply an undocumented technical score threshold to exclude technically qualified bidders from financial evaluation, which violates the combined 70%/30% evaluation methodology specified in the bidding documents and contradicts World Bank procurement regulations.",
    impact: "CRITICAL",
    violatesRegulations: [
      "PR2025 Section V Para 5.50 & Annex X Para 3.1",
      "PR2025 Annex X Para 2.2a, 2.2c",
      "Cathlab Rules C46 (page 60)"
    ]
  },
  criticalIssues: [
    {
      issueNumber: 1,
      title: "Application of Undocumented Minimum Technical Score Threshold",
      pages: "16-23 (Forms 2 & 3 across all lots)",
      severity: "CRITICAL",
      description: "The evaluation systematically excludes bidders from financial evaluation based on technical scores despite those bidders being marked 'Substantially Responsive' and passing all qualification criteria. This violates the specified combined evaluation methodology.",
      examples: [
        {
          lot: "LOT 1",
          bidder: "PT Rajawali Nusindo",
          score: "89/127",
          status: "Substantially Responsive, QUALIFIED on Form 11A (Pages 67-90)",
          outcome: "Excluded from financial evaluation",
          justification: "Not to be invited for the opening of financial part of the bid because not meet in the technical and qualification evaluation"
        },
        {
          lot: "LOT 4",
          bidder: "PT Tawada Healthcare",
          score: "68/132",
          status: "Substantially Responsive, QUALIFIED",
          outcome: "Excluded from financial evaluation"
        },
        {
          lot: "LOT 4",
          bidder: "Canon Medical Systems",
          score: "75/132",
          status: "Substantially Responsive, QUALIFIED",
          outcome: "Excluded from financial evaluation"
        },
        {
          lot: "LOT 2",
          bidder: "Consortium of Siemens",
          score: "61/126",
          status: "Invited to financial evaluation",
          note: "Lower score than excluded bidders, yet invited - inconsistent application"
        }
      ],
      rulesViolated: [
        "PR2025 Section V Para 5.50 & Annex X Para 3.1: When Rated Criteria methodology used, all qualified and responsive bidders proceed to combined technical/financial evaluation",
        "PR2025 Annex X Para 2.2a: Evaluation criteria and methodology must be specified in detail in Request for Bids documents",
        "PR2025 Annex X Para 2.2c: Only evaluation criteria indicated in procurement documents shall be applied",
        "Cathlab Rules C46: Evaluated Bid Score formula requires BOTH technical AND financial scores: B = (Clow/C × 0.70 × 100) + (T/Tmax × 0.30 × 100)"
      ],
      requiredActions: [
        "Provide exact citation from Section III of bidding documents specifying minimum technical score threshold (if it exists)",
        "If NO minimum threshold was specified, ALL technically qualified and responsive bidders MUST proceed to financial evaluation",
        "Apply the full combined evaluation formula to determine Most Advantageous Bid",
        "Reconsider LOT 4 particularly: excluding bidders with scores of 65, 68, and 75 when their financial competitiveness is unknown violates competitive principles",
        "Document the legal/procedural basis for any exclusion before financial evaluation"
      ]
    },
    {
      issueNumber: 2,
      title: "Inconsistent and Inadequate Rejection Justifications - Manufacturing Experience",
      pages: "24-39 (Form 3 - Summary of Bids/Proposals Rejected)",
      severity: "CRITICAL",
      description: "Multiple bidders across three lots rejected for allegedly not meeting manufacturing experience qualification based on interpretation that 'Mobile C produced is not a Cathlab,' yet this interpretation lacks citation to exact requirement specification, evidence of clarification process, and consistent application across all bidders.",
      affectedBidders: [
        "Shanghai United Imaging Healthcare (LOT 1, 3)",
        "PT Rajawali Nusindo & EUROCOLUMBUS S.R.L (LOT 1)",
        "PT Rajawali Nusindo & Allengers Medical Systems Ltd. (LOT 3)"
      ],
      inconsistency: "Form 11A qualification evaluations (Pages 67-160) show bidders who PASSED this same criterion, yet others were rejected for identical equipment manufacturing backgrounds",
      requiredActions: [
        "Provide exact text from Section III, page 53-54 defining 'cathlab equipment' manufacturing requirement",
        "Document clarification requests sent to affected bidders asking for explanation of manufacturing experience relevance",
        "Show bidder responses to clarifications and evaluation committee's assessment",
        "Demonstrate consistent application: if one bidder's Mobile C-arm experience was accepted, explain why others' was rejected"
      ]
    },
    {
      issueNumber: 3,
      title: "Rejection Based on Missing 'Year of Installation' Data Not Clearly Required",
      pages: "24-25, 33-34 (Form 3)",
      severity: "CRITICAL",
      description: "Multiple bids rejected because bidder offered 'latest model with production year 2024 but does not give the year of installation' (Row 459), yet unclear if 'year of installation' was mandatory requirement vs. 'year of 1st production' and should have triggered clarification request rather than outright rejection.",
      concern: "Technical Specification Excel files use color coding: Green cells = Mandatory, White cells = Information only. Is Row 459 mandatory (green) or information (white)?",
      logicalIssue: "If equipment was 'latest model production year 2024,' how could 'year of installation' exist for brand new equipment?",
      requiredActions: [
        "Provide screenshot/reference to Row 459 showing cell color (mandatory green vs. information white)",
        "Clarify definition: 'year of 1st production' vs. 'year of installation' - are these different requirements?",
        "Document whether this requirement was applied consistently to ALL bidders who passed",
        "If Row 459 was ambiguous, explain why clarification wasn't sought before rejection"
      ]
    },
    {
      issueNumber: 4,
      title: "Preliminary Examination Results Conflict with Later Rejections",
      pages: "56-62 (Form 10A - Preliminary Examination)",
      severity: "CRITICAL",
      description: "Form 10A shows ALL bidders marked 'Substantially Responsive' and 'Accepted for detail evaluation,' yet 11 bids (44%) were subsequently rejected for failing mandatory requirements. This indicates preliminary examination was not properly conducted or mandatory requirements were not checked at preliminary stage.",
      contradiction: "How can a bid be 'Substantially Responsive' (Page 56) yet later determined 'not meet the minimum requirement of mandatory criteria' (Page 24)?",
      properSequence: "Preliminary Examination → Detailed Qualification (Form 11A) → Detailed Technical (Form 12-13)",
      actualSequence: "Form 10A: All 'Substantially Responsive' → Form 11A & 12: Many fail mandatory requirements → Form 3: Rejections",
      requiredActions: [
        "Clarify what was actually checked during preliminary examination",
        "Explain the meaning of 'Substantially Responsive' as applied",
        "Revise evaluation sequence to align with WB procedures, OR explain why all mandatory requirements were deferred to detailed evaluation stage"
      ]
    },
    {
      issueNumber: 5,
      title: "Specific Experience Quantity Verification Inadequately Documented",
      pages: "24-39 (Form 3), 67-160 (Form 11A)",
      severity: "CRITICAL",
      description: "Multiple bidders rejected for 'Minimum required experience not meet (Requirement 21 unit)' with insufficient documentation of what was actually submitted and how it was verified.",
      ambiguousRequirement: "The phrase 'minimum cumulative 45 unit annually in any of year' is ambiguous - does it mean 45 units in one single year, or cumulative 45 units total over 7 years?",
      mathematicalErrors: "Canon Medical Systems rejection states '3 units on 2023 and 4 units on 2024' equals 'maximum 4 units' - this is incorrect (should be 7 units)",
      requiredActions: [
        "Clarify official interpretation of 'minimum cumulative X unit annually in any of year' requirement",
        "For each rejected bidder, provide table showing contracts submitted (year, quantity, contract reference)",
        "Show evaluation committee's verification of contract authenticity and quantities",
        "Correct mathematical errors in justifications"
      ]
    },
    {
      issueNumber: 6,
      title: "Technical Specification Rejections Without Adequate Evidence",
      pages: "24-39 (Form 3)",
      severity: "CRITICAL",
      description: "Multiple bidders rejected for failing specific technical requirements, but justifications lack exact requirement specification, what bidder actually offered, and reference to clarification process.",
      examples: [
        {
          bidder: "Canon Medical Systems",
          issue: "Display resolution does not meet 2K",
          questions: ["What resolution did Canon offer?", "What exactly is '2K resolution' requirement?", "Is 1920x1080 substantially equivalent to 2K?"]
        },
        {
          bidder: "Innvolution Healthcare Group",
          issue: "Heat Dissipation Rate - 300,000 Joules vs. required 392,000 Joules (23% shortfall)",
          questions: ["Is this mandatory (green cell) or rated criterion (orange cell)?", "Does lower rate mean equipment is unsafe or just less capable?"]
        },
        {
          bidder: "JV of Xianqin & Lepu Medical",
          issue: "Anti-malware Software - bidder proposed air-gapped security (no USB, no internet = no malware risk)",
          questions: ["Is this functionally equivalent security solution?", "Was clarification sought to understand cybersecurity architecture?"]
        }
      ],
      requiredActions: [
        "For EACH technical specification rejection: Provide Row Number, exact requirement text, whether mandatory (green) or rated (orange), what bidder offered, quantified gap, clarification documentation",
        "For 'substantially equivalent' arguments: Document technical evaluation of equivalency",
        "For quantitative shortfalls: Explain materiality and whether gap was clarified"
      ]
    },
    {
      issueNumber: 7,
      title: "Pre-Installation Requirements Interpretation Unclear",
      pages: "26-27 (LOT 1), 28-30 (LOT 2)",
      severity: "CRITICAL",
      description: "Multiple bidders rejected for incomplete installation requirements stating they would not provide electrical cables to panel, yet unclear if this cable provision was within scope of bidder's responsibility or purchaser's responsibility.",
      scopeBoundaryIssue: "Does 'Pre-Installation Requirement' require bidder to supply cables to electrical panel (equipment scope) or just specify what pre-installation works are needed (purchaser arranges)?",
      requiredActions: [
        "Provide exact text of Row 429 and 441 requirements from Excel file",
        "Clarify scope boundary: Is power cable to main electrical panel bidder's scope or purchaser's infrastructure?",
        "Show how passing bidders responded to Rows 429 and 441",
        "If passing bidders also excluded power cables, explain why they were not rejected"
      ]
    },
    {
      issueNumber: 8,
      title: "Missing Form 10.2 - Environmental & Social Evaluation",
      pages: "Table of Contents (Page 3), Missing from report",
      severity: "CRITICAL",
      description: "Form 10.2 'Preliminary Evaluation - E&S Related Completeness Check' is listed as required in Table of Contents but is NOT provided in the evaluation report, despite E&S requirements being mentioned in Section I General Information (OHS Plan, Material Safety Data Sheets).",
      requiredActions: [
        "Provide completed Form 10.2 showing E&S completeness check for ALL 25 bids",
        "Document which bidders submitted OHS Plan and Material Safety Data Sheets",
        "If E&S requirements were waived, document Bank's approval for this decision"
      ]
    }
  ],
  majorIssues: [
    {
      issueNumber: 9,
      title: "Identical Scoring Across All Five Evaluators Suggests Lack of Independent Assessment",
      pages: "Form 14 across all lots (Pages 1001+)",
      severity: "MAJOR",
      description: "Form 14 shows all 5 evaluators gave IDENTICAL scores to each bidder for every single sub-criterion across all 4 lots. This pattern is statistically improbable and raises concerns about evaluation independence.",
      pattern: "Every bidder shows scores like: '61, 61, 61, 61, 61' (all five evaluators) with zero variation",
      concern: "Suggests consensus scoring without independent assessment first, or post-facto alignment of scores"
    },
    {
      issueNumber: 10,
      title: "Evaluation Committee Lacks Documented Technical Expertise",
      pages: "13-14 (Evaluation Committee Members and Roles)",
      severity: "MAJOR",
      description: "All 5 members from Procurement Bureau designated as 'Evaluator' with no information on technical qualifications in medical imaging or cardiology equipment. Report itself states: 'Procurement committee has limited technical knowledge to determine the responsiveness.'",
      criticalConcern: "If evaluation committee lacked technical knowledge, how were complex judgments made about Mobile C-arm equivalency, display resolution requirements, heat dissipation materiality, and cybersecurity approaches?"
    },
    {
      issueNumber: 11,
      title: "Clarification Process Poorly Documented",
      pages: "8-9 (Issues Encountered), 40-41 (Form 4)",
      severity: "MAJOR",
      description: "Report mentions extensive clarification process (July 4 - September 10, 2024) with 'lengthy responses from bidder,' but provides NO documentation of what clarifications were requested, which bidders received requests, what responses were provided, or how responses were evaluated."
    },
    {
      issueNumber: 12,
      title: "Form 3 Rejections Insufficiently Detailed",
      pages: "24-39 (Form 3 across all lots)",
      severity: "MAJOR",
      description: "While Form 3 provides rejection justifications, many lack sufficient detail including: what bidder actually offered vs. required, page references to bid documents, whether issue was clarified, and materiality of deficiency."
    },
    {
      issueNumber: 13,
      title: "Bid Validity Extension Process and Timeline Concerns",
      pages: "8-9, 40-41 (Form 4)",
      severity: "MAJOR",
      description: "Bid validity extended from September 30, 2024 to November 25, 2024 (nearly 2 months). Total evaluation time: 99 days from bid opening to report submission (June 10 to September 17). Raises questions about evaluation efficiency and potential price adjustment implications per Cathlab Rules C68 (ITB BDS 18.3(b))."
    },
    {
      issueNumber: 14,
      title: "Minimum Specific Experience Quantities Potentially Too High",
      pages: "Throughout Form 3 and Form 11A",
      severity: "MAJOR",
      description: "LOT 3 requires evidence of supplying 56 cathlab units in one single year (representing $10-15 million USD). This may restrict competition to 3-5 global players only, potentially violating PR2025 Section V Para 5.25 principle of promoting broadest possible competition."
    },
    {
      issueNumber: 15,
      title: "Manufacturing Capacity Verification Method Unclear",
      pages: "Form 11A (67-160), Form 3 (24-39)",
      severity: "MAJOR",
      description: "Requirement 1(d) requires 'annual production capacity... at least 50% the quantities specified' but unclear whether this means theoretical production capacity (factory maximum output) or actual production volume (units manufactured). Innvolution rejected for '25 units produced vs. 35 required' - but was capacity vs. actual production assessed?"
    },
    {
      issueNumber: 16,
      title: "No Documentation of Evaluation Committee Meetings",
      pages: "Missing - Annex 1 template provided but not completed (Page 1097+)",
      severity: "MAJOR",
      description: "While Annex 1 (Attendance Register) template is included, there are NO completed registers documenting when committee met, who attended, or what decisions were made at each session."
    },
    {
      issueNumber: 17,
      title: "Power Plug Compliance Rejection Appears Overly Strict",
      pages: "26-27 (LOT 1 - Canon Medical Systems)",
      severity: "MAJOR",
      description: "Bidder rejected for offering 'Indian standard' power plug when requirement was 'Hospital Grade Type F power plug.' Question: Is this a material deficiency, or could it be resolved with simple power cord substitution per IEC 60320 international standard for appliance couplers?"
    },
    {
      issueNumber: 18,
      title: "No Analysis of Competition Impact",
      pages: "11-12 (Summary of bids received/rejected)",
      severity: "MAJOR",
      description: "Report shows 25 bids received from 12 bidders, with 11 bids (44%) rejected. LOT 2 has 56% rejection rate - only 4 bidders proceed to financial evaluation. No analysis of whether rejection rate is reasonable, impact on competition, or whether repeat rejections of same bidders suggest systematic issue vs. genuinely non-compliant submissions."
    }
  ],
  minorIssues: [
    {
      issueNumber: 19,
      title: "Inconsistent Terminology - 'Substantially Responsive' vs. 'Responsive'",
      severity: "MINOR",
      description: "Report uses both terms interchangeably without defining distinction. Should align with World Bank standard terminology."
    },
    {
      issueNumber: 20,
      title: "Table of Contents Page Numbering Errors",
      severity: "MINOR",
      description: "Lists 'Form 16' starting at page '1067' which should be page 106-107. Multiple forms show impossible page numbers."
    },
    {
      issueNumber: 21,
      title: "Missing Individual Evaluator Signatures on Technical Scoring Sheets",
      severity: "MINOR",
      description: "If individual evaluators completed separate scoring worksheets for Form 13, these should be signed and dated individually for clear audit trail."
    },
    {
      issueNumber: 22,
      title: "'Issues Encountered' Section Lacks Resolution Documentation",
      severity: "MINOR",
      description: "Lists six issues (lengthy bidder responses, manual data entry, incomplete qualification data, confusing rated columns, limited technical knowledge, lengthy technical team responses) but provides no information on how issues were resolved or lessons learned."
    },
    {
      issueNumber: 23,
      title: "Currency Conversion Not Yet Applicable",
      severity: "MINOR",
      description: "Financial evaluation forms (Forms 16-26) are blank templates as financial envelopes not yet opened. Report should clarify exchange rate methodology to be applied per PR2025 Annex X Para 3.6."
    }
  ],
  compliantAreas: [
    "Comprehensive Bid Tracking (Pages 11-23): All 25 bids across 4 lots systematically documented",
    "Multi-Evaluator Approach (Pages 13-14): Five-member evaluation committee with all signatures",
    "Form-Based Structure: Report follows World Bank EVAL2024 template structure",
    "Detailed Technical Scoring Methodology (Pages 1001+): Granular breakdown by sub-criterion",
    "Qualification Evaluation Documentation (Pages 67-160): Detailed Form 11A assessments",
    "Proper Prior Review Recognition: Acknowledges need for Bank No-Objection",
    "Bid Validity Extension Properly Handled: Bank's no-objection obtained before extension",
    "No Complaints Recorded (Page 14): Suggests transparent process from bidders' perspective",
    "Timely Addenda During Bidding (Page 42-43): Five addenda issued to clarify documents",
    "Complete Bid Opening Records (Pages 44-54): Detailed technical envelope opening documentation",
    "Consistent Committee Participation: All five members signed every form"
  ],
  overallRecommendation: {
    recommendation: "REQUEST MAJOR REVISION",
    summary: "The evaluation cannot proceed to Bank No-Objection for financial envelope opening until Critical Issues 1-8 are satisfactorily resolved.",
    immediateActions: [
      "Technical Score Threshold Clarification (CRITICAL ISSUE 1): Provide citation from Section III specifying minimum technical score, or if none exists, ALL qualified/responsive bidders must proceed to financial evaluation",
      "Manufacturing Experience Criteria Documentation (CRITICAL ISSUE 2): Define 'cathlab equipment manufacturing' and show clarification process with affected bidders",
      "'Year of Installation' Requirement Clarification (CRITICAL ISSUE 3): Confirm whether Row 459 was mandatory (green) or information (white)",
      "Preliminary Examination Reconciliation (CRITICAL ISSUE 4): Explain how all bidders were 'substantially responsive' yet 44% failed mandatory requirements",
      "Form 10.2 Environmental & Social Evaluation (CRITICAL ISSUE 8): Provide completed Form 10.2 for all bidders",
      "Enhanced Form 3 Documentation (CRITICAL ISSUES 5, 6, 7): For each rejection, provide exact requirement text, what bidder offered, quantified gap, clarification documentation, and materiality explanation"
    ],
    requiredForCompleteReport: [
      "Clarification Process Documentation (MAJOR ISSUE 11): Comprehensive log of all clarification requests and responses",
      "Technical Expertise Documentation (MAJOR ISSUE 10): Committee members' qualifications and technical expert consultation evidence",
      "Evaluation Committee Meetings (MAJOR ISSUE 16): Completed attendance registers and decision-making documentation",
      "Independent Evaluation Verification (MAJOR ISSUE 9): Individual evaluator worksheets or explanation of identical scoring pattern"
    ],
    futureRecommendations: [
      "Engage technical specialists in evaluation committee for medical equipment procurements",
      "Clarify minimum thresholds in bidding documents if any exist for technical scores",
      "Enhance preliminary examination to catch non-responsive bids earlier",
      "Improve clarification documentation with standardized logs and forms",
      "Allow adequate time for technical evaluation (3+ months appears standard for this complexity)",
      "Consider experience requirements proportionality to avoid unnecessary competition restriction",
      "Define scope boundaries clearly (supplier vs. purchaser responsibilities for installation)",
      "Provide detailed Form 3 templates requiring specific documentation for rejections"
    ]
  },
  conclusion: "While the evaluation demonstrates structured approach and comprehensive documentation in many areas, the eight critical issues identified—particularly the apparent application of an undocumented technical score threshold and inadequately justified rejections—prevent Bank No-Objection at this stage. Resolution of these issues is essential to ensure fair competition, compliance with World Bank procurement regulations, and achievement of value for money. Once critical issues are resolved and adequate documentation provided, the evaluation may proceed to financial evaluation stage with Bank No-Objection.",
  metadata: {
    analysisMode: 'REAL_MOCK_DATA',
    documentType: 'TECHNICAL_EVALUATION_REPORT',
    assessmentType: 'COMPREHENSIVE_PEER_REVIEWED_ANALYSIS',
    generatedAt: new Date().toISOString(),
    note: "Based on actual Cathlab Equipment procurement evaluation report for Indonesia Health Systems Strengthening Project"
  }
});
