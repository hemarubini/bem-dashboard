import {
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { createDynamoClient, TABLES } from "./dynamodb";
import type { AlertRecord, TelemetryRecord, TripRecord } from "@/types";
import {
  ALL_VEHICLES,
  historyLimitForRange,
  TELEMETRY_PUBLISH_INTERVAL_MS,
  type TimeRangeKey,
} from "@/config/constants";

async function freshQuery<T>(
  run: (client: ReturnType<typeof createDynamoClient>) => Promise<T>
): Promise<T> {
  const client = createDynamoClient();
  return run(client);
}

export async function queryLatestTelemetry(
  vehicleId: string
): Promise<TelemetryRecord | null> {
  return freshQuery(async (client) => {
    const res = await client.send(
      new QueryCommand({
        TableName: TABLES.telemetry,
        KeyConditionExpression: "vehicle_id = :v",
        ExpressionAttributeValues: { ":v": vehicleId },
        ScanIndexForward: false,
        Limit: 1,
      })
    );
    return (res.Items?.[0] as TelemetryRecord) ?? null;
  });
}

const DYNAMO_PAGE_SIZE = 1_000;

function logTelemetryQueryStats(
  records: TelemetryRecord[],
  context: {
    timeRangeKey: TimeRangeKey;
    sinceIso: string;
    untilIso: string;
    limitPerVehicle: number;
    vehicleCount: number;
  }
): void {
  if (!import.meta.env.DEV) return;

  const timestamps = records
    .map((r) => new Date(r.timestamp).getTime())
    .filter((t) => !Number.isNaN(t));
  const sinceMs = new Date(context.sinceIso).getTime();
  const untilMs = new Date(context.untilIso).getTime();
  const earliestMs = timestamps.length ? Math.min(...timestamps) : null;
  const latestMs = timestamps.length ? Math.max(...timestamps) : null;
  const spanMinutes =
    earliestMs !== null && latestMs !== null
      ? Math.round((latestMs - earliestMs) / 60_000)
      : 0;
  const requestedSpanMinutes = Math.round((untilMs - sinceMs) / 60_000);
  const perVehicle = context.vehicleCount
    ? Math.round(records.length / context.vehicleCount)
    : 0;
  const likelyTruncated =
    earliestMs !== null &&
    earliestMs > sinceMs + TELEMETRY_PUBLISH_INTERVAL_MS * 2 &&
    perVehicle >= context.limitPerVehicle * 0.95;

  console.debug("[queryTelemetryForVehicles]", {
    timeRange: context.timeRangeKey,
    vehicles: context.vehicleCount,
    limitPerVehicle: context.limitPerVehicle,
    records: records.length,
    recordsPerVehicle: perVehicle,
    earliest: earliestMs !== null ? new Date(earliestMs).toISOString() : null,
    latest: latestMs !== null ? new Date(latestMs).toISOString() : null,
    dataSpanMinutes: spanMinutes,
    requestedSpanMinutes,
    requestedSince: context.sinceIso,
    requestedUntil: context.untilIso,
    likelyTruncatedByLimit: likelyTruncated,
  });
}

export async function queryTelemetryHistory(
  vehicleId: string,
  sinceIso?: string,
  maxRecords?: number
): Promise<TelemetryRecord[]> {
  const cap = maxRecords ?? 200;
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : NaN;

  return freshQuery(async (client) => {
    const items: TelemetryRecord[] = [];
    let lastKey: Record<string, unknown> | undefined;

    while (items.length < cap) {
      const pageLimit = Math.min(cap - items.length, DYNAMO_PAGE_SIZE);
      const input: QueryCommandInput = {
        TableName: TABLES.telemetry,
        KeyConditionExpression: sinceIso
          ? "vehicle_id = :v AND #ts >= :since"
          : "vehicle_id = :v",
        ExpressionAttributeNames: sinceIso ? { "#ts": "timestamp" } : undefined,
        ExpressionAttributeValues: sinceIso
          ? { ":v": vehicleId, ":since": sinceIso }
          : { ":v": vehicleId },
        ScanIndexForward: false,
        Limit: pageLimit,
        ExclusiveStartKey: lastKey,
      };
      const res = await client.send(new QueryCommand(input));
      const page = (res.Items as TelemetryRecord[]) ?? [];
      items.push(...page);
      lastKey = res.LastEvaluatedKey;

      if (!lastKey || page.length === 0) break;
      if (items.length >= cap) break;

      if (!Number.isNaN(sinceMs)) {
        const oldestInPage = page[page.length - 1]?.timestamp;
        if (
          oldestInPage &&
          new Date(oldestInPage).getTime() <=
            sinceMs + TELEMETRY_PUBLISH_INTERVAL_MS
        ) {
          break;
        }
      }
    }

    return items.reverse();
  });
}

export async function queryTelemetryForVehicles(
  vehicleIds: readonly string[],
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<TelemetryRecord[]> {
  const until = untilIso ?? new Date().toISOString();
  const limitPerVehicle = historyLimitForRange(
    timeRangeKey,
    sinceIso,
    until
  );
  const batches = await Promise.all(
    vehicleIds.map((id) =>
      queryTelemetryHistory(id, sinceIso, limitPerVehicle)
    )
  );
  const records = batches
    .flat()
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  logTelemetryQueryStats(records, {
    timeRangeKey,
    sinceIso,
    untilIso: until,
    limitPerVehicle,
    vehicleCount: vehicleIds.length,
  });

  return records;
}

export async function queryLatestPerVehicle(
  vehicleIds: readonly string[]
): Promise<TelemetryRecord[]> {
  const results = await Promise.all(
    vehicleIds.map((id) => queryLatestTelemetry(id))
  );
  return results.filter((r): r is TelemetryRecord => r !== null);
}

export async function scanAllAlerts(): Promise<AlertRecord[]> {
  return freshQuery(async (client) => {
    const items: AlertRecord[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const res = await client.send(
        new ScanCommand({
          TableName: TABLES.alerts,
          ExclusiveStartKey: lastKey,
        })
      );
      if (res.Items) items.push(...(res.Items as AlertRecord[]));
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });
}

export async function acknowledgeAlert(
  vehicleId: string,
  alertId: string
): Promise<void> {
  return freshQuery(async (client) => {
    await client.send(
      new UpdateCommand({
        TableName: TABLES.alerts,
        Key: { vehicle_id: vehicleId, alert_id: alertId },
        UpdateExpression: "SET acknowledged = :ack",
        ExpressionAttributeValues: { ":ack": "true" },
      })
    );
  });
}

export async function scanAllTrips(): Promise<TripRecord[]> {
  return freshQuery(async (client) => {
    const items: TripRecord[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const res = await client.send(
        new ScanCommand({
          TableName: TABLES.trips,
          ExclusiveStartKey: lastKey,
        })
      );
      if (res.Items) items.push(...(res.Items as TripRecord[]));
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
  });
}

export async function fetchFleetOverviewData(
  filterVehicleIds: readonly string[],
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  latestTelemetry: TelemetryRecord[];
  history: TelemetryRecord[];
  alerts: AlertRecord[];
  filterVehicleIds: readonly string[];
}> {
  const latestTelemetry = await queryLatestPerVehicle(ALL_VEHICLES);
  const history = await queryTelemetryForVehicles(
    filterVehicleIds,
    sinceIso,
    timeRangeKey,
    untilIso
  );
  const alerts = await scanAllAlerts();
  return { latestTelemetry, history, alerts, filterVehicleIds };
}

export async function fetchVehicleDetailsData(
  vehicleId: string,
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  history: TelemetryRecord[];
  alerts: AlertRecord[];
  trips: TripRecord[];
  latest: TelemetryRecord | null;
}> {
  const client = createDynamoClient();
  const until = untilIso ?? new Date().toISOString();
  const limit = historyLimitForRange(timeRangeKey, sinceIso, until);

  const [history, alertRes, tripRes, latestRes] = await Promise.all([
    queryTelemetryHistory(vehicleId, sinceIso, limit),
    client.send(
      new QueryCommand({
        TableName: TABLES.alerts,
        KeyConditionExpression: "vehicle_id = :v",
        ExpressionAttributeValues: { ":v": vehicleId },
        ScanIndexForward: false,
      })
    ),
    client.send(
      new QueryCommand({
        TableName: TABLES.trips,
        KeyConditionExpression: "vehicle_id = :v",
        ExpressionAttributeValues: { ":v": vehicleId },
        ScanIndexForward: false,
      })
    ),
    client.send(
      new QueryCommand({
        TableName: TABLES.telemetry,
        KeyConditionExpression: "vehicle_id = :v",
        ExpressionAttributeValues: { ":v": vehicleId },
        ScanIndexForward: false,
        Limit: 1,
      })
    ),
  ]);

  return {
    history,
    alerts: (alertRes.Items as AlertRecord[]) ?? [],
    trips: (tripRes.Items as TripRecord[]) ?? [],
    latest: (latestRes.Items?.[0] as TelemetryRecord) ?? null,
  };
}

export async function fetchLNGPageData(
  vehicleId: string | "all",
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  records: TelemetryRecord[];
  latest: TelemetryRecord[];
  alerts: AlertRecord[];
}> {
  const ids =
    vehicleId === "all"
      ? ALL_VEHICLES.filter((v) => v.startsWith("LNG"))
      : [vehicleId];

  const latest = await queryLatestPerVehicle(ids);
  const records = await queryTelemetryForVehicles(
    ids,
    sinceIso,
    timeRangeKey,
    untilIso
  );
  const allAlerts = await scanAllAlerts();
  const alerts = allAlerts.filter((a) => ids.includes(a.vehicle_id));

  return { records, latest, alerts };
}

export async function fetchEVPageData(
  vehicleId: string | "all",
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  records: TelemetryRecord[];
  latest: TelemetryRecord[];
  alerts: AlertRecord[];
}> {
  const ids =
    vehicleId === "all"
      ? ALL_VEHICLES.filter((v) => v.startsWith("EV"))
      : [vehicleId];

  const latest = await queryLatestPerVehicle(ids);
  const records = await queryTelemetryForVehicles(
    ids,
    sinceIso,
    timeRangeKey,
    untilIso
  );
  const allAlerts = await scanAllAlerts();
  const alerts = allAlerts.filter((a) => ids.includes(a.vehicle_id));

  return { records, latest, alerts };
}

export async function fetchAlertsPageData(): Promise<AlertRecord[]> {
  return scanAllAlerts();
}

export async function fetchTripsPageData(): Promise<TripRecord[]> {
  return scanAllTrips();
}

export async function fetchCostAnalyticsData(
  vehicleIds: readonly string[],
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  records: TelemetryRecord[];
  latest: TelemetryRecord[];
}> {
  const latest = await queryLatestPerVehicle(vehicleIds);
  const records = await queryTelemetryForVehicles(
    vehicleIds,
    sinceIso,
    timeRangeKey,
    untilIso
  );
  return { records, latest };
}

export async function fetchDTCAnalyticsData(
  vehicleIds: readonly string[],
  sinceIso: string,
  timeRangeKey: TimeRangeKey,
  untilIso?: string
): Promise<{
  records: TelemetryRecord[];
  latest: TelemetryRecord[];
  alerts: AlertRecord[];
}> {
  const latest = await queryLatestPerVehicle(vehicleIds);
  const records = await queryTelemetryForVehicles(
    vehicleIds,
    sinceIso,
    timeRangeKey,
    untilIso
  );
  const allAlerts = await scanAllAlerts();
  const alerts = allAlerts.filter((a) => vehicleIds.includes(a.vehicle_id));
  return { records, latest, alerts };
}

export async function fetchFleetMapData(): Promise<{
  latest: TelemetryRecord[];
  alerts: AlertRecord[];
}> {
  const latest = await queryLatestPerVehicle(ALL_VEHICLES);
  const allAlerts = await scanAllAlerts();
  return { latest, alerts: allAlerts };
}

/** GPS trail for Fleet Map (filtered by time range via sinceIso). */
export async function fetchVehicleGpsTrail(
  vehicleId: string,
  sinceIso?: string,
  limit = 30
): Promise<{ lat: number; lon: number }[]> {
  const records = await queryTelemetryHistory(vehicleId, sinceIso, limit);
  const points: { lat: number; lon: number }[] = [];
  for (const r of records) {
    const lat = Number(r.gps_lat);
    const lon = Number(r.gps_lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({ lat, lon });
    }
  }
  return points;
}
