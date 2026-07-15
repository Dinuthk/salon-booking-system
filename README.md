# Salon Booking & Marketplace — Microservices Platform

A multi-tenant salon booking and marketplace platform (web only) connecting
**customers**, **salon owners/staff**, and **platform administrators**, built as a
**microservices architecture** per the EC8208 Software Architecture design report.

This repository currently implements the **core booking vertical slice**:

> **Auth → browse/search salons → pick a slot → book → pay** — end-to-end,
> across real, independently deployable services with Postgres, MongoDB, Redis
> and RabbitMQ.

---

## Architecture (this slice)

```
                         ┌──────────────┐
        React 18 SPA ──▶ │ API Gateway  │  (JWT validation, rate limit,
      (Vite, host 5174)  │ (host 8090)  │   injects x-user-* headers)
                         └──────┬───────┘
        ┌───────────────┬───────┼─────────────┬──────────────┐
        ▼               ▼       ▼             ▼              ▼
 ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐
 │  Identity  │ │ Catalogue  │ │  Search  │ │  Booking  │ │  Payment  │
 │  (:3001)   │ │  (:3002)   │ │ (:3003)  │ │  (:3004)  │ │  (:3005)  │
 │  Postgres  │ │  MongoDB   │ │ MongoDB  │ │ Postgres  │ │ Postgres  │
 └────────────┘ └─────┬──────┘ └────▲─────┘ └────┬──────┘ └────┬──────┘
                      │  events      │            │  Redis     │
                      └──────────────┴────────────┴────────────┘
                             RabbitMQ  (topic exchange: salon.events)
```

| Service | Tech | Store | Responsibility |
|---|---|---|---|
| **Identity & Access** | NestJS | Postgres | Register/login, JWT (access + refresh), roles, `/auth/me` |
| **Salon & Catalogue** | NestJS | MongoDB | Salons, branches, services; publishes `salon.upserted` |
| **Search** | NestJS | MongoDB | CQRS read model built from catalogue events; discovery API |
| **Booking** | NestJS | Postgres + Redis | Slot availability, double-booking prevention (Redis lock + SQL tx), saga, auto-release on payment timeout |
| **Payment** | NestJS | Postgres | Mock gateway, commission split, refunds, saga events |
| **API Gateway** | Express | — | Single entry point, JWT verification, trusted-header injection, rate limiting |
| **Frontend** | React 18 + Vite + Redux Toolkit + React Query | — | Customer + owner web portals |

### Key design decisions implemented
- **Redis slot locking** (`SETNX` + TTL) holds a slot during the payment window; expires automatically.
- **Choreographed saga**: `booking.pending → payment.completed → booking.confirmed`,
  with compensation `payment.failed / timeout → slot.freed` (and refund on cancel of a paid booking).
- **CQRS**: Search never touches the transactional catalogue store — it consumes events into a denormalized read model.
- **Database-per-service**: separate Postgres databases + separate Mongo databases.
- **API Gateway trust boundary**: services never see the JWT; the gateway injects `x-user-id` / `x-user-role` after verifying it (and strips any client-supplied identity headers).

---

## Running the stack

**Prerequisite:** Docker Desktop (Compose v2). You do **not** need Node on your host —
everything runs in containers on Node 20. (Your host Node 16 is too old for the tooling,
which is why the stack is Docker-first.)

```bash
# from the repo root
cp .env.example .env        # already done if .env exists
docker compose up --build
```

First build pulls images and installs dependencies (a few minutes). When it settles:

| URL | What |
|---|---|
| http://localhost:5174 | Web app (React) |
| http://localhost:8090/health | Gateway health |
| http://localhost:15673 | RabbitMQ management UI (user/pass from `.env`) |

> Infra host ports are offset (Mongo `27018`, Redis `6380`, RabbitMQ `5673`/`15673`,
> web `5174`) to avoid clashing with other local projects. Container-internal ports
> are standard, so this only affects how you reach them from the host. Override in `.env`.

### Try the end-to-end flow (in the browser)
1. **Sign up as an owner** → you'll see the **Owner** tab. Create a salon and add a service.
2. **Log out**, **sign up as a customer** (or use another browser/incognito).
3. On **Discover**, open the salon → pick the service → choose a date → pick a slot → **Reserve**.
   - The slot is now held (Redis lock) and a **pending** booking + payment are created via the saga.
4. Go to **My Bookings** → **Pay with card** (mock gateway). The saga confirms the booking within a few seconds.
   - Or wait ~10 min without paying and the slot auto-releases (payment timeout job).

### Double-booking test
Try reserving the same slot from two sessions simultaneously — the second is rejected
(`409 Conflict`) by the Redis lock + SQL conflict check.

---

## Repository layout

```
salon-booking-system/
├── docker-compose.yml          # full local stack
├── .env.example                # config template
├── infra/postgres/             # multi-database init script
├── gateway/                    # API gateway (Express)
├── services/
│   ├── identity-service/       # NestJS + Postgres
│   ├── catalogue-service/      # NestJS + MongoDB
│   ├── search-service/         # NestJS + MongoDB (read model)
│   ├── booking-service/        # NestJS + Postgres + Redis
│   └── payment-service/        # NestJS + Postgres
└── frontend/                   # React 18 + Vite
```

## Domain events (RabbitMQ topic: `salon.events`)

| Routing key | Producer | Consumers |
|---|---|---|
| `salon.upserted` | Catalogue | Search |
| `booking.pending` | Booking | Payment |
| `payment.completed` | Payment | Booking |
| `payment.failed` | Payment | Booking |
| `booking.confirmed` | Booking | (future: notifications, loyalty) |
| `slot.freed` | Booking | Payment |
| `booking.cancelled` | Booking | Payment (refund) |
| `payment.refunded` | Payment | (future) |

---

## Roadmap (not yet in this slice)

The report defines 11 services. Still to build: **Staff**, **Notification**, **Review**,
**Loyalty**, **Reporting & Analytics**, **Admin**, plus owner calendar/scheduling,
waiting lists, and the admin console. The event backbone and gateway are already in place
for these to plug into.
