FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY src /usr/share/nginx/html/src
COPY data /usr/share/nginx/html/data
COPY config /usr/share/nginx/html/config
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/web/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80
