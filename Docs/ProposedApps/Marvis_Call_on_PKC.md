# MARVIS on PKC: Clarifying Questions

> 🧩 Questions submitted by Luke Dallafior

Knowing that MARVIS is running on the MVP Cards infrastructure, please answer the following questions:

## 1. Protocol Stack: Messaging + Call

**Questions:**
* Will MARVIS implement its own E2EE messaging protocol, or adopt a standard like the Signal Protocol or MLS (Message Layer Security)?
* For VOIP: are we building custom signaling and media encryption, or leveraging WebRTC with DTLS-SRTP and custom key handling?

**Answer:**

### End-to-End Encrypted Messaging

MARVIS would **adopt the Signal Protocol** rather than implementing its own E2EE messaging protocol, for several reasons aligned with PKC principles:

1. **MCard Hash-Based Security**: PKC's MCard already provides content-addressable storage with cryptographic guarantees. The Signal Protocol's Double Ratchet Algorithm complements this by providing forward secrecy and break-in recovery - properties that align with PKC's immutable data model.

2. **PCard Polynomial Expression**: PCard's polynomial functor structure $F(X) = \sum (A_i \times X^{B_i})$ allows for formal validation of security properties. Signal Protocol's mathematical foundation (X3DH key agreement + Double Ratchet) can be represented and verified within this structure.

3. **VCard Value Boundary Enforcement**: As we've documented in VCard, security functions require multi-stage authentication using $X_j$ notation. Signal's multi-layer security approach aligns perfectly with this model.

### VOIP Implementation

For voice/video calls, MARVIS should **leverage WebRTC with DTLS-SRTP and custom key handling** rather than building custom signaling:

1. **MCard Token Conservation**: Using WebRTC's established protocol conserves development resources while still allowing all media packets to be tokenized and tracked through PKC's content hash system.

2. **Custom Key Handling via PCard**: The key exchange would be managed through PCard's conservation-based validation repository, allowing formal verification of the communication channel's security properties.

3. **Open MCP Client-Like Modularity**: As we recently documented, PCard supports independent evolution of implementations. WebRTC provides this same modularity for media transport while allowing custom key handling to evolve separately.

This approach maintains PKC's principle of maximum modularity while ensuring cryptographic verification can be mathematically assessed through polynomial functor expressions.

## 2. PKC Query Interface + Access

**Questions:**
* How does the MARVIS Call module query or write to the PKC?
* Is there a defined API for memory insert/update?
* Can I subscribe to memory changes (e.g., translation correction, identity rotation)?
* What's the data model/schema for storing:
  * Translation events?
  * File metadata?
  * Contact tagging and trust status?

**Answer:**

### PKC Query Interface

MARVIS Call interacts with the PKC through a **digital fingerprint system** that provides simplicity and security:

1. **Library-Like Reference System**: Every piece of information in PKC has a unique, permanent reference number (the hash value of an MCard) that MARVIS Call uses to find or store data without needing to understand complex details underneath.

2. **Automated History Tracking**: When information changes, PKC automatically creates new versions while maintaining a complete history trail, similar to how professional document systems track changes.

3. **Change Notification System**: Users can subscribe to specific information changes (translations, identity updates, file modifications) and receive notifications without constantly checking for updates.

### Information Organization

PKC organizes different types of information consistently and securely:

1. **Translation Memory**: Each translation is stored as an MCard, preserving the original text, translated version, correction history, and improvement timeline, creating a continuously learning system.

2. **Secure File Management**: Files store essential details (name, type, size), security settings, preview images when appropriate, and clearly defined access permissions.

3. **Trust-Based Contacts**: Each contact has a calculated trust level, personalized tags, verification history, and secure communication channel records.

This approach creates a private information ecosystem where everything is organized, searchable, and protected against unauthorized changes while remaining simple to use.

## 3. Identity: Alias Lifecycle

**Questions:**
* What is the alias registration flow on first use?
* Are aliases globally unique? Resolvable via local registry or p2p graph?
* How do we handle alias recovery if a user loses their device but has no cloud backup enabled?
* Can a single user manage multiple aliases, or alias groups?

**Answer:**

### Secure Identity Foundation

MARVIS Call builds on PKC's MCard system to create a privacy-first identity network:

1. **Flexible First-Use Registration**: When a user first creates an alias, PKC generates a unique identifier derived from a personal MCard that only exists on their device. This process happens entirely on the user's device without requiring central servers.

2. **Private Network Infrastructure**: Aliases operate through an **Overlay Virtual Private Network** - a secure layer that sits on top of the regular internet. This overlay connects user devices directly using modern privacy technology:
   
   * **Private DNS in Kubernetes**: Rather than using public DNS servers that can track user activity, MARVIS deploys private DNS servers in Kubernetes clusters that don't retain search records
   * **Distributed Hash Table (DHT)**: Aliases are discoverable through a distributed system similar to modern file-sharing networks, where no single server holds the complete directory
   * **libP2P Network Library**: The technical foundation enables direct device-to-device connections without requiring central servers

3. **Resilient Recovery Options**: If a user loses their device without cloud backup, recovery leverages the distributed network:
   
   * Users can pre-authorize trusted contacts who can help recover access
   * Recovery is possible through a special process requiring multiple trusted contacts to confirm identity
   * Social recovery eliminates the security risks of centralized password resets

4. **Multi-Alias Management**: Users can maintain multiple aliases with clear separation:
   
   * Personal, professional, and interest-based identities can exist separately
   * Alias grouping enables organized communication contexts
   * Cross-alias privacy barriers prevent correlation between different user identities

This approach gives users complete control over their digital identities while maintaining strong privacy protections through distributed technology rather than centralized servers.

## 4. Cross-Device Behavior (Multi-Device Sync)

**Questions:**
* If I log in from a second device (e.g., desktop), how is session sync authorized?
* Manual QR code scan only?
* Will PKC store per-device keys?
* Are messages synced across devices, or is MARVIS Call single-device per alias unless sync is configured?

**Answer:**

### Seamless Cross-Device Experience

The PKC foundation of MARVIS Call enables a unique approach to multi-device use:

1. **Web-First Architecture**: PKC is fundamentally a Progressive Web App (PWA) designed to provision MCards, making it accessible across any device with a modern web browser without requiring traditional app installation.

2. **Unified Storage Strategy**: Users can specify where their MCard library is stored as a single, efficient SQLite database file. This provides options for:
   * Local-only storage for maximum privacy
   * Cloud storage services for convenience
   * Self-hosted servers for complete control

3. **Smart Content Management**: For larger files like photos and videos:
   * References are stored efficiently as URLs within the SQLite database
   * Actual content lives in content-addressable systems like GitHub repositories or IPFS networks
   * This approach prevents database bloat while maintaining secure access to all content

4. **Flexible Authentication Process**: When adding a new device:
   * PKC leverages stored authentication procedures as MCards
   * The primary device displays a QR code containing a temporary access token
   * The new device scans this code to initiate a secure handshake
   * Additional verification steps can be configured based on security preferences

5. **Optimized Data Synchronization**: Once authenticated:
   * Only necessary MCard references are synchronized initially
   * Content is retrieved on-demand to minimize bandwidth usage
   * Background sync occurs based on user preferences and network conditions

This system creates a single sign-on experience (SSO, currently adopting Authentik as the SSO solution) across all PKC-enabled applications while minimizing data duplication and resource usage. The content-addressable nature of MCards ensures that identical data is never stored twice, creating an efficient ecosystem that works seamlessly across all your devices.

## 5. Translation Engine

**Questions:**
* Where does translation inference run — on-device (e.g., Whisper-style transformer) or edge-deployed?
* How is the correction mechanism fed back into the translation model?
* Is there federated learning or alias-level fine-tuning?
* Are the translation models fixed or modular per language pair?

**Answer:**

### Adaptive Translation Architecture

MARVIS Call implements a flexible, resource-aware translation system:

1. **Smart Resource Allocation**: Translation work runs on the most appropriate device available:
   * Computationally intensive translations automatically route to capable devices
   * MCP Servers implemented as configurable PCards direct tasks to optimal computing resources
   * The system dynamically chooses between local processing and remote data centers based on task requirements

2. **Continuous Learning System**: Translation quality improves through multiple mechanisms:
   * User corrections feed directly into locally fine-tuned language models
   * Each community develops its own translation memory based on past conversations
   * User feedback creates a virtuous cycle of improvement without sharing private data

3. **Task-Optimized Processing**:
   * **Non-Realtime Translation**: Uses an Agentic Workflow that can take more time for higher accuracy
   * **Realtime Interactive Translation**: Relies on pre-optimized workflows encoded as PCards for instant response
   * Both approaches benefit from the mathematical precision of Polynomial Functor Representation

4. **Modular Language Model Design**: 
   * Translation models are built as interchangeable components
   * Language pairs can be added or updated independently
   * Community-specific terminology and expressions are preserved in local models

This architecture allows MARVIS Call to balance translation quality, speed, and resource efficiency while continuously improving based on actual usage patterns. The mathematical foundation of PCard's polynomial representation ensures that all improvements are systematically captured and versioned.

## 6. Event Detection

**Questions:**
* Is NLP event detection done fully on-device?
* What model or pipeline is used for extracting time/place/actor?
* If integrated with MARVIS Assist's calendar, how are conflicts or overlaps resolved?

**Answer:**

### Adaptive NLP Processing System

MARVIS Call implements an adaptive event detection system that prioritizes user control and privacy:

1. **Device-Appropriate Processing**: The system intelligently adapts to available resources:
   * Users with powerful devices process event detection entirely locally
   * Users with limited devices can leverage network resources based on privacy preferences
   * Different optimized processes are launched based on device capabilities

2. **Dual-Pipeline Architecture**:
   * **Model Refreshing Cycle**: Scheduled updates to the core NLP models using version-controlled LLMs and fine-tuning
   * **Real-Time Event Processing**: Immediate analysis of conversations to detect time/place/actor information
   * Both pipelines maintain privacy boundaries while maximizing detection accuracy

3. **PocketFlow Agent Model**: Event detection uses PKC's lightweight agent framework:
   * More efficient than traditional frameworks like Langchain
   * Compatible with Model Context Protocol (MCP) for standardized AI interaction
   * Routes conversational events to appropriate processing nodes
   * Prioritizes privacy by keeping sensitive calendar data local

4. **Smart Conflict Resolution**:
   * Detected events are compared with existing calendar entries
   * Potential conflicts are presented with clear options
   * User preferences for handling overlaps are learned over time
   * All conflict resolution policies are stored as queryable MCards

This approach gives users comprehensive control over how their conversations are analyzed for events while ensuring that computational resources are used optimally. The continuously improving models adapt to individual communication patterns and scheduling preferences without compromising privacy.

## 7. Encrypted File Handling

**Questions:**
* What encryption protocol is used for media (e.g., AES-GCM, NaCl box)?
* Are files chunked for large transfers (e.g., 100MB+)?
* Will previews (e.g., thumbnails, waveform) be pre-rendered on sender device or generated on receiver side?

**Answer:**

### Flexible Media Security System

MARVIS Call implements a user-configurable approach to file handling:

1. **User-Configurable Encryption**: Security approaches adapt to user preferences:
   * Advanced users can select specific encryption protocols
   * Default configurations provide strong security without technical decisions
   * All encryption choices are stored as MCards for traceability

2. **Multi-Protocol Storage Integration**: The system leverages multiple storage options:
   * **GitHub**: Perfect for code-related files and text documents
   * **IPFS**: Ideal for content that benefits from distributed storage
   * **S3-Compatible Storage**: For traditional cloud storage needs
   * **Local File System**: Programmatically defined as a data resource for direct access
   * Each protocol automatically selected based on file characteristics

3. **Smart File Size Management**:
   * Standard web uploads limited to 10MB per file for performance
   * Larger files automatically routed through specialized tools like git-lfs
   * Progressive loading enables viewing large files before complete download
   * Network bandwidth usage optimized based on device and connection

4. **Server-Side Preview Generation**:
   * Media previews generated by server-side rendering techniques
   * Modern web frameworks like Next.js and Astro provide systematic preview generation
   * Thumbnail quality and dimensions adapt to receiving device capabilities
   * Low-bandwidth previews available even when full content download is impractical

5. **Advanced Synchronization Services**:
   * File synchronization handled through Git for version control and change tracking
   * libSQL leveraged as a globalized networked file system service
   * Seamless synchronization across multiple devices and storage protocols
   * Conflict resolution managed through Git-inspired branching and merging

This approach provides enterprise-grade security with consumer-friendly simplicity. Users benefit from optimized file handling without needing to understand the technical complexities of encryption protocols, storage systems, or media processing.

## 8. Storage Sync Behavior

**Questions:**
* What is the expected behavior when sync is toggled off and back on?
* Are there conflict resolution rules for message or file updates?
* If a file is shared in a thread and later deleted by sender, is that deletion enforced across synced devices?

**Answer:**

### Content-Aware Synchronization Model

MARVIS Call implements a smart synchronization system that respects user control while maximizing data integrity:

1. **Intelligent Sync Resumption**: When sync is toggled back on after being disabled:
   * The underlying MCard immutable database enables perfect change detection
   * Fine-grained resolution of content changes through cryptographic hashing
   * New content is instantly identified through unique MCard hash values
   * Similar content is grouped and optimized through semantic distance analysis
   * Vectorized embeddings enable intelligent content deduplication
   * Users receive a clear, prioritized summary of pending synchronization actions
   * Critical updates are intelligently prioritized based on communication patterns
   * Bandwidth-intensive syncs can be scheduled for optimal timing

2. **Polynomial-Based Conflict Resolution**: When content conflicts occur:
   * PCard's polynomial expressions constructed from MCard hash values distinguish conflict types
   * The system systematically assesses the precise nature of conflicts with fine-grained data difference analysis
   * Metadata timestamps (g_time) establish clear chronological precedence of conflicting events
   * Participant identities (VCard) verify authorized change permissions
   * Sound security practices inform automated conflict assessment
   * Non-conflicting changes are mathematically verified and automatically merged
   * For genuine conflicts, the system presents resolution options with security implications
   * Resolution policies can be saved as polynomial expressions for future conflict patterns

3. **MCard-Based Deletion Architecture**: When content deletion is requested:
   * MCard's immutable content-addressed storage creates "tombstone" references rather than physical deletion
   * The PKC categorical structure preserves referential integrity across the knowledge graph
   * PCard polynomials track deletion operations as functional transformations: $F(X_{delete}) = \Sigma_i (Policy_i \times Content_j^{AccessLevel_i})$
   * Recipients maintain sovereignty over locally-stored content through cryptographic independence
   * VCard boundary enforcement ensures deletion requests follow proper authorization chains
   * All deletion events generate cryptographic proofs stored as discrete MCard references
   * Cross-device deletion requests use polynomial expressions to encode scope and authorization

4. **Categorical Content Lifecycle**: 
   * Time-sensitive content leverages PCard's polynomial temporal expressions for automatic expiry
   * Content transitions follow Category Theory morphisms ensuring theoretical soundness
   * VCard boundary enforcement applies $F(X_j)$ polynomial expressions to define precise usage rights
   * Every lifecycle state transition generates a new content hash, preserving immutable history
   * Access control follows PKC's discrete representational system with mathematical completeness
   * All transitions between lifecycle states are functorial, preserving structural relationships
   * MCard's cryptographic verification provides unalterable audit provenance chains

This approach implements PKC's category-theoretic foundation to create a mathematically rigorous yet user-friendly synchronization model. The MVP Card system's discrete representational architecture ensures both theoretical soundness and practical completeness while maintaining cryptographic integrity across all operations. Users benefit from the mathematical rigor of polynomial functors without needing to understand the underlying complexity.