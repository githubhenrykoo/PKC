# GovTech Ecosystem Architecture

This document defines the structural and functional relationships between the projects constituting the **GovTech** system. Born from the **G20 2022 vision**, this ecosystem aims to establish sovereign governance technologies through a specific arrangement of tools, protocols, and infrastructure.

## 📂 Directory Structure

The ecosystem is organized hierarchically starting from the `GovTech` root:

```text
GovTech/
├── THKMesh/                 # Infrastructure, Containerization & Orchestration
├── PKC/                     # The Sovereign Operating System
│   ├── LandingPage/         # [Submodule] Single-Page Portal & Entry Point
│   └── PrologueOfSpacetime/ # [Submodule] Content & Curriculum (SQLite-packaged)
└── MCard_TDD/               # Core Algorithms & Logic (MCard/PCard/VCard)
    └── mcard-studio/        # [Submodule] Web-based Card Editor
```

## 🏗️ System Components & Roles

### 1. GovTech (The Vision)
**Role**: Strategic & Governance Container
All tools in this directory collectively form the **Governance Technology system**. They abide by the strategic vision originally created during the **G20 in 2022**, mandated to build **Sovereign Operational Networks** that empower communities through decentralized, self-administered infrastructure.

### 2. MCard_TDD & mcard-studio (The Core Physics & Tooling)
**MCard_TDD**:
- **Role**: Algorithm & Library Manager.
- **Function**: Maintains the core "physics" of the system. It manages the algorithms and libraries for:
  - **MCard**: Immutable Data Primitives.
  - **PCard**: Process & Transformation Specifications.
  - **VCard**: Validation & Credential Logic.
- **Benefit**: Ensures algorithmic correctness independent of the interface.

**mcard-studio** (Submodule of MCard_TDD):
- **Role**: Visual Editor & Creator.
- **Function**: A modular project designed to be used as a submodule. It provides a web-enabled interface for editing and composing Cards.
- **Integration**: These editing capabilities are shared with **PKC**, enabling any PKC-powered website to provide native, browser-based tools for knowledge creation and management.

### 3. PKC (The Operating System)
**Role**: The Network-as-OS.
PKC acts as the primary host. It aggregates the core capabilities from MCard_TDD and the visual tools from mcard-studio into a cohesive "Operating System" that users interact with. It manages the state, identity, and conversational flow of the network node.

### 4. LandingPage (The Portal)
**Role**: The User Gateway.
- **Architecture**: Ideally implemented as a **single-page, single-file HTML** application.
- **Function**: Acts as a lightweight, responsive portal. It provides immediate access to the desirable functionalities of a specific PKC instance (e.g., WebRTC meetings, dashboard access) without needing to load the full OS complexity immediately.

### 5. PrologueOfSpacetime (The Content Model)
**Role**: Content Demonstration & Packaging.
- **Function**: Illustrates how content is published and navigated within PKC.
- **Architecture**: Content is designed to be periodically packaged into a **single SQLite database file**.
- **Philosophy**:
  - **Modularity & Local-First**: Packaging the entire navigable content (relations and data) into a single DB file proves that knowledge can be portable and self-contained.
  - **Relational Knowledge**: Users don't just download files; they download a "brain" of interconnected knowledge relations, fully queryable via SQLite.

### 6. THKMesh (The Infrastructure)
**Role**: Containerization & High Availability.
- **Name Origin**: **THK** stands for **Tri-Hita-Karana** (Computational Trinitarianism), the Balinese philosophy of harmony between people, nature, and the spiritual. This honors the system's development roots in **Bali**.
- **Function**: As tools mature, THKMesh provides the robust engineering layer:
  - **Containerization**: Docker and Kubernetes orchestration.
  - **Behavioral Modularity**: Isolating complex behaviors into scalable services.
  - **High Availability (HA)**: Ensuring system uptime and resilience.
  - **Resource Monitoring**: Managing compute and network resources across the mesh.

## 🌐 The Social Mesh: A Computational Trinity

These components do not exist in isolation. They are designed to operate within a community of **Overlay VPNs** and **Peer-to-Peer networks**.

- **Self-Administration**: Each PKC node is a self-administered sovereign unit.
- **Connected Mesh**: These nodes connect to form the **THKMesh**.
- **Social Nature**: The architecture creates an inherent social structures—enabling secure sharing, collaborative editing, and community governance without central intermediaries.

Together, they realize the **Governance Technology** system: efficient, resilient, and harmoniously connected.
