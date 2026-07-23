# Salon Booking & Marketplace — Microservices Platform

A multi-tenant salon booking and marketplace platform (web only) connecting
**customers**, **salon owners**, **staff**, and **platform administrators**, built as a
**microservices architecture** per the EC8208 Software Architecture design report.

All **11 services** from the report are implemented and running, fronted by an API
Gateway and connected through a RabbitMQ event bus:

> **Discover → book → pay → complete → review + earn loyalty**, with owner
> business management, analytics, and platform administration — end-to-end across
> real, independently deployable services on Postgres, MongoDB, Redis and RabbitMQ.

---

## Architecture

```
                          ┌──────────────┐
        React 18 SPA  ──▶ │ API Gateway  │  (JWT validation, rate limit,
      (Vite, host 5174)   │ (host 8090)  │   injects trusted x-user-* headers)
                          └──────┬───────┘
     ┌──────────┬──────────┬─────┼──────┬──────────┬──────────┬───────── … 11 services
     ▼          ▼          ▼     ▼      ▼          ▼          ▼
 Identity   Catalogue   Search  Booking Payment  Notification Review  Loyalty  Staff  Reporting  Admin
 (:3001)    (:3002)    (:3003) (:3004) (:3005)   (:3006)    (:3007) (:3008) (:3009) (:3010)  (:3011)
  SQL        Mongo      Mongo    SQL+    SQL      Mongo       Mongo    SQL     SQL     SQL      SQL
                                Redis
     └──────────┴──────────┴─────┴──────┴──────────┴──────────┴─────────────┘
                        RabbitMQ  (topic exchange: salon.events)
     Datastores:  PostgreSQL (per-service DBs) · MongoDB · Redis · RabbitMQ
```

### Services (Table 4.1 of the report)

| Service | Tech | Store | Responsibility |
|---|---|---|---|
| **Identity & Access** | NestJS | Postgres | Register/login, JWT (access + refresh), roles, `/auth/me`, seeded admin |
| **Salon & Catalogue** | NestJS | MongoDB | Salons, services, opening hours; publishes `salon.upserted`; consumes rating/status |
| **Search** | NestJS | MongoDB | CQRS read model built from catalogue events; discovery/filter API |
| **Booking** | NestJS | Postgres + Redis | Availability, double-booking prevention (Redis lock + SQL tx), saga, payment-timeout auto-release, appointment lifecycle (complete/no-show) |
| **Payment** | NestJS | Postgres | Mock gateway, commission split, refunds, saga events; live commission from Admin |
| **Notification** | NestJS | MongoDB | Multi-channel delivery log (push→email→sms fallback) driven by domain events |
| **Review** | NestJS | MongoDB | Reviews after completed bookings, owner replies, rating rollup → Catalogue/Search |
| **Loyalty** | NestJS | Postgres | Points accrual on completion, reversal on refund, tiers, ledger |
| **Staff** | NestJS | Postgres | Staff profiles, titles, skills, working days, leave; owner-managed |
| **Reporting & Analytics** | NestJS | Postgres | Owner dashboard (revenue, bookings, cancellation/no-show rates) from consumed events |
| **Admin** | NestJS | Postgres | Salon verification/suspension, disputes, commission configuration |
| **API Gateway** | Express | — | Single entry point, JWT verification, trusted-header injection, rate limiting |
| **Frontend** | React 18 + Vite + Redux Toolkit + React Query | — | Customer, owner & admin web portals |

### Key design decisions implemented
- **Redis slot locking** (`SETNX` + TTL) holds a slot during the payment window; expires automatically.
- **Choreographed saga**: `booking.pending → payment.completed → booking.confirmed`,
  with compensation `payment.failed / timeout → slot.freed`, and refunds on cancel/dispute.
- **CQRS**: Search never touches the transactional catalogue store — it consumes events into a denormalized read model.
- **Event-driven side effects**: completing an appointment fans out to Loyalty, Review, Notification and Reporting via one `booking.completed` event.
- **Database-per-service**: separate Postgres databases + separate Mongo databases per service.
- **API Gateway trust boundary**: services never see the JWT; the gateway injects `x-user-id` / `x-user-role` after verifying it (and strips any client-supplied identity headers).

---

## Running the stack

**Prerequisite:** Docker Desktop (Compose v2). You do **not** need Node on your host —
every service runs in a container on Node 20, compiled to a **production build**
(`node dist/main.js`) for low memory use and fast, stable startup.

```bash
# from the repo root
cp .env.example .env        # already done if .env exists
docker compose up -d        # first run builds images (a few minutes)
docker compose ps           # all services should be Up / healthy
```

When it settles:

| URL | What |
|---|---|
| http://localhost:5174 | Web app (React) |
| http://localhost:8090/health | Gateway health |
| http://localhost:15673 | RabbitMQ management UI (user/pass from `.env`) |

**Seeded admin login:** `admin@salon.local` / `admin12345`

> Infra host ports are offset (Mongo `27018`, Redis `6380`, RabbitMQ `5673`/`15673`,
> web `5174`, gateway `8090`) to avoid clashing with other local projects. Container-internal
> ports are standard, so this only affects how you reach them from the host. Override in `.env`.

> **Note:** services run a compiled build, so **source changes require a rebuild**
> (`docker compose up -d --build <service>`) rather than hot-reloading.

### End-to-end flow (in the browser)
1. **Sign up as an owner** → **Owner** tab appears. Create a salon, add a service, add staff.
2. **Log out**, **sign up as a customer** (or use incognito).
3. **Discover** → open the salon → pick service → date → slot → **Reserve** (Redis lock + `PENDING` booking).
4. **My Bookings → Pay** → the saga confirms the booking; an alert appears under **Alerts**.
5. Back as the **owner**, open **Owner → Appointments → Mark completed**.
6. As the customer: **Rewards** shows points, **My Bookings** lets you **leave a review**;
   the owner’s **Dashboard** reflects the revenue and completion.
7. As **admin** (`/admin`): adjust commission, verify/suspend salons, resolve disputes (with refund).

### Double-booking test
Reserve the same slot from two sessions simultaneously — the second is rejected
(`409 Conflict`) by the Redis lock + SQL conflict check.

---

## Roles

| Role | How to get it | Capabilities |
|---|---|---|
| **Customer** | Sign up (default) | Discover, book, pay, cancel, review, earn loyalty, alerts |
| **Owner** | Sign up → "Salon owner" | + create salons/services, manage staff, complete/no-show appointments, business dashboard |
| **Admin** | Seeded account | Commission config, salon verification/suspension, dispute resolution |
| **Staff** | Created by an owner | Managed as records (profile/skills/schedule); shown on the salon page. *No dedicated staff login portal yet.* |

---

## Repository layout

```
salon-booking-system/
├── docker-compose.yml          # full local stack (17 containers)
├── .env.example                # config template
├── docs/booking-workflow.html  # printable workflow document
├── infra/postgres/             # multi-database init script
├── gateway/                    # API gateway (Express)
├── services/
│   ├── identity-service/       # NestJS + Postgres
│   ├── catalogue-service/      # NestJS + MongoDB
│   ├── search-service/         # NestJS + MongoDB (read model)
│   ├── booking-service/        # NestJS + Postgres + Redis
│   ├── payment-service/        # NestJS + Postgres
│   ├── notification-service/   # NestJS + MongoDB
│   ├── review-service/         # NestJS + MongoDB
│   ├── loyalty-service/        # NestJS + Postgres
│   ├── staff-service/          # NestJS + Postgres
│   ├── reporting-service/      # NestJS + Postgres
│   └── admin-service/          # NestJS + Postgres
└── frontend/                   # React 18 + Vite (customer/owner/admin portals)
```

## Domain events (RabbitMQ topic: `salon.events`)

| Routing key | Producer | Consumers |
|---|---|---|
| `salon.upserted` | Catalogue | Search |
| `salon.rating.updated` | Review | Catalogue → (re-emits `salon.upserted`) |
| `admin.salon.status` | Admin | Catalogue → Search |
| `commission.updated` | Admin | Payment |
| `booking.pending` | Booking | Payment, Reporting |
| `payment.completed` | Payment | Booking |
| `payment.failed` | Payment | Booking |
| `booking.confirmed` | Booking | Notification, Reporting |
| `booking.completed` | Booking | Loyalty, Review, Notification, Reporting |
| `booking.no_show` | Booking | Reporting |
| `slot.freed` | Booking | Payment, Notification |
| `booking.cancelled` | Booking / Admin | Payment (refund), Reporting, Notification |
| `payment.refunded` | Payment | Loyalty (reversal) |

---

## Data stores

| Store | Host port | Databases |
|---|---|---|
| PostgreSQL | 5432 | `identity_db`, `booking_db`, `payment_db`, `loyalty_db`, `staff_db`, `reporting_db`, `admin_db` |
| MongoDB | 27018 | `catalogue_db`, `search_db`, `notification_db`, `review_db` |
| Redis | 6380 | slot locks |
| RabbitMQ | 5673 (AMQP) / 15673 (UI) | topic exchange `salon.events` |

Inspect data with **MongoDB Compass** (`mongodb://localhost:27018`) or a Postgres client
(`localhost:5432`, user `salon` / `salon_pw`).

---

## Roadmap (remaining)

The 11-service core and all main flows are complete. Still to build (extra features from
the report): a **staff login portal** (staff see only their assigned appointments and mark
arrivals), **waiting lists**, an **owner drag-and-drop calendar**, and **2FA** for owner/admin
accounts. The event backbone is already in place for these to plug into.
