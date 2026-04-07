# ADR-002: Excluir CBHPM como CodeSystem separado

**Data:** 2026-04-07
**Status:** Aceito

## Contexto

Ao adicionar terminologias brasileiras ao IG (TUSS, TISS, CID-10, SUS raça/cor, IBGE município, CNES), avaliamos se a CBHPM (Classificação Brasileira Hierarquizada de Procedimentos Médicos) deveria ser incluída como CodeSystem separado.

## Decisão

Não incluir a CBHPM como CodeSystem no IG.

## Argumentos a favor (excluir)

- **Licenciamento comercial:** A CBHPM é publicação comercial co-editada pela Editora Manole e AMB (Associação Médica Brasileira), vendida em amb.org.br/cbhpm. Direitos reservados à AMB. Não pode ser redistribuída sem licença paga.
- **Redundância com TUSS:** A TUSS é a republicação da CBHPM pela ANS (Agência Nacional de Saúde Suplementar) sob autoridade regulatória. Incluir TUSS já cobre a necessidade de códigos de procedimentos para o contexto de saúde suplementar.
- **Incompatibilidade com licença Apache-2.0:** O projeto fhir-brasil é Apache-2.0 e gratuito. Redistribuir conteúdo da CBHPM violaria os termos de licenciamento da AMB.
- **TUSS é dado aberto:** Publicada pela ANS em gov.br e dados.gov.br como dado aberto, conforme Lei de Acesso à Informação (Lei 12.527/2011).

## Argumentos contra (incluir)

- **Uso em saúde privada:** Alguns sistemas de saúde privada referenciam CBHPM diretamente em vez de TUSS.
- **Granularidade:** A CBHPM pode ter descrições mais detalhadas que a TUSS em alguns casos.

## Consequências

- Sistemas que precisam de códigos CBHPM devem usar TUSS como equivalente funcional no contexto de saúde suplementar.
- Se no futuro a AMB liberar a CBHPM para uso aberto, esta decisão pode ser revisitada.
- A decisão está documentada no ig/README.md na seção "Terminologias brasileiras incluídas".
