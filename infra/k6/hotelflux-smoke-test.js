import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginLatency = new Trend('login_latency');
const apiLatency = new Trend('api_latency');

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    login_latency: ['p(95)<2000'],
    api_latency: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health status is 200': (r) => r.status === 200 });

  const login = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@hotelflux.com',
    password: 'test123',
  }), { headers: { 'Content-Type': 'application/json' } });
  loginLatency.add(login.timings.duration);
  errorRate.add(login.status !== 200);
  check(login, { 'login success': (r) => r.status === 200 });

  if (login.status === 200) {
    const token = login.json('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const rooms = http.get(`${BASE_URL}/api/v1/habitaciones`, { headers });
    apiLatency.add(rooms.timings.duration);
    errorRate.add(rooms.status !== 200);
    check(rooms, { 'rooms list status 200': (r) => r.status === 200 });

    const reservations = http.get(`${BASE_URL}/api/v1/reservas`, { headers });
    apiLatency.add(reservations.timings.duration);
    errorRate.add(reservations.status !== 200);
    check(reservations, { 'reservations list status 200': (r) => r.status === 200 });
  }

  sleep(1);
}
