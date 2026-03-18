/**
 * Next.js instrumentation file (loaded once on server startup).
 * Sets up OpenTelemetry for the Next.js server runtime, which instruments
 * all fetch() calls in API routes (proxy, SSE proxy) and propagates
 * W3C Trace Context headers to the Python backend.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { OTLPLogExporter } = await import(
      "@opentelemetry/exporter-logs-otlp-http"
    );
    const {
      getNodeAutoInstrumentations,
    } = await import("@opentelemetry/auto-instrumentations-node");
    const { Resource } = await import("@opentelemetry/resources");
    const {
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
    } = await import("@opentelemetry/semantic-conventions");
    const {
      SimpleLogRecordProcessor,
    } = await import("@opentelemetry/sdk-logs");

    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://otelcollectorhttp.10.0.122.91.sslip.io";

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: "studio-frontend",
      [ATTR_SERVICE_VERSION]: "1.0.0",
      "deployment.environment": process.env.NODE_ENV || "production",
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
      }),
      logRecordProcessor: new SimpleLogRecordProcessor(
        new OTLPLogExporter({ url: `${endpoint}/v1/logs` })
      ),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Only instrument fetch/http — skip fs, dns, etc. for performance
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: false },
          "@opentelemetry/instrumentation-net": { enabled: false },
        }),
      ],
    });

    sdk.start();
  }
}
