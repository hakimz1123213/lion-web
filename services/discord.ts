// ─── Noir Wealth — Discord Webhook Service ──────────────────────────────────
// Sends real-time alerts to segregated admin channels based on action node

// 💰 الروابط السحابية الحصينة الموزعة حسب القنوات
const DEPOSIT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1500083325803692122/lUGEHNf-Au1pPecgmQrKuox01chfxFxRctGwfDUs2wcMCmVz-XJCtVUZUVJy85cb3j36';
const WITHDRAW_WEBHOOK_URL = 'https://discord.com/api/webhooks/1511670423006478421/SgjnUz4ricoL8cFVXxrC2zsoJPAdNDOCLR-X020Z7_CSm1eu6KBOKpf2Q0fBtPkPJB7i';

interface DepositAlertPayload {
  username: string;
  userId: string;
  amount: number;
  txid: string; // 🔥 حقل الـ TXID لتوثيق المعاملة الرقمية
  timestamp: number;
}

export interface WithdrawalAlertPayload {
  username: string;
  amount: number;
  address: string;
  userId?: string;  
  vipLevel?: number;
  balance?: number;
  timestamp?: number;
}

interface VIPUpgradeAlertPayload {
  username: string;
  userId: string;
  previousLevel: number;
  newLevel: number;
  entryFee: number;
  dailyPayoutMin: number;
  dailyPayoutMax: number;
  newBalance: number;
  timestamp: number;
}

function formatTime(ts?: number): string {
  return new Date(ts || Date.now()).toUTCString();
}

const VIP_COLORS: Record<number, number> = {
  1: 0x8b8b8b,
  2: 0x4a9ee8,
  3: 0xc9a84c,
  4: 0xe05252,
  5: 0x9b59b6,
};

// ─── 1️⃣ دالة تنبيه الإيداع (قناة deposit) ──────────────────────────────────
export async function sendDepositAlert(payload: DepositAlertPayload): Promise<void> {
  if (!DEPOSIT_WEBHOOK_URL || DEPOSIT_WEBHOOK_URL.length < 20) return;
  const body: any = {
    username: 'LION Monitor',
    avatar_url: 'https://i.imgur.com/G2hWYfv.jpeg',
    embeds: [
      {
        title: '💰 New Deposit Request',
        color: 0x4a9ee8,
        fields: [
          { name: 'User', value: `**${payload.username}** (\`${payload.userId}\`)`, inline: true },
          { name: 'Amount', value: `**$${payload.amount.toFixed(2)} USDT**`, inline: true },
          { name: 'Status', value: '🟡 Pending Approval', inline: true },
          { name: 'Transaction TXID (BEP20)', value: `\`${payload.txid}\``, inline: false }, // حقل النص المضمون من بايننس
          { name: 'Submitted At', value: formatTime(payload.timestamp), inline: false },
        ],
        footer: { text: 'LION Admin System' },
        timestamp: new Date(payload.timestamp).toISOString(),
      },
    ],
  };

  try {
    await fetch(DEPOSIT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { console.warn('[Discord] Deposit alert failed:', e); }
}

// ─── 2️⃣ دالة تنبيه السحب الموزعة (قناة withdarw) ──────────────────────────
export async function sendWithdrawalAlert(payload: WithdrawalAlertPayload): Promise<void> {
  if (!WITHDRAW_WEBHOOK_URL || WITHDRAW_WEBHOOK_URL.length < 20) return;

  const ts = payload.timestamp || Date.now();
  const body = {
    username: 'LION Monitor',
    avatar_url: 'https://i.imgur.com/G2hWYfv.jpeg',
    embeds: [
      {
        title: '🏦 New Withdrawal Request',
        color: 0xe05252,
        fields: [
          { name: 'User', value: `**${payload.username}**`, inline: true },
          { name: 'Amount', value: `**$${payload.amount.toFixed(2)} USDT**`, inline: true },
          { name: 'Status', value: '🔴 Pending Admin Review', inline: true },
          { name: 'Wallet Address (BEP20)', value: `\`${payload.address}\``, inline: false },
          { name: 'Submitted At', value: formatTime(ts), inline: false },
        ],
        footer: { text: 'LION Admin System' },
        timestamp: new Date(ts).toISOString(),
      },
    ],
  };

  try {
    await fetch(WITHDRAW_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { console.warn('[Discord] Withdrawal alert failed:', e); }
}

// ─── 3️⃣ دالة تنبيه الترقية (ملحقة بقناة deposit للتأكيد المالي) ───────────────
export async function sendVIPUpgradeAlert(payload: VIPUpgradeAlertPayload): Promise<void> {
  if (!DEPOSIT_WEBHOOK_URL || DEPOSIT_WEBHOOK_URL.length < 20) return;
  const prevLabel = payload.previousLevel > 0 ? `VIP ${payload.previousLevel}` : 'No VIP';
  const newLabel = `VIP ${payload.newLevel}`;
  const color = VIP_COLORS[payload.newLevel] ?? 0xc9a84c;

  const body = {
    username: 'LION Monitor',
    avatar_url: 'https://i.imgur.com/G2hWYfv.jpeg',
    embeds: [
      {
        title: `💎 VIP Upgrade — ${newLabel}`,
        color,
        fields: [
          { name: 'User', value: `**${payload.username}** (\`${payload.userId}\`)`, inline: true },
          { name: 'Upgrade', value: `${prevLabel} → **${newLabel}**`, inline: true },
          { name: 'Fee Paid', value: `**$${payload.entryFee.toFixed(2)} USDT**`, inline: true },
          { name: 'New Daily Earnings', value: `$${payload.dailyPayoutMin} – $${payload.dailyPayoutMax} / day`, inline: false },
        ],
        footer: { text: 'LION Admin System' },
        timestamp: new Date(payload.timestamp).toISOString(),
      },
    ],
  };

  try {
    await fetch(DEPOSIT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { console.warn('[Discord] VIP Upgrade alert failed:', e); }
}