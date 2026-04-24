import type { CareerRole } from "./types";

/**
 * Role-specific future skill predictions (2026+ industry trends).
 * Realistic, role-targeted, non-random.
 */
const FUTURE_BY_CATEGORY: Record<string, string[]> = {
  "AI / ML": [
    "LLM Fine-tuning (LoRA / QLoRA)",
    "Agentic AI Frameworks (LangGraph, CrewAI)",
    "Vector Databases (Pinecone, Weaviate)",
    "RAG (Retrieval Augmented Generation)",
    "Multimodal Models (vision + text)",
    "AI Safety & Evaluation",
  ],
  "Data": [
    "Modern Data Stack (dbt, Snowflake)",
    "Real-time Analytics (Kafka, Flink)",
    "AI-assisted Analytics (text-to-SQL)",
    "Data Contracts & Quality",
    "Lakehouse Architecture (Delta, Iceberg)",
  ],
  "Web": [
    "Server Components (React 19+, Next.js)",
    "Edge Computing (Cloudflare Workers)",
    "AI-integrated UX (LLM chat surfaces)",
    "WebAssembly for performance",
    "tRPC / typed full-stack",
  ],
  "Infra": [
    "Platform Engineering / IDPs",
    "FinOps (cloud cost optimization)",
    "GitOps (ArgoCD, Flux)",
    "eBPF observability",
    "Service Mesh (Istio, Linkerd)",
  ],
  "Security": [
    "Cloud-native Security (CNAPP)",
    "AI/LLM Security (prompt injection)",
    "Zero Trust Architecture",
    "Supply Chain Security (SBOM)",
    "DevSecOps automation",
  ],
  "Software": [
    "AI-pair programming (Copilot workflows)",
    "Distributed System Design",
    "Event-driven architecture",
    "Observability (OpenTelemetry)",
    "Rust for systems work",
  ],
  "Mobile": [
    "Cross-platform with Compose Multiplatform",
    "On-device AI (CoreML, TFLite)",
    "AR/VR (visionOS, ARCore)",
    "Server-driven UI",
  ],
  "Design": [
    "AI-assisted design tools (Figma AI)",
    "Design tokens & systems at scale",
    "Motion & micro-interaction design",
    "Accessibility-first design",
    "Spatial / 3D UI",
  ],
  "Product": [
    "AI product strategy",
    "Growth experimentation at scale",
    "Product analytics (Amplitude, Mixpanel)",
    "Outcome-based roadmapping",
  ],
  "Business": [
    "AI-augmented analytics workflows",
    "Process automation (low-code, n8n)",
    "Storytelling with data",
    "Strategic finance modeling",
  ],
};

export function predictFutureSkills(role: CareerRole): string[] {
  const list = FUTURE_BY_CATEGORY[role.category] || FUTURE_BY_CATEGORY["Software"];
  return list.slice(0, 6);
}
