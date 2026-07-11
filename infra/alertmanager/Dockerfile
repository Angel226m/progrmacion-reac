FROM prom/alertmanager:v0.28.1
USER alertmanager:alertmanager
COPY alertmanager.yml /etc/alertmanager/alertmanager.yml
EXPOSE 9093
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost:9093/-/ready || exit 1
