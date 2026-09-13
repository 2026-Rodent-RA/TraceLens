import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { Graph, RecommendedEdge } from "../types/analysis";

interface GraphViewProps {
  graph: Graph;
  recommendedEdges: RecommendedEdge[];
  onEdgeClick: (source: string, target: string) => void;
  selectedEdge?: { source: string; target: string };
  theme: "light" | "dark";
}

function shortLabel(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-5)}` : value;
}

export default function GraphView({ graph, recommendedEdges, onEdgeClick, selectedEdge, theme }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const clickHandlerRef = useRef(onEdgeClick);

  useEffect(() => { clickHandlerRef.current = onEdgeClick; }, [onEdgeClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    const recommendedKeys = new Set(recommendedEdges.map((edge) => `${edge.source}\u0000${edge.target}`));
    const palette = theme === "dark"
      ? { node: "#1d2940", nodeBorder: "#6d7ff2", text: "#cbd5e1", edge: "#42516a", accent: "#7c8cf8", risk: "#f97066" }
      : { node: "#eef2ff", nodeBorder: "#6875e6", text: "#344054", edge: "#b8c1d1", accent: "#4f5bd5", risk: "#e5484d" };

    const elements = [
      ...graph.nodes.map((node) => ({ data: { id: node.id, label: shortLabel(node.id) } })),
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          isRecommended: recommendedKeys.has(`${edge.source}\u0000${edge.target}`),
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        { selector: "node", style: {
          "background-color": palette.node,
          "border-width": 2,
          "border-color": palette.nodeBorder,
          label: "data(label)", color: palette.text,
          "font-family": "JetBrains Mono, monospace", "font-size": "10px",
          "text-valign": "bottom", "text-margin-y": 7,
          width: 26, height: 26,
        } },
        { selector: "node:selected", style: { "background-color": palette.accent, "border-color": palette.accent, color: palette.accent } },
        { selector: "edge", style: {
          width: 1.5, "line-color": palette.edge, "target-arrow-color": palette.edge,
          "target-arrow-shape": "triangle", "arrow-scale": 0.75, "curve-style": "bezier", opacity: 0.78,
        } },
        { selector: "edge[?isRecommended]", style: {
          "line-color": palette.risk, "target-arrow-color": palette.risk,
          width: 3, opacity: 1, "z-index": 10,
        } },
        { selector: "edge:selected", style: {
          "line-color": palette.accent, "target-arrow-color": palette.accent,
          width: 4, opacity: 1, "z-index": 20,
        } },
      ],
      layout: { name: "breadthfirst", directed: true, padding: 48, spacingFactor: 1.2 },
      minZoom: 0.35,
      maxZoom: 2.5,
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    cy.on("tap", "edge", (event) => {
      const edge = event.target;
      clickHandlerRef.current(edge.data("source"), edge.data("target"));
    });
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [graph, recommendedEdges, theme]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().unselect();
    if (selectedEdge) {
      cy.edges().filter((edge) => edge.data("source") === selectedEdge.source && edge.data("target") === selectedEdge.target).select();
    }
  }, [selectedEdge]);

  return (
    <div className="graph-stage">
      <div className="graph-controls" aria-label="Graph controls">
        <button type="button" onClick={() => cyRef.current?.zoom({ level: Math.min((cyRef.current?.zoom() ?? 1) * 1.2, 2.5), renderedPosition: { x: 260, y: 230 } })} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => cyRef.current?.zoom({ level: Math.max((cyRef.current?.zoom() ?? 1) / 1.2, 0.35), renderedPosition: { x: 260, y: 230 } })} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => cyRef.current?.fit(undefined, 44)} aria-label="Fit graph">
          <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4" /></svg>
        </button>
      </div>
      <div ref={containerRef} className="graph-canvas" />
      <div className="graph-legend"><span><i className="normal" />Transaction flow</span><span><i className="recommended" />AI recommended</span></div>
    </div>
  );
}
