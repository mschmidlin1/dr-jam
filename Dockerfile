FROM nginx:alpine

COPY nginx-default.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/
COPY resources/ /usr/share/nginx/resources/

EXPOSE 80
