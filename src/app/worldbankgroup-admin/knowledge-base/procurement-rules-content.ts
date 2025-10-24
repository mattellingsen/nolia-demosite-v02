// Procurement Rules Content - ALL 190 Rules
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
    {
        title: "Core Principles & Legal Framework",
        priority: "critical",
        rules: [
            {
                number: 1,
                title: "Follow Core Procurement Principles",
                description: "All procurement must adhere to: value for money, economy, integrity, fit for purpose, efficiency, transparency, and fairness",
                source: "PR2025, Section I, Para 1.3, p.1"
            },
            {
                number: 2,
                title: "Comply with Legal Agreement",
                description: "Borrower must carry out all procurement activities in accordance with Procurement Regulations and Legal Agreement",
                source: "PR2025, Section II, Para 2.1, p.3"
            },
            {
                number: 3,
                title: "Maintain Clear Governance and Accountability",
                description: "Governance shall be managed through clear and transparent lines of accountability with clearly defined roles and responsibilities",
                source: "PR2025, Section III, Para 3.1, p.5"
            },
        ]
    },
    {
        title: "Strategic Planning Documents",
        priority: "critical",
        rules: [
            {
                number: 4,
                title: "Develop PPSD for Each Project",
                description: "Borrower must develop a Project Procurement Strategy for Development (PPSD) for each IPF project Level of detail and analysis must be proportional to risk, value, and complexity",
                source: "PR2025, Section IV, Para 4.1, p.13; Annex V, Para 1.1, p.71"
            },
            {
                number: 5,
                title: "Obtain Bank Approval for PPSD Before Loan Negotiations",
                description: "Bank must review and approve PPSD before completion of loan negotiations",
                source: "PR2025, Section IV, Para 4.3, p.14; Annex V, Para 2.1, p.71"
            },
            {
                number: 6,
                title: "Update PPSD Annually",
                description: "Borrower must update PPSD at least annually or more frequently as requested by Bank Updates must be submitted to Bank for review and approval",
                source: "PR2025, Section IV, Para 4.3, p.14; Annex V, Para 2.2, p.72"
            },
            {
                number: 7,
                title: "Prepare Procurement Plan Before Loan Negotiations",
                description: "Borrower must prepare Procurement Plan before loan negotiations Initial plan must cover at least first 18 months of project implementation",
                source: "PR2025, Section IV, Para 4.5, p.14"
            },
            {
                number: 8,
                title: "Obtain Bank Approval for Procurement Plan",
                description: "Bank must review and approve Procurement Plan before completion of loan negotiations Plan is incorporated by reference in Legal Agreement, making it legally binding",
                source: "PR2025, Section IV, Para 4.5, p.14"
            },
            {
                number: 9,
                title: "Submit Procurement Plan Updates to Bank",
                description: "Borrower must submit updates to Bank for review and approval Bank publishes approved plan and updates on external website",
                source: "PR2025, Section IV, Para 4.5, p.14"
            },
            {
                number: 10,
                title: "Include Required Elements in Procurement Plan",
                description: "Must include: activity descriptions, selection methods, evaluation approach, cost estimates, time schedules, Bank review requirements, applicable procurement documents, and other relevant information",
                source: "PR2025, Section IV, Para 4.6, p.14"
            },
            {
                number: 11,
                title: "Conduct Early Market Engagement for Large Contracts",
                description: "All projects with international competitive procurement contracts estimated over $10 million USD must undertake Early Market Engagement Plan and approach must be detailed in PPSD",
                source: "PR2025, Section IV, Para 4.4, p.14"
            },
        ]
    },
    {
        title: "Fraud, Corruption & Integrity",
        priority: "critical",
        rules: [
            {
                number: 12,
                title: "Observe Highest Ethical Standards",
                description: "Borrowers, bidders, consultants, contractors, suppliers, and their personnel must observe highest ethical standards Must refrain from corrupt, fraudulent, collusive, coercive, or obstructive practices",
                source: "PR2025, Annex IV, Para 2.1, p.67"
            },
            {
                number: 13,
                title: "Apply Definitions of Prohibited Practices",
                description: "Corrupt practice: offering, giving, receiving, or soliciting anything of value to improperly influence actions Fraudulent practice: misrepresentation to obtain benefit or avoid obligation Collusive practice: arrangement to achieve improper purpose Coercive practice: harming or threatening to harm to improperly influence actions Obstructive practice: destroying evidence, making false statements, or impeding Bank\'s inspection rights",
                source: "PR2025, Annex IV, Para 2.2a, p.67-68"
            },
            {
                number: 14,
                title: "Check Bank\'s Sanctions Lists During Evaluation",
                description: "Borrower must check Bank\'s lists of debarred/suspended firms and individuals during evaluation of Bids/Proposals Must also check disqualification status per Para 3.34",
                source: "PR2025, Annex II, Para 10.1, p.58"
            },
            {
                number: 15,
                title: "Exclude Ineligible Firms",
                description: "Firms declared ineligible, sanctioned, or debarred by Bank must be excluded from being awarded contracts",
                source: "PR2025, Section III, Para 3.22e, p.9"
            },
            {
                number: 16,
                title: "Report Fraud and Corruption Timely",
                description: "Borrower must timely inform Bank when aware of fraud and corruption practices Bank may declare misprocurement if Borrower fails to take satisfactory action",
                source: "PR2025, Annex IV, Para 2.2c, p.68"
            },
            {
                number: 17,
                title: "Allow Bank Inspection and Audit Rights",
                description: "Contracts must permit Bank to inspect all accounts, records, and documents relating to procurement process, selection, and contract execution Must allow audits by Bank-appointed auditors",
                source: "PR2025, Annex IV, Para 2.2e, p.68"
            },
            {
                number: 18,
                title: "Report Fraud and Corruption Red Flags",
                description: "Borrower must note and report any fraud and corruption red flags to Bank\'s Integrity Vice Presidency (INT)",
                source: "PR2025, Annex II, Para 4.2d, p.55"
            },
            {
                number: 19,
                title: "Prohibit Conflicts of Interest",
                description: "Firms or individuals involved in Bank IPF procurement must not have conflicts of interest",
                source: "PR2025, Section III, Para 3.13, p.6"
            },
            {
                number: 20,
                title: "Disqualify Firms with Conflicting Relationships - Goods/Works",
                description: "Firm providing goods/works from consulting services it provided is conflicted Firm with close business/family relationship with Borrower staff involved in procurement is conflicted",
                source: "PR2025, Section III, Para 3.14, p.6-7"
            },
            {
                number: 21,
                title: "Disqualify Consultants Providing Related Goods/Works",
                description: "Consultant providing goods/works for a project cannot provide related consulting services, and vice versa Exception: turnkey or design-build contracts where multiple firms perform together",
                source: "PR2025, Section III, Para 3.16, p.7-8"
            },
            {
                number: 22,
                title: "Ensure Consultants Avoid Conflicts",
                description: "Consultants must provide professional, objective, impartial advice Must hold Borrower\'s interests paramount without consideration of future work Cannot be hired if conflict exists with other assignments or corporate interests",
                source: "PR2025, Section III, Para 3.15-3.16, p.7-8"
            },
            {
                number: 23,
                title: "Prevent Unfair Competitive Advantage",
                description: "Borrower must make available to all short-listed consultants all information that would give any consultant competitive advantage",
                source: "PR2025, Section III, Para 3.17, p.8"
            },
        ]
    },
    {
        title: "Conflict of Interest",
        priority: "critical",
        rules: [
            {
                number: 24,
                title: "Permit Eligible Firms from All Countries",
                description: "Bank permits eligible firms and individuals from all countries to offer goods, works, and services",
                source: "PR2025, Section III, Para 3.20, p.8"
            },
            {
                number: 25,
                title: "Do Not Deny Participation for Unrelated Reasons",
                description: "Borrower cannot deny participation or award for reasons unrelated to capability, resources, or conflict of interest",
                source: "PR2025, Section III, Para 3.21, p.9"
            },
            {
                number: 26,
                title: "Apply Eligibility Exceptions Only as Specified",
                description: "Exceptions include: sanctions based on Borrower\'s country law/UN Security Council decisions, SOEs meeting specific criteria, sanctioned/debarred firms",
                source: "PR2025, Section III, Para 3.22-3.23, p.9-10"
            },
            {
                number: 27,
                title: "Verify SOE Eligibility",
                description: "State-owned enterprises may participate only if legally and financially autonomous, operate under commercial law, and not supervised by contracting agency",
                source: "PR2025, Section III, Para 3.22b, p.9"
            },
            {
                number: 28,
                title: "Limit One Bid/Proposal per Bidder - Goods/Works",
                description: "Firm cannot submit more than one Bid/Proposal (individually or as joint venture partner), except permitted alternatives Violation disqualifies all bids where firm involved Firm may be subcontractor in multiple bids",
                source: "PR2025, Section III, Para 3.18, p.8"
            },
            {
                number: 29,
                title: "Limit One Proposal per Consultant",
                description: "Consultant cannot submit more than one Proposal (individually or as joint venture partner) Violation disqualifies all proposals where consultant involved May participate as sub-consultant or team member in multiple proposals if permitted",
                source: "PR2025, Section III, Para 3.19, p.8"
            },
        ]
    },
    {
        title: "Eligibility & Participation",
        priority: "critical",
        rules: [
            {
                number: 30,
                title: "Submit Documents for Prior Review",
                description: "For contracts subject to prior review, Borrower must submit: GPN, SPN, prequalification/initial selection documents, Request for Bids/Proposals, evaluation reports, etc.",
                source: "PR2025, Annex II, Para 6.1, p.55-56"
            },
            {
                number: 31,
                title: "Obtain Bank No-Objection Before Proceeding",
                description: "Borrower cannot proceed to next procurement stage without Bank\'s no-objection for prior review contracts",
                source: "PR2025, Annex II, Para 6.1, p.55"
            },
            {
                number: 32,
                title: "Submit Evaluation Reports for Each Stage",
                description: "In two-envelope or multistage processes, submit evaluation report for each envelope/stage before proceeding",
                source: "PR2025, Annex II, Para 6.1e, p.56"
            },
            {
                number: 33,
                title: "Obtain Approval for Bid Validity Extensions",
                description: "First request to extend bid/proposal validity longer than 4 weeks, and all subsequent requests, require Bank\'s prior review and no-objection",
                source: "PR2025, Annex II, Para 6.1d, p.56"
            },
            {
                number: 34,
                title: "Cannot Award Without Complaint Resolution Confirmation",
                description: "Borrower cannot proceed with contract award without Bank confirmation of satisfactory complaint resolution",
                source: "PR2025, Annex II, Para 6.1g, p.56"
            },
            {
                number: 35,
                title: "Obtain Approval for Contract Modifications",
                description: "For prior review contracts, must seek Bank\'s no-objection before: extensions affecting project completion, material scope modifications, variations >15% (single or cumulative), termination, SEA/SH obligation modifications",
                source: "PR2025, Annex II, Para 9.1, p.58"
            },
            {
                number: 36,
                title: "Submit Negotiation Minutes and Draft Contracts",
                description: "If process involves negotiations, submit minutes and draft contract initialed by both parties Include probity audit report if required",
                source: "PR2025, Annex II, Para 6.1h, p.56"
            },
            {
                number: 37,
                title: "Submit BAFO Evaluation Reports",
                description: "If BAFO used, submit evaluation report prior to requesting BAFO and final evaluation report prior to award",
                source: "PR2025, Annex II, Para 6.1i, p.56"
            },
        ]
    },
    {
        title: "Prior Review Requirements",
        priority: "critical",
        rules: [
            {
                number: 38,
                title: "Retain All Procurement Documentation Per Legal Agreement",
                description: "Borrower must retain all documentation according to Legal Agreement requirements Includes: PPSD, original Bids/Proposals, contracts, amendments, payment records, certificates",
                source: "PR2025, Annex II, Para 7.1, p.57"
            },
            {
                number: 39,
                title: "Include Specific Documents in Prior Review Retention",
                description: "Must retain: PPSD (with Early Market Engagement details), original Bids/Proposals, all correspondence, evaluation support documents, signed contracts/amendments, payment invoices, inspection/delivery/completion certificates For direct procurement: justifications, technical/financial capacity documentation, signed contract",
                source: "PR2025, Annex II, Para 7.1, p.57"
            },
            {
                number: 40,
                title: "Furnish Documents to Bank Upon Request",
                description: "Borrower must provide all retained documentation to Bank upon request for examination by Bank or its consultants/auditors",
                source: "PR2025, Annex II, Para 7.2, p.57"
            },
            {
                number: 41,
                title: "Retain Documentation for Post Review Contracts",
                description: "Must retain: PPSD, evaluation reports, complaints, signed contracts/amendments, payment invoices, inspection certificates",
                source: "PR2025, Annex II, Para 8.1, p.57"
            },
            {
                number: 42,
                title: "Provide Conformed Contract Copy to Bank",
                description: "One conformed copy of contract and securities must be furnished to Bank promptly after signing and before first payment",
                source: "PR2025, Annex II, Para 6.2, p.56"
            },
            {
                number: 43,
                title: "Use Standard Procurement Documents for International Competition",
                description: "For international competitive procurement, Borrower must use Bank\'s Standard Procurement Documents (SPDs) Available at www.worldbank.org/procurement/standarddocuments",
                source: "PR2025, Section V, Para 5.24, p.19"
            },
            {
                number: 44,
                title: "May Use Own Documents for National Competition",
                description: "For national competitive procurement, may use own documents if acceptable to Bank",
                source: "PR2025, Section V, Para 5.24, p.19"
            },
            {
                number: 45,
                title: "Use English, French, or Spanish for International Competition",
                description: "All procurement documents for international competitive procurements must be in English, French, or Spanish May also issue translated versions in National Language",
                source: "PR2025, Section V, Para 5.14, p.17"
            },
            {
                number: 46,
                title: "Take Responsibility for Translation Accuracy",
                description: "Borrower takes full responsibility for correct translation into National Language In case of discrepancy, English/French/Spanish text prevails",
                source: "PR2025, Section V, Para 5.15, p.17"
            },
        ]
    },
    {
        title: "Selection Methods & Processes",
        priority: "high",
        rules: [
            {
                number: 47,
                title: "Specify Evaluation Criteria in Detail",
                description: "Evaluation criteria and methodology must be specified in detail in Request for Bids/Proposals documents Criteria must be appropriate to type, nature, market conditions, and complexity",
                source: "PR2025, Section V, Para 5.50, p.23; Annex X, Para 2.2, p.87"
            },
            {
                number: 48,
                title: "Apply Only Specified Evaluation Criteria",
                description: "Only evaluation criteria indicated in procurement documents shall be applied All specified criteria must be applied",
                source: "PR2025, Annex X, Para 2.2c, p.87"
            },
            {
                number: 49,
                title: "Apply Criteria Consistently",
                description: "Evaluation criteria must be applied consistently to all Bids/Proposals submitted",
                source: "PR2025, Annex X, Para 2.2e, p.87"
            },
            {
                number: 50,
                title: "Cannot Change Criteria After Issuance Without Addendum",
                description: "Once documents issued, any change to evaluation criteria must be made only through addenda approved by Bank",
                source: "PR2025, Annex X, Para 2.2d, p.87"
            },
            {
                number: 51,
                title: "Use Rated Criteria for International Competitive Procurement",
                description: "For international competitive procurement where SPDs required (excluding pharmaceuticals/vaccines/commodities), Rated Criteria must apply",
                source: "PR2025, Section V, Para 5.50, p.23"
            },
            {
                number: 52,
                title: "Follow Mandatory Rated Criteria Weightings Matrix",
                description: "High/Substantial Risk & High Value: 50-80% weighting High/Substantial Risk & Low Value: 60-100% weighting Moderate/Low Risk & High Value: 10-40% weighting Moderate/Low Risk & Low Value: 20-30% weighting (High value = contracts >$10 million USD)",
                source: "PR2025, Section V, Para 5.50, p.23; Annex X, Para 3.3, p.89"
            },
            {
                number: 53,
                title: "Obtain Bank Approval for Rated Criteria Weightings",
                description: "Bank reviews and approves Rated Criteria weightings for each contract subject to prior review For post review, Bank reviews compliance with Weightings Matrix Misapplication may lead to misprocurement",
                source: "PR2025, Annex X, Para 3.4, p.89"
            },
            {
                number: 54,
                title: "Keep Rated Criteria to Minimum",
                description: "Number of Rated Criteria should be kept to minimum Must be prioritized, scored, and weighted according to relative importance",
                source: "PR2025, Annex X, Para 3.2, p.89"
            },
            {
                number: 55,
                title: "Design Evaluation Criteria to Achieve VfM",
                description: "Criteria must consider: cost (adjusted bid price or life-cycle costs), quality, risk, sustainability, innovation",
                source: "PR2025, Annex X, Para 2.3, p.87-88"
            },
        ]
    },
    {
        title: "Bid/Proposal Requirements",
        priority: "high",
        rules: [
            {
                number: 56,
                title: "Allow Sufficient Bid/Proposal Preparation Time",
                description: "Borrower must allow sufficient time for preparation depending on nature and complexity Validity period must enable completion of evaluation, approvals, Bank review, and award",
                source: "PR2025, Section V, Para 5.36-5.39, p.21-22"
            },
            {
                number: 57,
                title: "Specify Deadline and Place for Receipt",
                description: "Deadline and place for receipt must be specified in SPN and Request for Bids/Proposals document",
                source: "PR2025, Section V, Para 5.37, p.21"
            },
            {
                number: 58,
                title: "Reject Late Bids/Proposals",
                description: "Bids/Proposals received after deadline shall not be considered",
                source: "PR2025, Section V, Para 5.49, p.23"
            },
            {
                number: 59,
                title: "Conduct Bid/Proposal Opening at Specified Time",
                description: "Opening date/time must be same as deadline or promptly thereafter Must be announced in procurement documents and/or SPN",
                source: "PR2025, Section V, Para 5.40, p.22"
            },
            {
                number: 60,
                title: "Open Bids/Proposals Publicly (Unless Specified Exception)",
                description: "Normally, bid/proposal openings are undertaken in public Exceptions: multistage with BAFO/Negotiations, Competitive Dialogue (requires Probity Assurance Provider)",
                source: "PR2025, Section V, Para 5.42, 5.47, p.22-23"
            },
            {
                number: 61,
                title: "Read Out Information at Public Opening",
                description: "Read out: bidder/proposer name, withdrawal/modification/substitution status, bid/proposal prices, discounts, alternative offers, bid security/proposal validity",
                source: "PR2025, Section V, Para 5.43-5.46, p.22-23"
            },
            {
                number: 62,
                title: "Record Opening and Send to All Bidders/Proposers",
                description: "Record of opening must be promptly sent to all bidders/proposers whose bids were opened If subject to prior review, also send to Bank",
                source: "PR2025, Section V, Para 5.48, p.23"
            },
            {
                number: 63,
                title: "Do Not Consider Bids Not Opened/Read Out",
                description: "Bids/Proposals not opened and read out at opening shall not be considered",
                source: "PR2025, Section V, Para 5.48, p.23"
            },
            {
                number: 64,
                title: "Observe Time Limits for Second Envelope Opening",
                description: "In two-envelope process, second envelope shall not be opened earlier than 10 Business Days after communicating first envelope results Subject to complaint procedures if complaint received",
                source: "PR2025, Section V, Para 5.41, p.22"
            },
            {
                number: 65,
                title: "Reject Seriously Unbalanced or Front-loaded Bids",
                description: "Reject bids that are seriously unbalanced or front-loaded and present unacceptable risks",
                source: "PR2025, Section V, Para 5.53-5.54, p.24-25"
            },
            {
                number: 66,
                title: "Investigate Abnormally Low Bids/Proposals",
                description: "Request written clarifications; give opportunity to demonstrate fulfillment capability Reject if cannot demonstrate ability to fulfill contract",
                source: "PR2025, Section V, Para 5.55-5.57, p.25-26"
            },
            {
                number: 67,
                title: "Allow Joint Ventures",
                description: "Firms may form joint ventures to enhance qualifications All partners jointly and severally liable for entire contract Do not accept mandatory joint venture requirements",
                source: "PR2025, Section V, Para 5.38, p.22"
            },
        ]
    },
    {
        title: "Evaluation Procedures",
        priority: "high",
        rules: [
            {
                number: 68,
                title: "Apply Standstill Period After Notification",
                description: "10 Business Day Standstill Period must apply after Notification of Intention to Award Exceptions: only one bid submitted, direct selection, call-off from framework agreements, emergencies",
                source: "PR2025, Section V, Para 5.78-5.80, p.28-29"
            },
            {
                number: 69,
                title: "Cannot Award Contract Before or During Standstill Period",
                description: "Contract cannot be awarded either before or during Standstill Period",
                source: "PR2025, Section V, Para 5.79, p.29"
            },
            {
                number: 70,
                title: "Accept Complaints Within Specified Timeframes",
                description: "Complaints challenging procurement documents: at least 10 Business Days before deadline (or 5 Business Days after amended terms) Complaints after Notification of Intention to Award: within Standstill Period",
                source: "PR2025, Annex III, Para 3.1a, p.61; Section V, Para 5.78, p.29"
            },
            {
                number: 71,
                title: "Respond to Complaints Within Required Timeframes",
                description: "Document challenges: within 7 Business Days of receipt Award challenges: within 15 Business Days of receipt",
                source: "PR2025, Annex III, Table 1, p.65"
            },
            {
                number: 72,
                title: "Cannot Proceed Until Complaint Properly Addressed",
                description: "Borrower cannot proceed to next procurement stage until properly addressing complaints meeting requirements",
                source: "PR2025, Annex III, Para 3.1, p.61"
            },
            {
                number: 73,
                title: "Inform Bank Promptly of Complaints (Prior Review)",
                description: "For prior review contracts, inform Bank promptly and provide all relevant documentation",
                source: "PR2025, Annex III, Para 3.2, p.62"
            },
            {
                number: 74,
                title: "Provide Required Information in Complaint Response",
                description: "Response must include: statement of issues, facts/evidence, decision/basis, analysis, conclusion/next steps Maintain confidentiality of other bidders\' information",
                source: "PR2025, Annex III, Para 3.6, p.62-63"
            },
            {
                number: 75,
                title: "Maintain Complete Records of Complaints",
                description: "Borrower must maintain complete records of all debriefings and complaints and their resolution",
                source: "PR2025, Annex III, Para 3.7e, p.63"
            },
            {
                number: 76,
                title: "Provide Debriefing Upon Timely Request",
                description: "Unsuccessful bidders/proposers have 3 Business Days to request debriefing after receiving Notification of Intention to Award Borrower must provide debriefing within 5 Business Days of request",
                source: "PR2025, Section V, Para 5.81-5.82, p.29"
            },
            {
                number: 77,
                title: "Extend Standstill Period if Debriefing Delayed",
                description: "If debriefing provided outside 5 Business Day timeframe, Standstill Period automatically extends until 5 Business Days after debriefing Must inform all bidders/proposers of extension",
                source: "PR2025, Section V, Para 5.82, p.29"
            },
            {
                number: 78,
                title: "Include Specific Information in Debriefing",
                description: "Provide information on evaluation, strengths/weaknesses, bid/proposal comparison, reasons for rejection Maintain confidentiality of other bidders\' information",
                source: "PR2025, Section V, Para 5.84-5.85, p.30"
            },
        ]
    },
    {
        title: "Contract Award & Management",
        priority: "high",
        rules: [
            {
                number: 79,
                title: "Transmit Notification of Intention to Award",
                description: "Borrower must notify all bidders/proposers who submitted bids/proposals of intention to award For prior review, transmit only after receiving Bank\'s no-objection",
                source: "PR2025, Section V, Para 5.72-5.73, p.27"
            },
            {
                number: 80,
                title: "Include Required Information in Notification",
                description: "Must include: successful bidder name/address, contract price, technical scores (if Rated Criteria used), all bidder names and prices, reasons for rejection, debriefing/complaint instructions, Standstill Period end date",
                source: "PR2025, Section V, Para 5.74-5.77, p.27-28"
            },
            {
                number: 81,
                title: "Publish Contract Award Notice",
                description: "Borrower must publish Contract Award Notice after Standstill Period expires",
                source: "PR2025, Section V, Para 5.93-5.95, p.30"
            },
            {
                number: 82,
                title: "Send Clarifications to All Parties Simultaneously",
                description: "All clarifications and addenda must be sent In Writing simultaneously to all recipients Must provide sufficient time for appropriate action",
                source: "PR2025, Section V, Para 5.30, p.20"
            },
            {
                number: 83,
                title: "Introduce Modifications as Written Addenda",
                description: "Any modification to issued procurement documents must be In Writing as addendum If necessary, extend deadline for submissions",
                source: "PR2025, Section V, Para 5.31, p.20"
            },
            {
                number: 84,
                title: "Publish Procurement Opportunities",
                description: "Procurement opportunities must be published as specified Procurement documents are public documents upon issuance",
                source: "PR2025, Section V, Para 5.24, p.19"
            },
        ]
    },
    {
        title: "Complaints Handling",
        priority: "high",
        rules: [
            {
                number: 85,
                title: "Define Contract Terms Clearly",
                description: "Contract documents must clearly define: scope of work, goods/works/services to be provided, rights and obligations, other appropriate conditions",
                source: "PR2025, Section V, Para 5.28, p.20"
            },
            {
                number: 86,
                title: "Allocate Risks Appropriately",
                description: "Contract conditions must provide appropriate allocation of responsibilities, risks, and liabilities Based on analysis of which party best placed to manage risks",
                source: "PR2025, Annex IX, Para 2.1, p.83"
            },
            {
                number: 87,
                title: "Cannot Materially Alter Terms Without Bank Approval",
                description: "Terms and conditions cannot materially differ from those on which Bids/Proposals were requested without Bank\'s prior review and no-objection",
                source: "PR2025, Annex II, Para 6.3, p.56"
            },
            {
                number: 88,
                title: "Use Internationally Recognized Standard Conditions",
                description: "When Bank has not issued applicable SPD, use other internationally recognized standard conditions acceptable to Bank",
                source: "PR2025, Annex IX, Para 2.3, p.83"
            },
            {
                number: 89,
                title: "Require Performance Security for Works",
                description: "Works and Plant contracts must require security to protect against breach Normally up to 10% of contract price (bank guarantees), unless industry practice differs Portion must extend beyond completion to cover defects liability period",
                source: "PR2025, Annex IX, Para 2.4, p.83"
            },
            {
                number: 90,
                title: "Require Performance Security for Goods as Appropriate",
                description: "For goods, need depends on market conditions and commercial practice Must be appropriate and reasonable amount",
                source: "PR2025, Annex IX, Para 2.5, p.84"
            },
            {
                number: 91,
                title: "Allow Choice of Financial Institution for Securities",
                description: "Bidders/Proposers may submit securities from financial institution of their choice in any eligible country If outside Borrower\'s country, must have correspondent institution in Borrower\'s country for enforceability",
                source: "PR2025, Annex IX, Para 2.6, p.84"
            },
            {
                number: 92,
                title: "Include Default Provisions",
                description: "Contract must include provisions for suspension and termination addressing defaults by either party",
                source: "PR2025, Annex IX, Para 2.7, p.85"
            },
            {
                number: 93,
                title: "Include Force Majeure Provisions",
                description: "Contract must stipulate failure to perform due to force majeure not considered default",
                source: "PR2025, Annex IX, Para 2.8, p.85"
            },
            {
                number: 94,
                title: "Include Liquidated Damages Provisions",
                description: "Contract completion time must be specified Include liquidated damages provisions when delays would result in extra cost or loss of revenue May include bonus for early completion when beneficial",
                source: "PR2025, Annex IX, Para 2.9, p.85"
            },
            {
                number: 95,
                title: "Specify Insurance Requirements",
                description: "Contracts must include insurance types and terms Normally \'all risk\' policy required For goods/single responsibility contracts: transportation insurance at minimum 110% CIP price",
                source: "PR2025, Annex IX, Para 2.21, p.86"
            },
            {
                number: 96,
                title: "Use Incoterms for Goods",
                description: "In international competitive procurement, Incoterms must be used for goods Must specify applicable Incoterms version",
                source: "PR2025, Section V, Para 5.29, p.20"
            },
            {
                number: 97,
                title: "Include Dispute Resolution Mechanisms",
                description: "Must include appropriate mechanisms for independent dispute resolution Either Dispute Review Experts or Dispute Review Boards",
                source: "PR2025, Annex IX, Para 2.24, p.86"
            },
            {
                number: 98,
                title: "Require International Commercial Arbitration",
                description: "International commercial arbitration in neutral venue required Exception: if national procedures acceptable to Bank and venue neutral, or contract awarded to domestic bidder Bank shall not be named arbitrator",
                source: "PR2025, Annex IX, Para 2.25-2.26, p.86"
            },
            {
                number: 99,
                title: "Include Anti-Corruption Provisions",
                description: "Must include Bank\'s Anti-Corruption Guidelines provisions Include Bank\'s right to sanction and inspection/audit rights",
                source: "PR2025, Annex IX, Para 2.27, p.86"
            },
            {
                number: 100,
                title: "Include Copyright and Patent Indemnity",
                description: "Contract conditions must include appropriate provisions on copyrights and patent indemnity",
                source: "PR2025, Annex IX, Para 2.23, p.86"
            },
        ]
    },
    {
        title: "Procurement Planning",
        priority: "important",
        rules: [
            {
                number: 101,
                title: "Develop Contract Management Plan for Identified Contracts",
                description: "For contracts identified in PPSD (or high-risk SEA/SH works contracts), develop Contract Management Plan Begin developing during procurement process Complete at time contract is signed",
                source: "PR2025, Annex XI, Para 2.3, p.93"
            },
            {
                number: 102,
                title: "Include Required Elements in Contract Management Plan",
                description: "Must include: identified risks and mitigation, key contacts/roles/responsibilities, communication/reporting procedures, key contractual terms/conditions, KPIs, payment procedures, contract variations process, dispute resolution, environmental/social management, SEA/SH prevention",
                source: "PR2025, Annex XI, Para 3.1, p.93-94"
            },
            {
                number: 103,
                title: "Establish Authorizations at Contract Beginning",
                description: "Each party must establish necessary authorizations and delegations for personnel at contract beginning Ensures all contracting decisions are valid and enforceable",
                source: "PR2025, Annex XI, Para 3.1b, p.93"
            },
            {
                number: 104,
                title: "Include Key Performance Indicators",
                description: "Contract Management Plans must include KPIs to ensure satisfactory performance and contract requirements are met Where required, set KPIs at contract signing",
                source: "PR2025, Annex XI, Para 2.4, p.93"
            },
            {
                number: 105,
                title: "Monitor Contract Performance Proactively",
                description: "Borrower must proactively manage contracts throughout duration against Contract Management Plan",
                source: "PR2025, Annex XI, Para 2.4, p.93"
            },
            {
                number: 106,
                title: "Provide Timely Reports to Bank",
                description: "Borrower must monitor performance and progress and provide timely reports to Bank Bank may use information to benchmark performance",
                source: "PR2025, Section V, Para 5.96, p.31; Annex I, Para 3.7, p.53"
            },
            {
                number: 107,
                title: "Evaluate Contract at Completion",
                description: "Evaluation of contract execution must be carried out at completion to assess performance Identify lessons learned for future contracts where applicable",
                source: "PR2025, Annex XI, Para 2.4, p.93"
            },
            {
                number: 108,
                title: "Submit Contract Management Plan to Bank When Requested",
                description: "If requested by Bank, submit Contract Management Plan including KPIs Submit ongoing progress reports based on agreed KPIs for Bank review and comments",
                source: "PR2025, Annex II, Para 6.1j, p.56"
            },
        ]
    },
    {
        title: "Market Engagement",
        priority: "important",
        rules: [
            {
                number: 109,
                title: "Disqualify for SEA/SH Non-compliance",
                description: "Bank may disqualify firms for 2 years if determined non-compliant with contractual Sexual Exploitation and Abuse/Sexual Harassment Prevention and Response obligations Determination made per procedures in applicable SPD",
                source: "PR2025, Section III, Para 3.33, p.11"
            },
            {
                number: 110,
                title: "Exclude Disqualified Firms from Award",
                description: "Firms disqualified per Para 3.35 must be excluded from being awarded Bank-financed contracts",
                source: "PR2025, Section III, Para 3.23a, p.10"
            },
            {
                number: 111,
                title: "Monitor Sanctioned Firms Closely",
                description: "Apply additional due diligence by closely supervising and monitoring ongoing contracts executed by firms sanctioned/disqualified after contract signing",
                source: "PR2025, Annex II, Para 10.2, p.58"
            },
            {
                number: 112,
                title: "Cannot Sign New Contracts/Amendments with Debarred Firms",
                description: "Cannot sign new contracts or amendments (including extensions or variations) with suspended, debarred, or disqualified firms after effective date Exception: with Bank\'s prior review and no-objection",
                source: "PR2025, Annex II, Para 10.2, p.58"
            },
            {
                number: 113,
                title: "Limit Financing for Contracts with Subsequently Sanctioned Firms",
                description: "Bank will only finance additional expenditures if incurred before completion date For prior review: in amendment with Bank no-objection For post review: in amendment signed before effective date of suspension/debarment",
                source: "PR2025, Annex II, Para 10.3, p.58"
            },
            {
                number: 114,
                title: "No Financing for New Contracts with Sanctioned Firms",
                description: "Bank will not finance any new contract or material amendment signed with suspended, debarred, or disqualified firm on/after effective date",
                source: "PR2025, Annex II, Para 10.4, p.59"
            },
        ]
    },
    {
        title: "Sustainability Requirements",
        priority: "important",
        rules: [
            {
                number: 115,
                title: "Promote Broadest Competition in Specifications",
                description: "Standards and technical specifications must promote broadest possible competition while ensuring performance requirements",
                source: "PR2025, Section V, Para 5.25, p.19"
            },
            {
                number: 116,
                title: "Use International Standards",
                description: "To extent possible, specify internationally accepted standards (technical, environmental, social, cybersecurity, quality, etc.) When international standards don\'t exist or inappropriate, may use national standards",
                source: "PR2025, Section V, Para 5.25, p.19"
            },
            {
                number: 117,
                title: "Accept Substantially Equivalent Standards",
                description: "Procurement documents must state that equipment, materials, workmanship, and/or methodology meeting other substantially equivalent standards will be accepted",
                source: "PR2025, Section V, Para 5.25, p.19"
            },
            {
                number: 118,
                title: "Base Specifications on Technical Characteristics",
                description: "Specifications must be based on relevant technical characteristics and/or performance requirements",
                source: "PR2025, Section V, Para 5.26, p.19"
            },
            {
                number: 119,
                title: "Avoid Brand Names",
                description: "References to brand names, catalogue numbers, or similar classifications shall be avoided",
                source: "PR2025, Section V, Para 5.26, p.19"
            },
            {
                number: 120,
                title: "Add \'Or Equivalent\' When Brand Names Used",
                description: "If justified to specify brand name, must add \'or equivalent\' after reference Permits acceptance of offers with similar characteristics and substantially equivalent performance",
                source: "PR2025, Section V, Para 5.26, p.19"
            },
        ]
    },
    {
        title: "Alternative Procurement",
        priority: "important",
        rules: [
            {
                number: 121,
                title: "May Include Sustainability Requirements",
                description: "Borrower may include sustainability requirements if consistent with Bank\'s Core Procurement Principles May include own sustainable procurement policy requirements",
                source: "PR2025, Section V, Para 5.12, p.17; Annex VII, p.79-80"
            },
            {
                number: 122,
                title: "Evaluate Sustainability Through Non-Price Criteria",
                description: "If sustainability requirements specified, evaluate using non-price/qualitative criteria stated in procurement documents",
                source: "PR2025, Section V, Para 5.12, p.17"
            },
            {
                number: 123,
                title: "Specify Relevant Evaluation Criteria for Sustainability",
                description: "If specified, include relevant evaluation and qualification criteria to enable evaluation of sustainability aspects May evaluate: Environmental and Social Management Strategy, works methodology, key personnel, code of conduct, etc.",
                source: "PR2025, Annex VII, Para 2.6, p.80"
            },
            {
                number: 124,
                title: "May Use International Sustainability Standards",
                description: "May adopt international sustainability standards covering wide range of product/service groups if consistent with Core Procurement Principles May use internationally recognized certification schemes (e.g., ISO 14001) Bidders may demonstrate equivalent measures even without certification",
                source: "PR2025, Annex VII, Para 2.6, p.80"
            },
            {
                number: 125,
                title: "May Include Sustainability Considerations in Contract",
                description: "May include economic, environmental, and social considerations if consistent with Bank policy",
                source: "PR2025, Annex VII, Para 2.7, p.80"
            },
            {
                number: 126,
                title: "Include Sustainability KPIs if Requirements in Contract",
                description: "If sustainability requirements included, KPIs must include key sustainability aspects to enable monitoring",
                source: "PR2025, Annex VII, Para 2.8, p.80"
            },
            {
                number: 127,
                title: "May Apply Value Engineering",
                description: "Request for Bids/Proposals documents may allow application of value engineering Systematic approach to provide necessary functions at optimal cost Should enhance performance, reliability, quality, safety, durability, effectiveness",
                source: "PR2025, Section V, Para 5.13, p.17"
            },
            {
                number: 128,
                title: "Specify Value Engineering Mechanism in Contract",
                description: "Mechanism for application during contract execution must be specified in contract documents",
                source: "PR2025, Section V, Para 5.13, p.17"
            },
        ]
    },
    {
        title: "Consultant Selection",
        priority: "important",
        rules: [
            {
                number: 129,
                title: "Choose Appropriate Selection Method",
                description: "Selection method must be appropriate to nature, risk, and complexity to enable value for money Must justify and document approach in PPSD",
                source: "PR2025, Annex I, Para 3.3-3.4, p.53"
            },
            {
                number: 130,
                title: "Choose Appropriate Contract Type",
                description: "Contract type selection must be based on value for money and fit-for-purpose considerations Consider nature, risk, and complexity of procurement",
                source: "PR2025, Section V, Para 5.27, p.19; Annex I, Para 3.6, p.53"
            },
            {
                number: 131,
                title: "Available Contract Types Include",
                description: "Lump sum, turnkey, performance-based, unit price, time-based, Framework Agreements, build-own-operate, build-operate-transfer",
                source: "PR2025, Section V, Para 5.27, p.19"
            },
            {
                number: 132,
                title: "Determine Contract Type Based on Specific Factors",
                description: "Consider: nature/risk/complexity of activity, fit-for-purpose, optimal risk allocation, roles/responsibilities",
                source: "PR2025, Annex I, Para 3.6, p.53"
            },
            {
                number: 133,
                title: "May Use Alternative Procurement Arrangements",
                description: "At Borrower\'s request and with Bank agreement, may use procurement rules of other multilateral/bilateral agencies or Borrower\'s own agencies",
                source: "PR2025, Section II, Para 2.4, p.4"
            },
            {
                number: 134,
                title: "May Use National Procurement Procedures",
                description: "For contracts not financed by Bank but in project scope, may use other procedures if Bank satisfied they meet requirements",
                source: "PR2025, Section II, Para 2.3, p.3"
            },
        ]
    },
    {
        title: "Quality Considerations",
        priority: "important",
        rules: [
            {
                number: 135,
                title: "Allow Advance Contracting",
                description: "Borrower may proceed with procurement before signing Legal Agreement if Bank agrees",
                source: "PR2025, Section V, Para 5.1, p.15"
            },
            {
                number: 136,
                title: "May Allow Retroactive Financing",
                description: "Bank may agree to finance eligible expenditures incurred before loan signing",
                source: "PR2025, Section V, Para 5.1, p.15"
            },
            {
                number: 137,
                title: "May Procure Second-hand Goods",
                description: "If agreed with Bank and in Procurement Plan, may procure if economically efficient Requirements: risk mitigation in PPSD, not combined with new goods, specify minimum characteristics (age/condition), appropriate warranty provisions",
                source: "PR2025, Section V, Para 5.11, p.16-17"
            },
            {
                number: 138,
                title: "May Use Leasing",
                description: "May use leasing if agreed with Bank and specified in Procurement Plan Appropriate risk mitigation measures must be agreed",
                source: "PR2025, Section V, Para 5.10, p.16"
            },
            {
                number: 139,
                title: "Simplified Procedures for Urgent Need",
                description: "In urgent need situations (natural/man-made disaster, conflicts recognized by Bank), may: prepare simplified PPSD, complete simplified Procurement Plan during implementation Arrangements must be consistent with Core Procurement Principles",
                source: "PR2025, Section IV, Para 4.7, p.15"
            },
            {
                number: 140,
                title: "May Use Electronic Procurement Systems",
                description: "Borrower may use electronic procurement systems acceptable to Bank",
                source: "PR2025, Section V, Para 5.8, p.16"
            },
            {
                number: 141,
                title: "Use Procurement Planning and Tracking Tool",
                description: "Borrower should use Bank\'s Procurement Planning and Tracking Tool Facilitates preparation, approval, publishing of Procurement Plan and tracking implementation",
                source: "PR2025, Section V, Para 5.9, p.16"
            },
        ]
    },
    {
        title: "Small Contracts",
        priority: "important",
        rules: [
            {
                number: 142,
                title: "Bank Offers Direct Payment for Large Contracts",
                description: "For contracts >$10 million USD under international competitive procurement/Direct Selection, Bank will offer to make direct payments to supplier/contractor/consultant For Bank\'s share of eligible expenditure Exception: if Special Commitment disbursement method used",
                source: "PR2025, Section V, Para 5.32, p.20"
            },
            {
                number: 143,
                title: "May Require Bid/Proposal Security",
                description: "For goods/works/non-consulting services, Borrower may require bid/proposal security Must be in amount and form specified in documents Validity: sufficient time for Borrower to act if called upon (generally 4 weeks beyond bid validity)",
                source: "PR2025, Section V, Para 5.33, p.20"
            },
            {
                number: 144,
                title: "Consultants Normally Do Not Provide Proposal Security",
                description: "For consulting services, proposal security normally not required Exception: may be required in certain circumstances",
                source: "PR2025, Section V, Para 5.34, p.21"
            },
            {
                number: 145,
                title: "Maintain Confidentiality",
                description: "Borrower must maintain confidentiality of commercial and financial information and trade secrets as requested by bidders/proposers",
                source: "PR2025, Section V, Para 5.19, p.18"
            },
        ]
    },
    {
        title: "Direct Contracting",
        priority: "important",
        rules: [
            {
                number: 146,
                title: "Protect Confidential Information",
                description: "Confidential information from firms must not be disclosed to competitors or other parties not officially concerned with process Evaluators and officials must not use confidential information for personal benefit",
                source: "PR2025, Section V, Para 5.19, p.18"
            },
            {
                number: 147,
                title: "Do Not Release Evaluation Information Prematurely",
                description: "Information on bid/proposal examination, evaluation, and comparison shall not be disclosed until contract award is published Exception: as provided in complaint procedures",
                source: "PR2025, Section V, Para 5.20, p.18"
            },
            {
                number: 148,
                title: "Communicate In Writing",
                description: "All official communications must be In Writing (mail, email, fax, or electronic procurement system) System must be accessible, secure, ensure integrity/confidentiality, have audit trail",
                source: "PR2025, Glossary, p.xiv (definition of \"In Writing\")"
            },
            {
                number: 149,
                title: "Respond to Clarification Requests Without Divulging Advantages",
                description: "Borrower\'s response to clarification requests must not divulge information giving unfair advantage",
                source: "PR2025, Section V, Para 5.30, p.20"
            },
            {
                number: 150,
                title: "May Conduct Pre-Bid/Pre-Proposal Conference",
                description: "For complex procurement, may arrange conference where potential bidders/proposers meet with Borrower representatives Should provide reasonable access to project sites",
                source: "PR2025, Section V, Para 5.36, p.21"
            },
            {
                number: 151,
                title: "May Engage Probity Assurance Providers",
                description: "Borrower may engage independent Probity Assurance Providers to be present during procurement stages Includes: Early Market Engagement, bid opening, evaluation, negotiations, award decisions, contract execution",
                source: "PR2025, Section III, Para 3.3, p.5"
            },
            {
                number: 152,
                title: "Obtain Bank Agreement for Required Probity Providers",
                description: "Where Bank requires Probity Assurance Provider, Borrower must obtain Bank\'s agreement to selection and appointment",
                source: "PR2025, Section III, Para 3.3, p.5"
            },
        ]
    },
    {
        title: "Framework Agreements",
        priority: "important",
        rules: [
            {
                number: 153,
                title: "Cooperate with Independent Reviews",
                description: "Borrower must cooperate with independent third parties appointed by Bank for procurement reviews Must provide all necessary access",
                source: "PR2025, Section III, Para 3.9, p.6"
            },
            {
                number: 154,
                title: "Accept Hands-on Support When Required",
                description: "Bank may provide hands-on expanded implementation support where determined necessary Does not result in Bank executing procurement; project execution remains Borrower\'s responsibility",
                source: "PR2025, Section III, Para 3.10, p.7"
            },
            {
                number: 155,
                title: "Specify Prior/Post Review in Procurement Plan",
                description: "Requirement for prior or post review must be specified in Procurement Plan Based on project and contract-specific procurement risks",
                source: "PR2025, Section III, Para 3.8, p.6"
            },
            {
                number: 156,
                title: "Accept Bank Risk Reassessment",
                description: "Bank monitors and reassesses risk during implementation May require Borrower to revise prior/post review requirements in Procurement Plan",
                source: "PR2025, Section III, Para 3.8, p.6"
            },
            {
                number: 157,
                title: "Bank Sets Mandatory Prior Review Thresholds",
                description: "Bank sets thresholds based on project procurement risk levels Exception: below-threshold contracts may be prior review if procurement arrangements more challenging (e.g., negotiations, BAFO, Competitive Dialogue)",
                source: "PR2025, Annex II, Para 3.1, p.54"
            },
            {
                number: 158,
                title: "Bank May Reduce Prior Review for Low/Moderate Risk",
                description: "If assessed risk is low/moderate, Bank may determine above-threshold procurement subject to post review Such procurement must use SPDs and be included in Procurement Plan",
                source: "PR2025, Annex II, Para 3.2, p.54"
            },
            {
                number: 159,
                title: "Address Required Areas in PPSD",
                description: "Must cover: project needs and procurement objectives, operating context assessment, implementing agency capacity assessment, risk mitigation approach, market adequacy assessment, justification of procurement arrangements, proposed evaluation approach/methodology",
                source: "PR2025, Annex V, Para 2.3, p.72"
            },
        ]
    },
    {
        title: "E-Procurement Systems",
        priority: "important",
        rules: [
            {
                number: 160,
                title: "Include Project Overview in PPSD",
                description: "Must include: project description, development objectives, key result indicators, specific legal/policy requirements, summary of proposed contracts",
                source: "PR2025, Annex V, Para 3.2, p.72"
            },
            {
                number: 161,
                title: "Analyze Operating Context in PPSD",
                description: "Should analyze factors affecting procurement approach, bidder motivation, contract success Include: governance aspects, local economic factors, market constraints, infrastructure/logistics, environmental/social risks, emergency situations",
                source: "PR2025, Annex V, Para 3.3, p.72"
            },
            {
                number: 162,
                title: "Assess Borrower Capacity in PPSD",
                description: "Assess implementing agency\'s capacity, resources, and previous experience in procuring these types of activities",
                source: "PR2025, Annex V, Para 2.3c, p.72"
            },
            {
                number: 163,
                title: "Justify Procurement Arrangements in PPSD",
                description: "Provide basis and justification for procurement decisions, including approach to market and selection methods Based on market analysis, risk, operating context, and project circumstances",
                source: "PR2025, Annex V, Para 1.1, Para 2.3f, p.71-72"
            },
            {
                number: 164,
                title: "Detail Early Market Engagement Plan in PPSD",
                description: "Plan and approach to Early Market Engagement must be detailed in PPSD Should be appropriate for type of procurement and operating environment",
                source: "PR2025, Section IV, Para 4.4, p.14"
            },
        ]
    },
    {
        title: "Transparency & Disclosure",
        priority: "important",
        rules: [
            {
                number: 165,
                title: "Use Standard Evaluation Report Template",
                description: "Use template and forms for Procurement Evaluation Reports for Goods, Works, and Non-consulting Services Delete non-applicable parts from final report and table of contents",
                source: "EVAL2024, Template Cover Page, p.1"
            },
            {
                number: 166,
                title: "Include Required Information in Evaluation Report",
                description: "Must include: project/activity information, general information, complaints record, bid/proposal summary, procurement process dates, addenda record",
                source: "EVAL2024, Table of Contents, p.2-4"
            },
            {
                number: 167,
                title: "Document Bid/Proposal Opening Process",
                description: "Record: deadline for submission, opening date/time, attendance Use appropriate form based on process type (single stage/two stage, one envelope/two envelope)",
                source: "EVAL2024, Form 6, p.20"
            },
            {
                number: 168,
                title: "Conduct Preliminary Examination",
                description: "Examine all bids for: administrative compliance, eligibility, technical envelope compliance, financial envelope compliance",
                source: "EVAL2024, Form 10A, p.27"
            },
            {
                number: 169,
                title: "Conduct Detailed Qualification Evaluation",
                description: "Evaluate: eligibility criteria, qualification criteria for single entities and joint ventures Document compliance requirement, information provided, determination",
                source: "EVAL2024, Form 11A, p.30"
            },
            {
                number: 170,
                title: "Evaluate Specialized Subcontractors",
                description: "If applicable, evaluate eligibility and qualification of specialized subcontractors",
                source: "EVAL2024, Form 11B, p.32"
            },
            {
                number: 171,
                title: "Conduct Technical Evaluation Using Rated Criteria",
                description: "Use individual detailed evaluation sheets for each Rated Criterion Apply scoring methodology prescribed in Procurement Document Multiply scores by corresponding weights to get weighted scores",
                source: "EVAL2024, Form 13, p.34-36"
            },
            {
                number: 172,
                title: "Summarize Individual Evaluators\' Evaluations",
                description: "Compile evaluations from all individual evaluators Show scores from each evaluator for each bidder/proposer",
                source: "EVAL2024, Form 14, p.37"
            },
            {
                number: 173,
                title: "Conduct Financial Evaluation",
                description: "Evaluate: bid prices as read, currency conversion, arithmetic corrections, adjustments, evaluated bid price",
                source: "EVAL2024, Form 16, p.39-40"
            },
            {
                number: 174,
                title: "Combine Technical and Financial Evaluations",
                description: "Calculate combined scores based on specified weighting methodology Determine ranking of bidders/proposers",
                source: "EVAL2024, Form 25, p.52"
            },
            {
                number: 175,
                title: "Prepare Post-Qualification Assessment",
                description: "If applicable, conduct post-qualification of lowest evaluated or highest ranked bidder/proposer",
                source: "EVAL2024, Forms 17-18, p.41-42"
            },
            {
                number: 176,
                title: "Document BAFO Process If Used",
                description: "Record: invitation to BAFO, revised technical/financial proposals, final evaluation",
                source: "EVAL2024, Forms 19-21, p.43-45"
            },
            {
                number: 177,
                title: "Document Negotiation Process If Used",
                description: "Record: matters discussed, revised proposals, evaluation",
                source: "EVAL2024, Forms 22-24, p.46-51"
            },
            {
                number: 178,
                title: "Prepare Contract Award Recommendation",
                description: "Document: recommended bidder/proposer, contract amount, justification Include evaluation committee signatures and date",
                source: "EVAL2024, Form 26, p.54"
            },
            {
                number: 179,
                title: "Maintain Attendance Registers",
                description: "Record attendance at bid opening, evaluation committee meetings, other key events",
                source: "EVAL2024, Annex 1, p.56"
            },
            {
                number: 180,
                title: "Use Memorandum of Changes for Two-Stage Process",
                description: "Document changes to proposals between stages Include: original proposal details, justification for change, changes required",
                source: "EVAL2024, Annex 2, p.57-58"
            },
            {
                number: 181,
                title: "Use Completeness Checklist",
                description: "Check completeness of bid/proposal evaluation information and documents Verify all required sections and forms included",
                source: "EVAL2024, Annex 3, p.59-61"
            },
        ]
    },
    {
        title: "Documentation & Records",
        priority: "important",
        rules: [
            {
                number: 182,
                title: "Use Life-Cycle Costing When Appropriate",
                description: "Should be used when operation/maintenance costs considerable compared to initial cost and may vary among bids Evaluate on net present cost basis",
                source: "PR2025, Annex X, Para 3.7, p.89"
            },
            {
                number: 183,
                title: "Specify Life-Cycle Costing Information in Documents",
                description: "Must specify: number of years, discount rate percentage, factors/methodology for calculating operation/maintenance/residual value costs",
                source: "PR2025, Annex X, Para 3.8, p.89"
            },
            {
                number: 184,
                title: "Apply Cost Adjustments Properly",
                description: "Adjustments include: arithmetic correction, discounts, adjustments for delivery schedule/payment terms deviations, corrections for minor deviations/omissions",
                source: "PR2025, Annex X, Para 3.6, p.89"
            },
            {
                number: 185,
                title: "Give Financial Score Inversely Proportional to Price",
                description: "In combined Rated Criteria and Cost evaluation, financial scores inversely proportional to prices",
                source: "PR2025, Annex X, Para 3.9, p.89"
            },
            {
                number: 186,
                title: "Reject Bids Not Meeting Minimum Requirements",
                description: "May reject all bids if they do not meet minimum requirements or prices substantially exceed budget",
                source: "PR2025, Section V, Para 5.52, p.24"
            },
            {
                number: 187,
                title: "May Cancel Procurement Process",
                description: "Borrower may cancel process before contract award All cancellation requests must be submitted to Bank for prior review",
                source: "PR2025, Section V, Para 5.58-5.59, p.26; Annex II, Para 6.1f, p.56"
            },
            {
                number: 188,
                title: "Identify Most Advantageous Bid/Proposal",
                description: "Identify based on evaluation criteria specified in documents Represents best value for money under risk-based approach",
                source: "PR2025, Section V, Para 5.60-5.71, p.26-27"
            },
            {
                number: 189,
                title: "Award to Most Advantageous Responsive Bid/Proposal",
                description: "Award to bidder/proposer with Most Advantageous Bid/Proposal who has been determined to be eligible, qualified, and compliant",
                source: "PR2025, Section V, Para 5.88-5.92, p.30"
            },
            {
                number: 190,
                title: "Publish Public Notice of Award",
                description: "Publish on Borrower\'s website or in national newspaper/official gazette Include: contract description, contractor name, contract amount, contract duration",
                source: "PR2025, Section V, Para 5.93-5.95, p.30"
            },
        ]
    },
    {
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
