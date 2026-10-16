import { crmDepotById } from '@/features/depots/data/crm';
import { salesReps } from '@/features/planning/data/demo-data';

export interface DepotContactPerson {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  telegram?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface DepotDocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: 'image' | 'pdf';
  category: 'storefront' | 'interior' | 'owner_id' | 'patent_tax' | 'moc_cert' | 'bank_statement';
  uploadedAt: string;
  status: 'verified' | 'pending' | 'required' | 'rejected';
  previewUrl?: string;
  thumbnailUrl?: string;
  description: string;
}

export interface ApprovalChainStep {
  step: number;
  title: string;
  actor: string;
  role: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  timestamp?: string;
  remarks?: string;
}

export interface DepotApprovalDetail {
  id: string;
  code: string;
  previousCode?: string;
  name: string;
  khmerName: string;
  legalName: string;
  type: 'Depot (BP)' | 'Non-BP Depot';
  status: 'pending' | 'approved' | 'rejected';
  canTrade: boolean;

  // Identity & Registration
  industry: string;
  segment: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Standard';
  category: string;
  taxId: string;
  registrationNo: string;
  sapBpNumber: string;
  sapSyncStatus: 'Pending Initial Sync' | 'Synced' | 'Failed';
  yearEstablished: string;
  businessClassification: string;

  // Sales & Commercial Information
  salesOrg: string;
  distributionChannel: string;
  division: string;
  salesTerritory: string;
  creditLimit: number;
  proposedCreditLimit: number;
  paymentTerms: string;
  creditTermDays: number;
  creditRiskRating: 'Low Risk (A-)' | 'Moderate Risk (B+)' | 'High Risk (C)';
  creditScore: number;
  assignedRep: {
    id: string;
    employeeId: string;
    name: string;
    team: string;
    phone: string;
    email: string;
    avatarInitials: string;
  };
  projectedMonthlyRevenue: number;
  projectedAnnualRevenue: number;
  targetProductLines: string[];

  // Contact Information
  primaryContact: {
    name: string;
    title: string;
    phone: string;
    alternativePhone?: string;
    email: string;
    telegram: string;
    website?: string;
  };
  operatingHours: string;
  deliveryReceivingHours: string;
  contacts: DepotContactPerson[];

  // Address & Location
  address: {
    houseNo: string;
    street: string;
    village: string;
    commune: string;
    district: string;
    province: string;
    postalCode: string;
    country: string;
    formatted: string;
    latitude: number;
    longitude: number;
  };
  siteAccessNotes: {
    roadCondition: string;
    truckAccessibility: string;
    equipmentOnSite: string;
    deliveryGateRemarks: string;
  };

  // Documents & Attachments
  documents: DepotDocumentItem[];
  missingDocumentsCount: number;

  // Workflow & Audit
  submittedBy: string;
  submittedByRole: string;
  submittedDate: Date;
  submissionChannel: string;
  slaDeadline: string;
  approvalChain: ApprovalChainStep[];
}

export const DEPOT_APPROVAL_DATABASE: Record<string, DepotApprovalDetail> = {
  'REQ-D-8821': {
    id: 'REQ-D-8821',
    code: 'DPT-8821',
    previousCode: 'KH-SR-0082',
    name: 'Sokha Building Materials',
    khmerName: 'ដេប៉ូ សុខា សម្ភារៈសំណង់',
    legalName: 'Sokha Construction Supply Co., Ltd',
    type: 'Depot (BP)',
    status: 'pending',
    canTrade: false,

    // Identity & Registration
    industry: 'Building Materials Retail & Wholesale',
    segment: 'Key Account - Tier 1 Enterprise',
    tier: 'Platinum',
    category: 'Authorized Steel & Roofing Depot',
    taxId: 'K009-902188219',
    registrationNo: 'MoC-00049281/2021',
    sapBpNumber: 'BP-1008821',
    sapSyncStatus: 'Pending Initial Sync',
    yearEstablished: '2018',
    businessClassification: 'Wholesale Depot & Project Supplier',

    // Sales & Commercial Information
    salesOrg: 'ISI Steel Co., Ltd',
    distributionChannel: 'Authorized Depot Network',
    division: 'Retail & Commercial Construction',
    salesTerritory: 'North-West Region (Siem Reap Zone 1)',
    creditLimit: 50000,
    proposedCreditLimit: 50000,
    paymentTerms: 'Net 30 Days',
    creditTermDays: 30,
    creditRiskRating: 'Low Risk (A-)',
    creditScore: 88,
    assignedRep: {
      id: 'rep-1',
      employeeId: 'REP-104',
      name: 'Chandy Neat',
      team: 'Team Alpha (North-West)',
      phone: '+855 12 890 123',
      email: 'chandy.neat@isisteel.com.kh',
      avatarInitials: 'CN',
    },
    projectedMonthlyRevenue: 38500,
    projectedAnnualRevenue: 462000,
    targetProductLines: [
      'Deformed Bar SD390 / SD490 (10mm, 12mm, 16mm, 20mm)',
      'Zinc & Color Roofing Sheets (INP / Mega Roof 0.35 - 0.45mm)',
      'Galvanized Hollow Pipes & Square Tubes (1" to 4")',
      'Structural C-Purlin & Z-Purlin',
      'Wire Rod 6mm & Binding Wire',
    ],

    // Contact Information
    primaryContact: {
      name: 'Mr. Sokha Chan',
      title: 'Managing Director & Founder',
      phone: '+855 12 345 678',
      alternativePhone: '+855 63 963 888',
      email: 'sokha.materials@gmail.com',
      telegram: '@sokha_materials',
      website: 'www.sokhamb.com.kh',
    },
    operatingHours: '07:30 AM - 05:30 PM (Mon - Sat)',
    deliveryReceivingHours: '08:00 AM - 04:00 PM (Direct forklift unloading)',
    contacts: [
      {
        id: 'c-1',
        name: 'Mr. Sokha Chan',
        role: 'Managing Director & Legal Owner',
        phone: '+855 12 345 678',
        email: 'sokha.materials@gmail.com',
        telegram: '@sokha_chan',
        isPrimary: true,
        notes: 'Final decision maker on credit terms and procurement agreements',
      },
      {
        id: 'c-2',
        name: 'Mrs. Bopha Sokha',
        role: 'Chief Financial Officer / Co-Owner',
        phone: '+855 12 345 679',
        email: 'finance@sokhamb.com.kh',
        telegram: '@bopha_fin',
        isPrimary: false,
        notes: 'Authorizes payments, reconciles monthly statements',
      },
      {
        id: 'c-3',
        name: 'Mr. Rithy Nou',
        role: 'Procurement & Purchasing Manager',
        phone: '+855 93 456 123',
        email: 'purchasing@sokhamb.com.kh',
        telegram: '@rithy_procurement',
        isPrimary: false,
        notes: 'Issues daily replenishment POs and quotation requests',
      },
      {
        id: 'c-4',
        name: 'Mr. Vibol Pich',
        role: 'Warehouse & Logistics Foreman',
        phone: '+855 88 765 4321',
        email: 'logistics@sokhamb.com.kh',
        telegram: '@vibol_yard',
        isPrimary: false,
        notes: 'Inspects delivery quality, manages on-site unloading team',
      },
    ],

    // Address & Location
    address: {
      houseNo: '#123-125',
      street: 'Sivutha Blvd & Ring Road',
      village: 'Phum Mondul 1',
      commune: 'Sangkat Svay Dangkum',
      district: 'Krong Siem Reap',
      province: 'Siem Reap Province',
      postalCode: '17252',
      country: 'Cambodia',
      formatted: '#123-125, Sivutha Blvd, Phum Mondul 1, Sangkat Svay Dangkum, Krong Siem Reap, Siem Reap Province, Cambodia',
      latitude: 13.3633,
      longitude: 103.8564,
    },
    siteAccessNotes: {
      roadCondition: 'Paved 4-lane asphalt boulevard with 15m street frontage',
      truckAccessibility: 'Accessible for 40ft semi-trailers & 10-wheel flatbed trucks (No municipal restriction)',
      equipmentOnSite: '3.5-Ton Toyota Forklift & 5-Ton Overhead Gantry Crane in Yard Bay 2',
      deliveryGateRemarks: 'Wide 8m commercial gate on East Sivutha Blvd. Notify Mr. Vibol 30 mins prior to arrival.',
    },

    // Documents & Attachments
    documents: [
      {
        id: 'doc-1',
        title: 'Storefront Facade & Signboard',
        fileName: 'Storefront_Official_Signboard.jpg',
        fileSize: '3.2 MB',
        fileType: 'image',
        category: 'storefront',
        uploadedAt: 'Sep 17, 2026 10:15',
        status: 'verified',
        description: 'Exterior storefront showing official ISI STEEL co-branding signage and main entrance.',
      },
      {
        id: 'doc-2',
        title: 'Warehouse & Storage Yard',
        fileName: 'Warehouse_Yard_Interior.jpg',
        fileSize: '4.1 MB',
        fileType: 'image',
        category: 'interior',
        uploadedAt: 'Sep 17, 2026 10:18',
        status: 'verified',
        description: 'Covered warehouse bay showing rebar staging racks, roofing sheet bays, and forklift aisle.',
      },
      {
        id: 'doc-3',
        title: 'Owner Cambodian National ID (Front & Back)',
        fileName: 'National_ID_Sokha_Chan.pdf',
        fileSize: '1.8 MB',
        fileType: 'pdf',
        category: 'owner_id',
        uploadedAt: 'Sep 17, 2026 10:22',
        status: 'verified',
        description: 'Valid national identity card of legal entity representative Mr. Sokha Chan (Expires 2031).',
      },
      {
        id: 'doc-4',
        title: 'Patent Tax Certificate (GDT)',
        fileName: 'Patent_Tax_Certificate_2026.pdf',
        fileSize: '2.4 MB',
        fileType: 'pdf',
        category: 'patent_tax',
        uploadedAt: 'Sep 17, 2026 10:25',
        status: 'verified',
        description: 'General Department of Taxation stamped patent tax receipt for current assessment year.',
      },
      {
        id: 'doc-5',
        title: 'Ministry of Commerce (MoC) Registration',
        fileName: 'MoC_Registration_Certificate.pdf',
        fileSize: '2.9 MB',
        fileType: 'pdf',
        category: 'moc_cert',
        uploadedAt: 'Sep 17, 2026 10:28',
        status: 'verified',
        description: 'Official single-member private limited company certificate issued by Ministry of Commerce.',
      },
      {
        id: 'doc-6',
        title: 'Bank Account Reference & Liquidity Letter',
        fileName: 'Bank_Statement_ABA_6Months.pdf',
        fileSize: '3.5 MB',
        fileType: 'pdf',
        category: 'bank_statement',
        uploadedAt: 'Sep 17, 2026 10:30',
        status: 'verified',
        description: '6-month operating cash flow statement showing healthy average balance exceeding $85,000.',
      },
    ],
    missingDocumentsCount: 0,

    // Workflow & Audit
    submittedBy: 'Chandy Neat (Sales Rep · ID: REP-104)',
    submittedByRole: 'Field Sales Representative',
    submittedDate: new Date(2026, 8, 17, 11, 20),
    submissionChannel: 'ISI Sales 360 Handset v2.4.1 (Samsung Galaxy Tab Active4 Pro)',
    slaDeadline: 'Sep 18, 2026 11:20 (16 hrs remaining)',
    approvalChain: [
      {
        step: 1,
        title: 'Field Verification & Shop Survey',
        actor: 'Chandy Neat (REP-104)',
        role: 'Field Sales Representative',
        status: 'completed',
        timestamp: 'Sep 17, 2026 11:20 AM',
        remarks: 'Physical site inspected. High-volume location with verified warehouse capacity. Recommended limit: $50,000.',
      },
      {
        step: 2,
        title: 'Regional Territory Review',
        actor: 'Seng Davi (RSM-02)',
        role: 'Regional Sales Manager (North-West)',
        status: 'completed',
        timestamp: 'Sep 17, 2026 02:45 PM',
        remarks: 'Strategic partner depot to expand Siem Reap provincial penetration. Endorsed Net 30 terms.',
      },
      {
        step: 3,
        title: 'Credit Risk & Finance Assessment',
        actor: 'Credit Risk Committee',
        role: 'Finance & Risk Control Department',
        status: 'in_progress',
        timestamp: 'Pending Review',
        remarks: 'Reviewing GDT tax filings and bank reference letter. Ready for committee vote.',
      },
      {
        step: 4,
        title: 'SAP ERP Account Provisioning',
        actor: 'SAP Auto-Integration Engine',
        role: 'Enterprise Systems Gateway',
        status: 'pending',
        remarks: 'Will generate SAP Business Partner #1008821 and unlock quotation workflow once approved.',
      },
    ],
  },

  'REQ-D-8820': {
    id: 'REQ-D-8820',
    code: 'DPT-8820',
    previousCode: 'KH-BTB-0044',
    name: 'Chea Sambath Iron Works',
    khmerName: 'ដេប៉ូ ជា សម្បត្តិ ដែកថែប',
    legalName: 'Chea Sambath Metal & Construction Co., Ltd',
    type: 'Non-BP Depot',
    status: 'pending',
    canTrade: false,

    industry: 'Metal Fabrication & Building Retail',
    segment: 'Mid-market Commercial',
    tier: 'Gold',
    category: 'Independent Steel Outlet',
    taxId: 'K002-110928374',
    registrationNo: 'MoC-00031829/2020',
    sapBpNumber: 'BP-1008820',
    sapSyncStatus: 'Pending Initial Sync',
    yearEstablished: '2019',
    businessClassification: 'Retail Outlet & Light Fabricator',

    salesOrg: 'ISI Steel Co., Ltd',
    distributionChannel: 'Non-BP Independent Trade',
    division: 'Retail & Fabrication Supply',
    salesTerritory: 'North-West Region (Battambang Zone 2)',
    creditLimit: 25000,
    proposedCreditLimit: 25000,
    paymentTerms: 'Net 15 Days',
    creditTermDays: 15,
    creditRiskRating: 'Moderate Risk (B+)',
    creditScore: 76,
    assignedRep: {
      id: 'rep-2',
      employeeId: 'REP-108',
      name: 'Vannak Ouk',
      team: 'Team Beta (Battambang)',
      phone: '+855 93 456 789',
      email: 'vannak.ouk@isisteel.com.kh',
      avatarInitials: 'VO',
    },
    projectedMonthlyRevenue: 22000,
    projectedAnnualRevenue: 264000,
    targetProductLines: [
      'Galvanized Hollow Pipes (1.2mm, 1.4mm)',
      'Equal Angles & Flat Bars',
      'Corrugated Roofing Sheets (0.30mm - 0.40mm)',
      'C-Channel 100x50',
    ],

    primaryContact: {
      name: 'Mr. Sambath Chea',
      title: 'Proprietor & General Manager',
      phone: '+855 93 456 789',
      alternativePhone: '+855 53 730 111',
      email: 'sambath.ironworks@gmail.com',
      telegram: '@cheasambath_iron',
      website: 'www.cheasambath.com.kh',
    },
    operatingHours: '07:00 AM - 05:00 PM (Mon - Sat)',
    deliveryReceivingHours: '07:30 AM - 04:30 PM',
    contacts: [
      {
        id: 'c-201',
        name: 'Mr. Sambath Chea',
        role: 'Sole Proprietor & Owner',
        phone: '+855 93 456 789',
        email: 'sambath.ironworks@gmail.com',
        telegram: '@cheasambath_iron',
        isPrimary: true,
        notes: 'Key decision maker for stock purchase and credit decisions',
      },
      {
        id: 'c-202',
        name: 'Ms. Sreymom Chea',
        role: 'Store Manager & Bookkeeper',
        phone: '+855 93 456 790',
        email: 'accounts@cheasambath.com.kh',
        telegram: '@sreymom_chea',
        isPrimary: false,
        notes: 'Oversees shop floor and handles invoicing',
      },
    ],

    address: {
      houseNo: '#88',
      street: 'Street 106 & Riverfront Road',
      village: 'Phum Romchek 4',
      commune: 'Sangkat Ratanak',
      district: 'Krong Battambang',
      province: 'Battambang Province',
      postalCode: '02353',
      country: 'Cambodia',
      formatted: '#88, Street 106, Phum Romchek 4, Sangkat Ratanak, Krong Battambang, Battambang Province, Cambodia',
      latitude: 13.0957,
      longitude: 103.2022,
    },
    siteAccessNotes: {
      roadCondition: 'Good concrete road, 10m width',
      truckAccessibility: 'Medium rigid truck and 10-wheel flatbeds accessible. 40ft containers require early morning delivery.',
      equipmentOnSite: 'Manual gantry hoist (2-ton) and manual pallet jacks',
      deliveryGateRemarks: 'Front driveway entrance directly from Street 106.',
    },

    documents: [
      {
        id: 'doc-21',
        title: 'Storefront Facade Photo',
        fileName: 'Shopfront_Battambang.jpg',
        fileSize: '2.8 MB',
        fileType: 'image',
        category: 'storefront',
        uploadedAt: 'Sep 17, 2026 08:30',
        status: 'verified',
        description: 'Street view of Chea Sambath workshop and retail display.',
      },
      {
        id: 'doc-22',
        title: 'Storage Yard Photo',
        fileName: 'Yard_Stock.jpg',
        fileSize: '3.1 MB',
        fileType: 'image',
        category: 'interior',
        uploadedAt: 'Sep 17, 2026 08:32',
        status: 'verified',
        description: 'Yard inventory storage for pipes and steel angle.',
      },
      {
        id: 'doc-23',
        title: 'National ID Card',
        fileName: 'ID_Chea_Sambath.pdf',
        fileSize: '1.5 MB',
        fileType: 'pdf',
        category: 'owner_id',
        uploadedAt: 'Sep 17, 2026 08:35',
        status: 'verified',
        description: 'National identity card of Mr. Sambath Chea.',
      },
      {
        id: 'doc-24',
        title: 'Patent Tax Document',
        fileName: 'Patent_Tax_2026.pdf',
        fileSize: '2.1 MB',
        fileType: 'pdf',
        category: 'patent_tax',
        uploadedAt: 'Sep 17, 2026 08:40',
        status: 'verified',
        description: 'Current year provincial patent tax certificate.',
      },
    ],
    missingDocumentsCount: 0,

    submittedBy: 'Vannak Ouk (Sales Rep · ID: REP-108)',
    submittedByRole: 'Field Sales Representative',
    submittedDate: new Date(2026, 8, 17, 9, 0),
    submissionChannel: 'ISI Sales 360 Handset v2.4.1',
    slaDeadline: 'Sep 18, 2026 09:00 (14 hrs remaining)',
    approvalChain: [
      {
        step: 1,
        title: 'Field Verification & Survey',
        actor: 'Vannak Ouk (REP-108)',
        role: 'Field Sales Representative',
        status: 'completed',
        timestamp: 'Sep 17, 2026 09:00 AM',
        remarks: 'Shop visited and credit background verified with local trade partners.',
      },
      {
        step: 2,
        title: 'Regional Territory Review',
        actor: 'Seng Davi (RSM-02)',
        role: 'Regional Sales Manager',
        status: 'completed',
        timestamp: 'Sep 17, 2026 11:15 AM',
        remarks: 'Approved for Non-BP Depot terms with 15 days credit limit.',
      },
      {
        step: 3,
        title: 'Credit Risk Review',
        actor: 'Credit Committee',
        role: 'Risk Management',
        status: 'in_progress',
        timestamp: 'In Progress',
        remarks: 'Evaluating initial $25,000 threshold.',
      },
      {
        step: 4,
        title: 'SAP Integration',
        actor: 'Automated Gateway',
        role: 'Enterprise Sync',
        status: 'pending',
        remarks: 'Awaiting credit authorization.',
      },
    ],
  },

  'REQ-D-8819': {
    id: 'REQ-D-8819',
    code: 'DPT-8819',
    previousCode: 'KH-PP-0012',
    name: 'Phnom Penh Central Steel',
    khmerName: 'ដេប៉ូ ភ្នំពេញ សេនត្រល់ ស្ទីល',
    legalName: 'Phnom Penh Central Steel Distribution Co., Ltd',
    type: 'Depot (BP)',
    status: 'pending',
    canTrade: false,

    industry: 'Heavy Structural Steel & Distribution',
    segment: 'Enterprise Wholesale',
    tier: 'Platinum',
    category: 'Master Regional Distributor',
    taxId: 'K001-382910482',
    registrationNo: 'MoC-00062819/2017',
    sapBpNumber: 'BP-1008819',
    sapSyncStatus: 'Pending Initial Sync',
    yearEstablished: '2017',
    businessClassification: 'Regional Hub & Project Distributor',

    salesOrg: 'ISI Steel Co., Ltd',
    distributionChannel: 'Authorized Depot Network',
    division: 'Wholesale & Infrastructure Distribution',
    salesTerritory: 'Central Capital Region (Phnom Penh West)',
    creditLimit: 100000,
    proposedCreditLimit: 100000,
    paymentTerms: 'Net 45 Days',
    creditTermDays: 45,
    creditRiskRating: 'Low Risk (A-)',
    creditScore: 92,
    assignedRep: {
      id: 'rep-1',
      employeeId: 'REP-104',
      name: 'Chandy Neat',
      team: 'Team Alpha (Central)',
      phone: '+855 12 890 123',
      email: 'chandy.neat@isisteel.com.kh',
      avatarInitials: 'CN',
    },
    projectedMonthlyRevenue: 95000,
    projectedAnnualRevenue: 1140000,
    targetProductLines: [
      'Full ISI Roofing Portfolio (INP, Mega Roof, PU Foam)',
      'Structural Wide Flange Beams & H-Beams',
      'Deformed Bar High Tensile SD490 (12mm to 32mm)',
      'ERW Galvanized Steel Pipes & Tubes',
    ],

    primaryContact: {
      name: 'Mrs. Somaly Ly',
      title: 'Chief Executive Officer & Shareholder',
      phone: '+855 11 222 333',
      alternativePhone: '+855 23 888 999',
      email: 'somaly.ly@ppcentralsteel.com',
      telegram: '@centralsteel_pp',
      website: 'www.ppcentralsteel.com.kh',
    },
    operatingHours: '07:30 AM - 06:00 PM (Mon - Sat)',
    deliveryReceivingHours: '07:00 AM - 05:00 PM (Crane unloading available)',
    contacts: [
      {
        id: 'c-301',
        name: 'Mrs. Somaly Ly',
        role: 'CEO & Principal Owner',
        phone: '+855 11 222 333',
        email: 'somaly.ly@ppcentralsteel.com',
        telegram: '@centralsteel_pp',
        isPrimary: true,
        notes: 'Direct contact for contract execution and corporate guarantees',
      },
      {
        id: 'c-302',
        name: 'Mr. Bunthoeun Kem',
        role: 'General Operations Director',
        phone: '+855 12 777 888',
        email: 'ops@ppcentralsteel.com',
        telegram: '@bunthoeun_kem',
        isPrimary: false,
        notes: 'Manages multi-depot fleet and yard operations',
      },
    ],

    address: {
      houseNo: '#500',
      street: 'Russian Confederation Blvd (St 110)',
      village: 'Phum Prey Tea 2',
      commune: 'Sangkat Kakab 1',
      district: 'Khan Pou Senchey',
      province: 'Phnom Penh Capital',
      postalCode: '120908',
      country: 'Cambodia',
      formatted: '#500, Russian Confederation Blvd, Phum Prey Tea 2, Sangkat Kakab 1, Khan Pou Senchey, Phnom Penh Capital, Cambodia',
      latitude: 11.5564,
      longitude: 104.8582,
    },
    siteAccessNotes: {
      roadCondition: 'Prime arterial boulevard with dedicated turning bay',
      truckAccessibility: 'Full container terminal access, 50-ton weighbridge on premise',
      equipmentOnSite: 'Two 7-ton Toyota forklifts and twin 10-ton overhead gantry cranes',
      deliveryGateRemarks: 'Main freight entrance at Gate B. Security check required.',
    },

    documents: [
      {
        id: 'doc-31',
        title: 'Storefront & Showroom Facade',
        fileName: 'PP_Central_Showroom.jpg',
        fileSize: '4.5 MB',
        fileType: 'image',
        category: 'storefront',
        uploadedAt: 'Sep 16, 2026 14:10',
        status: 'verified',
        description: 'Large commercial facade with full product showcase display.',
      },
      {
        id: 'doc-32',
        title: 'Yard & Crane Logistics Bay',
        fileName: 'PP_Central_Yard.jpg',
        fileSize: '5.2 MB',
        fileType: 'image',
        category: 'interior',
        uploadedAt: 'Sep 16, 2026 14:15',
        status: 'verified',
        description: 'Enclosed 4,000 sqm warehouse with twin gantry crane bays.',
      },
      {
        id: 'doc-33',
        title: 'Passport & National ID',
        fileName: 'Passport_Somaly_Ly.pdf',
        fileSize: '2.2 MB',
        fileType: 'pdf',
        category: 'owner_id',
        uploadedAt: 'Sep 16, 2026 14:20',
        status: 'verified',
        description: 'Valid passport and Cambodian National ID of Mrs. Somaly Ly.',
      },
      {
        id: 'doc-34',
        title: 'Patent Tax & Large Taxpayer Certificate',
        fileName: 'Patent_Large_Taxpayer_2026.pdf',
        fileSize: '3.1 MB',
        fileType: 'pdf',
        category: 'patent_tax',
        uploadedAt: 'Sep 16, 2026 14:25',
        status: 'verified',
        description: 'Gold-status tax compliance certificate from GDT Department of Large Taxpayers.',
      },
      {
        id: 'doc-35',
        title: 'MoC Certificate of Incorporation',
        fileName: 'MoC_Certificate_Incorporation.pdf',
        fileSize: '3.4 MB',
        fileType: 'pdf',
        category: 'moc_cert',
        uploadedAt: 'Sep 16, 2026 14:30',
        status: 'verified',
        description: 'Corporate business registry certificate with $500,000 registered capital.',
      },
      {
        id: 'doc-36',
        title: 'Audited Financial Statements (2025)',
        fileName: 'Audited_Financials_2025.pdf',
        fileSize: '6.8 MB',
        fileType: 'pdf',
        category: 'bank_statement',
        uploadedAt: 'Sep 16, 2026 14:35',
        status: 'verified',
        description: 'Full independent auditor report showing top-tier balance sheet strength.',
      },
    ],
    missingDocumentsCount: 0,

    submittedBy: 'Chandy Neat (Sales Rep · ID: REP-104)',
    submittedByRole: 'Senior Key Account Representative',
    submittedDate: new Date(2026, 8, 16, 15, 45),
    submissionChannel: 'ISI Sales 360 Handset v2.4.1',
    slaDeadline: 'Sep 17, 2026 15:45 (Completed preliminary gate)',
    approvalChain: [
      {
        step: 1,
        title: 'Field Audit & Financial Dossier',
        actor: 'Chandy Neat (REP-104)',
        role: 'Senior Key Account Rep',
        status: 'completed',
        timestamp: 'Sep 16, 2026 03:45 PM',
        remarks: 'Full dossier compiled. Top-tier regional partner.',
      },
      {
        step: 2,
        title: 'Commercial Director Endorsement',
        actor: 'Heng Piseth (VP-Sales)',
        role: 'Commercial Vice President',
        status: 'completed',
        timestamp: 'Sep 17, 2026 09:30 AM',
        remarks: 'Approved for VIP credit bracket with $100,000 initial limit.',
      },
      {
        step: 3,
        title: 'Credit Risk Committee Vote',
        actor: 'Executive Credit Board',
        role: 'Credit Risk & Legal',
        status: 'in_progress',
        timestamp: 'Current Agenda',
        remarks: 'Under final committee review.',
      },
      {
        step: 4,
        title: 'SAP BP Auto-Provisioning',
        actor: 'ERP Integration Gateway',
        role: 'System',
        status: 'pending',
        remarks: 'Pre-configured mapping ready for immediate publish.',
      },
    ],
  },

  'REQ-D-8818': {
    id: 'REQ-D-8818',
    code: 'DPT-8818',
    previousCode: 'KH-KPT-0021',
    name: 'Kampot Coastal Supply',
    khmerName: 'ដេប៉ូ កំពត ខូសស្តល សឹបផ្លាយ',
    legalName: 'Kampot Coastal Building Materials Enterprise',
    type: 'Non-BP Depot',
    status: 'approved',
    canTrade: true,

    industry: 'Coastal & Maritime Building Supply',
    segment: 'Small & Medium Retail',
    tier: 'Silver',
    category: 'Coastal Retail Outlet',
    taxId: 'K005-772910481',
    registrationNo: 'MoC-00019284/2022',
    sapBpNumber: 'BP-1008818',
    sapSyncStatus: 'Synced',
    yearEstablished: '2021',
    businessClassification: 'Retail Outlet & Contractor Supply',

    salesOrg: 'ISI Steel Co., Ltd',
    distributionChannel: 'Non-BP Independent Trade',
    division: 'Retail Sales',
    salesTerritory: 'Southern Coastal Region (Kampot)',
    creditLimit: 15000,
    proposedCreditLimit: 15000,
    paymentTerms: 'Net 15 Days',
    creditTermDays: 15,
    creditRiskRating: 'Low Risk (A-)',
    creditScore: 82,
    assignedRep: {
      id: 'rep-3',
      employeeId: 'REP-112',
      name: 'Sokha Rith',
      team: 'Team Charlie (South Coastal)',
      phone: '+855 77 888 999',
      email: 'sokha.rith@isisteel.com.kh',
      avatarInitials: 'SR',
    },
    projectedMonthlyRevenue: 18000,
    projectedAnnualRevenue: 216000,
    targetProductLines: [
      'Corrosion-Resistant Zinc Roofing (Alu-Zinc AZ150)',
      'Galvanized Square Tubes (20x20 to 50x50)',
      'SD390 Deformed Bar 12mm & 16mm',
    ],

    primaryContact: {
      name: 'Mr. Rithy Heng',
      title: 'Store Owner & Operator',
      phone: '+855 77 888 999',
      alternativePhone: '+855 33 932 444',
      email: 'kampot.coastal@gmail.com',
      telegram: '@kampot_coastal',
      website: 'www.kampotcoastal.com.kh',
    },
    operatingHours: '07:00 AM - 05:30 PM (Mon - Sat)',
    deliveryReceivingHours: '08:00 AM - 04:30 PM',
    contacts: [
      {
        id: 'c-401',
        name: 'Mr. Rithy Heng',
        role: 'Store Owner',
        phone: '+855 77 888 999',
        email: 'kampot.coastal@gmail.com',
        telegram: '@kampot_coastal',
        isPrimary: true,
        notes: 'Primary point of contact',
      },
    ],

    address: {
      houseNo: '#42',
      street: 'National Road 3',
      village: 'Phum Kampong Bay Khang Tboung',
      commune: 'Sangkat Kampong Bay',
      district: 'Krong Kampot',
      province: 'Kampot Province',
      postalCode: '07252',
      country: 'Cambodia',
      formatted: '#42, National Road 3, Phum Kampong Bay Khang Tboung, Sangkat Kampong Bay, Krong Kampot, Kampot Province, Cambodia',
      latitude: 10.6094,
      longitude: 104.1818,
    },
    siteAccessNotes: {
      roadCondition: 'National highway frontage, paved asphalt',
      truckAccessibility: 'Accessible for 10-wheel flatbed delivery trucks',
      equipmentOnSite: 'Forklift rental nearby, manual loading ramps on site',
      deliveryGateRemarks: 'Front yard parking bay along National Road 3.',
    },

    documents: [
      {
        id: 'doc-41',
        title: 'Storefront Photo',
        fileName: 'Kampot_Storefront.jpg',
        fileSize: '2.5 MB',
        fileType: 'image',
        category: 'storefront',
        uploadedAt: 'Sep 16, 2026 13:45',
        status: 'verified',
        description: 'Front road-facing retail shop and parking bay.',
      },
      {
        id: 'doc-42',
        title: 'Owner ID Card',
        fileName: 'ID_Rithy_Heng.pdf',
        fileSize: '1.4 MB',
        fileType: 'pdf',
        category: 'owner_id',
        uploadedAt: 'Sep 16, 2026 13:50',
        status: 'verified',
        description: 'National identity document of Mr. Rithy Heng.',
      },
      {
        id: 'doc-43',
        title: 'Patent Tax Receipt',
        fileName: 'Patent_Tax_Receipt.pdf',
        fileSize: '1.9 MB',
        fileType: 'pdf',
        category: 'patent_tax',
        uploadedAt: 'Sep 16, 2026 13:55',
        status: 'verified',
        description: 'Verified patent tax payment receipt for Kampot Province.',
      },
    ],
    missingDocumentsCount: 0,

    submittedBy: 'Sokha Rith (Sales Rep · ID: REP-112)',
    submittedByRole: 'Field Sales Representative',
    submittedDate: new Date(2026, 8, 16, 14, 10),
    submissionChannel: 'ISI Sales 360 Handset v2.4.1',
    slaDeadline: 'Approved within SLA window',
    approvalChain: [
      {
        step: 1,
        title: 'Field Verification',
        actor: 'Sokha Rith (REP-112)',
        role: 'Field Sales Representative',
        status: 'completed',
        timestamp: 'Sep 16, 2026 02:10 PM',
        remarks: 'Verified local market reputation.',
      },
      {
        step: 2,
        title: 'Regional Approval',
        actor: 'Seng Davi (RSM-02)',
        role: 'Regional Sales Manager',
        status: 'completed',
        timestamp: 'Sep 16, 2026 04:30 PM',
        remarks: 'Approved.',
      },
      {
        step: 3,
        title: 'Credit Authorization',
        actor: 'Finance Committee',
        role: 'Credit Risk',
        status: 'completed',
        timestamp: 'Sep 16, 2026 05:15 PM',
        remarks: 'Final approval granted for $15,000 credit limit.',
      },
      {
        step: 4,
        title: 'SAP Integration Complete',
        actor: 'SAP Gateway',
        role: 'ERP System',
        status: 'completed',
        timestamp: 'Sep 16, 2026 05:20 PM',
        remarks: 'Account active and open for trading.',
      },
    ],
  },
};

/**
 * Resolves a depot detail record by any ID:
 * 1. Specific request match (`REQ-D-8821`, etc.)
 * 2. Lookup in CRM repository (`cust-1` ... `cust-200`)
 * 3. Dynamic realistic fallback for any arbitrary ID
 */
export function getDepotApprovalDetail(id: string): DepotApprovalDetail {
  if (DEPOT_APPROVAL_DATABASE[id]) {
    return DEPOT_APPROVAL_DATABASE[id];
  }

  // Check CRM customer
  const crm = crmDepotById[id];
  if (crm) {
    const rep = salesReps.find((r) => r.id === crm.repId) ?? salesReps[0];
    return {
      id: crm.id,
      code: crm.code,
      previousCode: `OLD-${crm.code}`,
      name: crm.name,
      khmerName: `ដេប៉ូ ${crm.name}`,
      legalName: `${crm.name} Co., Ltd`,
      type: crm.type === 'Depot' ? 'Depot (BP)' : 'Non-BP Depot',
      status: 'pending',
      canTrade: false,

      industry: crm.industry || 'Building Materials Distribution',
      segment: crm.segment || 'Mid-market Commercial',
      tier: crm.tier || 'Gold',
      category: crm.category || 'Authorized Depot Partner',
      taxId: `K009-${crm.registrationNo.replace(/\D/g, '').slice(0, 9) || '881239102'}`,
      registrationNo: crm.registrationNo || 'MoC-00049281/2022',
      sapBpNumber: `BP-${crm.code.replace(/\D/g, '') || '901823'}`,
      sapSyncStatus: 'Pending Initial Sync',
      yearEstablished: '2019',
      businessClassification: 'Wholesale & Retail Depot',

      salesOrg: crm.salesOrg || 'ISI Steel Co., Ltd',
      distributionChannel: 'Authorized Depot Network',
      division: crm.division || 'Retail & Construction',
      salesTerritory: `${crm.province} Territory`,
      creditLimit: crm.creditLimit || 50000,
      proposedCreditLimit: crm.creditLimit || 50000,
      paymentTerms: crm.paymentTerms || 'Net 30 Days',
      creditTermDays: 30,
      creditRiskRating: crm.creditStatus === 'Good Standing' ? 'Low Risk (A-)' : 'Moderate Risk (B+)',
      creditScore: 85,
      assignedRep: {
        id: rep.id,
        employeeId: rep.employeeId,
        name: rep.name,
        team: rep.team,
        phone: rep.phone,
        email: `${rep.name.toLowerCase().replace(/\s+/g, '.')}@isisteel.com.kh`,
        avatarInitials: rep.initials,
      },
      projectedMonthlyRevenue: crm.monthlyRevenue || 35000,
      projectedAnnualRevenue: crm.salesValue || 420000,
      targetProductLines: [
        'INP Zinc & Color Roofing Sheets (0.35 - 0.45mm)',
        'SD390 High Tensile Deformed Bar (10mm - 25mm)',
        'Galvanized Square & Rectangular Hollow Pipes',
        'Structural C-Purlin and Z-Purlin',
      ],

      primaryContact: {
        name: crm.contactPerson || 'Store Proprietor',
        title: 'Managing Director',
        phone: crm.phone,
        alternativePhone: '+855 23 999 111',
        email: crm.email,
        telegram: `@${crm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        website: crm.website,
      },
      operatingHours: crm.workingHours || '07:30 AM - 05:30 PM (Mon - Sat)',
      deliveryReceivingHours: '08:00 AM - 04:00 PM',
      contacts: [
        {
          id: 'c-dyn-1',
          name: crm.contactPerson || 'Store Proprietor',
          role: 'Managing Director & Legal Owner',
          phone: crm.phone,
          email: crm.email,
          telegram: `@${crm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          isPrimary: true,
          notes: 'Principal contact on record',
        },
      ],

      address: {
        houseNo: '#108',
        street: crm.address || 'National Highway 4',
        village: 'Phum Phsar',
        commune: 'Sangkat Kakab',
        district: crm.district || 'Krong',
        province: crm.province,
        postalCode: '120801',
        country: 'Cambodia',
        formatted: `${crm.address}, ${crm.district}, ${crm.province}, Cambodia`,
        latitude: crm.lat || 11.5564,
        longitude: crm.lng || 104.9282,
      },
      siteAccessNotes: {
        roadCondition: 'Paved wide concrete road with commercial truck access',
        truckAccessibility: 'Suitable for 40ft container semi-trailers & flatbed trucks',
        equipmentOnSite: '3-Ton Toyota Forklift on premises',
        deliveryGateRemarks: 'Main entrance along primary access road.',
      },

      documents: [
        {
          id: 'doc-dyn-1',
          title: 'Storefront Facade & Signage',
          fileName: 'Storefront_Signboard.jpg',
          fileSize: '3.1 MB',
          fileType: 'image',
          category: 'storefront',
          uploadedAt: 'Sep 17, 2026 10:15',
          status: 'verified',
          description: 'Official storefront photo showing street frontage.',
        },
        {
          id: 'doc-dyn-2',
          title: 'Owner Cambodian National ID Card',
          fileName: 'Owner_National_ID.pdf',
          fileSize: '1.8 MB',
          fileType: 'pdf',
          category: 'owner_id',
          uploadedAt: 'Sep 17, 2026 10:20',
          status: 'verified',
          description: 'Government issued national identity card of legal owner.',
        },
        {
          id: 'doc-dyn-3',
          title: 'Patent Tax Certificate (GDT)',
          fileName: 'Patent_Tax_Certificate_2026.pdf',
          fileSize: '2.4 MB',
          fileType: 'pdf',
          category: 'patent_tax',
          uploadedAt: 'Sep 17, 2026 10:25',
          status: 'verified',
          description: 'Valid general department of taxation patent certificate.',
        },
      ],
      missingDocumentsCount: 0,

      submittedBy: `${rep.name} (${rep.employeeId})`,
      submittedByRole: 'Field Sales Representative',
      submittedDate: new Date(2026, 8, 17, 11, 20),
      submissionChannel: 'ISI Sales 360 Handset v2.4.1',
      slaDeadline: 'Within 24-Hour Approval SLA',
      approvalChain: [
        {
          step: 1,
          title: 'Field Verification Survey',
          actor: `${rep.name} (${rep.employeeId})`,
          role: 'Field Sales Representative',
          status: 'completed',
          timestamp: 'Sep 17, 2026 11:20 AM',
          remarks: 'Depot surveyed and identity verified on site.',
        },
        {
          step: 2,
          title: 'Regional Manager Review',
          actor: 'Regional Sales Manager',
          role: 'RSM Office',
          status: 'completed',
          timestamp: 'Sep 17, 2026 02:30 PM',
          remarks: 'Endorsed for credit committee approval.',
        },
        {
          step: 3,
          title: 'Credit Committee Decision',
          actor: 'Credit Risk Department',
          role: 'Credit Committee',
          status: 'in_progress',
          timestamp: 'Pending Review',
          remarks: 'Evaluating submitted paperwork and financial standing.',
        },
        {
          step: 4,
          title: 'SAP Synchronization',
          actor: 'Automated Gateway',
          role: 'ERP System',
          status: 'pending',
          remarks: 'Queued for SAP master data sync once approved.',
        },
      ],
    };
  }

  // Dynamic fallback for any ID
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  return {
    id: id,
    code: `DEP-${cleanId.slice(0, 4) || '9000'}`,
    previousCode: `OLD-${cleanId.slice(0, 4) || '9000'}`,
    name: 'Phnom Penh Steel & Building Materials',
    khmerName: 'ដេប៉ូ ភ្នំពេញ ស្ទីល សម្ភារៈសំណង់',
    legalName: 'Phnom Penh Steel & Construction Co., Ltd',
    type: 'Depot (BP)',
    status: 'pending',
    canTrade: false,

    industry: 'Building Materials Retail & Wholesale',
    segment: 'Key Account - Tier 1 Enterprise',
    tier: 'Platinum',
    category: 'Authorized Steel & Roofing Depot',
    taxId: 'K009-881239011',
    registrationNo: 'MoC-00049281/2021',
    sapBpNumber: 'BP-1008821',
    sapSyncStatus: 'Pending Initial Sync',
    yearEstablished: '2019',
    businessClassification: 'Wholesale Depot & Project Supplier',

    salesOrg: 'ISI Steel Co., Ltd',
    distributionChannel: 'Authorized Depot Network',
    division: 'Retail & Commercial Construction',
    salesTerritory: 'Central Capital Region (Phnom Penh)',
    creditLimit: 50000,
    proposedCreditLimit: 50000,
    paymentTerms: 'Net 30 Days',
    creditTermDays: 30,
    creditRiskRating: 'Low Risk (A-)',
    creditScore: 88,
    assignedRep: {
      id: 'rep-1',
      employeeId: 'REP-104',
      name: 'Chandy Neat',
      team: 'Team Alpha (Central)',
      phone: '+855 12 890 123',
      email: 'chandy.neat@isisteel.com.kh',
      avatarInitials: 'CN',
    },
    projectedMonthlyRevenue: 38500,
    projectedAnnualRevenue: 462000,
    targetProductLines: [
      'Deformed Bar SD390 / SD490 (10mm, 12mm, 16mm, 20mm)',
      'Zinc & Color Roofing Sheets (INP / Mega Roof 0.35 - 0.45mm)',
      'Galvanized Hollow Pipes & Square Tubes (1" to 4")',
      'Structural C-Purlin & Z-Purlin',
    ],

    primaryContact: {
      name: 'Mr. Sokha Chan',
      title: 'Managing Director & Founder',
      phone: '+855 12 345 678',
      alternativePhone: '+855 23 963 888',
      email: 'sokha.materials@gmail.com',
      telegram: '@sokha_materials',
      website: 'www.sokhamb.com.kh',
    },
    operatingHours: '07:30 AM - 05:30 PM (Mon - Sat)',
    deliveryReceivingHours: '08:00 AM - 04:00 PM',
    contacts: [
      {
        id: 'c-f-1',
        name: 'Mr. Sokha Chan',
        role: 'Managing Director & Legal Owner',
        phone: '+855 12 345 678',
        email: 'sokha.materials@gmail.com',
        telegram: '@sokha_chan',
        isPrimary: true,
        notes: 'Final decision maker on credit terms and procurement agreements',
      },
      {
        id: 'c-f-2',
        name: 'Mrs. Bopha Sokha',
        role: 'Chief Financial Officer / Co-Owner',
        phone: '+855 12 345 679',
        email: 'finance@sokhamb.com.kh',
        telegram: '@bopha_fin',
        isPrimary: false,
        notes: 'Authorizes payments, reconciles monthly statements',
      },
    ],

    address: {
      houseNo: '#123-125',
      street: 'Street 271 (Sowannaphum Blvd)',
      village: 'Phum Trea 1',
      commune: 'Sangkat Stueng Mean Chey 1',
      district: 'Khan Mean Chey',
      province: 'Phnom Penh Capital',
      postalCode: '120601',
      country: 'Cambodia',
      formatted: '#123-125, Street 271, Phum Trea 1, Sangkat Stueng Mean Chey 1, Khan Mean Chey, Phnom Penh Capital, Cambodia',
      latitude: 11.536842,
      longitude: 104.894215,
    },
    siteAccessNotes: {
      roadCondition: 'Paved 4-lane asphalt boulevard with 15m street frontage',
      truckAccessibility: 'Accessible for 40ft semi-trailers & 10-wheel flatbed trucks',
      equipmentOnSite: '3.5-Ton Toyota Forklift on premises',
      deliveryGateRemarks: 'Main gate on Street 271.',
    },

    documents: [
      {
        id: 'doc-f-1',
        title: 'Storefront Facade & Signboard',
        fileName: 'Storefront_Signboard.jpg',
        fileSize: '3.2 MB',
        fileType: 'image',
        category: 'storefront',
        uploadedAt: 'Sep 17, 2026 10:15',
        status: 'verified',
        description: 'Exterior storefront showing official ISI STEEL co-branding signage and main entrance.',
      },
      {
        id: 'doc-f-2',
        title: 'Warehouse & Storage Yard',
        fileName: 'Warehouse_Yard_Interior.jpg',
        fileSize: '4.1 MB',
        fileType: 'image',
        category: 'interior',
        uploadedAt: 'Sep 17, 2026 10:18',
        status: 'verified',
        description: 'Covered warehouse bay showing rebar staging racks, roofing sheet bays, and forklift aisle.',
      },
      {
        id: 'doc-f-3',
        title: 'Owner Cambodian National ID (Front & Back)',
        fileName: 'National_ID_Owner.pdf',
        fileSize: '1.8 MB',
        fileType: 'pdf',
        category: 'owner_id',
        uploadedAt: 'Sep 17, 2026 10:22',
        status: 'verified',
        description: 'Valid national identity card of legal entity representative.',
      },
      {
        id: 'doc-f-4',
        title: 'Patent Tax Certificate (GDT)',
        fileName: 'Patent_Tax_Certificate_2026.pdf',
        fileSize: '2.4 MB',
        fileType: 'pdf',
        category: 'patent_tax',
        uploadedAt: 'Sep 17, 2026 10:25',
        status: 'verified',
        description: 'General Department of Taxation stamped patent tax receipt for current assessment year.',
      },
    ],
    missingDocumentsCount: 0,

    submittedBy: 'Chandy Neat (Sales Rep · ID: REP-104)',
    submittedByRole: 'Field Sales Representative',
    submittedDate: new Date(2026, 8, 17, 11, 20),
    submissionChannel: 'ISI Sales 360 Handset v2.4.1',
    slaDeadline: 'Sep 18, 2026 11:20 (16 hrs remaining)',
    approvalChain: [
      {
        step: 1,
        title: 'Field Verification & Shop Survey',
        actor: 'Chandy Neat (REP-104)',
        role: 'Field Sales Representative',
        status: 'completed',
        timestamp: 'Sep 17, 2026 11:20 AM',
        remarks: 'Physical site inspected. High-volume location with verified warehouse capacity.',
      },
      {
        step: 2,
        title: 'Regional Territory Review',
        actor: 'Regional Sales Manager',
        role: 'RSM Office',
        status: 'completed',
        timestamp: 'Sep 17, 2026 02:45 PM',
        remarks: 'Strategic partner depot. Endorsed Net 30 terms.',
      },
      {
        step: 3,
        title: 'Credit Risk & Finance Assessment',
        actor: 'Credit Risk Committee',
        role: 'Finance & Risk Control Department',
        status: 'in_progress',
        timestamp: 'Pending Review',
        remarks: 'Reviewing GDT tax filings and bank reference letter.',
      },
      {
        step: 4,
        title: 'SAP ERP Account Provisioning',
        actor: 'SAP Auto-Integration Engine',
        role: 'Enterprise Systems Gateway',
        status: 'pending',
        remarks: 'Will generate SAP Business Partner account once approved.',
      },
    ],
  };
}
