import { StyleSheet, Platform } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from './theme';

export const GlobalStyles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5, // حدود أوضح
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg, // مساحة داخلية أوسع لراحة العين
    // إضافة ظل خفيف للكروت
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
      android: { elevation: 8 },
    }),
  },
  cardGold: {
    backgroundColor: Colors.goldSurface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.goldDim,
    padding: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: Colors.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold, // جعلناها عريضة أكثر
    color: Colors.goldLight, // عناوين الأقسام بالذهبي الفاتح
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  labelText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: FontSize.lg, // تكبير القيم لتبرز أكثر
    color: Colors.textPrimary,
    fontWeight: FontWeight.extrabold,
  },
  goldText: {
    color: Colors.gold,
    fontWeight: FontWeight.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.full, // أزرار دائرية عصرية جداً
    paddingVertical: 18, // زر أطول قليلاً لفخامة اللمس
    alignItems: 'center',
    justifyContent: 'center',
    // تأثير التوهج الذهبي للأزرار
    ...Platform.select({
      ios: { shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 12, shadowColor: Colors.gold },
    }),
  },
  primaryButtonText: {
    color: Colors.textOnGold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 1, // تباعد الأحرف لفخامة النص
  },
  outlineButton: {
    borderWidth: 2, // حدود أسمك
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldSurface, // خلفية خفيفة جداً للزر الشفاف
  },
  outlineButtonText: {
    color: Colors.gold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
});