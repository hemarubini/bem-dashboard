# BEM Fleet Monitoring Portal

React + TypeScript dashboard for Blue Energy Motors. Queries DynamoDB via **AWS SDK v3** using a **Cognito Identity Pool** for temporary credentials on every filter change, navigation, and **5-second** refresh. **No caching**, no localStorage, no Redux persistence.

## Stack

- React 19 + TypeScript + Vite
- Material UI (BEM navy / electric blue theme)
- Recharts
- React Router
- `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`
- `@aws-sdk/client-cognito-identity` + `@aws-sdk/credential-providers`

## Architecture

```text
React (browser) → Cognito Identity Pool → temporary IAM credentials → DynamoDB
```

## Tables

| Table | Usage |
|-------|--------|
| `bem_telemetry` | Fleet, LNG, EV, Vehicle Details |
| `bem_alerts` | Fleet Overview, Alerts, Vehicle Details |
| `bem_trips` | Trips, Vehicle Details |

## Setup

```bash
cd bem-dashboard
cp .env.example .env
# .env needs VITE_COGNITO_IDENTITY_POOL_ID (see below)
npm install
npm run dev
```

Open http://localhost:5173

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito Identity Pool ID (e.g. `us-east-1:5b01964c-...`) |
| `VITE_TELEMETRY_TABLE` | DynamoDB telemetry table name |
| `VITE_ALERTS_TABLE` | DynamoDB alerts table name |
| `VITE_TRIPS_TABLE` | DynamoDB trips table name |

## Cognito Identity Pool (bem-cognito)

The app uses the **unauthenticated** (or authenticated) IAM role attached to the identity pool. No access keys are stored in the browser bundle.

Ensure your pool (`bem-cognito`, ID `us-east-1:5b01964c-28b6-4f26-8179-08841e62a859`) has:

1. **Unauthenticated identities** enabled (for demo without login), **or** a User Pool linked for authenticated access
2. An IAM role with DynamoDB permissions (see below)

## IAM policy (attach to the Identity Pool role)

Attach to the **unauthenticated** and/or **authenticated** role used by the identity pool:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:DescribeTable",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:943881661843:table/bem_telemetry",
        "arn:aws:dynamodb:us-east-1:943881661843:table/bem_alerts",
        "arn:aws:dynamodb:us-east-1:943881661843:table/bem_trips"
      ]
    }
  ]
}
```

## Amplify Hosting

Set the same `VITE_*` variables in Amplify **Environment variables** before build. No AWS access keys required — only the identity pool ID and table names.

## Build

```bash
npm run build
npm run preview
```
