import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "../styles/base.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
