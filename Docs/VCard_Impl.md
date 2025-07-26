# VCard Implementation Guide

## Overview

This document provides detailed implementation specifications for VCard (Value-Carrying Card), the Application Plane component of the Progressive Knowledge Container (PKC) system. For design intent and conceptual framework, see [VCard.md](./VCard.md).

**Key Implementation Principle**: VCard is a **subclass of both [[PCard]] and [[MCard]]**, inheriting:
- **From [[MCard]]**: Content-addressable storage for immutable value data
- **From [[PCard]]**: Polynomial expression format for encoding value assessments
- **Blockchain Integration**: Represents smart contracts, atomic swaps, and DeFi protocols as polynomial functors

## 1. Core Data Structures

### 1.1 VCard Dual Inheritance Structure

```typescript
// VCard extends both PCard and MCard for dual inheritance
interface VCard extends PCard, MCard {
  // Inherited from MCard
  content: Blob;          // SQLite BLOB type
  content_hash: string;   // Cryptographic hash (SHA-256) for identity
  g_time: string;        // Global timestamp for versioning
  
  // Inherited from PCard
  abstractSpecHash: string;           // Social identity: human-readable function description
  concreteImplHash: string;          // Physical execution: REPL-like interactive runtime
  balancedExpectationsHash: string;  // Interactive validation repository
  
  // VCard-specific polynomial value assessment extensions
  valueSeekingPolynomial: PolynomialExpression;   // F_seek(X) = Σ(Opportunity_i × X^SearchComplexity_i)
  valueSeeingPolynomial: PolynomialExpression;    // F_see(X) = Σ(Pattern_i × X^RecognitionDepth_i)
  valueDeliveryPolynomial: PolynomialExpression;  // F_deliver(X) = Σ(Transfer_i × X^ExecutionCost_i)
  
  // Blockchain integration through hash composition
  smartContractHash: string;         // MCard hash containing smart contract bytecode
  defiProtocolConfigHash: string;    // MCard hash containing DeFi protocol configurations
  crossChainBridgeHash: string;      // MCard hash containing bridge protocol settings
  atomicSwapConfigHash: string;      // MCard hash containing HTLC configurations
  
  // Economic coordination through polynomial assessment
  liquidityPoolHash: string;         // MCard hash containing AMM liquidity data
  yieldFarmingStrategyHash: string;  // MCard hash containing yield optimization strategies
  gasOptimizationHash: string;       // MCard hash containing gas cost optimization data
}

// Polynomial expression structure for value assessment
interface PolynomialExpression {
  coefficients: string[];  // MCard hashes containing assessment data
  exponents: number[];     // Complexity/cost measures
  evaluationContext: string; // MCard hash containing evaluation parameters
}
```

### 1.2 Polynomial Value Assessment Implementation

```typescript
class VCardPolynomialAssessment {
  // Create VCard with polynomial value assessment from PCard base
  static createVCard(
    pcard: PCard,
    valueSeekingData: MCard[],
    valueSeeingData: MCard[],
    valueDeliveryData: MCard[],
    blockchainConfig: BlockchainConfiguration
  ): VCard {
    
    // Compose polynomial expressions for value assessment
    const valueSeekingPolynomial = this.composePolynomial(
      valueSeekingData,
      'opportunity_discovery'
    );
    
    const valueSeeingPolynomial = this.composePolynomial(
      valueSeeingData,
      'pattern_recognition'
    );
    
    const valueDeliveryPolynomial = this.composePolynomial(
      valueDeliveryData,
      'transfer_execution'
    );
    
    return {
      // Inherited from MCard
      content: new Blob([JSON.stringify({
        valueAssessment: {
          seeking: valueSeekingPolynomial,
          seeing: valueSeeingPolynomial,
          delivery: valueDeliveryPolynomial
        },
        blockchain: blockchainConfig
      })]),
      content_hash: this.computeHash({valueSeekingPolynomial, valueSeeingPolynomial, valueDeliveryPolynomial}),
      g_time: new Date().toISOString(),
      
      // Inherited from PCard
      abstractSpecHash: pcard.abstractSpecHash,
      concreteImplHash: pcard.concreteImplHash,
      balancedExpectationsHash: pcard.balancedExpectationsHash,
      
      // VCard-specific polynomial assessments
      valueSeekingPolynomial,
      valueSeeingPolynomial,
      valueDeliveryPolynomial,
      
      // Blockchain integration
      smartContractHash: blockchainConfig.smartContractHash,
      defiProtocolConfigHash: blockchainConfig.defiConfigHash,
      crossChainBridgeHash: blockchainConfig.bridgeConfigHash,
      atomicSwapConfigHash: blockchainConfig.swapConfigHash,
      liquidityPoolHash: blockchainConfig.liquidityHash,
      yieldFarmingStrategyHash: blockchainConfig.yieldStrategyHash,
      gasOptimizationHash: blockchainConfig.gasOptimizationHash
    };
  }
  
  // Compose polynomial expression from MCard data
  static composePolynomial(
    mcards: MCard[],
    assessmentType: 'opportunity_discovery' | 'pattern_recognition' | 'transfer_execution'
  ): PolynomialExpression {
    const coefficients = mcards.map(mcard => mcard.content_hash);
    const exponents = this.calculateComplexity(mcards, assessmentType);
    
    return {
      coefficients,
      exponents,
      evaluationContext: this.createEvaluationContext(assessmentType)
    };
  }
  
  // Calculate complexity measures for polynomial exponents
  static calculateComplexity(
    mcards: MCard[],
    assessmentType: string
  ): number[] {
    return mcards.map(mcard => {
      const content = JSON.parse(mcard.content.toString());
      switch (assessmentType) {
        case 'opportunity_discovery':
          return content.searchComplexity || 1;
        case 'pattern_recognition':
          return content.recognitionDepth || 1;
        case 'transfer_execution':
          return content.executionCost || 1;
        default:
          return 1;
      }
    });
  }
}
```

### 1.3 VCard Identity Implementation

```typescript
// VCard Identity stored as MCard hash composition
interface VCardIdentity {
  // Core identity stored as MCard hash
  identityMCardHash: string;      // MCard containing DID document
  
  // W3C DID specification compliance (stored in referenced MCard)
  didDocumentHash: string;        // MCard hash containing DID document
  authenticationHash: string;     // MCard hash containing authentication methods
  
  // Account Abstraction integration (stored as MCard references)
  accountAbstractionHash: string; // MCard hash containing AA configuration
  smartWalletConfigHash: string;  // MCard hash containing wallet setup
  guardiansHash?: string;         // MCard hash containing social recovery data
  sessionKeysHash?: string;       // MCard hash containing temporary permissions
}

// Implementation class for identity management
class VCardIdentityManager {
  // Create identity from MCard components
  static createIdentity(
    didDocument: MCard,
    authentication: MCard,
    accountAbstraction: MCard
  ): VCardIdentity {
    return {
      identityMCardHash: didDocument.content_hash,
      didDocumentHash: didDocument.content_hash,
      authenticationHash: authentication.content_hash,
      accountAbstractionHash: accountAbstraction.content_hash,
      smartWalletConfigHash: accountAbstraction.content_hash
    };
  }
  
  // Resolve identity from hash references
  static async resolveIdentity(identity: VCardIdentity): Promise<ResolvedIdentity> {
    const didDocument = await MCardStorage.retrieve(identity.didDocumentHash);
    const authentication = await MCardStorage.retrieve(identity.authenticationHash);
    const accountAbstraction = await MCardStorage.retrieve(identity.accountAbstractionHash);
    
    return {
      didDocument: JSON.parse(didDocument.content.toString()),
      authentication: JSON.parse(authentication.content.toString()),
      accountAbstraction: JSON.parse(accountAbstraction.content.toString())
    };
  }
}
```

### 1.4 Smart Contract Wallets with Hash Composition

```typescript
// Smart Wallet configuration stored through MCard hash composition
interface SmartWallet {
  // Wallet configuration stored as MCard hash
  walletConfigHash: string;        // MCard containing wallet setup
  
  // ERC-4337 UserOperation structure (stored as MCard references)
  userOperationTemplateHash: string; // MCard containing operation template
  paymasterConfigHash: string;      // MCard containing paymaster setup
  
  // Wallet-specific data through hash composition
  deploymentCodeHash: string;       // MCard containing deployment bytecode
  securityPolicyHash: string;       // MCard containing security rules
  recoveryConfigHash: string;       // MCard containing recovery mechanisms
}

## 2. Blockchain Integration Implementation

### 2.1 Smart Contract as Polynomial Functor

```typescript
// Smart contracts represented as polynomial functors
class SmartContractPolynomial {
  // Create smart contract from polynomial expression
  static createContract(
    contractSpec: MCard,
    stateVariables: MCard[],
    functions: MCard[]
  ): SmartContractPolynomial {
    
    // Contract state as polynomial coefficients
    const stateCoefficients = stateVariables.map(state => state.content_hash);
    
    // Function complexity as polynomial exponents
    const functionExponents = functions.map(func => {
      const content = JSON.parse(func.content.toString());
      return content.gasComplexity || 1;
    });
    
    return {
      contractHash: contractSpec.content_hash,
      statePolynomial: {
        coefficients: stateCoefficients,
        exponents: functionExponents,
        evaluationContext: contractSpec.content_hash
      },
      deploymentBytecode: this.generateBytecode(contractSpec, stateVariables, functions)
    };
  }
  
  // Execute contract function as polynomial evaluation
  static async executeFunction(
    contract: SmartContractPolynomial,
    functionName: string,
    parameters: any[]
  ): Promise<ExecutionResult> {
    
    // Evaluate polynomial for gas estimation
    const gasEstimate = this.evaluatePolynomial(
      contract.statePolynomial,
      parameters.length
    );
    
    // Execute with polynomial-optimized gas limit
    return await this.executeWithGasOptimization(
      contract,
      functionName,
      parameters,
      gasEstimate
    );
  }
}
```

### 2.2 Cross-Chain Atomic Swap Implementation

```typescript
// Cross-chain atomic swaps as categorical morphisms
class AtomicSwapMorphism {
  // Create atomic swap between blockchain polynomial functors
  static createSwap(
    sourceChain: BlockchainPolynomial,
    targetChain: BlockchainPolynomial,
    swapAmount: bigint,
    timelock: number
  ): AtomicSwapMorphism {
    
    // HTLC as polynomial morphism between chains
    const htlcPolynomial = this.composeHTLCPolynomial(
      sourceChain.polynomial,
      targetChain.polynomial,
      swapAmount,
      timelock
    );
    
    return {
      sourceChainHash: sourceChain.chainHash,
      targetChainHash: targetChain.chainHash,
      htlcPolynomial,
      swapParameters: {
        amount: swapAmount,
        timelock,
        hashLock: this.generateHashLock()
      }
    };
  }
  
  // Execute atomic swap through polynomial composition
  static async executeSwap(
    swap: AtomicSwapMorphism,
    secret: string
  ): Promise<SwapResult> {
    
    // Verify polynomial morphism preserves categorical structure
    const morphismValid = this.verifyMorphismProperties(swap.htlcPolynomial);
    
    if (!morphismValid) {
      throw new Error('Invalid categorical morphism for atomic swap');
    }
    
    // Execute swap with polynomial-verified parameters
    return await this.executeCrossChainTransfer(
      swap.sourceChainHash,
      swap.targetChainHash,
      swap.swapParameters,
      secret
    );
  }
}
```

### 2.3 DeFi Protocol Integration

```typescript
// DeFi protocols as polynomial functor categories
class DeFiProtocolCategory {
  // Create liquidity pool as polynomial coefficient distribution
  static createLiquidityPool(
    tokenA: MCard,
    tokenB: MCard,
    initialLiquidity: bigint
  ): LiquidityPoolPolynomial {
    
    // Pool state as polynomial with token reserves as coefficients
    const poolPolynomial = {
      coefficients: [tokenA.content_hash, tokenB.content_hash],
      exponents: [1, 1], // Linear for constant product formula
      evaluationContext: this.createPoolContext(tokenA, tokenB, initialLiquidity)
    };
    
    return {
      poolHash: this.computePoolHash(tokenA, tokenB),
      polynomial: poolPolynomial,
      constantProduct: initialLiquidity * initialLiquidity
    };
  }
  
  // Yield farming strategy as polynomial optimization
  static createYieldStrategy(
    pools: LiquidityPoolPolynomial[],
    riskTolerance: number
  ): YieldOptimizationPolynomial {
    
    // Compose yield strategy as polynomial optimization problem
    const strategyPolynomial = this.optimizeYieldPolynomial(
      pools.map(pool => pool.polynomial),
      riskTolerance
    );
    
    return {
      strategyHash: this.computeStrategyHash(pools, riskTolerance),
      optimizationPolynomial: strategyPolynomial,
      expectedAPY: this.calculateAPY(strategyPolynomial),
      riskMetrics: this.calculateRisk(strategyPolynomial)
    };
  }
  
  // Execute DeFi strategy through polynomial composition
  static async executeStrategy(
    strategy: YieldOptimizationPolynomial,
    amount: bigint
  ): Promise<StrategyResult> {
    
    // Evaluate polynomial for optimal allocation
    const allocation = this.evaluateOptimizationPolynomial(
      strategy.optimizationPolynomial,
      amount
    );
    
    // Execute strategy with polynomial-optimized parameters
    return await this.executeOptimalAllocation(
      allocation,
      strategy.strategyHash
    );
  }
}
```
    signatureHash: string;        // MCard hash containing signature data
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