"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingFeedbackProps {
  loadingTasks: string[];
}

export function LoadingFeedback({ loadingTasks }: LoadingFeedbackProps) {
  if (loadingTasks.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div>
              <h3 className="text-lg font-semibold mb-3">Carregando dados...</h3>
              <div className="space-y-2">
                {loadingTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                    <span className="text-muted-foreground">{task}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Os resultados aparecerão conforme ficarem prontos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
