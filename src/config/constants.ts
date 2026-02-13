/**
 * Constantes de configuração da aplicação
 */

// Configurações de autenticação
export const AUTH_CONFIG = {
  STORAGE_KEY: 'sei_auth_data',
  EXPIRY_HOURS: 8,
  TOKEN_CACHE_DURATION_MS: 30 * 60 * 1000, // 30 minutos
} as const;

// Lista de órgãos do Piauí
export const ORGAOS_PIAUI = [
  'GOV-PI',
  'SEAD-PI',
  'ETIPI-PI',
  'PGE-PI',
  'SEFAZ-PI',
  'CGE-PI',
  'VICEGOV-PI',
  'INTERPI-PI',
  'SEDUC-PI',
  'FUESPI-PI',
  'SEPLAN-PI',
  'EMGERPI-PI',
  'SSP-PI',
  'PM-PI',
  'CBMEPI-PI',
  'SEMARH-PI',
  'DETRAN-PI',
  'AGESPISA-PI',
  'SEJUS-PI',
  'SECULT-PI',
  'BADESPI-PI',
  'PIAUIPREV-PI',
  'JUCEPI-PI',
  'SEMPI-PI',
  'SASC-PI',
  'IMEPI-PI',
  'COJUV-PI',
  'SDE-PI',
  'EMATER-PI',
  'PC-PI',
  'SEGOV-PI',
  'ISBPI-PI',
  'IDEPI-PI',
  'GAMIL-PI',
  'SEINFRA-PI',
  'SESAPI-PI',
  'CENDFOL-PI',
  'SEFIR-PI',
  'SEID-PI',
  'ADH-PI',
  'CCOM-PI',
  'SAF-PI',
  'SEAGRO-PI',
  'FUNDESPI-PI',
  'FAPEPI-PI',
  'SETUR-PI',
  'DPE-PI',
  'DER-PI',
  'ADAPI-PI',
  'SETRANS-PI',
  'SIDERPI-PI',
  'SECID-PI',
  'CFLP-PI',
  'SEDEC-PI',
  'FEPISERH-PI',
  'INVESTEPIAUI-PI',
  'FUNART-PI',
  'IASPI-PI',
  'AGRESPI-PI',
  'CVCI-PI',
  'FUAPI-PI',
  'SUPRES-PI',
  'ZPE',
  'SADA-PI',
  'CDTER-PI',
  'SERES-PI',
  'PORTO-PI',
  'GASPISA-PI',
  'SECEPI-PI',
  'PIAUILINK-PI',
  'SIA-PI',
  'PIT-PI',
  'REABILITAR-PI',
  'MUNICIPIO-PI',
  'ALEPI-PI',
] as const;

// Timeouts e limites
export const API_CONFIG = {
  DEFAULT_TIMEOUT_MS: 120000, // 2 minutos
  HEALTH_CHECK_TIMEOUT_MS: 10000, // 10 segundos
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  AUTH: {
    EXPIRED: 'Sessão expirada',
    REQUIRED: 'Autenticação necessária',
    INVALID_CREDENTIALS: 'Credenciais inválidas',
  },
  PROCESS: {
    NOT_FOUND: 'Processo não encontrado',
    INVALID_NUMBER: 'Número do processo inválido',
    UNIT_REQUIRED: 'Selecione uma unidade',
  },
  API: {
    UNAVAILABLE: 'Serviço temporariamente indisponível',
    TIMEOUT: 'Tempo limite excedido',
    NETWORK: 'Erro de conexão',
  },
} as const;
