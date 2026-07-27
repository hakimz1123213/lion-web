// Noir Wealth — Business Configuration

// ─── Super Admin ─────────────────────────────────────────────────────────────
// Super Admin status is granted exclusively based on UID matching.
export const SUPER_ADMIN_UID = 'jec4njRnjSO5ZQfqz1h4X2jAqla2'; 

export function isSuperAdmin(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return uid === SUPER_ADMIN_UID;
}

// Admin USDT BEP20 wallet address for deposits
export const ADMIN_USDT_ADDRESS = '0xd30bc656b044b477f6aab63c450e2015aee62cfd';

export interface VIPTier {
  level: number;
  label: string;
  entryFee: number;
  dailyPayoutMin: number;
  dailyPayoutMax: number;
  durationDays: number;
  color: string;
}

// المستوى المجاني الافتراضي (VIP 0)
export const VIP_0_TIER: VIPTier = {
  level: 0,
  label: 'Free Member',
  entryFee: 0,
  dailyPayoutMin: 0,
  dailyPayoutMax: 0,
  durationDays: 0,
  color: '#666666',
};

export const VIP_TIERS: VIPTier[] = [
  {
    level: 1,
    label: 'VIP 1 Elite',
    entryFee: 70,
    dailyPayoutMin: 2.20,
    dailyPayoutMax: 2.20,
    durationDays: 35,
    color: '#9e9e9e', // برونزي خافت فخم
  },
  {
    level: 2,
    label: 'VIP 2 Pro',
    entryFee: 150,
    dailyPayoutMin: 4.20,
    dailyPayoutMax: 4.20,
    durationDays: 30,
    color: '#D4AF37', // ذهبي ملوكي
  },
  {
    level: 3,
    label: 'VIP 3 Master',
    entryFee: 300,
    dailyPayoutMin: 8.5,
    dailyPayoutMax: 8.5,
    durationDays: 30,
    color: '#00EAFF', // سيان مضيء
  },
  {
    level: 4,
    label: 'VIP 4 Royal',
    entryFee: 500,
    dailyPayoutMin: 12.4,
    dailyPayoutMax: 12.4,
    durationDays: 30,
    color: '#a020f0', // بنفسجي ملكي
  },
  {
    level: 5,
    label: 'VIP 5 Legend',
    entryFee: 800,
    dailyPayoutMin: 23.30,
    dailyPayoutMax: 23.30,
    durationDays: 30,
    color: '#ff4d4d', // أحمر ناري
  },
  {
    level: 6,
    label: 'VIP 6 Grand Master',
    entryFee: 1400,
    dailyPayoutMin: 33.33,
    dailyPayoutMax: 33.33,
    durationDays: 30,
    color: '#0011fd', // أزرق ملكي مشع
  },
  {
    level: 7,
    label: 'VIP 7 Supreme',
    entryFee: 2400,
    dailyPayoutMin: 56.5,
    dailyPayoutMax: 56.5,
    durationDays: 30,
    color: '#ff8800', // برتقالي نيون فخم
  },
  {
    level: 8,
    label: 'VIP 8 Apex',
    entryFee: 4100,
    dailyPayoutMin: 96.5,
    dailyPayoutMax: 96.5,
    durationDays: 30,
    color: '#00ff40', // أخضر زمردي نيون
  }
];

export const TASK_TOTAL = 10; // ads/videos per day
export const VIDEO_DURATION_SECONDS = 16; // simulated video length
export const WITHDRAWAL_MIN = 10; // minimum withdrawal amount

// ✅ دالة مصلحة: تُرجع المستوى 0 إذا كان المستخدم غير مشترك
export function getVIPTier(level: number): VIPTier {
  if (!level || level <= 0) return VIP_0_TIER;
  return VIP_TIERS.find((t) => t.level === level) ?? VIP_0_TIER;
}

export function generateReferralCode(username: string): string {
  const suffix = Math.floor(Math.random() * 90000 + 10000).toString();
  return `NOIR-${username.slice(0, 3).toUpperCase()}-${suffix}`;
}

export function randomPayout(tier: VIPTier): number {
  const range = tier.dailyPayoutMax - tier.dailyPayoutMin;
  const raw = tier.dailyPayoutMin + Math.random() * range;
  return Math.round(raw * 100) / 100;
}

export function isNewDay(lastTimestamp: number | null): boolean {
  if (!lastTimestamp) return true;
  const last = new Date(lastTimestamp);
  const now = new Date();
  return (
    last.getUTCDate() !== now.getUTCDate() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCFullYear() !== now.getUTCFullYear()
  );
}