---
# Source: the FlavorGPT hero and "Highlighted features" on the previous home
# page, and the product screenshots published there. Feature texts are as
# published, except that the two features with claims we could not check
# (the "100+ LLMs" list of model names, and SOC2/GDPR/HIPAA) are left on the
# home page only. Statements about tools, knowledge bases, assistants, custom
# models and the admin console describe what the screenshots show.
# The explanations of MCP and RAG, "Who it is for" and the FAQ are new copy: please review.
title: "FlavorGPT: AI workspace for models, tools and agents"
description: >-
  FlavorGPT by YBX Labs is an AI workspace: chat with many language models,
  connect them to your tools and data, and run agents on multi-step work.
updatedAt: 2026-11-27
name: FlavorGPT
navTitle: FlavorGPT
code: P-01
order: 1
category: AI workspace
website:
  label: Visit flavor-ai.tech
  href: https://flavor-ai.tech/
summary: >-
  FlavorGPT is an AI workspace made by YBX Labs. It gives one interface for
  chatting with many language models, connecting them to your own tools and
  data, and running agents that carry out multi-step work. In our words: AI
  that works with your tools, not just your prompts.
facts:
  - label: Type
    value: AI chat and agent workspace
  - label: Made by
    value: YBX Labs
  - label: Website
    value: "[flavor-ai.tech](https://flavor-ai.tech/)"
  - label: Models
    value: Leading foundation models such as Claude, OpenAI and Gemini, plus custom models through any OpenAI SDK-compatible endpoint
  - label: Tools
    value: MCP servers and OpenAPI tools
  - label: Your data
    value: Knowledge bases built from files, URLs and notes
  - label: For businesses
    value: White-label branding, an admin console and built-in payments (Stripe, PayPal, crypto)
features:
  - title: Multi-model orchestration
    text: Seamlessly route requests and chat across leading foundation models like Claude, OpenAI, and Gemini from a single, unified interface.
  - title: Autonomous agents
    text: Deploy intelligent agents that autonomously execute complex workflows, reason through multi-step problems, and deliver finished results.
  - title: MCP and tool integration
    text: Connect your AI directly to your existing databases, APIs, and enterprise toolstack so it can take real action.
  - title: Live data retrieval (RAG)
    text: Ground your AI's outputs in your actual company data, allowing it to operate intelligently on your private knowledge base.
  - title: Custom model training
    text: Fine-tune and train dedicated models exclusively on your proprietary enterprise data for highly specialized tasks.
  - title: Custom model endpoints
    text: Add your own model by connecting any OpenAI SDK-compatible endpoint, and make it available in the model selector.
  - title: Integrated code deployment
    text: Generate, preview, and deploy functional code directly within the interface without needing to switch contexts or tabs.
  - title: White-label infrastructure
    text: Ship our robust AI operating layer directly to your customers as your own fully branded product.
  - title: Flexible monetization
    text: Instantly monetize your AI deployments with built-in payment integrations for Stripe, PayPal, and crypto.
  - title: Centralized operational dashboard
    text: Manage your entire AI ecosystem, monitor usage telemetry, and control API keys from a single command center.
  - title: Privacy by default
    text: Ensure maximum security with strictly anonymous usage options and zero-retention policies for your sensitive inputs.
figures:
  - src: products/flavorgpt/chat.png
    alt: FlavorGPT start screen with a chat history sidebar on the left and a prompt box in the center that has a reasoning mode and a model picker.
    caption: The chat workspace. The prompt box has a model picker and a reasoning mode.
  - src: products/flavorgpt/mcp-server-tool.png
    alt: FlavorGPT Create Tool panel with the MCP Server tab selected, showing quick setup and a catalog of MCP templates that includes GitHub and Notion.
    caption: Adding an MCP server from the built-in catalog.
  - src: products/flavorgpt/openapi-tool.png
    alt: FlavorGPT Create Tool panel with the OpenAPI Tool tab selected, with fields for a base URL, custom headers and a schema.
    caption: Adding a tool from an OpenAPI schema.
  - src: products/flavorgpt/assistant.png
    alt: FlavorGPT Create Assistant panel with fields for name, description, model, prompt, files and knowledge bases, conversation starters and public or private permissions.
    caption: Creating an assistant with its own model, prompt and knowledge.
  - src: products/flavorgpt/knowledge-base.png
    alt: FlavorGPT Create Knowledge base panel with options to select indexed files, upload new files, add URL sources and add notes.
    caption: Building a knowledge base from files, URLs and notes.
  - src: products/flavorgpt/custom-model.png
    alt: FlavorGPT Create Model panel for adding a custom model through an OpenAI SDK-compatible endpoint, with fields for model ID, endpoint URL, API key and API type.
    caption: Connecting a custom model through an OpenAI SDK-compatible endpoint.
  - src: products/flavorgpt/chat-settings.png
    alt: FlavorGPT Chat Settings panel on the Message tab, with options for message style, group style, navigation bar and message font size.
    caption: Chat settings for each user.
  - src: products/flavorgpt/admin-models.png
    alt: FlavorGPT admin console Models page, listing models by provider with status, tier and limits, below a Tool Workflow Safety section with limits for rounds, tool calls and execution time.
    caption: The admin console, with models, providers and safety limits for tool workflows.
  - src: products/flavorgpt/white-label.png
    alt: FlavorGPT admin console Customize White Label page with fields for brand name, company name, website URL and product description, a login redirect setting and logo uploads.
    caption: White-label settings for brand identity, redirects and brand assets.
faq:
  - q: What is FlavorGPT?
    a: FlavorGPT is an AI workspace made by YBX Labs. It gives one interface for chatting with many language models, connecting them to your tools and data, and running agents on multi-step work.
  - q: How is FlavorGPT different from FlavorAI?
    a: FlavorGPT is the workspace people use directly. [FlavorAI](/products/flavorai) is the orchestration platform built on the foundation of the FlavorGPT architecture, designed to sit between your enterprise applications and language models.
  - q: Can FlavorGPT use my own tools and data?
    a: Yes. Tools are added as MCP servers or as OpenAPI tools, and data is added as knowledge bases built from files, URLs and notes.
  - q: Can I connect my own model?
    a: Yes. A custom model is added by connecting any OpenAI SDK-compatible endpoint, with a model ID, an endpoint URL and an API key.
  - q: Can I offer FlavorGPT under my own brand?
    a: Yes. White-label settings let you ship it to your customers as your own branded product, with your brand name, website, logo and favicon.
  - q: Where can I learn more or try it?
    a: The product site is [flavor-ai.tech](https://flavor-ai.tech/). For a business deployment, [contact us](/contact-us).
related:
  - /products/flavorai
  - /products/flavorai-api
  - /services/consulting
---

## What FlavorGPT is

FlavorGPT is a single workspace for working with AI models. Instead of one chat window tied to one provider, it lets a person or a team talk to many models, give those models access to real tools and company data, and hand multi-step tasks to agents.

Our short description of it is: AI that works with your tools, not just your prompts.

## Working with your tools

A language model on its own can only produce text. To look something up in a database, call an API or change a record, it needs tools. FlavorGPT adds tools in two ways:

- **MCP servers.** MCP, the Model Context Protocol, is an open standard for connecting AI models to external tools and data sources. FlavorGPT can connect to MCP servers, and includes a catalog of ready-made templates for services such as GitHub and Notion.
- **OpenAPI tools.** Any API that has an OpenAPI schema can be added as a tool by giving its base URL, headers and schema.

The admin console includes safety limits for tool workflows, such as a maximum number of rounds and tool calls, to prevent runaway loops.

## Working with your data

Retrieval-augmented generation, or RAG, means fetching relevant passages from your own documents and giving them to the model along with the question, so the answer is grounded in your data instead of the model's general training.

In FlavorGPT this is done with knowledge bases. A knowledge base can be built from uploaded files, from URLs that FlavorGPT fetches and indexes, and from notes typed in directly. Assistants can then be given specific files and knowledge bases to work from.

## For teams and businesses

- **Assistants:** reusable assistants with their own model, prompt, knowledge and conversation starters, shared publicly or kept private.
- **Admin console:** sections for users, models, providers, model tiers, assistants, prompts, MCP servers, plans, discount codes and API keys.
- **White label:** ship it to your customers as your own branded product.
- **Monetization:** built-in payment integrations for Stripe, PayPal and crypto.

## Who it is for

- Individuals who want several AI models and tools in one place.
- Teams that want AI connected to their own systems and documents, not only a chat box.
- Businesses that want to offer an AI product under their own brand without building the platform themselves.
