import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 🛠️ الحل الجذري والنهائي: تحميل الخطوط بدون تعارض */}
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'MaterialIcons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/MaterialIcons.ttf') format('truetype');
            font-display: block;
          }
          @font-face {
            font-family: 'FontAwesome';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.3/Fonts/FontAwesome.ttf') format('truetype');
            font-display: block;
          }
        `}} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}