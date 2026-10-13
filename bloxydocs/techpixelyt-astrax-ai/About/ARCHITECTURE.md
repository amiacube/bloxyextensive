<div align="center">

# 🏗 Architecture Overview

### *How Astrax (v1.9) Works*

Understanding the systems that power Astrax.

From a single prompt to a fully generated response, Astrax combines multiple layers of intelligence designed specifically for the Bloxd.io ecosystem.

---

**This document provides a high-level overview of the major systems and execution pathways used throughout Astrax v1.9.**

</div>

---

# 🎯 Design Philosophy

Astrax was designed around one simple principle:

> **Specialized AI is more useful than general AI.**

Instead of trying to solve every possible problem, Astrax focuses on helping Bloxd.io creators build faster, research deeper, and organize projects more effectively.

The architecture prioritizes:

- ⚡ Speed
- 🧠 Intelligent reasoning
- 🌐 Live information access
- 📚 Knowledge persistence
- 🛠 Developer productivity
- 🎨 Creative workflows
- 🔎 Reliable research verification

---

# 🔄 High-Level Architecture

At its core, Astrax follows a layered execution model.

```text
                ┌──────────────────┐
                │      User        │
                │     Prompt       │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Input Processing │
                │ & Classification │
                └────────┬─────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Runtime Configuration │
              │  Research / Planning  │
              │  Voice / Continuity   │
              └────────┬─────────────┘
                       │
                       ▼
           ┌────────────────────────────┐
           │ Astrax Runtime Engine       │
           │ Multi-Agent + Model Routing │
           └────────┬───────────────────┘
                    │
      ┌─────────────┼───────────────────────┐
      │             │                       │
      ▼             ▼                       ▼
┌────────────┐ ┌──────────────┐       ┌────────────┐
│ Memory     │ │ Deep Research │       │ PixelGen   │
│ Core       │ │ Engine       │       │ Generation │
└─────┬──────┘ └──────┬───────┘       └─────┬──────┘
      │               │                      │
      └──────┬────────┴───────┬────────────┘
             │                │
             ▼                ▼
      ┌──────────────────────────────┐
      │ Response Construction        │
      │ Validation / Formatting      │
      └──────────┬───────────────────┘
                 │
                 ▼
      ┌──────────────────────────────┐
      │ Astrax UI Layer             │
      │ Voice Input / Reports /     │
      │ Project Continuity          │
      └──────────────────────────────┘
```

---

# 💬 Prompt Processing Layer

Every interaction begins with a user prompt.

Examples include:

```text
Debug this WorldCode script.

Research progression systems.

Generate a Bloxd logo.

Explain this API function.
```

The Input Processing Layer determines:

- What type of request was submitted
- Which execution pathways should activate
- Whether special tools are required
- How much reasoning depth is appropriate

---

# ⚙ Runtime Configuration Layer

Before generation begins, Astrax configures its runtime behavior.

This layer determines how the AI should think, search, and respond.

---

## Effort Levels

Effort levels control reasoning depth.

### Low

Optimized for speed.

Best for:

- Quick questions
- Minor edits
- Simple explanations

---

### Balanced

Recommended for everyday use.

Balances:

- Performance
- Thoroughness
- Latency

---

### Thorough

Allocates additional reasoning time.

Best for:

- Complex debugging
- Multi-step logic
- Deep analysis

---

# 🔍 Deep Research (v1.9)

Astrax’s Deep Research experience is a major upgrade over the earlier research systems in v1.1 and v1.2.

It prioritizes:

- Live web crawling
- Structured investigation
- Source-backed findings
- Verification against official Bloxd resources
- Reduced hallucination risk

When enabled, Astrax breaks complex questions into a multi-step plan and uses dedicated sub-agents to gather, verify, and synthesize information. This includes live web search and official Bloxd Fandom Wiki API integration.

Example:

```text
Research the strongest progression systems for Bloxd RPG competitions.
```

Produces:

- Step-by-step research plans
- Verified findings
- Structured recommendations
- Polished final reports

---

# 🗺 Plan Mode

Plan Mode transforms broad ideas into actionable plans.

Example:

```text
Plan the development of a SkyWars server.
```

Outputs may include:

- Development phases
- Milestones
- Priorities
- Implementation steps

---

# 🧠 Astrax Runtime Engine

At the center of Astrax is a modern runtime designed for speed and reliability.

Responsible for:

- Natural language understanding
- Code generation
- Debugging
- Explanation
- Reasoning
- Planning
- Research synthesis
- Project continuity support

The runtime adapts its behavior based on the active configuration.

---

# 🌐 Web Search & Wiki Integration

Astrax can supplement responses using live web information and official Bloxd Fandom Wiki API endpoints.

The research layer helps reduce outdated or inaccurate responses by grounding investigations in current, authentic sources whenever possible.

Uses include:

- Verifying information
- Finding recent updates
- Referencing official documentation
- Supporting Deep Research workflows

---

# 🧠 Memory Core

The Memory Core enables personalized experiences across sessions.

Memory may include:

- User preferences
- Ongoing project context
- Communication styles
- Frequently referenced information
- Active project continuity details

Examples:

```text
Remember that I prefer concise explanations.

Remember that I'm working on a prison server.
```

Memory exists to reduce repetition and improve continuity.

---

# 🎤 Voice Dictation

Astrax supports hands-free voice input for composing prompts and messages.

This helps make interactions faster, more natural, and more accessible during active workflows.

---

# 🧾 Automatic Text Attachments

Large blocks of pasted text are automatically converted into organized text attachments.

This keeps conversations cleaner while preserving formatting and editability.

---

# 🖼 PixelGen Integration

PixelGen provides image generation capabilities directly within Astrax.

PixelGen accepts natural language prompts and produces Bloxd-inspired visuals.

Common outputs include:

- Logos
- Promotional graphics
- Environment concepts
- Server artwork
- Creative references

PixelGen generations are tracked through Generation History.

---

# 📚 Training Pipeline

Astrax supports community-driven knowledge expansion.

The training pipeline follows this workflow:

```text
User Submission
        ↓
Relevance Validation
        ↓
Quality Assessment
        ↓
Knowledge Integration
```

Submissions may include:

- Documentation
- Tutorials
- Examples
- Reference materials
- Code snippets

---

# ✅ Relevance Validation Agent

Before knowledge is accepted, it is evaluated.

The validator determines:

- Whether submissions relate to Bloxd
- Whether information is sufficiently clear
- Whether content meets quality standards

This helps maintain reliability within the knowledge base.

---

# 🖥 User Interface Layer

Astrax uses a more refined interface built around clarity, responsiveness, and productivity.

Major UI systems include:

---

## Sidebar Workspace

Provides access to:

- Conversations
- Navigation
- Session controls

---

## Research Report Reader

Presents completed Deep Research investigations in a polished, interactive experience with animated transitions and structured presentation.

---

## Interactive Initialization

Simulates a modern startup experience featuring:

- Diagnostic checks
- System status indicators
- Boot sequences

---

## Community Sync Footer

Provides visibility into community activity and updates.

Sources may include:

- Reddit
- BloxdHub
- Fandom
- Official announcements

---

# 💾 Persistence & Export

Astrax supports preserving work beyond the current session.

Features include:

## PDF Export

```text
Conversation
        ↓
Formatting Engine
        ↓
PDF Document
```

Useful for:

- Documentation
- Sharing
- Archiving

---

## Generation History

Stores previous PixelGen outputs for future access.

---

## Chat History

Maintains previous conversations for returning users.

---

# 🔄 Complete Request Lifecycle

The following illustrates a typical Astrax interaction.

```text
User Prompt
      ↓
Prompt Classification
      ↓
Runtime Configuration
      ↓
Astrax Processing
      ↓
Memory Retrieval
      ↓
Deep Research / Web Search (Optional)
      ↓
PixelGen Invocation (If Needed)
      ↓
Validation & Formatting
      ↓
Response Delivery
      ↓
History & Persistence
```

---

# 🎯 Architectural Goals

Astrax's architecture is designed to achieve the following objectives:

- Provide Bloxd-specific assistance.
- Minimize repetitive work.
- Support both technical and creative workflows.
- Balance speed with reasoning quality.
- Personalize experiences through memory.
- Encourage community contributions.
- Remain accessible through a browser-first experience.
- Improve research reliability through structured verification.

---

<div align="center">

## ⚡ Astrax v1.9

**Built for the Bloxd Community.**

*Research. Plan. Code. Create.*

</div>
