import { salesReps } from '@/features/planning/data/demo-data';
import { createPersistentStore } from '@/services/mock';
import type { NonBpDepot, NonBpDepotStatus } from '../repositories/non-bp-types';

/**
 * NON-BP prospects for the static prototype: shops a representative captured in the
 * field that SAP has never issued a business partner number for.
 */

type Seed = [
  name: string,
  contact: string,
  phone: string,
  address: string,
  city: string,
  district: string,
  province: string,
  lat: number,
  lng: number,
  outletType: string,
  targetProduct: string,
  potential: number,
  status: NonBpDepotStatus,
  daysAgo: number,
];

const SEEDS: Seed[] = [
  ['Srey Pov Hardware', 'Mrs. Srey Pov', '+855 12 418 220', '#18, St. 598', 'Phnom Penh', 'Russey Keo', 'Phnom Penh', 11.6043, 104.9012, 'Hardware Shop', 'Deformed bar 10–12mm', 6500, 'Pending', 1],
  ['Chhay Leng Steel Corner', 'Mr. Chhay Leng', '+855 92 610 731', 'National Road 1, km 9', 'Phnom Penh', 'Chbar Ampov', 'Phnom Penh', 11.5292, 104.9606, 'Steel Shop', 'Zinc roofing sheet', 9000, 'Pending', 1],
  ['Kien Svay Building Point', 'Mr. Sothea Prak', '+855 17 335 902', 'National Road 1, Kien Svay', 'Kien Svay', 'Kien Svay', 'Kandal', 11.4957, 105.0061, 'Retail Shop', 'Color roofing sheet', 4800, 'Pending', 2],
  ['Bakong Village Supply', 'Ms. Sokunthea Mao', '+855 15 772 004', 'Road 6, Bakong market', 'Prasat Bakong', 'Prasat Bakong', 'Siem Reap', 13.3392, 103.9752, 'Hardware Shop', 'C purlin', 3200, 'Pending', 2],
  ['Odongk Rebar Stop', 'Mr. Vanna Ros', '+855 88 940 115', 'National Road 5, Odongk', 'Odongk', 'Odongk', 'Kampong Speu', 11.7935, 104.7423, 'Steel Shop', 'Deformed bar 16mm', 7200, 'Pending', 3],
  ['Thma Koul Agro & Hardware', 'Mr. Bunthoeun Seng', '+855 12 207 486', 'Road 5, Thma Koul', 'Thma Koul', 'Thma Koul', 'Battambang', 13.2802, 103.0917, 'Outlet', 'Binding wire', 2600, 'Pending', 3],
  ['Tuol Kork Fittings', 'Mrs. Chenda Ly', '+855 10 553 671', '#77, St. 289', 'Phnom Penh', 'Tuol Kork', 'Phnom Penh', 11.5742, 104.8994, 'Retail Shop', 'Galvanized square tube', 5400, 'Pending', 4],
  ['Ponhea Leu Construction Mart', 'Mr. Kimhong Tan', '+855 97 418 330', 'National Road 5, Ponhea Leu', 'Ponhea Leu', 'Ponhea Leu', 'Kandal', 11.7302, 104.8481, 'Hardware Shop', 'Zinc roofing sheet', 8300, 'Pending', 5],
  ['Sotr Nikum Roofing', 'Mr. Phalla Chhim', '+855 16 330 908', 'National Road 6, Sotr Nikum', 'Sotr Nikum', 'Sotr Nikum', 'Siem Reap', 13.3131, 104.0904, 'Retail Shop', 'Color roofing sheet', 4100, 'Pending', 6],
  ['Pou Senchey Pipe Centre', 'Mr. Rotha Nhem', '+855 89 220 517', 'Veng Sreng Blvd', 'Phnom Penh', 'Pou Senchey', 'Phnom Penh', 11.5308, 104.8401, 'Steel Shop', 'Steel pipe 2"', 11500, 'Approved', 7],
  ['Samraong Tong Builders', 'Mrs. Kanha Yin', '+855 12 870 360', 'National Road 4', 'Samraong Tong', 'Samraong Tong', 'Kampong Speu', 11.5418, 104.5562, 'Hardware Shop', 'Deformed bar 12mm', 5900, 'Approved', 8],
  ['Banan Steel & Cement', 'Mr. Socheat Dy', '+855 77 104 662', 'Road 155, Banan', 'Banan', 'Banan', 'Battambang', 12.9729, 103.1462, 'Steel Shop', 'Wire rod 6mm', 13800, 'Approved', 9],
  ['Mean Chey Hardware Plus', 'Ms. Davy Keo', '+855 15 908 213', '#210, Chbar Ampov Rd', 'Phnom Penh', 'Mean Chey', 'Phnom Penh', 11.5321, 104.9298, 'Hardware Shop', 'C purlin', 6200, 'Approved', 10],
  ['Kandal Stung Depot Shop', 'Mr. Sopheak Chan', '+855 93 615 744', 'National Road 2', 'Kandal Stung', 'Kandal Stung', 'Kandal', 11.3711, 104.8692, 'Outlet', 'Binding wire', 1800, 'Rejected', 11],
  ['Puok Market Iron', 'Mr. Narin Ouch', '+855 12 951 238', 'Puok market, Road 6', 'Puok', 'Puok', 'Siem Reap', 13.4467, 103.7614, 'Steel Shop', 'Deformed bar 10mm', 2400, 'Rejected', 13],
  ['Moung Ruessei Hardware', 'Mrs. Sreyneang Hor', '+855 16 602 377', 'National Road 5', 'Moung Ruessei', 'Moung Ruessei', 'Battambang', 12.7756, 103.4466, 'Hardware Shop', 'Zinc roofing sheet', 3900, 'Converted', 15],
  ['Chroy Changvar Steel Yard', 'Mr. Heng Sovann', '+855 11 845 920', 'National Road 6A', 'Phnom Penh', 'Chroy Changvar', 'Phnom Penh', 11.5987, 104.9373, 'Steel Shop', 'Deformed bar 20mm', 16000, 'Converted', 18],
  ['Dangkao Roofing Corner', 'Ms. Malis Sun', '+855 87 330 641', 'National Road 3, Dangkao', 'Phnom Penh', 'Dangkao', 'Phnom Penh', 11.4987, 104.8471, 'Retail Shop', 'Color roofing sheet', 4700, 'Pending', 1],
  ['Kong Pisei Steel House', 'Mr. Ratanak Pich', '+855 12 116 873', 'Road 51, Kong Pisei', 'Kong Pisei', 'Kong Pisei', 'Kampong Speu', 11.3367, 104.6402, 'Steel Shop', 'Galvanized square tube', 3600, 'Pending', 4],
  ['Saang Riverside Hardware', 'Mrs. Sothy Lach', '+855 96 220 485', 'Road 21, Saang', 'Saang', 'Saang', 'Kandal', 11.3955, 105.0127, 'Hardware Shop', 'Deformed bar 12mm', 5100, 'Pending', 5],
  ['Sangkae Builders Stop', 'Mr. Sambo Nget', '+855 70 885 109', 'Road 5, Sangkae', 'Sangkae', 'Sangkae', 'Battambang', 13.1371, 103.2603, 'Outlet', 'Steel pipe 2"', 2900, 'Pending', 6],
  ['Angkor Chum Supply', 'Mr. Pheakdey Rin', '+855 10 437 561', 'Road 66', 'Angkor Chum', 'Angkor Chum', 'Siem Reap', 13.6834, 103.6421, 'Hardware Shop', 'Zinc roofing sheet', 3300, 'Pending', 9],
  ['Daun Penh Fasteners', 'Ms. Bopha Seang', '+855 12 309 784', '#14, St. 130', 'Phnom Penh', 'Daun Penh', 'Phnom Penh', 11.5703, 104.9215, 'Retail Shop', 'Binding wire', 2100, 'Pending', 12],
  ['Phnom Sruoch Rebar Mart', 'Mr. Chanra Kong', '+855 97 650 238', 'National Road 4', 'Phnom Sruoch', 'Phnom Sruoch', 'Kampong Speu', 11.4171, 104.3196, 'Steel Shop', 'Deformed bar 16mm', 6800, 'Approved', 14],
];

const TERRITORY: Record<string, string> = {
  'Phnom Penh': 'PP',
  Kandal: 'KD',
  'Siem Reap': 'SR',
  Battambang: 'BB',
  'Kampong Speu': 'KS',
};

function seedProspects(): NonBpDepot[] {
  const base = Date.UTC(2026, 8, 20, 9, 0);
  return SEEDS.map((s, i) => {
    const [name, contact, phone, address, city, district, province, lat, lng, outletType, targetProduct, potential, status, daysAgo] = s;
    const reps = salesReps.filter((r) => r.province === province);
    const rep = reps[i % Math.max(1, reps.length)] ?? salesReps[i % salesReps.length];
    const createdAt = new Date(base - daysAgo * 86_400_000 - (i % 6) * 3_600_000).toISOString();
    const decidedAt = new Date(base - Math.max(0, daysAgo - 1) * 86_400_000).toISOString();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return {
      id: `NBP-${String(4100 + i)}`,
      name,
      code: null,
      phone,
      email: i % 3 === 0 ? `${slug.slice(0, 14)}@gmail.com` : null,
      contactPerson: contact,
      addressLine1: address,
      city,
      district,
      province,
      latitude: lat,
      longitude: lng,
      description:
        i % 2 === 0
          ? 'Buys from a competitor depot today; owner asked for ISI pricing on the next visit.'
          : 'New shop on a busy road; stocks cement and small hardware, no long steel yet.',
      outletType,
      targetProduct,
      estimatedPotential: potential,
      status,
      createdBySalesRepId: rep.id,
      territoryCode: `${TERRITORY[province] ?? 'KH'}-${String((i % 4) + 1).padStart(2, '0')}`,
      servingCustomerId: null,
      approvedBy: status === 'Approved' || status === 'Converted' ? 'Sok Dara (Area Sales Manager)' : null,
      approvedAt: status === 'Approved' || status === 'Converted' ? decidedAt : null,
      rejectedBy: status === 'Rejected' ? 'Sok Dara (Area Sales Manager)' : null,
      rejectedAt: status === 'Rejected' ? decidedAt : null,
      rejectionReason:
        status === 'Rejected' ? 'Inside an existing depot’s delivery radius; serve it through that depot instead.' : null,
      convertedCustomerId: null,
      convertedAt: status === 'Converted' ? decidedAt : null,
      createdAt,
    } satisfies NonBpDepot;
  });
}

export const nonBpStore = createPersistentStore<NonBpDepot[]>('depots.non-bp', seedProspects);
