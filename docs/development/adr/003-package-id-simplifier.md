# ADR-003: Package ID e publicação no FHIR Package Registry (Simplifier)

**Data:** 2026-04-07
**Status:** Aceito

## Contexto

O Implementation Guide do fhir-brasil (perfis, extensões, terminologias FSH) precisa ser distribuído como pacote FHIR para que ferramentas como SUSHI, IG Publisher, HAPI FHIR, Medplum e Firely Terminal possam consumi-lo via o mecanismo padrão de dependência FHIR. Isso requer um package ID permanente e a escolha de um registry.

O FHIR NPM Package Spec define que pacotes usam namespaces separados por ponto (ex: `hl7.fhir.us.core`), e ferramentas FHIR **não** procuram pacotes no npmjs.com — o canal correto é um FHIR Package Registry como o Simplifier.

O package ID anterior era `br.fhir-brasil`, que não seguia a convenção reverse-DNS e não permitia expansão para sub-IGs.

## Decisão

1. Adotar `br.dev.fhir-brasil.core` como package ID.
2. Publicar no Simplifier (packages.simplifier.net) como registry primário.
3. Automatizar publicação no CI via API REST do Simplifier em cada release.

## Argumentos a favor

### Package ID `br.dev.fhir-brasil.core`

- **Reverse-DNS de `fhir-brasil.dev.br`**: torna a origem do pacote imediatamente identificável, seguindo a convenção da comunidade FHIR.
- **Prefixo `br`**: alinha com IGs nacionais (`hl7.fhir.us.core`, `hl7.fhir.uk.core`). Identifica como infraestrutura FHIR brasileira ao navegar registries.
- **Sufixo `.core`**: permite expansão futura para sub-IGs (ex: `br.dev.fhir-brasil.lab`, `br.dev.fhir-brasil.rnds`) sob o mesmo namespace.
- **Disponibilidade verificada**: nenhum conflito com pacotes existentes no Simplifier.

### Simplifier como registry

- **Registry mais estabelecido** da comunidade FHIR, usado pela HL7 e IGs nacionais (US Core, UK NHS, Suíça, Holanda).
- **Conta gratuita** para projetos open-source.
- **API REST** para automação de publicação.
- **Integração nativa** com `fhir install` CLI e SUSHI `dependencies`.

## Argumentos contra

- **Self-hosted em fhir-brasil.dev.br**: daria controle total, mas o custo de manter um package registry próprio não se justifica no estágio atual do projeto.
- **`br.com.precisa-saude.fhir`**: vincularia o pacote à empresa em vez do projeto open-source. `fhir-brasil.dev.br` é o domínio do projeto, não da empresa.
- **Sufixo `.core` pode ser prematuro**: se nenhum sub-IG for criado, o `.core` é redundante. Porém, remover depois é impossível (porta sem volta), e adicionar é trivial no namespace.
- **packages.fhir.org / registry.fhir.org**: são catálogos oficiais HL7, mas requerem processo de submissão separado. Podem ser adicionados depois que a publicação no Simplifier estiver estável.

## Consequências

- **Porta sem volta**: uma vez publicado, renomear o package ID quebra todos os consumidores downstream. A decisão está documentada aqui para referência futura.
- **CI**: o workflow de release precisa de um secret `SIMPLIFIER_API_KEY` para upload automático.
- **Versionamento independente**: a versão do IG (`0.9.0`) é gerenciada manualmente em `sushi-config.yaml`, independente do semantic-release que versiona os pacotes npm. Isso é intencional — o IG segue seu próprio ritmo de publicação.
- **ig.ini e outputs**: todos os arquivos gerados pelo SUSHI agora referenciam `br.dev.fhir-brasil.core` em vez de `br.fhir-brasil`.
- **registry.fhir.org**: inclusão no catálogo oficial HL7 fica para ticket futuro, após validação da publicação no Simplifier.
