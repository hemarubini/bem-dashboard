/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION: string;
  readonly VITE_COGNITO_IDENTITY_POOL_ID: string;
  readonly VITE_TELEMETRY_TABLE: string;
  readonly VITE_ALERTS_TABLE: string;
  readonly VITE_TRIPS_TABLE: string;
}
