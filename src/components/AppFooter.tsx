"use client";

import Image from 'next/image';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function AppFooter() {
  return (
    <footer className="bg-gray-100 py-6 px-4 sm:py-8 sm:px-8">
      <div className="flex flex-col items-center gap-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="https://soberania.ai/">
            <Image
              src={`${basePath}/logo-soberania.svg`}
              alt="Logo SoberanIA"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </a>
          <a href="https://pidigital.pi.gov.br/">
            <Image
              src={`${basePath}/logo-governo-piaui.svg`}
              alt="Logo Governo do Piau&#237;"
              width={168}
              height={56}
              className="h-14 w-auto object-contain"
            />
          </a>
        </div>
        <div className="text-center text-xs text-gray-600 max-w-2xl">
          <p className="font-semibold mb-1">{"Desenvolvido pelo N\u00facleo Estrat\u00e9gico de Tecnologia e Governo Digital"}</p>
          <p className="mb-1">{"SEAD-PI/NTGD \u2022 Secretaria de Administra\u00e7\u00e3o do Piau\u00ed & SIA \u2022 Secretaria de Intelig\u00eancia Artificial do Piau\u00ed"}</p>
          <p>{"\u00a9 2026 Governo do Estado do Piau\u00ed"}</p>
        </div>
      </div>
    </footer>
  );
}
