import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 🛠️ حقن الخطوط الأصلية بالأسماء الرسمية للـ React Native Web */}
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Material Icons'; /* الفراغ هنا هو السر! */
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
          }
          @font-face {
            font-family: 'FontAwesome';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
          }
          @font-face {
            font-family: 'FontAwesome5Free-Solid';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Ionicons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
          }
        `}} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}