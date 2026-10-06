# Laudo de demonstração

Dois arquivos fictícios, com os mesmos dados, para rodar os comandos de linha
de comando dos pacotes sem precisar de um laudo de verdade. Nenhum dado aqui
vem de paciente.

- `exame.txt`: texto como sai de um OCR, com o nome do exame e o valor na
  mesma linha. `HDL-c` está lá de propósito, porque não é uma grafia do
  catálogo e não deve casar.
- `exame.json`: o mesmo laudo já estruturado, no formato que o
  `fhir-bio convert` recebe.

```bash
curl -sLO https://raw.githubusercontent.com/Precisa-Saude/fhir-brasil/main/examples/laudo-demo/exame.txt
curl -sLO https://raw.githubusercontent.com/Precisa-Saude/fhir-brasil/main/examples/laudo-demo/exame.json

npx -p @precisa-saude/fhir-ocr-utils fhir-ocr find exame.txt
npx -p @precisa-saude/fhir fhir-bio convert exame.json | npx -p @precisa-saude/fhir fhir-bio validate
```

Os comandos rodam em Node 22.
