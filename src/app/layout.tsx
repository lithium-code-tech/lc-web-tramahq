import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TramaHQ — editor de roteiro de quadrinhos',
  description: 'Escreva roteiros de HQ quadro a quadro, com modo Full Script e Plot.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=Courier+Prime:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
