# PRD: LAT-Based Codebase Reconstruction Workflow

## 1. Objective

Provide a structured, interactive workflow that enables a developer to **decompose an existing codebase into a concept graph and reconstruct invariant-driven specifications** (lat.md-compatible), focusing strictly on:

* **What the system guarantees**
* **Why those guarantees exist**

Explicitly exclude:

* implementation details
* control flow
* data structures

The system must support **incremental, inspectable, and interruptible progression**, not batch execution.

---

## 2. Problem Statement

Existing documentation approaches:

* mirror code structure rather than intent
* entangle “what” with “how”
* degrade under iteration and refactoring

LLM-assisted summarization:

* hallucinates intent
* produces non-actionable prose
* cannot detect inconsistencies

A system is required that:

* reconstructs **design intent as a first-class artifact**
* enforces **invariant-based specifications**
* exposes **contradictions between code and spec**

---

## 3. Scope

### In Scope

* Concept extraction from code
* Concept graph construction
* Evidence-based invariant extraction
* Spec synthesis (lat-style)
* Spec compression
* Code vs spec auditing
* Incremental, per-concept workflow
* Manual review and intervention at every step

### Out of Scope

* Code generation
* Automatic refactoring
* Full automation without human review
* Runtime enforcement of specs

---

## 4. Core Concepts

### 4.1 Concept

A unit of responsibility defined by:

* behavior or guarantee
* independence from implementation
* stability across rewrites

### 4.2 Artifact Types

Each concept may produce:

* **Extraction** (evidence-backed facts)
* **Synthesis** (intent-level specification)
* **Audit** (spec/code mismatches)

### 4.3 Concept Lifecycle

```
candidate → extracted → specified → audited
```

Progression is explicit and reversible.

---

## 5. Functional Requirements

### 5.1 Decomposition

* System MUST allow splitting a codebase into **analysis units**
* Units MUST represent **single responsibilities**
* Over-segmentation is preferred to under-segmentation

---

### 5.2 Concept Extraction

* System MUST derive **concept candidates** from units
* Concepts MUST:

  * not correspond to file names or types
  * be describable independent of implementation

---

### 5.3 Concept Graph

* System MUST support relationships:

  * depends_on
  * refines
  * interacts_with
  * constrains

* Graph MUST be:

  * non-hierarchical
  * incrementally constructed

---

### 5.4 Evidence Extraction

* System MUST extract:

  * responsibilities (observable behavior)
  * invariants (with code evidence)
  * failure modes

* Every claim MUST:

  * be traceable to code
  * include location reference

* System MUST NOT:

  * infer intent at this stage

---

### 5.5 Specification Synthesis

* System MUST produce lat-style nodes with:

  * Purpose
  * Non-goals
  * Invariants
  * Constraints
  * Rationale

* Specifications MUST:

  * exclude implementation details
  * remain valid under full rewrite

---

### 5.6 Specification Compression

* System MUST:

  * limit sections to high-density statements
  * eliminate redundancy
  * merge overlapping claims

---

### 5.7 Audit

* System MUST detect:

  * violated invariants
  * undocumented behavior
  * mismatches between code and spec

* Each finding MUST be classified:

  * bug
  * spec_error
  * undocumented_behavior

---

### 5.8 Incremental Operation

* System MUST allow:

  * independent progression of concepts
  * partial completion of the graph
  * re-entry at any phase

---

### 5.9 Manual Intervention

* System MUST support:

  * artifact inspection
  * manual edits
  * re-validation after edits

* Any modification MUST:

  * invalidate downstream artifacts

---

### 5.10 State Management

* System MUST maintain:

  * concept states
  * artifacts per concept
  * graph structure

* State MUST be:

  * serializable (e.g., JSON)
  * resilient to partial updates

---

## 6. Non-Functional Requirements

### 6.1 Determinism (within bounds)

* Given identical inputs and prompts, outputs should be stable

### 6.2 Traceability

* Every invariant must map back to code evidence

### 6.3 Composability

* Concepts must be reusable and linkable

### 6.4 Latency Tolerance

* System prioritizes correctness over speed or token efficiency

---

## 7. Constraints

### 7.1 “No How” Constraint

System MUST reject outputs that include:

* control flow
* data structures
* implementation details

---

### 7.2 Invariant Validity Constraint

All statements MUST satisfy:

> They remain true if the implementation is completely rewritten.

---

### 7.3 Role Separation

System MUST enforce:

* extraction (no interpretation)
* synthesis (no implementation)
* audit (no rewriting)

---

## 8. Success Criteria

A successful system:

* Produces **lat.md-compatible specifications**
* Enables **clean-room reimplementation** from specs alone
* Surfaces **non-obvious inconsistencies** in the codebase
* Allows **incremental progress without global recomputation**
* Improves **LLM reasoning efficiency** by replacing raw code context

---

## 9. Failure Conditions

The system is considered failed if:

* specs contain implementation details
* concepts mirror file/module structure
* invariants are unverifiable or vague
* workflow requires full linear completion
* artifacts cannot be independently inspected or revised

---

## 10. Usage Model

User interacts via discrete operations:

* decomposition
* concept extraction
* evidence extraction
* spec synthesis
* audit

Each step produces a **reviewable artifact** before progression.

---

## 11. Future Extensions (Non-Blocking)

* automated drift detection (“lat check” equivalent)
* versioned spec evolution
* integration with code review systems
* visualization of concept graph

---
