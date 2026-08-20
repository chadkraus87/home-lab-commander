import type { MetricPoint } from "@/domain/types";

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function downsampleMetrics(
  points: MetricPoint[],
  maximumPoints: number,
): MetricPoint[] {
  if (points.length <= maximumPoints) return points;
  const bucketSize = Math.ceil(points.length / maximumPoints);
  const sampled: MetricPoint[] = [];
  for (let index = 0; index < points.length; index += bucketSize) {
    const bucket = points.slice(index, index + bucketSize);
    const last = bucket.at(-1);
    if (!last) continue;
    sampled.push({
      timestamp: last.timestamp,
      cpu: average(bucket.map((point) => point.cpu)),
      memory: average(bucket.map((point) => point.memory)),
      disk: average(bucket.map((point) => point.disk)),
      temperature: average(
        bucket.flatMap((point) =>
          point.temperature === null ? [] : [point.temperature],
        ),
      ),
      networkRx: average(bucket.map((point) => point.networkRx)),
      networkTx: average(bucket.map((point) => point.networkTx)),
      latency: average(bucket.map((point) => point.latency)),
    });
  }
  return sampled;
}
