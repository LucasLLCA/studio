"use client";

import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 w-full">
      <AppHeader />
      <main className="flex-1 flex flex-col w-full">{children}</main>
      <AppFooter />
    </div>
  );
}
