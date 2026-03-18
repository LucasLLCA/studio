import { ExternalLink } from 'lucide-react';
import { formatProcessNumber } from '@/lib/utils';

interface ProcessoItemRowProps {
  numeroProcesso: string;
  contexto?: string | null;
  nota?: string | null;
  onClick: () => void;
  actionSlot?: React.ReactNode;
  variant?: "default" | "compact";
}

export function ProcessoItemRow({
  numeroProcesso,
  contexto,
  nota,
  onClick,
  actionSlot,
  variant = "default",
}: ProcessoItemRowProps) {
  const isCompact = variant === "compact";

  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className={`font-medium text-gray-800 ${isCompact ? "text-sm" : ""}`}>
          {formatProcessNumber(numeroProcesso)}
        </span>
        <ExternalLink className={isCompact ? "h-3 w-3 text-gray-400" : "h-3.5 w-3.5 text-gray-400"} />
      </div>
      {contexto && (
        <p
          className={`text-xs text-gray-600 ${isCompact ? "mt-0.5" : "mt-1"} whitespace-nowrap overflow-hidden text-ellipsis`}
          title={contexto}
        >
          {contexto.split(" - ")[0]}
          <br />
          {contexto.split(" - ")[1]}
        </p>
      )}
      {nota && (
        <p className="text-xs text-gray-500 mt-0.5">{nota}</p>
      )}
    </>
  );

  if (actionSlot) {
    return (
      <div className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-gray-50 group">
        <button onClick={onClick} className="flex-1 text-left">
          {content}
        </button>
        {actionSlot}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={
        isCompact
          ? "w-full text-left py-1.5 px-1 rounded hover:bg-gray-50 transition-colors"
          : "w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
      }
    >
      {content}
    </button>
  );
}
