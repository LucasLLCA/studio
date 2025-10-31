"use client";

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Activity, HomeIcon, LogOut } from 'lucide-react';

interface SearchHeaderProps {
  isSummarizedView: boolean;
  onSummarizedViewChange: (value: boolean) => void;
  hasProcessData: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  apiSearchPerformed: boolean;
  onFileUploadClick: () => void;
  onBackToHome: () => void;
  onApiStatusClick: () => void;
  onLogout: () => void;
}

export function SearchHeader({
  isSummarizedView,
  onSummarizedViewChange,
  hasProcessData,
  isLoading,
  isAuthenticated,
  apiSearchPerformed,
  onFileUploadClick,
  onBackToHome,
  onApiStatusClick,
  onLogout,
}: SearchHeaderProps) {
  return (
    <div className="p-3 border-b border-border shadow-sm sticky top-0 z-30 bg-card">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
        <div className="flex flex-wrap items-center gap-2 flex-grow">
          <div className="flex items-center space-x-2 ml-auto sm:ml-0 flex-shrink-0">
            <Switch
              id="summarize-graph"
              checked={isSummarizedView}
              onCheckedChange={onSummarizedViewChange}
              disabled={!hasProcessData || isLoading}
            />
            <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">
              Resumido
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {apiSearchPerformed && (
            <Button
              onClick={onBackToHome}
              variant="outline"
              size="sm"
              disabled={isLoading}
              title="Voltar ao início"
            >
              <HomeIcon className="mr-2 h-4 w-4" /> Início
            </Button>
          )}
          <Button onClick={onFileUploadClick} variant="outline" size="sm" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onApiStatusClick}
            title="Status das APIs"
          >
            <Activity className="h-4 w-4" />
          </Button>
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
