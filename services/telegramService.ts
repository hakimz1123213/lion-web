// 📡 NoirWealth — Telegram Admin Alert System

const TELEGRAM_BOT_TOKEN = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
// 👈 هنا نحينا كلمة ADMIN باش يقرأ من ملف .env صح
const TELEGRAM_ADMIN_CHAT_ID = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID; 

export const sendTelegramAdminAlert = async (
  username: string,
  type: 'Deposit' | 'Withdrawal',
  amount: number,
  extraDetails?: string
) => {
  // تأمين الحماية: إذا كانت المتغيرات الأساسية غير موجودة لا تكمل
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.error("Telegram Admin Alert Error: Missing Token or Chat ID in environment variables.");
    return;
  }

  try {
    const emoji = type === 'Deposit' ? '📥' : '📤';
    const actionText = type === 'Deposit' ? 'إيداع شحن جديد' : 'طلب سحب أرباح';
    
    // 👑 ديزاين النص المنسق
    const message = 
`🚨 *MASTER COMMAND — LION* 🚨

${emoji} *نوع العملية:* ${actionText} (${type})
👤 *المستخدم:* \`${username}\`
💰 *المبلغ:* \`$${amount.toFixed(2)}\`
${extraDetails ? `📝 *تفاصيل إضافية:* \n\`${extraDetails}\`\n` : ''}⚡ *الحالة:* معلق في قائمة الانتظار (Pending)

🎮 _latchaaaaaaa boyyyyyyyyyyyy khoofffffff!_`;

    // ✉️ إرسال رسالة نصية فقط عبر JSON (بدون صور نهائياً)
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       console.warn("Telegram Send Failed:", errorData);
    }
    
  } catch (error) {
    console.error("Telegram Admin Alert Error: ", error);
  }
};