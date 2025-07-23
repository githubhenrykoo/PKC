# VCard Implementation Guide

## Overview

This document provides detailed implementation specifications for VCard (Value-Carrying Card), the Application Plane component of the Progressive Knowledge Container (PKC) system. For design intent and conceptual framework, see [VCard.md](./VCard.md).

## 1. Core Data Structures

### 1.1 VCard Identity Implementation

```typescript
interface VCardIdentity {
  // W3C DID specification compliance
  did: string;                    // did:method:specific-id
  didDocument: {
    id: string;
    authentication: PublicKey[];
    assertionMethod: PublicKey[];
    keyAgreement: PublicKey[];
    capabilityInvocation: PublicKey[];
    capabilityDelegation: PublicKey[];
    service: ServiceEndpoint[];
  };
  
  // Account Abstraction integration
  accountAbstraction: {
    contractAddress: string;      // Smart contract wallet address
    implementation: 'ERC4337' | 'Safe' | 'Argent' | 'Biconomy';
    guardians?: string[];         // Social recovery guardians
    sessionKeys?: SessionKey[];   // Temporary access permissions
  };
}
```

### 1.2 Smart Contract Wallets

```typescript
interface SmartWallet {
  // ERC-4337 UserOperation structure
  userOperation: {
    sender: string;               // Smart contract wallet address
    nonce: bigint;               // Anti-replay protection
    initCode: string;            // Wallet deployment code (if needed)
    callData: string;            // Transaction data
    callGasLimit: bigint;        // Gas limit for execution
    verificationGasLimit: bigint; // Gas for signature verification
    preVerificationGas: bigint;   // Gas for pre-verification
    maxFeePerGas: bigint;        // Maximum gas price
    maxPriorityFeePerGas: bigint; // Maximum priority fee
    paymasterAndData: string;     // Paymaster contract and data
    signature: string;           // Signature data
  };
  
  // Multi-signature support
  multisig?: {
    threshold: number;           // Required signatures
    owners: string[];           // Authorized signers
    nonce: bigint;             // Multisig nonce
  };
  
  // Social recovery
  recovery?: {
    guardians: string[];        // Recovery guardians
    threshold: number;          // Required guardian approvals
    delay: number;             // Recovery delay period
  };
}
```

## 2. Cross-Chain Implementation

### 2.1 Cross-Chain Bridge Interface

```typescript
interface CrossChainBridge {
  // Bridge protocol specification
  protocol: 'LayerZero' | 'Wormhole' | 'Axelar' | 'Multichain' | 'Hop';
  
  // Source and destination chains
  sourceChain: {
    chainId: number;
    networkName: string;
    rpcEndpoint: string;
    contractAddress: string;
  };
  
  destinationChain: {
    chainId: number;
    networkName: string;  
    rpcEndpoint: string;
    contractAddress: string;
  };
  
  // Transfer parameters
  transferData: {
    tokenAddress: string;      // Token contract address
    amount: bigint;           // Transfer amount
    recipient: string;        // Destination address
    deadline: number;         // Transaction deadline
    slippage: number;         // Acceptable slippage
  };
}
```

### 2.2 Atomic Swap Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VCardAtomicSwap {
    struct Swap {
        bytes32 secretHash;      // Hash of secret
        address initiator;       // Swap initiator
        address participant;     // Swap participant
        uint256 amount;         // Swap amount
        uint256 lockTime;       // Lock time
        bool completed;         // Completion status
    }
    
    mapping(bytes32 => Swap) public swaps;
    
    function initiate(
        bytes32 _secretHash,
        address _participant,
        uint256 _lockTime
    ) external payable {
        // Initialize atomic swap
    }
    
    function redeem(bytes32 _secret) external {
        // Redeem with secret reveal
    }
    
    function refund(bytes32 _secretHash) external {
        // Refund after timeout
    }
}
```

## 3. NFT Implementation

### 3.1 VCard NFT Interface

```typescript
interface VCardNFT extends VCard {
  // ERC-721 compliance
  erc721: {
    tokenId: bigint;
    contractAddress: string;
    owner: string;
    approved?: string;          // Approved spender
    tokenURI: string;          // Metadata URI
  };
  
  // ERC-1155 multi-token support
  erc1155?: {
    tokenId: bigint;
    contractAddress: string;
    balances: Map<string, bigint>; // owner -> balance
    uri: string;               // Metadata URI template
  };
  
  // Advanced NFT features
  royalties?: {
    recipient: string;         // Royalty recipient
    percentage: number;        // Royalty percentage (basis points)
    standard: 'ERC2981' | 'Custom';
  };
  
  // Programmable NFT features
  programmable?: {
    renderer: string;          // Dynamic rendering contract
    traits: Record<string, any>; // Programmable traits
    evolution?: {              // NFT evolution mechanics
      conditions: string[];
      outcomes: string[];
    };
  };
}
```

## 4. Enhanced VCard Structure

### 4.1 Complete VCard Interface

```typescript
interface VCard extends PCard {
  // Core MCard properties inherited through PCard
  hash: string;           // Content-addressable hash
  content: any;          // Value representation
  g_time: string;        // Global timestamp
  
  // Identity and authentication
  identity: VCardIdentity;
  naming: VCardNaming;
  
  // Value-specific properties
  valueType: 'token' | 'nft' | 'right' | 'access' | 'reputation' | 'service' | 'custom';
  owner: string;         // Current owner's DID
  transferable: boolean; // Transfer permissions
  
  // Cross-chain capabilities
  crossChain?: {
    supportedChains: ChainInfo[];
    bridgeContracts: Map<number, string>; // chainId -> contract
    lockingMechanism: 'mint-burn' | 'lock-unlock' | 'atomic-swap';
  };
  
  // Service discovery and endpoints
  services?: {
    computing: ComputingService[];
    storage: StorageService[];
    networking: NetworkingService[];
    custom: CustomService[];
  };
  
  // Value determination with oracle support
  valueFunction?: {
    type: 'static' | 'dynamic' | 'oracle' | 'governance';
    implementation: string;
    oracles?: OracleConfig[];
    updateFrequency?: number;
  };
  
  // Enhanced metadata
  metadata?: {
    supply?: bigint;       // Total supply
    decimals?: number;     // Decimal precision
    properties?: Record<string, any>;
    licensing?: {
      type: 'CC0' | 'MIT' | 'GPL' | 'Commercial' | 'Custom';
      terms: string;
      commercialUse: boolean;
    };
  };
  
  // Smart contract integration
  smartContract?: {
    address: string;
    abi: any[];
    bytecode?: string;
    deploymentTx?: string;
  };
  
  // Transfer rules with Account Abstraction
  transferRules?: {
    allowedRecipients?: string[];
    conditions?: string;
    fees?: TransferFee[];
    gasSponsorship?: {
      enabled: boolean;
      sponsor: string;      // Paymaster address
      conditions: string;   // Sponsorship conditions
    };
    multisigRequired?: boolean;
    timeLocks?: {
      duration: number;
      conditions: string;
    };
  };
  
  // History and provenance with cross-chain tracking
  history: Array<{
    timestamp: string;
    blockNumber?: bigint;
    chainId?: number;
    event: 'mint' | 'transfer' | 'burn' | 'update' | 'bridge' | 'swap';
    from?: string;
    to?: string;
    txHash: string;
    gasUsed?: bigint;
    gasPrice?: bigint;
    bridgeData?: {
      sourceChain: number;
      destinationChain: number;
      bridgeProtocol: string;
    };
  }>;
}
```

## 5. Service Discovery Implementation

### 5.1 Computing Service Interface

```typescript
interface ComputingService {
  serviceId: string;
  provider: string;        // Provider DID
  capabilities: {
    cpu: {
      cores: number;
      architecture: string; // x86_64, arm64, etc.
      frequency: number;    // GHz
    };
    memory: number;        // GB
    gpu?: {
      model: string;
      memory: number;      // GB VRAM
      cudaCores?: number;
    };
    storage: {
      type: 'SSD' | 'HDD' | 'NVMe';
      capacity: number;    // GB
      iops: number;
    };
  };
  
  pricing: {
    model: 'per-hour' | 'per-task' | 'subscription';
    amount: bigint;
    currency: string;      // Token contract address
  };
  
  availability: {
    uptime: number;        // Percentage
    regions: string[];     // Geographic regions
    latency: number;       // Average latency in ms
  };
  
  discovery: {
    libp2p?: {
      peerId: string;
      multiaddrs: string[];
    };
    dns?: {
      hostname: string;
      port: number;
    };
    ens?: string;          // ENS name
  };
}
```

## 6. Multi-Chain Configuration

### 6.1 Chain Configuration

```typescript
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
  
  // VCard-specific configuration
  vCardRegistry: string;    // VCard registry contract
  bridgeContract?: string;  // Cross-chain bridge
  paymasterContract?: string; // Account abstraction paymaster
  
  // Layer 2 specific
  layer?: {
    type: 'optimistic' | 'zk' | 'sidechain' | 'state-channel';
    parentChain?: number;   // Parent chain ID
    withdrawalDelay?: number; // Withdrawal delay in blocks
  };
}
```

## 7. Use Case Implementations

### 7.1 Decentralized Computing Marketplace

```typescript
interface ComputingMarketplace {
  // Resource listing
  listResource: (service: ComputingService) => Promise<VCard>;
  
  // Resource discovery
  discoverResources: (requirements: ResourceRequirements) => Promise<VCard[]>;
  
  // Resource booking with smart contracts
  bookResource: (
    resourceVCard: VCard,
    duration: number,
    payment: PaymentDetails
  ) => Promise<BookingContract>;
  
  // Reputation and quality assurance
  rateProvider: (
    providerDID: string,
    rating: number,
    review: string
  ) => Promise<ReputationVCard>;
}
```

### 7.2 Cross-Chain NFT Collections

```typescript
interface CrossChainNFTCollection {
  // Deploy collection across multiple chains
  deployMultiChain: (
    chains: number[],
    metadata: CollectionMetadata
  ) => Promise<Map<number, VCard>>;
  
  // Bridge NFTs between chains
  bridgeNFT: (
    tokenVCard: VCard,
    sourceChain: number,
    destinationChain: number
  ) => Promise<BridgeTransaction>;
  
  // Unified collection view
  getUnifiedCollection: (
    collectionId: string
  ) => Promise<{
    totalSupply: bigint;
    chainDistribution: Map<number, bigint>;
    floorPrices: Map<number, bigint>;
  }>;
}
```

## 8. Security Implementation

### 8.1 Zero-Knowledge Proofs

```typescript
interface ZKProofConfig {
  // Proof system configuration
  system: 'groth16' | 'plonk' | 'stark' | 'bulletproofs';
  
  // Circuit configuration
  circuit: {
    name: string;
    constraints: number;
    publicInputs: string[];
    privateInputs: string[];
  };
  
  // Proof verification
  verifyProof: (
    proof: string,
    publicSignals: string[],
    verificationKey: string
  ) => boolean;
}
```

### 8.2 Compliance Framework

```typescript
interface ComplianceFramework {
  // KYC/AML integration
  kycProvider: {
    name: string;
    apiEndpoint: string;
    requiredLevel: 'basic' | 'enhanced' | 'institutional';
  };
  
  // Jurisdiction-specific rules
  jurisdictionRules: Map<string, {
    transferLimits: bigint;
    reportingThreshold: bigint;
    restrictedCountries: string[];
    taxReporting: boolean;
  }>;
  
  // Compliance checking
  checkCompliance: (
    transaction: Transaction,
    userProfile: UserProfile
  ) => Promise<ComplianceResult>;
}