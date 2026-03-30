import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TabListWrapperProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

export function TabListWrapper({ isLoading, isEmpty, emptyMessage, children }: TabListWrapperProps) {
  if (isLoading) {
    return (
      <div className="min-h-[200px] max-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="min-h-[200px] max-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-[200px] max-h-[50vh] pr-2">
      {children}
    </ScrollArea>
  );
}
