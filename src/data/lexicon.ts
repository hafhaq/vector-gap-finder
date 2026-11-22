/**
 * Cross-Domain Capability & Paradigm Lexicon (~160 curated primitives)
 * Used for Inverse Gap Vector Decoding (Orthogonal Residual Concept Inversion).
 *
 * When a void is detected in semantic vector space, these primitives are projected into
 * the exact same embedding space (LSA-SVD or MiniLM-L6-v2) so the engine can mathematically
 * identify which cross-domain capabilities sit inside the untapped niche!
 */

import type { LexiconConcept } from '../types.ts';

export const CAPABILITY_LEXICON: LexiconConcept[] = [
  // Verification, Trust & Cryptography
  {
    term: 'Formal Proof Verification',
    domain: 'Verification & Safety',
    description: 'Mathematical proof synthesis and SMT model checking guaranteeing zero runtime safety or logic violations before deployment',
  },
  {
    term: 'Zero-Knowledge Telemetry Proofs',
    domain: 'Cryptography',
    description: 'zk-SNARK cryptographic attestation proving compliance, uptime, or production metrics without revealing proprietary factory or trade-secret data',
  },
  {
    term: 'Post-Quantum Fieldbus Cryptography',
    domain: 'Cryptography',
    description: 'Lattice-based post-quantum key exchange and hardware-rooted message authentication for long-lived industrial and edge infrastructure',
  },
  {
    term: 'Confidential Enclave Execution',
    domain: 'Security',
    description: 'Hardware trusted execution environments (TEE) isolating sensitive control algorithms, IP, and ML weights on untrusted shared edge nodes',
  },
  {
    term: 'Cryptographic Supply-Chain Attestation',
    domain: 'Security',
    description: 'Signed SBOMs, reproducible firmware builds, and immutable provenance verification across hardware modules and software dependencies',
  },
  {
    term: 'Self-Revoking Capability Tokens',
    domain: 'Security',
    description: 'Fine-grained time-bounded zero-trust capability leases replacing static passwords and flat network segmentation',
  },
  {
    term: 'Byzantine Fault-Tolerant Control',
    domain: 'Distributed Systems',
    description: 'Consensus-backed actuation surviving arbitrary compromised, hallucinating, or adversarial sensor and controller nodes',
  },
  {
    term: 'Deterministic Sandboxed WebAssembly',
    domain: 'Runtime Systems',
    description: 'Memory-safe deterministic Wasm micro-runtimes isolating third-party plugins, control logic, and skills with hard WCET timing budgets',
  },

  // Autonomous Intelligence, Reasoning & Verification
  {
    term: 'Verified Neuro-Symbolic Synthesis',
    domain: 'AI & Control',
    description: 'Combining neural foundation models with symbolic constraint solvers to synthesize guaranteed-safe control code or execution plans',
  },
  {
    term: 'Causal Root-Cause Inference',
    domain: 'AI & Diagnostics',
    description: 'Structural causal graphs distinguishing true upstream physical or software root faults from cascading alarm floods',
  },
  {
    term: 'Differentiable Physics Co-Simulation',
    domain: 'Simulation',
    description: 'Gradient-enabled physics engines allowing real-time inverse parameter identification and closed-loop trajectory optimization',
  },
  {
    term: 'Federated Cross-Site Learning',
    domain: 'Distributed AI',
    description: 'Privacy-preserving collaborative model training across competing factories, clinics, or fleets without centralizing raw telemetry',
  },
  {
    term: 'Active Uncertainty-Aware Exploration',
    domain: 'AI & Control',
    description: 'Bayesian epistemic uncertainty quantification that triggers safe human escalation or targeted probing when encountering out-of-distribution states',
  },
  {
    term: 'Continual Zero-Downtime Adaptation',
    domain: 'AI & Control',
    description: 'Online adaptation to mechanical wear, calibration drift, and process shifts without halting production or catastrophic forgetting',
  },
  {
    term: 'Counterfactual What-If Replay',
    domain: 'Simulation',
    description: 'Branching shadow execution testing hypothetical policy, parameter, or recipe changes on live mirrored state before committing',
  },
  {
    term: 'Neuromorphic Event-Driven Sensing',
    domain: 'Edge Hardware',
    description: 'Ultra-low-latency asynchronous spiking neural processing reacting to microsecond anomalies at milliwatt power budgets',
  },
  {
    term: 'Physics-Informed Anomaly Bounds',
    domain: 'AI & Diagnostics',
    description: 'Embedding conservation laws and thermodynamic equations directly into neural monitors to eliminate false-positive drift',
  },
  {
    term: 'Multimodal Acoustic & Tactile Fusion',
    domain: 'Sensing',
    description: 'Fusing ultrasonic audio, force-torque, vibration, and thermal streams to perceive micro-defects invisible to standard cameras',
  },

  // Architecture, Networking & Distributed Control
  {
    term: 'Intent-Based Autonomous Orchestration',
    domain: 'Networking & Ops',
    description: 'Declarative high-level SLA and throughput goals compiled automatically into low-level deterministic network, compute, and actuator schedules',
  },
  {
    term: 'Self-Healing Reconfigurable Mesh',
    domain: 'Resilience',
    description: 'Autonomous runtime topology rerouting and live workload migration around failed hardware nodes without operator intervention',
  },
  {
    term: 'Swarm Decentralized Coordination',
    domain: 'Distributed Systems',
    description: 'Leaderless local-rule multi-agent coordination scaling seamlessly across hundreds of mobile robots, cells, or edge nodes',
  },
  {
    term: 'Time-Deterministic Wireless Control',
    domain: 'Networking',
    description: 'Sub-millisecond bounded-jitter closed-loop control over private 5G URLLC, Wi-Fi 7 deterministic scheduling, or UWB',
  },
  {
    term: 'Semantic Digital Thread Interoperability',
    domain: 'Data Architecture',
    description: 'Self-describing ontology-backed data contracts eliminating brittle manual tag mapping across heterogeneous legacy and cloud systems',
  },
  {
    term: 'Zero-Configuration Plug-and-Produce',
    domain: 'Automation',
    description: 'Autonomous device discovery, capability negotiation, and kinematic self-calibration when swapping hardware modules on the fly',
  },
  {
    term: 'CRDT Offline-First State Sync',
    domain: 'Distributed Systems',
    description: 'Conflict-free replicated data types keeping air-gapped or intermittent edge sites strictly consistent without central cloud lock-in',
  },
  {
    term: 'Deterministic Event-Sourced Replay',
    domain: 'Runtime Systems',
    description: 'Bit-exact time-travel debugging and audit logging of every sensor frame, state transition, and actuator command',
  },
  {
    term: 'Hardware-in-the-Loop Fuzz Testing',
    domain: 'Verification & Safety',
    description: 'Automated adversarial fault injection and boundary stress testing against virtualized controllers before physical commissioning',
  },
  {
    term: 'Composable Micro-Control Primitives',
    domain: 'Software Architecture',
    description: 'Hot-swappable versioned functional skills with strict typed interfaces replacing monolithic proprietary ladder or script bases',
  },

  // Sustainability, Energy & Physical Economics
  {
    term: 'Carbon-Aware Dynamic Load Scheduling',
    domain: 'Energy & Sustainability',
    description: 'Real-time adjustment of batch sequencing, actuator speed profiles, and compute jobs according to live grid carbon intensity and spot tariffs',
  },
  {
    term: 'Regenerative Kinetic Energy Harvesting',
    domain: 'Energy & Sustainability',
    description: 'Capturing braking, thermal, and vibration energy across synchronized axes and sharing DC bus power dynamically across cells',
  },
  {
    term: 'Circular Remanufacturing Disassembly',
    domain: 'Sustainability',
    description: 'Adaptive perception-guided non-destructive robotic disassembly and component grading for circular economy recovery',
  },
  {
    term: 'Autonomous Microgrid Co-Control',
    domain: 'Energy & Sustainability',
    description: 'Co-optimizing factory machinery, battery storage, and on-site renewables inside a unified sub-second real-time control loop',
  },
  {
    term: 'Digital Product Passport Traceability',
    domain: 'Compliance & Markets',
    description: 'Item-level automated carbon footprint, material provenance, and lifecycle telemetry recorded natively during execution',
  },

  // Human-Machine Symbiosis & Cognitive UX
  {
    term: 'Natural-Language Guardrailed Commissioning',
    domain: 'Human-Machine UX',
    description: 'Conversational intent capture compiled into formally checked configuration diffs with visual simulation preview before apply',
  },
  {
    term: 'Spatial AR X-Ray Diagnostics',
    domain: 'Human-Machine UX',
    description: 'Live spatial augmented reality overlay projecting real-time internal signals, thermal stress, and dataflow directly onto physical assets',
  },
  {
    term: 'Shared-Autonomy Teleoperation Handover',
    domain: 'Human-Machine UX',
    description: 'Seamless blended human-AI intervention where operators resolve edge-case exceptions while the system learns the recovery skill',
  },
  {
    term: 'Adaptive Cognitive Load Interfaces',
    domain: 'Human-Machine UX',
    description: 'Context-aware operator consoles suppressing secondary noise during crisis events and surfacing only high-leverage causal actions',
  },
  {
    term: 'Tribal Knowledge Graph Capture',
    domain: 'Knowledge Systems',
    description: 'Extracting veteran technician troubleshooting heuristics from maintenance logs, voice notes, and machine states into executable playbooks',
  },
  {
    term: 'Explainable Regulatory Audit Trails',
    domain: 'Compliance & Markets',
    description: 'Human-readable counterfactual justifications for every autonomous decision satisfying EU AI Act, FDA, and IEC safety auditors',
  },

  // Business Models, Ecosystems & Market Structure
  {
    term: 'Outcome-Based Automation Metering',
    domain: 'Market & Economics',
    description: 'Pay-per-good-unit or guaranteed-OEE commercial models backed by verifiable edge telemetry instead of upfront CapEx licensing',
  },
  {
    term: 'Open Cross-Vendor Skill Marketplace',
    domain: 'Market & Economics',
    description: 'Hardware-agnostic app store of certified control modules, safety blocks, and robotic policies portable across competing OEMs',
  },
  {
    term: 'Automated Brownfield Legacy Bridging',
    domain: 'Migration & Legacy',
    description: 'Non-invasive sidecar adapters wrapping decades-old serial, Modbus, or undocumented monoliths into modern typed APIs without rewiring',
  },
  {
    term: 'Zero-Touch Multi-Site Fleet Rollout',
    domain: 'Operations',
    description: 'Canary-tested GitOps progressive delivery of verified firmware, models, and logic across thousands of heterogeneous remote sites',
  },
  {
    term: 'Autonomous Spare-Parts Supply Triggering',
    domain: 'Supply Chain',
    description: 'Linking remaining-useful-life degradation curves directly to just-in-time procurement, 3D printing, and maintenance crew scheduling',
  },
  {
    term: 'Continuous Compliance Drift Remediation',
    domain: 'Compliance & Markets',
    description: 'Real-time detection and automated safe rollback whenever live configurations diverge from certified safety or security baselines',
  },

  // Compute, Silicon & Physical Frontiers
  {
    term: 'FPGA-Accelerated Sub-Microsecond Inference',
    domain: 'Edge Hardware',
    description: 'Quantized neural control loops synthesized directly into programmable logic for deterministic microsecond closed-loop response',
  },
  {
    term: 'Bio-Inspired Homeostatic Fault Tolerance',
    domain: 'Resilience',
    description: 'Graceful degraded-mode survival algorithms dynamically redistributing load and recalibrating dynamics after partial actuator damage',
  },
  {
    term: 'Soft-Body & Deformable Manipulation',
    domain: 'Robotics & Physics',
    description: 'Real-time modeling and closed-loop control of cables, fabrics, fluids, and biological tissues beyond rigid-body assumptions',
  },
  {
    term: 'Self-Calibrating Sensor-Less Estimation',
    domain: 'Sensing',
    description: 'Virtual soft sensors inferring internal torque, temperature, wear, or chemical state purely from motor current and physics observers',
  },
  {
    term: 'Acoustic & RF Passive Localization',
    domain: 'Sensing',
    description: 'Camera-free privacy-preserving spatial tracking of tools, assets, and workers through cluttered or visually occluded environments',
  },
  {
    term: 'Cross-Modal Sim-to-Real Domain Randomization',
    domain: 'Simulation',
    description: 'Zero-shot policy transfer from procedural photorealistic and physical-friction randomized simulations directly onto physical hardware',
  },
  {
    term: 'Speculative Execution & Latency Hiding',
    domain: 'Runtime Systems',
    description: 'Pre-computing probable next control or UI branches in parallel with safe instant rollback when real sensor feedback diverges',
  },
  {
    term: 'Memory-Safe Systems Firmware (Rust)',
    domain: 'Runtime Systems',
    description: 'Eliminating buffer overflows and data races in safety-critical embedded real-time controllers through compile-time ownership proofs',
  },
  {
    term: 'Differential Privacy Benchmark Sharing',
    domain: 'Cryptography',
    description: 'Mathematically bounded noise injection allowing industry peers to compare yield, latency, and security benchmarks without leaking secrets',
  },
  {
    term: 'Autonomous Red-Team Chaos Injection',
    domain: 'Security',
    description: 'Continuous automated adversarial simulation probing OT/IT boundaries, agent prompt injection, and safety interlocks in shadow twins',
  },
  {
    term: 'Semantic Diff & Behavioral Regression Testing',
    domain: 'Verification & Safety',
    description: 'Evaluating code or model updates by comparing invariant state trajectories rather than brittle syntactic line diffs',
  },
  {
    term: 'Composable Multi-Agent Contract Protocols',
    domain: 'AI & Control',
    description: 'Formal SLA negotiation, budget limits, and verifiable handoff schemas between specialized autonomous agents across vendor boundaries',
  },
  {
    term: 'Local-First Air-Gapped Small Reasoning Models',
    domain: 'Distributed AI',
    description: 'Compact quantized reasoning models running completely offline on ruggedized edge silicon with zero cloud dependency or data exfiltration',
  },
  {
    term: 'Automated Kinematic & Wiring Synthesis',
    domain: 'Automation',
    description: 'Generative co-design jointly optimizing mechanical layout, I/O bus topology, and control logic from target product geometry',
  },
  {
    term: 'Dynamic Safety-Zone Fluid Envelopes',
    domain: 'Verification & Safety',
    description: 'Real-time velocity-scaled 3D human-robot safety fields replacing rigid physical cages to maximize collaborative throughput',
  },
  {
    term: 'Self-Documenting Live System Cartography',
    domain: 'Knowledge Systems',
    description: 'Passive network and code introspection continuously reconstructing accurate architecture, dependency, and physical wiring diagrams',
  },
  {
    term: 'Verifiable Long-Horizon Task Memory',
    domain: 'AI & Control',
    description: 'Structured episodic and procedural memory graphs with provenance citations preventing hallucination across multi-week operations',
  },
  {
    term: 'Thermal & Wear-Aware Predictive Scheduling',
    domain: 'Energy & Sustainability',
    description: 'Balancing work across redundant machines and actuators to equalize thermal fatigue and extend fleet lifetime without throughput loss',
  },
  {
    term: 'Deterministic Multi-Tenant Compute Slicing',
    domain: 'Runtime Systems',
    description: 'Hardware-enforced cache, memory, and I/O partitioning running hard real-time safety loops alongside best-effort AI workloads on one SoC',
  },
];
