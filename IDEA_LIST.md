# Idea List

## 1. Fault Capsule

A local-first incident context compiler that turns noisy telemetry, maintenance history, asset topology, and safety rules into a compact evidence capsule, enabling Gemma 4 to choose the next safe diagnostic check.

## 2. Repro Capsule

A privacy-first research assistant that combines private experiment logs with sourced public science, enabling local Gemma 4 to identify the next reproducibility check without exposing sensitive or unpublished data.

```mermaid
flowchart LR
    subgraph Fault["Fault Capsule"]
        F1["Telemetry<br/>Maintenance<br/>Safety Rules"]
        F2["Incident<br/>Context Compiler"]
        F3["Local Gemma 4"]
        F4["Next Safe<br/>Diagnostic Check"]

        F1 --> F2 --> F3 --> F4
    end

    subgraph Repro["Repro Capsule"]
        R1["Private Logs<br/>Code & Dataset Versions"]
        R2["Repro<br/>Context Compiler"]
        R3["Local Gemma 4"]
        R4["Next Reproducibility<br/>Check"]
        A["Alien / OpenAIRE<br/>Public Science"]
        S["SerpAPI<br/>Public Sources"]

        R1 --> R2
        A --> R2
        S --> R2
        R2 --> R3 --> R4
    end
```
