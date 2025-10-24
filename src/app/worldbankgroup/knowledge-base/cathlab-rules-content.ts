// Cathlab Procurement Evaluation Rules Content
// Parsed from cathlab_eval_rules_v2.md - ALL 75 RULES

export interface CathlabRule {
    number: number;
    title: string;
    description: string;
    requirements?: string[];
    source: string;
    citation: string;
}

export interface CathlabSection {
    id: string;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: "gray" | "success" | "warning" | "error";
    rules: CathlabRule[];
    isInfoSection?: boolean;
}

export const cathlabRulesContent: CathlabSection[] = [
    {
        id: "section-a1",
        title: "A1: BIDDER ELIGIBILITY & QUALIFICATION",
        description: "Critical mandatory requirements - Pass/Fail evaluation. Automatic disqualification if failed.",
        badge: "Critical",
        badgeColor: "error",
        rules: [
            {
                number: 1,
                title: "Bidder Eligibility - No World Bank Disqualification",
                description: "Bidder must not be subject to World Bank disqualification for fraud, corruption, or SEA/SH (Sexual Exploitation and Abuse/Sexual Harassment) violations",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 4.7, Section III Evaluation and Qualification Criteria page 53-56",
                citation: "At the time of Contract Award, the Bidder (including each subcontractor proposed by the Bidder) shall not be subject to disqualification by the Bank for non-compliance with SEA/SH obligations"
            },
            {
                number: 2,
                title: "No Suspension Based on Bid-Securing Declaration",
                description: "Bidder must not have been suspended nor declared ineligible based on execution of Bid Securing Declaration in Indonesia",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section IV Bidding Forms - Letter of Bid page 63-67",
                citation: "Bid-Securing Declaration: We have not been suspended nor declared ineligible by the Purchaser based on execution of a Bid Securing Declaration"
            },
            {
                number: 3,
                title: "Financial Capability - Minimum Average Annual Turnover (AATO)",
                description: "Requirements by Lot:",
                requirements: [
                    "Lot 1: US$ 66 million",
                    "Lot 2: US$ 31 million",
                    "Lot 3: US$ 81 million",
                    "Lot 4: US$ 7 million",
                    "Financial Statements Required: Audited financial statements or acceptable alternatives for last 3 years (2020, 2021, 2022)"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III Evaluation and Qualification Criteria page 53",
                citation: "The Bidder shall submit audited financial statements or, if not required by the law of the Bidder's country, other financial statements acceptable to the Purchaser, for the last three (3) years (2020, 2021 and 2022) prior to bid submission deadline"
            },
            {
                number: 4,
                title: "Specific Experience - Past Contract Performance",
                description: "Requirements by Lot (cumulative units annually in any year within last 7 years):",
                requirements: [
                    "Lot 1: 45 units minimum",
                    "Lot 2: 21 units minimum",
                    "Lot 3: 56 units minimum",
                    "Lot 4: 4 units minimum",
                    "Documentation Required: Purchaser's name/address, country, contract details, scope, completion date, equipment supplied, contract amount/role, percent subcontracted, plus copy of relevant signed contract pages"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 53-54; Amendment 5 page 2",
                citation: "The documentary evidence shall contain at minimum a copy of the relevant pages of the signed contract providing the above requested information"
            },
            {
                number: 5,
                title: "Documentary Evidence of Equipment Compliance",
                description: "Must provide technical specification catalog (brochures) demonstrating equipment meets usage requirements",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54; Technical Specifications Excel files (all lots) - Tab 1 Cathlab rows 9-12",
                citation: "Each lot Excel file requires: Brochure/Catalogue (both soft and hard copy required), U.S. FDA Clearance/CE Mark or equivalent"
            },
            {
                number: 6,
                title: "Manufacturing Experience (if Bidder is Manufacturer)",
                description: "Requirements:",
                requirements: [
                    "(i) Manufactured cathlab equipment for minimum 4 years prior to bid submission",
                    "(ii) Annual production capacity for last 4 years is at least 50% of lot quantities"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54",
                citation: "it has manufactured cathlab equipment for at least four (4) years, prior to the bid submission deadline; and its annual production capacity of cathlab equipment for each of the last four (4) years prior to the bid submission deadline, is at least 50% the quantities specified under each lot"
            },
            {
                number: 7,
                title: "Cybersecurity Capability",
                description: "Must demonstrate cybersecurity management experience with ISO 27001 or equivalent accreditation; provide MDS2 Form for equipment cybersecurity mitigation",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54",
                citation: "The bidder has experience in managing cyber security, practice and track record, including relevant Cyber security accreditation such as ISO 27000 (ISO 27001) or equivalent. The bidder to provide relevant equipment cybersecurity mitigation via their MDS2 Form"
            },
            {
                number: 8,
                title: "Manufacturer's Authorization (if not Manufacturer)",
                description: "If bidder does not manufacture items, must provide Manufacturer's Authorization from manufacturer meeting criteria 6(i) and 6(ii) above",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54, Section I ITB 17.2(a) per BDS",
                citation: "A Bidder who does not manufacture an item/s where a manufacturer authorization is required in accordance with BDS ITB 17.2 (a), the Bidder shall provide evidence of being duly authorized by a manufacturer"
            },
            {
                number: 9,
                title: "Joint Venture Requirements",
                description: "Requirements:",
                requirements: [
                    "Lead Partner must meet minimum 40% of total AATO requirement",
                    "Each partner must meet minimum 20% of total AATO requirement"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54",
                citation: "In case of joint venture, Lead Partner must meet minimum forty percent (40%) of the total AATO requirement while each partner must meet minimum twenty percent (20%) of total AATO requirement"
            },
            {
                number: 10,
                title: "Multiple Lot Bidding",
                description: "If one bidder bids for multiple lots, must meet cumulative minimum requirements for financial capability and specific experience for respective lots",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54",
                citation: "In case one bidder is to be recommended to be awarded the contract for more than one lot, such bidder shall meet the cumulative minimum requirement of point (a) financial capability and (b) specific experience respective lots"
            },
            {
                number: 11,
                title: "Goods Must Be New",
                description: "All goods and materials must be new, unused, most recent/current models with recent design improvements",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 96",
                citation: "All goods and materials to be incorporated in the goods must be new, unused, and of the most recent or current models and must incorporate all recent improvements in design and materials"
            }
        ]
    },
    {
        id: "section-a2",
        title: "A2: BID SUBMISSION REQUIREMENTS",
        description: "Mandatory submission format and documentation requirements",
        badge: "Critical",
        badgeColor: "error",
        rules: [
            {
                number: 12,
                title: "Two-Envelope Submission Format",
                description: "Bid must be submitted in two separate sealed envelopes: (a) Technical Part, (b) Financial Part, both enclosed in outer envelope marked 'Original Bid'",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 11.1, page 14-15",
                citation: "The Bid shall comprise two parts: (a) the Technical Part; and (b) the Financial Part...These two envelopes shall be enclosed in a separate sealed outer envelope marked 'Original Bid'"
            },
            {
                number: 13,
                title: "Bid Security or Bid-Securing Declaration",
                description: "Must be included in Technical Part envelope",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 19.1, Section IV Bidding Forms page 78-79",
                citation: "Bid Security or Bid-Securing Declaration: in accordance with ITB 19.1"
            },
            {
                number: 14,
                title: "Financial Information Prohibition in Technical Part",
                description: "Technical Part must not contain any material financial information related to bid price",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 11.4, page 16",
                citation: "The Technical Part shall not include any financial information related to the Bid price. Where material financial information related to the Bid price is contained in the Technical Part the Bid shall be declared non-responsive"
            },
            {
                number: 15,
                title: "Language Requirement",
                description: "All documents must be in required language (English and Bahasa Indonesia)",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 10.1, Section VII page 96",
                citation: "All documentation shall be in in Bahasa and English. All tags/labels on the equipment shall be in Indonesian and English"
            },
            {
                number: 16,
                title: "Authorized Signatory",
                description: "Bid must be signed by authorized person with power of attorney",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 20.3, Section IV page 63",
                citation: "The Bid shall be signed by a person duly authorized to sign on behalf of the Bidder... The authorization shall be evidenced by a power of attorney"
            },
            {
                number: 17,
                title: "No Reservations to Bidding Document",
                description: "Bidder must have no reservations to bidding document including all addenda",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section IV Letter of Bid page 63",
                citation: "(a) No reservations: We have examined and have no reservations to the bidding document, including addenda issued in accordance with Instructions to Bidders (ITB 8)"
            },
            {
                number: 18,
                title: "Submission Deadline",
                description: "Bid must be received before deadline; late bids not considered",
                requirements: [
                    "Date: May 30, 2024",
                    "Time: 10:00 AM Jakarta Time (Western Indonesia Time)"
                ],
                source: "Amendment 5, Section II BDS ITB 22.1, page 2",
                citation: "The deadline for Bid submission is: Date: May 30, 2024, Time: 10:00 AM Jakarta Time"
            },
            {
                number: 19,
                title: "Bid Validity Period",
                description: "Bid must remain valid until October 15, 2024",
                source: "Amendment 5, Section II BDS ITB 18.1, page 2",
                citation: "The Bid shall be valid until: October 15, 2024"
            }
        ]
    },
    {
        id: "section-a3",
        title: "A3: SUBSTANTIAL RESPONSIVENESS - TECHNICAL SPECIFICATIONS",
        description: "All mandatory technical specifications must be met",
        badge: "Critical",
        badgeColor: "error",
        rules: [
            {
                number: 20,
                title: "All Mandatory Technical Specifications Must Be Met",
                description: "Equipment must comply with ALL mandatory requirements (green cells) in device-specific Excel spreadsheet",
                requirements: [
                    "Excel Files: Amendment 1-4 R10_Cathlab files for each lot",
                    "Color Scheme: Green cells = mandatory requirements, orange cells = rated criteria, white cells = for information"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 55-56; Technical Specifications Excel files (all lots)",
                citation: "Mandatory requirements will be judged on a Pass/Fail basis. Those units that do not comply with ALL Mandatory requirements will be excluded"
            },
            {
                number: 21,
                title: "Technical Specification Compliance Documentation",
                description: "Requirements:",
                requirements: [
                    "Must check 'Yes' or 'No' for each specification",
                    "Must provide supporting materials (catalogues, data sheets, operating manuals, service manuals)",
                    "Incomplete information, lack of supportive material, or blank parameter lines = NON-RESPONSIVE",
                    "Must provide references to supporting materials for each compliance claim"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 95-96; Excel files Tab 1 rows throughout",
                citation: "The Bid of the Bidder who Comments with incomplete information, lacks supportive reference material, or leaves any parameter line blank, would be considered as NON-RESPONSIVE"
            },
            {
                number: 22,
                title: "Minimum Performance, Safety, and Service Requirements",
                description: "Requirements Include:",
                requirements: [
                    "Minimum physical and technical attributes for sustainable, high-quality performance",
                    "Guaranteed availability of consumables and spare parts",
                    "Required post-delivery support services: Inspection at commissioning, Warranty requirements, Training of staff, Operational support and maintenance"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 55",
                citation: "Device-specific minimum performance criteria (Mandatory specifications), including: Minimum physical and technical attributes to ensure sustainable, high-quality performance of the equipment; Guaranteed Availability of consumables and spare parts; Required post-delivery support services"
            },
            {
                number: 23,
                title: "Delivery Timeline - 210 Days from Contract Signing",
                description: "Must complete room readiness, pre-installation services, delivery, installation, testing, and commissioning within 210 days from contract signing",
                source: "Amendment 5, Section VII Schedule of Requirements, page 4-5; Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 93-94",
                citation: "within 210 days from contract signing (changed from contract award)"
            },
            {
                number: 24,
                title: "Service Requirements - Uptime and Response Times",
                description: "Requirements:",
                requirements: [
                    "Minimum uptime: 95% of required service time (calculated at lot level per half-year period)",
                    "Maximum turnaround time for repairs: 120 hours for all regions",
                    "Response time: within 1 hour for remote support, within 48 hours for on-site support",
                    "'Hours' means calendar hours (24 hours = 1 calendar day)"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 98",
                citation: "Required minimum uptime: 95% of required service time, calculated at the lot level for each half-yearly period. Maximum turnaround time for repairs for Region 1: 120 Hours, with response commencing within one hour for remote support and within 48 hours for on-site support"
            },
            {
                number: 25,
                title: "Training Requirements",
                description: "Requirements:",
                requirements: [
                    "Minimum 2 in-person training sessions at each location",
                    "First training within 2 weeks of successful acceptance testing & commissioning",
                    "Second training (refresher) delivered 3 months later",
                    "Each session for 6-12 trainees (medical doctors and non-medical staff)",
                    "Quarterly virtual refresher training sessions for up to 12 participants per location",
                    "Exception: If less than 6 trainees available, hospital must authorize in writing"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 98; Excel files Tab 2 'Installation activities'",
                citation: "the supplier shall provide a minimum of two (2) In-person training sessions at each location. The first training is to be delivered within 2 weeks upon successful Acceptance Testing & Commissioning. The second training is a refresher course, delivered three months later"
            },
            {
                number: 26,
                title: "Warranty Period - 5 Years",
                description: "5 years upon installation for maintenance and repairs",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 94; Amendment 5 page 5; Excel files Tab 5 'Proposed Post Warranty Service'",
                citation: "Warranty for Maintenance and repairs: 5 years upon installation"
            },
            {
                number: 27,
                title: "Documentation Requirements",
                description: "Requirements:",
                requirements: [
                    "1 copy of instruction manual in Bahasa Indonesia and English with bid",
                    "Operators Manual (1 hard copy per location + soft copies for updates)",
                    "Service Manual (1 hard copy per location + soft copies for updates)",
                    "All documentation in Bahasa and English",
                    "All tags/labels in Indonesian and English with manufacturer's name and country of origin"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 96, 102",
                citation: "Bidder must submit 1 copy of the instruction manual (in Bahasa Indonesia and English) with the bid...All documentation shall be in in Bahasa and English"
            },
            {
                number: 28,
                title: "Tools Requirement",
                description: "Full set of necessary tools for each type of delivered goods according to operation manual and technical specification",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 96",
                citation: "The Supplier shall provide a full set of necessary tools for each type of the delivered goods as required according to the operation manual and technical specification"
            },
            {
                number: 29,
                title: "Spare Parts List",
                description: "List and quantity of spare parts and materials needed for operating equipment per technical specifications",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 96; Excel files Tab 4 'Proposed Consumables and Price'",
                citation: "The Bidder shall present the list and quantity of spare parts and materials needed for operating the equipment in compliance with technical specifications"
            },
            {
                number: 30,
                title: "Acceptance Testing & Commissioning",
                description: "Must perform in-person testing in presence of MOH representative including electrical safety testing with calibrated equipment; inspect and test per manufacturer's procedures",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 97",
                citation: "Upon installation of the Goods at place of final destination, the Bidder must perform in-person Acceptance Testing and Commissioning in the presence of MOH Representative. This shall include Electrical Safety Testing using calibrated test equipment and tools"
            },
            {
                number: 31,
                title: "NIE Registration Status",
                description: "Not required for bid submission, but successful bidders must complete accelerated NIE registration before contract signing",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 98; Excel files Tab 1 rows 10-11, 19-20",
                citation: "Registration of goods based on the Nomor Izin Edar (NIE, Distribution Permit Number) is required...However, this shall not be a pre-condition for the bidders to participate in the bidding process and shall not be the basis for rejection. Successful bidders will be offered an accelerated track for NIE registration before contract signing"
            },
            {
                number: 32,
                title: "Environmental & Social Requirements",
                description: "Requirements:",
                requirements: [
                    "OHS (Occupational Health & Safety) procedure per MoH Regulation No. 14/2021 covering: Safety aspects of equipment packaging, Safety during transportation/distribution, Safety during installation and maintenance, OHS awareness/training/information dissemination",
                    "Material Safety Data Sheet (MSDS) for relevant equipment and chemicals"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 98-99",
                citation: "Occupational Health and Safety (OHS) procedure to address Supplier's personnel safety when carrying out equipment distribution, installation, operation and maintenance in accordance with MoH Regulation No. 14/2021"
            },
            {
                number: 33,
                title: "Supply Chain Risk Assessment",
                description: "Must include assessment of supply chain risks and proposal to manage risks",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 97; Section IV page 68",
                citation: "The Bidder must include an assessment of supply chain risks and proposal to manage the risks"
            },
            {
                number: 34,
                title: "Functional Guarantees",
                description: "Must provide list of detailed functional guarantees covered by warranty (submitted in device-specific Excel spreadsheet)",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 97; Amendment 5 page 7",
                citation: "To be submitted as part of the Device-Specific Excel spreadsheet on technical specifications"
            },
            {
                number: 35,
                title: "Room Requirements Compliance",
                description: "Must fulfill room requirements including turnkey service for room completion (wet works, painting, wall/floor finishing, ceiling works, radiation shielding)",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 93-94",
                citation: "The bidder is expected to fulfill the room requirement as described in the Technical Specification of Cathlab; whereby the bidder must supply, install and complete the commission of the room related to this equipment incorporating a turnkey service within the determined delivery and installation period of 210 days"
            },
            {
                number: 36,
                title: "Standards Compliance",
                description: "Must meet latest edition of specified standards and codes, or demonstrate substantial equivalence",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 96",
                citation: "Wherever reference is made in the Technical Specifications to specific standards and codes to be met by the goods and materials to be furnished or tested the provisions of the latest current edition or revision of the relevant standards or codes shall apply"
            },
            {
                number: 37,
                title: "Substantial Responsiveness - No Material Deviations",
                description: "Bid must not contain material deviations, reservations, or omissions; non-responsive bids cannot subsequently be made responsive",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 31.3, page 31",
                citation: "If a Bid is not substantially responsive to the requirements of bidding document, it shall be rejected by the Purchaser and may not subsequently be made responsive by correction of the material deviation, reservation, or omission"
            },
            {
                number: 38,
                title: "Equipment Type and Model Information",
                description: "Must specify brand/manufacturer name, model name, country of origin, year of 1st production for model proposed",
                source: "Excel files (all lots) Tab 1 'Cathlab' rows 5-8, 14-17",
                citation: "Rows require: Brand/Manufacturer Name - Bidder to specify, Model Name - Bidder to specify, Country of Origin - Bidder to specify, Year of 1st Production for Model Proposed - Bidder to specify"
            },
            {
                number: 39,
                title: "Regulatory Approvals",
                description: "U.S. FDA Clearance, CE Mark (MDD), or other health/safety/environmental standard adherence (mandatory if NIE not allocated)",
                source: "Excel files (all lots) Tab 1 rows 11-12, 20-21",
                citation: "U.S. FDA Clearance, CE Mark (Conformité Européenne mark) (MDD), or other health, safety and environmental standard adherence - Bidder to specify, mandatory if NIE not alloted as of yet"
            }
        ]
    },
    {
        id: "section-b1",
        title: "B1: TECHNICAL SCORING METHODOLOGY",
        description: "Technical evaluation weighted at 30% of total score",
        badge: "High Priority",
        badgeColor: "warning",
        rules: [
            {
                number: 40,
                title: "Overall Weighting - Technical vs. Financial",
                description: "Technical part carries 30% weight, financial part carries 70% weight in overall evaluation",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 60",
                citation: "The technical part will carry a weight of 30%, and the financial part will carry a weight of 70% in the overall evaluation"
            },
            {
                number: 41,
                title: "Technical Scoring Categories (Updated per Amendment 5)",
                description: "For Single Plane Lots (1, 2, 3) - Maximum 127 points:",
                requirements: [
                    "Physical equipment specifications exceeding minimum: 71 points",
                    "Mechanical & Electrical (M&E) Requirements: 3 points",
                    "IT Requirements: 2 points",
                    "AI and Telemedicine Requirements: 11 points",
                    "Operational support exceeding minimum: 40 points",
                    "Total: 127 points",
                    "For Biplane Lot (4) - Maximum 133 points (73/3/2/11/44)"
                ],
                source: "Amendment 5, Section III page 2-3",
                citation: "Section III Evaluation and Qualification Criteria, Technical Evaluation -- Rated Criteria Scoring Table is updated in alignment with revisions to the technical specifications"
            },
            {
                number: 42,
                title: "Rated Criteria Scoring Rules",
                description: "Scoring Method:",
                requirements: [
                    "Score = 0: Only mandatory minimum requirements met, no additional performance",
                    "Score > 0: Specific feature present that exceeds mandatory minimum requirement",
                    "Scores assigned based on thresholds identified in scoring spreadsheet",
                    "Partial scores NOT allowed - incomplete/partial compliance = no score assigned",
                    "Each rated criterion judged on Available/Not-available basis"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 56",
                citation: "The assignment of partial scores is not allowed. In case of partial or incomplete compliance to a rated criterion, the relevant score will not be assigned"
            },
            {
                number: 43,
                title: "Rated Criteria Detailed Specifications",
                description: "Categories Evaluated (15 categories per Technical Specifications):",
                requirements: [
                    "a. Equipment general information",
                    "b. Equipment regulatory approvals",
                    "c. Clinical applications capability",
                    "d. Performance/functionality features compliance",
                    "e. Desirable features availability",
                    "f. Required accessories for clinical applications",
                    "g. Required consumables and availability",
                    "h. Device physical attributes",
                    "i. Mechanical and electrical requirements (including energy efficiency)",
                    "j. IT requirements (including cybersecurity)",
                    "k. AI capability (if applicable)",
                    "l. Telemedicine capability (if applicable)",
                    "m. Room requirements",
                    "n. Maintenance and service requirements",
                    "o. After-purchase service and support availability"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 54-55; Technical Specifications Excel files (all lots), Tab 1 'Cathlab' - orange highlighted cells",
                citation: "Green cells representing mandatory requirements, orange cells representing rated criteria, and white cells representing for information requirements"
            },
            {
                number: 44,
                title: "Cumulative Point Calculation",
                description: "Sum of values (V) equals Cumulative Point (CP); total of all CPs consolidated for rating outcome",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 56",
                citation: "The sum of values (V) shall equate to the Cumulative Point (CP), representing the evaluated compliance points for each requirement. The total of all CPs will be consolidated"
            },
            {
                number: 45,
                title: "Technical Specification Table Requirements",
                description: "Each Excel file contains 5 tabs with specific requirements:",
                requirements: [
                    "Tab 1: 'Cathlab (single-plane)' or 'Cathlab (Bi-plane)' - Main technical specifications with mandatory (green) and rated (orange) criteria",
                    "Tab 2: 'Installation activities' - Installation and commissioning details",
                    "Tab 3: 'Hazards and Recalls' - Notification procedures",
                    "Tab 4: 'Proposed Consumables and Price' - 5-year consumables pricing",
                    "Tab 5: 'Proposed Post Warranty Service' - Years 6-10 comprehensive service contract"
                ],
                source: "All Excel files (Amendments 1-4, R6 versions)",
                citation: "All 6 Excel files contain identical 5-tab structure"
            }
        ]
    },
    {
        id: "section-c1",
        title: "C1: FINANCIAL EVALUATION",
        description: "Financial evaluation at 70% of total score with life-cycle costing",
        badge: "Important",
        badgeColor: "gray",
        rules: [
            {
                number: 46,
                title: "Evaluated Bid Score Formula",
                description: "B = (Clow/C × X × 100) + (T/Tmax × (1-X) × 100) where C = Evaluated Bid Price, Clow = lowest bid, T = technical score, Tmax = max technical score (127 for Single Plane, 133 for Biplane), X = weight for cost (70% or 0.70)",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 60",
                citation: "An Evaluated Bid Score (B) will be calculated for each responsive Bid using the following formula (for comparison in percentages)"
            },
            {
                number: 47,
                title: "Life-Cycle Costing Adjustment",
                description: "Parameters:",
                requirements: [
                    "Period: 10 years after commissioning for comprehensive O&M costs; 5 years for proprietary consumables",
                    "Discount rate: 6% for net present value calculation",
                    "Recurrent Cost Formula: R = Σ(Rx/(1+I)^x) for x=1 to N+M",
                    "Variables: N = warranty period years, M = post-warranty service period years, Rx = recurrent costs for year x, I = discount rate (6%)"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 59-60; Amendment 5 page 3",
                citation: "the discount rate to be applied to determine the net present value of future operational support and maintenance costs (recurrent costs) is 6%"
            },
            {
                number: 48,
                title: "Recurrent Costs Requirements (Updated per Amendment 5)",
                description: "Requirements:",
                requirements: [
                    "i) List of spare parts needing replacement for 10-year period + confirmation all included in comprehensive O&M contract years 1-5 with no additional payment",
                    "ii) Proprietary consumables for equipment and accessories with quantities/volumes for quantities specified in technical specifications document (cost valid for 5 years)",
                    "iii) Any other proprietary costs during operational support and maintenance period"
                ],
                source: "Amendment 5, Section III page 3",
                citation: "ii) proprietary consumables for the equipment and its accessories and the requirement in terms of quantities/volume for each consumable for quantities specified in the technical specifications document (cost for this set quantity per to be provided in the financial bid valid for 5 years)"
            },
            {
                number: 49,
                title: "Price Evaluation Components",
                description: "Components:",
                requirements: [
                    "(a) Bid price as quoted per ITB 14",
                    "(b) Price adjustment for arithmetic error correction",
                    "(c) Price adjustment for discounts offered",
                    "(d) Currency conversion to single currency if needed",
                    "(e) Price adjustment for quantifiable nonmaterial nonconformities",
                    "(f) Additional evaluation factors from Section III (life-cycle costing)",
                    "(g) Performance and productivity of equipment: Not applicable",
                    "(h) Specific additional criteria: None"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 34.2, page 34-35",
                citation: "To evaluate the Financial Part of each Bid, the Purchaser shall consider the following..."
            },
            {
                number: 50,
                title: "Margin of Preference (if applicable)",
                description: "Classification:",
                requirements: [
                    "Group A: Goods manufactured in Indonesia with >30% local content (labor, raw materials, components) and production facility engaged since bid submission",
                    "Group B: All other goods manufactured in Indonesia",
                    "Group C: Goods manufactured outside Indonesia (imported or to be imported)"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 56-58",
                citation: "Group A: Bids offering goods manufactured in the Purchaser's Country, for which (i) labor, raw materials, and components from within the Purchaser's Country account for more than thirty (30) percent of the DDP price"
            },
            {
                number: 51,
                title: "Price Schedules Required",
                description: "Requirements:",
                requirements: [
                    "For Goods from Abroad: DDP terms (delivered duty paid)",
                    "For Goods from Indonesia: Local currency (IDR)",
                    "Must Show: Unit prices and total prices separately; sales and other taxes separately identified"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section IV Bidding Forms page 69-75; Amendment 5 page 7-10",
                citation: "Price Schedule for Goods to be Imported and Price Schedule for Goods from Within Indonesia"
            }
        ]
    },
    {
        id: "section-c2",
        title: "C2: BID OPENING & EVALUATION PROCESS",
        description: "Two-stage opening with technical evaluation before financial",
        badge: "Important",
        badgeColor: "gray",
        rules: [
            {
                number: 52,
                title: "Two-Stage Opening Process",
                description: "Stage 1: Public opening of Technical Parts only. Stage 2: Public opening of Financial Parts only after technical evaluation completion",
                requirements: [
                    "Opening Date: May 30, 2024",
                    "Time: 10:30 AM Jakarta Time",
                    "Format: Hybrid (in-person + Zoom)"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 25 and ITB 33, pages 27-28, 32-33",
                citation: "The Bid opening shall take place hybrid at: Ministry of Health's office...Date: May 30, 2024, Time: 10:30 AM Jakarta Time"
            },
            {
                number: 53,
                title: "Technical Evaluation Sequence",
                description: "Steps:",
                requirements: [
                    "1. Preliminary examination of bid completeness",
                    "2. Eligibility verification",
                    "3. Qualification assessment (financial, experience, manufacturing, cybersecurity)",
                    "4. Substantial responsiveness determination",
                    "5. Mandatory requirements assessment (Pass/Fail)",
                    "6. Rated criteria detailed evaluation and scoring",
                    "7. SEA/SH disqualification verification before contract award"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 30-32, pages 30-32",
                citation: "Only substantially responsive bids submitted by eligible and qualified bidders shall proceed to the detailed technical evaluation"
            },
            {
                number: 54,
                title: "Clarification of Bids",
                description: "Process: Purchaser may request clarification but cannot request changes to substance of bid. Deadline for Clarification Requests (per Amendment 5): April 26, 2024",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 27, page 29; Amendment 5 page 1",
                citation: "The deadline for the Purchaser to respond to clarification requests, under ITB 7.2, is: April 26, 2024 at 15:00 (Jakarta time)"
            },
            {
                number: 55,
                title: "Notification After Technical Evaluation",
                description: "Requirements:",
                requirements: [
                    "Notify all bidders whether technical part was responsive",
                    "Notify date/time/place of Financial Part opening",
                    "Only technically responsive bidders proceed to financial opening"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 33, page 32-33",
                citation: "The Purchaser shall notify all Bidders in writing of its decision whether their bids were or were not responsive to requirements of the Technical Part"
            },
            {
                number: 56,
                title: "Financial Evaluation Steps",
                description: "Steps:",
                requirements: [
                    "Correction of arithmetic errors",
                    "Currency conversion (if needed)",
                    "Margin of preference calculation (if applicable)",
                    "Abnormally low bid assessment",
                    "Life-cycle costing adjustment"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 34-39, pages 34-37",
                citation: "Financial evaluation process steps"
            },
            {
                number: 57,
                title: "Combined Evaluation",
                description: "Method: Calculate Evaluated Bid Score (B) for each responsive bid. Most Advantageous Bid: Highest combined technical and financial score from qualified bidder with substantially responsive bid",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 40, page 37-38",
                citation: "The Most Advantageous Bid is the Bid of the Bidder that meets the Qualification Criteria and whose Bid has been determined to be substantially responsive to the Bidding document and is the Bid with the highest combined technical and financial score"
            }
        ]
    },
    {
        id: "section-c3",
        title: "C3: AWARD & CONTRACT MANAGEMENT",
        description: "Contract award rules and payment terms",
        badge: "Important",
        badgeColor: "gray",
        rules: [
            {
                number: 58,
                title: "Multiple Lots Award",
                description: "Each lot evaluated separately; contract for each lot awarded to bidder with highest evaluated score for individual lot for which bidder is qualified",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section III page 60",
                citation: "The evaluation will be made for each lot separately and the contract for a lot shall be awarded to the Bidder whose bid is determined substantially responsive and with highest evaluated score for individual lots for which the Bidder is qualified"
            },
            {
                number: 59,
                title: "Conditional Discounts - NOT Considered",
                description: "Discounts conditional on award of more than one lot NOT considered for bid evaluation",
                source: "Amendment 5, Section III page 3 (typo correction from 'then' to 'than')",
                citation: "Discounts that are conditional on the award of more than one lot will not be considered for bid evaluation purpose"
            },
            {
                number: 60,
                title: "Purchaser's Rights",
                description: "Rights:",
                requirements: [
                    "Reserve right to accept or reject any bid",
                    "Reserve right to annul bidding process and reject all bids anytime prior to contract award",
                    "Not bound to accept lowest evaluated cost bid or Most Advantageous Bid"
                ],
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 41, page 38",
                citation: "The Purchaser reserves the right to accept or reject any Bid, and to annul the Bidding process and reject all Bids at any time prior to Contract Award"
            },
            {
                number: 61,
                title: "Standstill Period",
                description: "Required period after Notification of Intention to Award before contract signing",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 42, page 38",
                citation: "Referenced in ITB 42 with details specified in BDS"
            },
            {
                number: 62,
                title: "Payment Terms (Updated per Amendment 5)",
                description: "Payment Schedule:",
                requirements: [
                    "(i) Advance Payment: 10% of Unitary Contract Price within 30 days of contract signing (with bank guarantee valid until goods accepted and commissioned)",
                    "(ii) On Delivery: 25% of Unitary Contract Price upon submission of GCC Clause 13 documents",
                    "(iii) On Acceptance/Testing/Commissioning/Training: 15% within 30 days after acceptance certificate; includes first training; advance payment also fully settled at acceptance",
                    "(iv) Uptime Performance-Linked Payment: 12.5% per half-year over 4 half-year periods (adjusted for penalties for delayed repair or higher downtime), within 30 days upon submission of claim supported by ASPAK data"
                ],
                source: "Amendment 5, Section IX Special Conditions of Contract, pages 10-11",
                citation: "GCC 16.2 Payment for Goods and Services supplied from abroad: (i) Advance Payment: Ten (10) percent of the Unitary Contract Price..."
            },
            {
                number: 63,
                title: "Performance Security",
                description: "Initial Requirement: Required after contract award. Adjustment After Last Batch: Adjust to 10% of Unitary Contract Price for remaining equipment still within warranty period. Validity: Must be valid for entire warranty period",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section IX page 133; Amendment 5 page 12",
                citation: "After delivery, installation, testing, acceptance, and full commissioning of the Goods for the last batch...the Supplier shall adjust the Performance Security to 10 % of the Unitary Contract Price for the remaining quantity of equipment still within the warranty period"
            },
            {
                number: 64,
                title: "Comprehensive Service Contract",
                description: "Years 6-10 after installation",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 94; Excel files Tab 5",
                citation: "Proposed Post Warranty Service - detailed pricing for years 6-10"
            },
            {
                number: 65,
                title: "Proprietary Consumables Pricing Validity",
                description: "Must be valid for 5 years",
                source: "Amendment 5, Section III page 3; Excel files Tab 4",
                citation: "proprietary consumables for the equipment and its accessories...cost for this set quantity per to be provided in the financial bid valid for 5 years"
            },
            {
                number: 66,
                title: "Equipment Property Transfer",
                description: "Equipment becomes Purchaser's property at whichever is earlier: (a) delivery to final destination, or (b) when Contractor paid value under GCC 16.1",
                source: "Amendment 5, Section IX GCC 14.11, page 6",
                citation: "Each item of Equipment shall...become the property of the Purchaser at whichever is the earlier of the following times"
            },
            {
                number: 67,
                title: "Shipping Notification Requirements",
                description: "For Goods from Abroad: Must notify Purchaser at least 14 days before arrival at site; notify about upfront shipping needs for pre-installation. For Goods from Indonesia: Must notify 14 days before arrival in Indonesia and at site",
                source: "Amendment 5, Section IX GCC 13.1, pages 6-7",
                citation: "The Supplier must notify the Purchaser about date and point of arrival of the Goods in Indonesia and at the site with at least fourteen (14) days before their arrival"
            },
            {
                number: 68,
                title: "Documentation Upon Delivery",
                description: "Required Documents:",
                requirements: [
                    "Original supplier's invoice",
                    "Original packing list",
                    "Original manufacturer's/supplier's warranty certificate",
                    "Original certificate(s) of origin",
                    "Original insurance certificate",
                    "Manufacturer's authorization (if applicable)",
                    "Inspection certificate (if applicable)",
                    "Consequence: If not received before delivery, Supplier responsible for consequent expenses"
                ],
                source: "Amendment 5, Section IX GCC 13.1, page 7",
                citation: "The above documents shall be received by the Purchaser before delivery of the Goods and, if not received, the Supplier will be responsible for any consequent expenses"
            },
            {
                number: 69,
                title: "Contract Price Adjustments",
                description: "Estimated effect of price adjustment provisions NOT taken into account in bid evaluation",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 34.3, page 35",
                citation: "The estimated effect of the price adjustment provisions of the Conditions of Contract, applied over the period of execution of the Contract, shall not be taken into account in Bid evaluation"
            },
            {
                number: 70,
                title: "Debriefing Rights",
                description: "Unsuccessful bidders entitled to debriefing from Purchaser explaining award decision",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 47, page 40",
                citation: "Process Details: Specified in ITB 47 with procedures for requesting debriefing"
            },
            {
                number: 71,
                title: "Procurement Related Complaints",
                description: "Procedures specified in BDS",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 50, page 42",
                citation: "The procedures for making a Procurement-related Complaint are as specified in the BDS"
            },
            {
                number: 72,
                title: "Abnormally Low Bids",
                description: "Purchaser may request clarification if bid appears abnormally low; bidder must demonstrate bid is responsive",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section I ITB 39, page 37",
                citation: "The Purchaser shall request the Bidder to demonstrate that the Bid price is not abnormally low by providing evidence that the price is responsive"
            },
            {
                number: 73,
                title: "Hazards, Alerts, and Recalls",
                description: "Bidder must provide notification system for hazards, alerts, and recalls",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section IV page 75; Excel files Tab 3",
                citation: "Hazards and Recalls - detailed notification procedures and responsibilities"
            },
            {
                number: 74,
                title: "Installation Activities Documentation",
                description: "Detailed description of work/services required for full delivery/commission including Supplier activities and Purchaser participation",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 97; Excel files Tab 2",
                citation: "Bidder must clearly describe work and/or Related Services required to achieve full delivery/commission of the equipment including detailed activities to be performed by the Supplier, and participation of the Purchaser thereon"
            },
            {
                number: 75,
                title: "Acceptance Certificate Timing",
                description: "Issued within 10 working days of receipt of goods at final destination; includes description of goods, quantity, unit and total prices",
                source: "Final_BD_Cathlab_11-03-24_as_issued.docx, Section VII page 102",
                citation: "The Acceptance Certificate shall be issued within 10 working days of receipt of the Goods or part of Goods at place of final destination"
            }
        ]
    },
    {
        id: "section-info-1",
        title: "Document Hierarchy & Amendments",
        description: "Amendment priority and document structure",
        badge: "Info",
        badgeColor: "gray",
        isInfoSection: true,
        rules: []
    },
    {
        id: "section-info-2",
        title: "Critical Notes",
        description: "Evaluation sequence and Excel file usage",
        badge: "Info",
        badgeColor: "gray",
        isInfoSection: true,
        rules: []
    }
];

// Info section content for Document Hierarchy & Amendments
export const documentHierarchyContent = `**Amendment Priority:** All amendments supersede the original bid document where conflicts exist

**Amendment 5 (issued 30-04-24) - Most Recent Updates:**
- Clarification request deadline: April 26, 2024
- Bid validity: October 15, 2024
- Bid submission deadline: May 30, 2024, 10:00 AM Jakarta Time
- Bid opening: May 30, 2024, 10:30 AM Jakarta Time (hybrid)
- Technical scoring updated (127 for Single Plane, 133 for Biplane)
- Delivery timeline reference: "from contract signing" (vs "from contract award")
- Consumables costing: "quantities specified in technical specifications" (vs "per 1,000 procedures")
- Functional guarantees: Submit in Excel spreadsheet
- Payment terms updated with detailed schedule
- Shipping notification requirements clarified
- Equipment property transfer timing specified

**Technical Specifications Files:**
- **Amendments 1-4:** Current technical requirements by lot
- **R6 Files:** Reference versions (superseded by Amendments 1-4)
- **5-Tab Structure (all files):**
  1. Main technical specs (mandatory & rated criteria)
  2. Installation activities
  3. Hazards and recalls
  4. Proposed consumables and price (5 years)
  5. Proposed post-warranty service (years 6-10)

**Key Documents:**
1. Final_BD_Cathlab_11-03-24_as_issued.docx (original, 150+ pages)
2. Amendment 5- Amendments_to_BD_Cathlab_issued_30-04-24 (1).docx (22 amendments)
3. Technical Specification Excel files (6 files, 5 tabs each)`;

// Info section content for Critical Notes
export const criticalNotesContent = `**Evaluation Sequence:**
1. Eligibility & Qualification (Pass/Fail)
2. Substantial Responsiveness (Pass/Fail)
3. Mandatory Technical Requirements (Pass/Fail)
4. Rated Technical Criteria (0-127/133 points)
5. Financial Evaluation (70% weight)
6. Combined Score Calculation
7. Most Advantageous Bid Determination

**Excel File Usage:**
- All technical specifications, scoring criteria, mandatory requirements, and rated criteria are contained in device-specific Excel files
- Bidders must complete all 5 tabs in relevant lot Excel file
- Green cells = mandatory (Pass/Fail)
- Orange cells = rated criteria (scored)
- White cells = information only

**Color-Coded Priority System:**
- **Section A (Critical Mandatory):** Miss any = automatic disqualification
- **Section B (High Priority):** Determines technical competitiveness (30% of total)
- **Section C (Important Operational):** Determines financial competitiveness (70% of total) and contract management

---

This comprehensive evaluation framework ensures thorough assessment of bidder capability, technical merit, financial competitiveness, and operational sustainability across all procurement dimensions.`;
