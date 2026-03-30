import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from '@/components/providers/QueryProvider';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'Visualizador de Processos',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${plusJakarta.variable} ${dmSans.variable} ${dmMono.variable} antialiased flex flex-col min-h-screen`}>
        <QueryProvider>
          <div className="flex-1">
            {children}
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
