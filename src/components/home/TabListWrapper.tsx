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
      <div className="h-[330px] flex items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-[330px] flex items-center justify-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[330px] pr-2">
      {children}
    </ScrollArea>
  );
}
