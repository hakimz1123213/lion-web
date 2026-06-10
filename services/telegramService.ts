// 📡 NoirWealth — Telegram Admin Alert System

const TELEGRAM_BOT_TOKEN = "8834944638:AAGo6PmusQMbhsTfdjsrPESuL0KFS3rFD48"; 
const TELEGRAM_ADMIN_CHAT_ID = "8753035799"; 

export const sendTelegramAdminAlert = async (
  username: string,
  type: 'Deposit' | 'Withdrawal',
  amount: number,
  extraDetails?: string,
  imageUri?: string
) => {
  try {
    const emoji = type === 'Deposit' ? '📥' : '📤';
    const actionText = type === 'Deposit' ? 'إيداع شحن جديد' : 'طلب سحب أرباح';
    
    // 👑 ديزاين النص المنسق
    const message = 
`🚨 *MASTER COMMAND — NoirWealth* 🚨

${emoji} *نوع العملية:* ${actionText} (${type})
👤 *المستخدم:* \`${username}\`
💰 *المبلغ:* \`$${amount.toFixed(2)}\`
${extraDetails ? `📝 *تفاصيل إضافية:* \`${extraDetails}\`` : ''}
⚡ *الحالة:* معلق في قائمة الانتظار (Pending)

🎮 _يا حكيم، كاين شغل راه يستنى فيك، ادخل للوحة التحكم واكزييكوتي!_`;

    const hasPhoto = imageUri && imageUri.trim() !== '';
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${hasPhoto ? 'sendPhoto' : 'sendMessage'}`;
    
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
    formData.append('parse_mode', 'Markdown');
    
    if (hasPhoto) {
      // 🚀 الحل الذكي لـ React Native: نبعثوا مسار الملف مباشرة كـ Object
      formData.append('photo', {
        uri: imageUri,
        name: 'proof.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('caption', message);
    } else {
      formData.append('text', message);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData, // بدون Content-Type، لأن FormData تديرها تلقائياً
    });

    // 🛡️ خطة الطوارئ: إذا فشل رفع الصورة (مثلاً الحجم كبير أو مسار محمي)، نرسل النص كاحتياط!
    if (!response.ok && hasPhoto) {
      const fallbackUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const fallbackParams = new URLSearchParams();
      fallbackParams.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
      fallbackParams.append('text', message + "\n\n⚠️ _(ملاحظة: فشل رفع الصورة في الشات ولكن الطلب مسجل بنجاح)._");
      fallbackParams.append('parse_mode', 'Markdown');
      
      await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fallbackParams.toString(),
      });
    }
    
  } catch (error) {
    console.error("Telegram Admin Alert Error: ", error);
  }
};