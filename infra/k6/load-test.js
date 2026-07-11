import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://nginx:80';
const API_PREFIX = '/api/v1';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency_p95');
const successCount = new Counter('success_count');

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(res.status !== 200);
    latencyTrend.add(res.timings.duration);
    if (res.status === 200) successCount.add(1);
  });

  sleep(1);

  group('API - Habitaciones', () => {
    const res = http.get(`${BASE_URL}${API_PREFIX}/habitaciones/disponibles`);
    check(res, {
      'habitaciones status 200': (r) => r.status === 200,
      'habitaciones response time < 1000ms': (r) => r.timings.duration < 1000,
      'habitaciones body is JSON': (r) => r.headers['Content-Type'] === 'application/json',
    });
    errorRate.add(res.status !== 200);
    latencyTrend.add(res.timings.duration);
  });

  sleep(2);

  group('API - Crear Reserva', () => {
    const payload = JSON.stringify({
      fecha_entrada: '2026-07-15',
      fecha_salida: '2026-07-18',
      habitacion_id: '1',
      huesped_id: 'test-k6',
      servicios_extra: [],
      metodo_pago: 'tarjeta',
      idempotency_key: `k6-${__VU}-${__ITER}`,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(
      `${BASE_URL}${API_PREFIX}/reservas`,
      payload,
      params
    );

    check(res, {
      'reserva creada (201)': (r) => r.status === 201,
      'reserva response time < 3000ms': (r) => r.timings.duration < 3000,
      'reserva tiene saga_id': (r) => {
        try {
          return JSON.parse(r.body).saga_id !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(res.status !== 201);
    latencyTrend.add(res.timings.duration);
    if (res.status === 201) successCount.add(1);
  });

  sleep(3);
}
