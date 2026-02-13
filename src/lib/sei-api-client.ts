/**
 * Re-export barrel for backward compatibility.
 * Implementation has been split into domain modules under ./api/
 */
export { loginToSEI } from './api/auth';
export { fetchProcessData, fetchProcessSummary, fetchDocumentSummary, fetchDocuments, invalidateProcessCache } from './api/process';
export { checkSEIApiHealth, checkSummaryApiHealth } from './api/health';
export type { HealthCheckResponse } from './api/health';
export { fetchOpenUnits } from './api/units';
