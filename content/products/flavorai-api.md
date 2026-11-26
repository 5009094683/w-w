---
# Source: the "AI asset management" page of the previous site and the FlavorAI
# API block on the previous home page.
# The description below and the second paragraph under "What the FlavorAI API
# is" are as published on the previous site. They say the endpoint handles
# billions of requests per second and gives 200+ LLMs at 50% less price:
# please confirm or replace them.
# "What an AI gateway is", the request example, "Who it is for" and the FAQ are
# new copy: please review.
title: "FlavorAI API: one API for all your AI models"
description: >-
  Get access to 200+ LLMs at 50% less price in single API. We can handle
  billions of requests per second, without any limits.
updatedAt: 2026-11-27
name: FlavorAI API
navTitle: FlavorAI API
code: P-03
order: 3
category: AI asset management
summary: >-
  The FlavorAI API is YBX Labs' AI asset management platform. It brings your
  AI providers and APIs into one infrastructure that you host on your own
  server under an enterprise license, and exposes all of them through a single
  API endpoint in the OpenAI API format.
facts:
  - label: Type
    value: AI asset management (one API in front of many AI providers)
  - label: Made by
    value: YBX Labs
  - label: Hosting
    value: On your own server, with enterprise licensing
  - label: Providers you can connect
    value: OpenAI, AWS Bedrock, Claude, OpenRouter and others
  - label: API format
    value: The unified OpenAI API structure
  - label: Setup
    value: Through a graphical interface, without writing code
  - label: Pricing
    value: See the [pricing page](/pricing)
features:
  - title: Connect your providers
    text: Connect your multiple external AI providers and APIs, for example OpenAI, AWS Bedrock, Claude and OpenRouter.
  - title: Configure in a GUI
    text: Customize the platform, internal users, API behavior and other settings through a graphical interface.
  - title: One API, no code
    text: Create your API and start using it with the unified OpenAI API structure, without writing a single piece of code.
faq:
  - q: What is the FlavorAI API?
    a: It is YBX Labs' AI asset management platform. You connect your AI providers to it, and your applications reach all of them through a single API endpoint in the OpenAI API format.
  - q: Where does it run?
    a: On your own server. You use our infrastructure under an enterprise license and host it yourself.
  - q: Which AI providers can I connect?
    a: Multiple external AI providers and APIs, for example OpenAI, AWS Bedrock, Claude and OpenRouter.
  - q: Do I need to change my application code?
    a: The API follows the unified OpenAI API structure, so software that already speaks that format can point to your FlavorAI API endpoint instead. The API itself is created in a graphical interface, without writing code.
  - q: How does it relate to FlavorAI and FlavorGPT?
    a: It is the API product in the FlavorAI family. [FlavorAI](/products/flavorai) is the orchestration platform, and [FlavorGPT](/products/flavorgpt) is the workspace people use directly.
related:
  - /products/flavorai
  - /products/flavorgpt
  - /services/architectural-planning
---

## What the FlavorAI API is

The FlavorAI API is AI asset management: all of a company's AI providers, APIs and assets managed in one place and reached through one endpoint.

Our platform consolidates all your AI assets into one secure infrastructure, accessible via a unified API endpoint built to handle billions of requests per second. Perfect for enterprises scaling AI-driven products or automating workflows.

## What an AI gateway is

A company that uses AI seriously soon has several providers, each with its own API, its own keys, its own billing and its own limits. Every application has to be written for each provider it uses, and nobody has one view of what is being spent or who is using what.

An AI gateway solves this by standing in front of all the providers. Applications call the gateway through one API. The gateway holds the provider keys, forwards each request to the right provider and applies the rules the company has set.

## How it works

Use our infrastructure with enterprise licensing, and host it on your own server:

1. Connect your multiple external AI providers and APIs, for example OpenAI, AWS Bedrock, Claude and OpenRouter.
2. Customize the platform, internal users, API behavior and other settings through the GUI.
3. Create your API and start using it, with the unified OpenAI API structure, without writing a single piece of code.

A request to the finished API has the same shape as a request to OpenAI. In this illustration, `YOUR-FLAVORAI-HOST` stands for the address of your own installation and the key is a placeholder:

```bash
curl -X POST "https://YOUR-FLAVORAI-HOST/v1/chat/completions" \
  -H "Authorization: Bearer sk-xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      { "role": "user", "content": "Hello" }
    ]
  }'
```

## Who it is for

- Enterprises scaling AI-driven products or automating workflows.
- Teams that use several AI providers and want one endpoint and one place to manage them.
- Organizations that need their AI infrastructure to run on servers they control.
