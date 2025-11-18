export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background mt-auto">
      <div className="container mx-auto px-2 py-3">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Desenvolvido pelo{' '}
            <span className="font-semibold text-foreground">
              Núcleo Estratégico de Tecnologia e Governo Digital
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            SEAD/NTGD • Secretaria de Administração do Piauí
          </p>
          <p className="text-xs text-muted-foreground">
            © {currentYear} Governo do Estado do Piauí
          </p>
        </div>
      </div>
    </footer>
  );
}
