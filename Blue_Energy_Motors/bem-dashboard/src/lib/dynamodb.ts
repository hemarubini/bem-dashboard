import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;

let credentialsProvider: ReturnType<typeof fromCognitoIdentityPool> | undefined;

function getCredentialsProvider() {
  if (!identityPoolId) {
    throw new Error(
      "Missing VITE_COGNITO_IDENTITY_POOL_ID in .env — set your Cognito Identity Pool ID (e.g. us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
    );
  }

  if (!credentialsProvider) {
    credentialsProvider = fromCognitoIdentityPool({
      identityPoolId,
      clientConfig: { region },
    });
  }

  return credentialsProvider;
}

/** New SDK client on each call — no shared cached data layer. */
export function createDynamoClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({
    region,
    credentials: getCredentialsProvider(),
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export const TABLES = {
  telemetry: import.meta.env.VITE_TELEMETRY_TABLE || "bem_telemetry",
  alerts: import.meta.env.VITE_ALERTS_TABLE || "bem_alerts",
  trips: import.meta.env.VITE_TRIPS_TABLE || "bem_trips",
};
