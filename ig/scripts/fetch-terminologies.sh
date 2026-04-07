#!/usr/bin/env bash
# Baixa dados-fonte das terminologias brasileiras para ig/scripts/data/.
#
# Uso: bash ig/scripts/fetch-terminologies.sh
#
# Fontes:
#   - CID-10 pt-BR: DATASUS (CID10CSV.ZIP — ISO-8859-1, separador ;)
#   - IBGE municípios: API servicodados.ibge.gov.br (JSON)
#
# Os arquivos baixados NÃO devem ser comitados (ver .gitignore).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"

mkdir -p "${DATA_DIR}/cid10" "${DATA_DIR}/ibge"

# ── CID-10 pt-BR ──────────────────────────────────────────────
CID10_URL="https://ftp.cdc.gov.br/DATASUS/CID10CSV.ZIP"
CID10_ZIP="${DATA_DIR}/cid10/CID10CSV.ZIP"

if [ ! -f "${DATA_DIR}/cid10/CID-10-CATEGORIAS.CSV" ]; then
  echo "Baixando CID-10 do DATASUS..."
  curl -fSL --retry 3 --retry-delay 5 -o "${CID10_ZIP}" "${CID10_URL}"
  unzip -o -d "${DATA_DIR}/cid10" "${CID10_ZIP}"
  rm -f "${CID10_ZIP}"
  echo "CID-10 extraído em ${DATA_DIR}/cid10/"
else
  echo "CID-10 já existe em ${DATA_DIR}/cid10/ — pulando download"
fi

# ── IBGE municípios ───────────────────────────────────────────
IBGE_URL="https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"
IBGE_JSON="${DATA_DIR}/ibge/municipios.json"

if [ ! -f "${IBGE_JSON}" ]; then
  echo "Baixando municípios do IBGE..."
  curl -fSL --retry 3 --retry-delay 5 -o "${IBGE_JSON}" "${IBGE_URL}"
  echo "IBGE municípios salvo em ${IBGE_JSON}"
else
  echo "IBGE municípios já existe em ${IBGE_JSON} — pulando download"
fi

echo "Dados-fonte baixados com sucesso."
