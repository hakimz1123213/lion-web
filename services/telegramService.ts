// 📡 NoirWealth — Telegram Admin Alert System

const TELEGRAM_BOT_TOKEN = "8975330909:AAEIOPN1eSlnBlO7QJW17mI3iT6oTSCPd-c"; 
const TELEGRAM_ADMIN_CHAT_ID = "-1004463288669"; 

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
${extraDetails ? `📝 *تفاصيل إضافية:* \n\`${extraDetails}\`\n` : ''}⚡ *الحالة:* معلق في قائمة الانتظار (Pending)

🎮 _latchaaaaaaa boyyyyyyyyyyyy khoofffffff!_`;

    const hasPhoto = imageUri && imageUri.trim() !== '' && !imageUri.includes('No image');
    let response;

    if (hasPhoto) {
      const isHttp = imageUri!.startsWith('http');
      
      if (isHttp) {
        // 🌐 1. إذا كانت الصورة رابط (مثل صورة البروفايل أو فايربيز) -> نرسلها كـ JSON (أسرع ومضمونة 100%)
        response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_ADMIN_CHAT_ID,
            photo: imageUri,
            caption: message,
            parse_mode: 'Markdown'
          })
        });
      } else {
        // 📱 2. إذا كانت الصورة من استوديو الهاتف (file://) -> نرفعها عبر FormData
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
        formData.append('parse_mode', 'Markdown');
        formData.append('caption', message);
        formData.append('photo', {
          uri: imageUri,
          name: 'proof.jpg',
          type: 'image/jpeg',
        } as any);

        response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: formData, 
        });
      }
    } else {
      // ✉️ 3. إذا لم توجد صورة نهائياً -> نرسل رسالة نصية فقط عبر JSON
      response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    }

    // 🛡️ خطة الطوارئ: إذا فشل كل شيء لسبب ما، نرسل إشعار نصي فوري للإنقاذ!
    if (!response.ok && hasPhoto) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          text: message + "\n\n⚠️ _(ملاحظة: فشل عرض الصورة في الشات، ولكن الطلب مسجل في التطبيق بنجاح)._",
          parse_mode: 'Markdown'
        })
      });
    }
    
  } catch (error) {
    console.error("Telegram Admin Alert Error: ", error);
  }
};