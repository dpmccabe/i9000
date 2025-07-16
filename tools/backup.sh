#!/bin/zsh

set -e

source .env

echo "Emptying mp3 trash..."
aws s3 rm s3://${BUCKET_NAME}/trash/ --recursive --profile ${AWS_PROFILE_NAME}

echo "Emptying incoming folder..."
aws s3 rm s3://${BUCKET_NAME}/incoming/ --recursive --profile ${AWS_PROFILE_NAME}

echo "Syncing mp3s down..."
aws s3 sync s3://${BUCKET_NAME}/mp3s ${BACKUP_PATH}/mp3s --delete --profile ${AWS_PROFILE_NAME}

echo "Running do_backup.py..."
poetry run python do_backup.py

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
	-f ${BACKUP_PATH}/database/$(date +"%Y-%m-%d").sql

echo "Backing up prod database on S3..."
aws s3 sync ${BACKUP_PATH}/database s3://${BUCKET_NAME}/database --exclude "*.DS_Store*" --delete --profile=${AWS_PROFILE_NAME}

echo "Backing up code..."
rsync -a \
	--exclude "__pycache__" \
	--exclude ".git" \
	--exclude ".gitignore" \
	--exclude ".idea" \
	--exclude ".venv" \
	--exclude ".env" \
	--exclude "*.env" \
	--exclude "node_modules" \
	--exclude ".cert" \
	--delete \
	${CODE_PATH}/ ${BACKUP_PATH}/code/

echo "Backing up code on S3..."
aws s3 sync ${BACKUP_PATH}/code s3://${BUCKET_NAME}/code --exclude "*.DS_Store*" --delete --profile=${AWS_PROFILE_NAME}

echo "Done with all."
