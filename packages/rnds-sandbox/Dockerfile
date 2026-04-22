FROM node:22-alpine

RUN apk add --no-cache tini \
  && npm install -g @precisa-saude/fhir-rnds-sandbox

EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--", "rnds-sandbox"]
CMD ["start", "--host", "0.0.0.0"]
