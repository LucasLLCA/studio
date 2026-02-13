"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiHealth } from '@/hooks/use-api-health';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ApiHealthCheckProps {
  className?: string;
  showDetails?: boolean;
}

const ApiHealthCheck: React.FC<ApiHealthCheckProps> = ({ 
  className = "",
  showDetails = false
}) => {
  const { seiApiStatus, summaryApiStatus, isChecking, lastCheck, refreshHealth } = useApiHealth();

  const hasOfflineApis = !seiApiStatus?.isOnline || !summaryApiStatus?.isOnline;
  const hasApiErrors = seiApiStatus?.status === 'error' || summaryApiStatus?.status === 'error';

  if (!hasOfflineApis && !hasApiErrors && !showDetails) {
    return null;
  }

  const getStatusBadge = (status: typeof seiApiStatus) => {
    if (!status) return <Badge variant="outline">Verificando...</Badge>;
    
    switch (status.status) {
      case 'online':
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (showDetails) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            Status das APIs
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshHealth}
              disabled={isChecking}
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API SEI:</span>
            <div className="flex items-center space-x-2">
              {getStatusBadge(seiApiStatus)}
              {seiApiStatus?.responseTime && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {seiApiStatus.responseTime}ms
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Resumo:</span>
            <div className="flex items-center space-x-2">
              {getStatusBadge(summaryApiStatus)}
              {summaryApiStatus?.responseTime && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {summaryApiStatus.responseTime}ms
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isChecking) {
    return (
      <Alert className={`mb-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          <strong>Verificando APIs...</strong> Verificando conectividade com as APIs.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasOfflineApis || hasApiErrors) {
    const offlineApis = [];
    if (!seiApiStatus?.isOnline) offlineApis.push('API SEI');
    if (!summaryApiStatus?.isOnline) offlineApis.push('API de Resumo');

    return (
      <Alert variant="destructive" className={`mb-4 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>APIs Indisponíveis:</strong> {offlineApis.join(' e ')} 
          {offlineApis.length > 1 ? ' não estão' : ' não está'} respondendo. 
          Algumas funcionalidades podem não funcionar corretamente.
          {lastCheck && ` Última verificação: ${lastCheck.toLocaleTimeString()}`}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ApiHealthCheck;