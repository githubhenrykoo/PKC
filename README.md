# PKC - Progressive Knowledge Container

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![libP2P](https://img.shields.io/badge/networking-libP2P-purple.svg)](https://libp2p.io)
[![IPFS](https://img.shields.io/badge/storage-IPFS-blue.svg)](https://ipfs.io)

> A modular, card-based web application for self-sovereign knowledge management and community learning, built on Astro Islands Architecture with libP2P distributed networking.

## 🌟 Overview

PKC (Progressive Knowledge Container) implements a **triadic architecture** that treats every piece of content as an atomic "Card" component. Built with **Astro Islands Architecture** and enhanced with **libP2P modular networking**, PKC provides universal connectivity across any devices and networks while maintaining local-first operation.

### Core Architecture

- **MCard**: Universal atomic storage foundation with IPFS-compatible content addressing
- **PCard**: Astro component composition engine with hash-based references
- **VCard**: Security boundaries and value exchange layer with distributed authentication
- **libP2P Networking**: Modular networking foundation enabling universal connectivity

```mermaid
graph TB
    subgraph "Application Plane: VCard Security Islands"
        V[VCard: Authentication & Authorization]
        V1[P2P JWT Token Management]
        V2[Distributed Hash Signatures]
        V3[Network Security Boundaries]
    end
    
    subgraph "Control Plane: PCard Component Islands"
        P[PCard: Astro Component Composition]
        P1[Hash-Based Component References]
        P2[Hydrated JSX Components]
        P3[Interactive UI Islands]
    end
    
    subgraph "Data Plane: MCard Atomic Storage"
        M[MCard: Universal Content Storage]
        M1[Embedded Database - SQLite]
        M2[IPFS-Compatible Content Addressing]
        M3[Local-First Data Layer]
    end
    
    subgraph "Networking Foundation: libP2P Layer"
        N[libP2P Modular Networking]
        N1[Distributed Hash Table - DHT]
        N2[IPFS Content Distribution]
        N3[Peer Discovery & Routing]
    end
    
    V -.->|Secures| P
    P -.->|Composes| M
    V -.->|Authenticates| M
    M <--> N
    P <--> N
    V <--> N
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/githubhenrykoo/PKC.git
cd PKC

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

## 🏗️ Architecture

### Astro Islands Architecture with Distributed Networking

PKC leverages Astro's Islands Architecture enhanced with libP2P networking:

- **Static HTML Generation**: Pre-rendered content from MCard storage
- **Selective Hydration**: Interactive components hydrate only when needed
- **Hash-Based Composition**: Components reference each other through cryptographic hashes
- **Local-First Storage**: Embedded SQLite database with P2P synchronization
- **Universal Connectivity**: libP2P enables operation across any network topology

### Key Features

- 🏝️ **Islands Architecture**: Optimal performance with selective hydration
- 🔗 **Content Addressing**: IPFS-compatible hashing for universal content identification
- 🌐 **Distributed Networking**: libP2P for peer-to-peer connectivity and content distribution
- 🔒 **Security Boundaries**: VCard authentication with JWT and hash-based signatures
- 📱 **Progressive Web App**: Full PWA support with offline capabilities
- 🔄 **Upgradable Patterns**: Smart contract-inspired upgrade mechanisms
- 🗃️ **Local-First**: Embedded database with distributed synchronization

## 📁 Project Structure

```
PKC/
├── src/
│   ├── components/          # Astro components (PCard implementations)
│   ├── pages/              # Astro pages and routing
│   ├── layouts/            # Page layouts
│   ├── lib/                # Core libraries
│   │   ├── mcard/          # MCard storage implementation
│   │   ├── pcard/          # PCard composition engine
│   │   ├── vcard/          # VCard security layer
│   │   └── networking/     # libP2P integration
│   └── styles/             # Global styles
├── docs/                   # Documentation
│   ├── PKC.md             # Complete implementation guide
│   ├── MCard.md           # MCard specification
│   ├── PCard.md           # PCard specification
│   └── VCard.md           # VCard specification
├── public/                 # Static assets
├── docker/                 # Docker configuration
└── tests/                  # Test suites
```

## 🛠️ Technology Stack

### Core Framework
- **[Astro](https://astro.build)** - Islands Architecture web framework
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **[Shadcn/ui](https://ui.shadcn.com)** - Component library

### Networking & Storage
- **[libP2P](https://libp2p.io)** - Modular networking stack
- **[IPFS](https://ipfs.io)** - Distributed content addressing
- **[SQLite](https://sqlite.org)** - Embedded database
- **[Anime.js](https://animejs.com)** - Animation library

### Development & Deployment
- **[Docker](https://docker.com)** - Containerized deployment
- **[PWA](https://web.dev/progressive-web-apps/)** - Progressive Web App features
- **[Vite](https://vitejs.dev)** - Build tooling

## 📖 Documentation

- **[PKC.md](./Docs/PKC.md)** - Complete implementation guide and architecture overview
- **[MCard.md](./Docs/MCard.md)** - Universal atomic storage specification
- **[PCard.md](./Docs/PCard.md)** - Component composition engine details
- **[VCard.md](./Docs/VCard.md)** - Security and value exchange layer
- **[MVP Cards for PKC.md](./Docs/MVP%20Cards%20for%20PKC.md)** - MVP implementation strategy

## 🌐 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t pkc .

# Run container
docker run -p 3000:3000 pkc
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# libP2P Configuration
LIBP2P_BOOTSTRAP_PEERS=
LIBP2P_LISTEN_ADDRESSES=

# IPFS Configuration
IPFS_API_URL=
IPFS_GATEWAY_URL=

# Database Configuration
DATABASE_PATH=./data/pkc.db

# Security Configuration
JWT_SECRET=your-jwt-secret-key
HASH_ALGORITHM=SHA-256
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Ensure tests pass (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Astro](https://astro.build) for the Islands Architecture framework
- [libP2P](https://libp2p.io) for modular networking capabilities
- [IPFS](https://ipfs.io) for distributed content addressing
- The open-source community for continuous inspiration and support

## 📞 Support

- **Documentation**: [docs/PKC.md](./docs/PKC.md)
- **Issues**: [GitHub Issues](https://github.com/xlp0/PKC/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xlp0/PKC/discussions)
- **Website**: [pkc.pub](https://pkc.pub)

---

Built with ❤️ using Astro Islands Architecture and libP2P modular networking.
