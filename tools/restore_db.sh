#!/bin/zsh

set -e

source .env

echo "Dumping prod database..."
PGPASSWORD=${DATABASE_PASSWORD} pg_dump ${DATABASE_NAME} \
	-h ${DATABASE_HOST} \
	-U ${DATABASE_USER} \
	-p 5432 \
	--no-acl \
	--no-privileges \
	--no-owner \
	--format=custom \
	--exclude-schema=cron \
	-f /tmp/i9000-$(date +"%Y-%m-%d").dump

echo "Recreating local database..."
dropdb --if-exists --force ${LOCAL_DB_NAME}
createdb ${LOCAL_DB_NAME}

echo "Restoring local database..."
pg_restore \
	--no-privileges \
	--no-owner \
	--format=custom \
	--exclude-schema=cron \
	--role=${LOCAL_DB_ROLE} \
	-d ${LOCAL_DB_NAME} \
	/tmp/i9000-$(date +"%Y-%m-%d").dump

echo "Done with all."
