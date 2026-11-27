---
# All definitions are new copy, written as general explanations of terms used
# on this site: please review. They state nothing about YBX Labs beyond linking
# each term to the page where the company uses it.
title: Glossary of AI, Web3 and software terms
description: >-
  Plain definitions of the AI, Web3 and software engineering terms used by
  YBX Labs, from AI agents and RAG to smart contracts and Statements of Work.
updatedAt: 2026-11-27
heading: Glossary
lead: >-
  Plain definitions of the terms used across this site, in alphabetical order.
  Each one links to the page where it matters.
terms:
  - term: AI agent
    id: ai-agent
    aka: [autonomous agent]
    definition: A program that uses a language model to plan and carry out a task in several steps, calling tools along the way, instead of answering a single prompt.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: AI gateway
    id: ai-gateway
    aka: [AI asset management, LLM gateway]
    definition: A service that stands in front of several AI providers and exposes them through one API. Applications call the gateway, and the gateway holds the provider keys and forwards each request.
    see: { label: FlavorAI API, href: /products/flavorai-api }
  - term: AI orchestration
    id: ai-orchestration
    aka: [multi-model orchestration]
    definition: Coordinating more than one AI model, and the steps between them, to complete a task. Orchestration decides which model handles which request and what happens to each result.
    see: { label: FlavorAI, href: /products/flavorai }
  - term: API
    id: api
    aka: [application programming interface]
    definition: A defined way for one piece of software to ask another to do something. Web APIs are called over HTTP, usually with a key that identifies the caller.
    see: { label: FlavorAI API, href: /products/flavorai-api }
  - term: CI/CD
    id: ci-cd
    aka: [continuous integration, continuous delivery]
    definition: The practice of automatically building, testing and releasing software every time the code changes, so releases are small, frequent and repeatable.
    see: { label: Software development, href: /services/development }
  - term: Concurrency
    id: concurrency
    definition: A system's ability to handle many tasks or requests at the same time. High concurrency is what lets a backend serve many users without slowing down.
    see: { label: Architecture planning, href: /services/architectural-planning }
  - term: Containerization
    id: containerization
    aka: [Docker containers]
    definition: Packaging an application together with everything it needs to run, so it behaves the same on a laptop, a staging server and production. Docker is the most widely used tool for it.
    see: { label: Architecture planning, href: /services/architectural-planning }
  - term: Cross-verification
    id: cross-verification
    definition: Giving the same task to more than one AI model and comparing the answers before one is used, to catch errors that a single model would not flag.
    see: { label: FlavorAI, href: /products/flavorai }
  - term: dApp
    id: dapp
    aka: [decentralized application]
    definition: An application whose core logic runs as smart contracts on a blockchain instead of on servers owned by one company.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: DeFi
    id: defi
    aka: [decentralized finance]
    definition: Financial services such as lending, trading and providing liquidity, run by smart contracts on a blockchain without a bank or broker in the middle.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: Dependency audit
    id: dependency-audit
    definition: A review of every open-source package a piece of software relies on, looking for known security vulnerabilities and for license terms that conflict with how the software is used.
    see: { label: Open-source management, href: /services/open-source }
  - term: Fine-tuning
    id: fine-tuning
    definition: Continuing the training of an existing AI model on a smaller, specialized set of examples so that it performs better on one kind of task.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Foundation model
    id: foundation-model
    definition: A large AI model trained on broad data that can be adapted to many tasks. The large language models from providers such as OpenAI, Anthropic and Google are foundation models.
    see: { label: FlavorAI, href: /products/flavorai }
  - term: Hallucination
    id: hallucination
    definition: An answer from an AI model that sounds confident but is factually wrong or invented. It is a known limit of language models, which is why their output needs checking.
    see: { label: FlavorAI, href: /products/flavorai }
  - term: Large language model
    id: large-language-model
    aka: [LLM]
    definition: An AI model trained on very large amounts of text to predict and generate language. It can answer questions, write, summarize and, when given tools, take actions.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Layer 2
    id: layer-2
    aka: [L2]
    definition: A blockchain network built on top of another blockchain to process transactions faster and more cheaply, while relying on the underlying chain for security.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: MCP
    id: mcp
    aka: [Model Context Protocol]
    definition: An open standard for connecting AI models to external tools and data sources. A tool exposed as an MCP server can be used by any AI application that supports the protocol.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Microservices
    id: microservices
    definition: A way of building an application as a set of small services that each do one job and communicate over a network, instead of as one large program (a monolith).
    see: { label: Software development, href: /services/development }
  - term: Net 30
    id: net-30
    definition: A payment term meaning an invoice is due within 30 days of its date.
    see: { label: Payment & Refund Policy, href: /refund-policy }
  - term: Node
    id: node
    aka: [blockchain node]
    definition: A computer that runs a blockchain's software, keeps a copy of the ledger and relays or validates transactions. Applications reach a blockchain through a node.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: OpenAI-compatible API
    id: openai-compatible-api
    definition: An API that accepts requests in the same format as OpenAI's API. Software written for that format can use any compatible service by changing only the address and the key.
    see: { label: FlavorAI API, href: /products/flavorai-api }
  - term: OpenAPI
    id: openapi
    definition: A standard format for describing an HTTP API, with its addresses, inputs and outputs. Given an OpenAPI description, software, including an AI model, can work out how to call the API.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Open-source software
    id: open-source-software
    aka: [OSS]
    definition: Software whose source code anyone may use, study, change and share under the terms of its license. Each license sets its own conditions.
    see: { label: Open-source management, href: /services/open-source }
  - term: RAG
    id: rag
    aka: [retrieval-augmented generation]
    definition: A technique in which relevant passages are fetched from your own documents and given to an AI model together with the question, so that the answer is grounded in your data.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Service Level Agreement
    id: service-level-agreement
    aka: [SLA]
    definition: A contract term that sets measurable service standards, such as uptime, and what the customer receives if they are not met.
    see: { label: Terms & Conditions, href: /terms-conditions }
  - term: Smart contract
    id: smart-contract
    definition: A program stored on a blockchain that runs exactly as written when its conditions are met. Once deployed it usually cannot be changed, so it is reviewed carefully beforehand.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: Statement of Work
    id: statement-of-work
    aka: [SOW]
    definition: A document agreed before a project starts that sets out its deliverables, timeline and payment schedule.
    see: { label: Terms & Conditions, href: /terms-conditions }
  - term: Telemetry
    id: telemetry
    definition: Measurements that a running system reports about itself, such as speed, errors and usage, so that its behavior can be monitored and improved.
    see: { label: Architecture planning, href: /services/architectural-planning }
  - term: Token
    id: token
    definition: In AI, a small piece of text, roughly a word or part of one; model usage and limits are counted in tokens. In blockchain, a digital asset recorded on a ledger.
    see: { label: FlavorAI, href: /products/flavorai }
  - term: Udyam registration
    id: udyam-registration
    definition: The Government of India's registration for micro, small and medium enterprises. A registered business receives a Udyam registration number.
    see: { label: About YBX Labs, href: /about-us }
  - term: Vector database
    id: vector-database
    definition: A database that stores text and other content as numerical vectors and finds items by similarity of meaning. It is the usual store behind retrieval-augmented generation.
    see: { label: FlavorGPT, href: /products/flavorgpt }
  - term: Web3
    id: web3
    definition: A general name for applications built on blockchains, where records and assets are held on a shared ledger instead of in one company's database.
    see: { label: Web3 and blockchain development, href: /services/web3 }
  - term: White label
    id: white-label
    definition: A product made by one company that another company sells under its own brand.
    see: { label: FlavorGPT, href: /products/flavorgpt }
---
