FROM postgres:15-alpine
COPY schema.sql /docker-entrypoint-initdb.d/schema.sql
