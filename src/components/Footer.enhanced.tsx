import Image from 'next/image';

/**
 * Footer Aprimorado com Logo (opcional)
 *
 * Para usar este footer ao invés do simples:
 * 1. Renomeie Footer.tsx para Footer.simple.tsx
 * 2. Renomeie este arquivo para Footer.tsx
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background mt-auto">
      <div className="container mx-auto px-2 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo-sead.png"
              alt="SEAD/PI"
              width={60}
              height={60}
              className="object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                Secretaria de Administração
              </span>
              <span className="text-xs text-muted-foreground">
                Governo do Estado do Piauí
              </span>
            </div>
          </div>

          {/* Informações Centrais */}
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Desenvolvido pelo{' '}
              <span className="font-semibold text-foreground">
                Núcleo Estratégico de Tecnologia e Governo Digital
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              SEAD/NTGD
            </p>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground">
              © {currentYear} Governo do Piauí
            </p>
            <p className="text-xs text-muted-foreground">
              Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
