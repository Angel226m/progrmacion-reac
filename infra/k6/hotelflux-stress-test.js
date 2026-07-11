import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency_p95');

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    api_latency_p95: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://nginx:80';

export default function () {
  const endpoints = [
    { path: '/api/v1/habitaciones', method: 'GET', body: null },
    { path: '/api/v1/habitaciones/disponibles', method: 'GET', body: null },
    { path: '/api/v1/servicios', method: 'GET', body: null },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.request(endpoint.method, `${BASE_URL}${endpoint.path}`, endpoint.body, params);

  apiLatency.add(res.timings.duration);
  errorRate.add(res.status >= 400);
  check(res, { [`${endpoint.path} success`]: (r) => r.status < 400 });

  sleep(Math.random() * 2 + 0.5);
}
