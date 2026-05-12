/**
 * Mock data for citizen endpoints not yet built by Person 2.
 * Matches the actual DB schema shapes from the SQL migrations.
 * Toggle USE_MOCK env var to switch between real and mock.
 */

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Delay helper to simulate network latency
export const mockDelay = (ms = 800) => new Promise(r => setTimeout(r, ms));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Classification {
  matterType: string;
  statute: string;
  userQuestion: string;
  involvesPolice: boolean;
  incidentDate?: string;
  location?: string;
}

export interface Citation {
  title: string;
  section?: string;
  url?: string;
  type: 'statute' | 'judgment' | 'rule';
}

export interface Matter {
  id: string;
  queryText: string;
  queryLanguage: 'en' | 'bn';
  classification: Classification;
  citations: Citation[];
  aiResponseEnglish: string;
  aiResponseBengali: string;
  disclaimer: string;
  status: 'session-owned' | 'user-owned' | 'archived';
  createdAt: string;
  expiresAt?: string;
  userId?: string;
}

export interface Advocate {
  id: string;
  userId: string;
  name: string;
  barEnrolmentNumber: string;
  stateBar: string;
  address: string;
  phone: string;
  email?: string;
  practiceAreas: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface Consultation {
  id: string;
  matterId: string;
  citizenId: string;
  advocateId: string;
  status: 'requested' | 'accepted' | 'declined' | 'closed';
  requestedAt: string;
  acceptedAt?: string;
}

export interface Message {
  id: string;
  consultationId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'approved' | 'pending' | 'flagged';
  createdAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_MATTER: Matter = {
  id: 'mock-matter-001',
  queryText: 'My landlord has locked me out of my house without notice and kept my belongings inside.',
  queryLanguage: 'en',
  classification: {
    matterType: 'Tenancy & Housing',
    statute: 'West Bengal Premises Tenancy Act, 1997',
    userQuestion: 'What are my rights when a landlord illegally evicts me?',
    involvesPolice: false,
    location: 'Kolkata, West Bengal',
  },
  citations: [
    {
      title: 'West Bengal Premises Tenancy Act, 1997',
      section: 'Section 17 — Protection against eviction',
      url: 'https://indiacode.nic.in',
      type: 'statute',
    },
    {
      title: 'Transfer of Property Act, 1882',
      section: 'Section 108(q) — Tenant rights',
      url: 'https://indiacode.nic.in',
      type: 'statute',
    },
    {
      title: 'Calcutta HC: Hari Mohan Das v. Bimal Kumar Roy (2019)',
      section: 'Illegal lockout — injunction granted',
      type: 'judgment',
    },
  ],
  aiResponseEnglish: `Based on your description, your landlord has committed an **illegal eviction**, which is prohibited under the West Bengal Premises Tenancy Act, 1997.

**Your Rights:**
1. **Immediate re-entry**: Under Section 17 of the WB Premises Tenancy Act, a landlord cannot evict a tenant without following due process (a court order). A lockout without notice is illegal.
2. **Injunction from court**: You can file for an emergency injunction in the Civil Court to be restored to possession immediately.
3. **Recovery of belongings**: Your landlord cannot hold your personal property. This may also constitute wrongful detention of property under Indian law.
4. **Police complaint**: You can file an FIR under Section 441 IPC (Criminal Trespass) and/or Section 447 IPC against your landlord.

**Recommended Steps:**
- Document everything: take photos/videos of the locked premises.
- Send a written legal notice (through an advocate) to the landlord demanding immediate access.
- Approach the Civil Court for an urgent injunction.
- File a police complaint simultaneously.

This situation is time-sensitive. A verified advocate can file for an emergency injunction within 24–48 hours.`,

  aiResponseBengali: `আপনার বিবরণ অনুযায়ী, আপনার বাড়িওয়ালা একটি **অবৈধ উচ্ছেদ** করেছেন, যা পশ্চিমবঙ্গ প্রেমাইসেস টেন্যান্সি অ্যাক্ট, ১৯৯৭-এর অধীনে নিষিদ্ধ।

**আপনার অধিকার:**
১. **তাৎক্ষণিক পুনঃপ্রবেশ**: WB টেন্যান্সি আইনের ধারা ১৭ অনুযায়ী, কোনো আদালতের আদেশ ছাড়া বাড়িওয়ালা ভাড়াটেকে উচ্ছেদ করতে পারবেন না। নোটিশ ছাড়া তালা দেওয়া বেআইনি।
২. **আদালত থেকে নিষেধাজ্ঞা**: আপনি দেওয়ানি আদালতে জরুরি নিষেধাজ্ঞার আবেদন করতে পারেন।
৩. **জিনিসপত্র ফেরত পাওয়া**: আপনার বাড়িওয়ালা আপনার ব্যক্তিগত সম্পত্তি আটকে রাখতে পারবেন না।
৪. **পুলিশে অভিযোগ**: আপনি ধারা ৪৪১ IPC (অপরাধমূলক অনধিকার প্রবেশ) এবং ধারা ৪৪৭ IPC-এর অধীনে FIR দায়ের করতে পারেন।

**প্রস্তাবিত পদক্ষেপ:**
- সব কিছু নথিভুক্ত করুন: তালা দেওয়া প্রাঙ্গণের ছবি/ভিডিও নিন।
- বাড়িওয়ালাকে আইনি নোটিশ পাঠান।
- জরুরি নিষেধাজ্ঞার জন্য দেওয়ানি আদালতে যান।
- একই সাথে পুলিশে অভিযোগ দায়ের করুন।

এই পরিস্থিতি সময়-সংবেদনশীল। একজন যাচাইকৃত আইনজীবী ২৪-৪৮ ঘণ্টার মধ্যে জরুরি নিষেধাজ্ঞার আবেদন করতে পারেন।`,

  disclaimer: 'This analysis is generated by an AI system and is for informational purposes only. It does not constitute legal advice and does not create an attorney-client relationship. Please consult a qualified advocate for advice specific to your situation.',
  status: 'session-owned',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const MOCK_ADVOCATES: Advocate[] = [
  {
    id: 'adv-001',
    userId: 'user-001',
    name: 'Anirban Sen',
    barEnrolmentNumber: 'WB/1234/2018',
    stateBar: 'West Bengal',
    address: '12, Park Street, Kolkata - 700016',
    phone: '+919876543210',
    email: 'anirban.sen@example.com',
    practiceAreas: ['tenancy', 'civil', 'property'],
    courts: ['Calcutta HC', 'City Civil Court'],
    languages: ['en', 'bn'],
    districts: ['kolkata', 'howrah'],
    verificationStatus: 'verified',
  },
  {
    id: 'adv-002',
    userId: 'user-002',
    name: 'Priya Chakraborty',
    barEnrolmentNumber: 'WB/5678/2015',
    stateBar: 'West Bengal',
    address: '45, Ballygunge Circular Road, Kolkata - 700019',
    phone: '+919876543211',
    practiceAreas: ['civil', 'consumer', 'family'],
    courts: ['Calcutta HC', 'Alipore District Court'],
    languages: ['bn', 'en', 'hi'],
    districts: ['kolkata', 'south-24-parganas'],
    verificationStatus: 'verified',
  },
  {
    id: 'adv-003',
    userId: 'user-003',
    name: 'Subhadeep Mitra',
    barEnrolmentNumber: 'WB/9012/2020',
    stateBar: 'West Bengal',
    address: 'Howrah Court Complex, Howrah - 711101',
    phone: '+919876543212',
    practiceAreas: ['tenancy', 'motor_vehicle', 'criminal'],
    courts: ['Howrah District Court', 'Calcutta HC'],
    languages: ['bn'],
    districts: ['howrah', 'hooghly'],
    verificationStatus: 'verified',
  },
];

export const MOCK_CONSULTATION: Consultation = {
  id: 'cons-001',
  matterId: 'mock-matter-001',
  citizenId: 'citizen-001',
  advocateId: 'adv-001',
  status: 'requested',
  requestedAt: new Date().toISOString(),
};

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-001',
    consultationId: 'cons-001',
    senderType: 'citizen',
    senderId: 'citizen-001',
    content: 'Hello, I need help with my tenancy matter.',
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'msg-002',
    consultationId: 'cons-001',
    senderType: 'advocate',
    senderId: 'adv-001',
    content: 'Hello! I have reviewed your matter. Please share any written communications you have received from your landlord.',
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 240000).toISOString(),
  },
];

export const MOCK_MATTERS: Matter[] = [
  {
    ...MOCK_MATTER,
    id: 'matter-saved-001',
    status: 'user-owned',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'matter-saved-002',
    queryText: 'My employer has not paid my salary for 3 months.',
    queryLanguage: 'en',
    classification: {
      matterType: 'Labour & Employment',
      statute: 'Payment of Wages Act, 1936',
      userQuestion: 'What can I do if my employer withholds salary?',
      involvesPolice: false,
      location: 'Howrah, West Bengal',
    },
    citations: [
      {
        title: 'Payment of Wages Act, 1936',
        section: 'Section 15 — Claims arising out of deductions',
        type: 'statute',
      },
    ],
    aiResponseEnglish: 'Under the Payment of Wages Act, 1936, your employer is legally obligated to pay wages on time...',
    aiResponseBengali: 'পেমেন্ট অব ওয়েজেস অ্যাক্ট, ১৯৩৬ অনুযায়ী, আপনার নিয়োগকর্তা সময়মতো বেতন দিতে বাধ্য...',
    disclaimer: 'This analysis is for informational purposes only.',
    status: 'user-owned',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
