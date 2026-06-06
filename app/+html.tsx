import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}