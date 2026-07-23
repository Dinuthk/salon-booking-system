#!/bin/bash
# Creates one logical database per SQL microservice inside the shared
# Postgres instance (database-per-service pattern).
set -e

create_db() {
  local db="$1"
  echo "  -> creating database '$db'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE $db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
}

for db in "$IDENTITY_DB" "$BOOKING_DB" "$PAYMENT_DB" \
          "$LOYALTY_DB" "$STAFF_DB" "$REPORTING_DB" "$ADMIN_DB"; do
  if [ -n "$db" ]; then
    create_db "$db"
  fi
done

echo "Multiple databases created."
