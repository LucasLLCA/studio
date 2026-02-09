"use client";

export default function AppFooter() {
  return (
    <footer className="bg-gray-100 py-8 px-8">
      <div className="flex flex-col items-center gap-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="https://soberania.ai/">
            <img
              src="/logo-soberania.svg"
              alt="Logo SoberanIA"
              className="h-10 w-auto object-contain"
            />
          </a>
          <a href="https://pidigital.pi.gov.br/">
            <img
              src="/logo-governo-piaui.svg"
              alt="Logo Governo do Piau\u00ed"
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
