/**
 * Re-export barrel for backward compatibility.
 * Implementation has been split into domain modules under ./api/
 */
export { loginToSEI } from './api/auth';
export { fetchProcessData, fetchAndamentosDelta, fetchProcessSummary, fetchDocumentSummary, fetchDocuments, consultarDocumento, invalidateProcessCache, fetchAndamentosCount } from './api/process';
export { fetchOpenUnits } from './api/units';
