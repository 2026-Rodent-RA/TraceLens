// frontend/src/components/GraphView.tsx
import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { Graph, RecommendedEdge } from "../types/analysis";

interface GraphViewProps {
  graph: Graph;
  recommendedEdges: RecommendedEdge[];
  onEdgeClick: (source: string, target: string) => void;
  selectedEdge?: { source: string; target: string };
}

export default function GraphView({ graph, recommendedEdges, onEdgeClick, selectedEdge }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = [
      ...graph.nodes.map(n => ({ data: { id: n.id, label: n.id } })),
      ...graph.edges.map(e => {
        const isRecommended = recommendedEdges.some(re => re.source === e.source && re.target === e.target);
        return {
          data: {
            id: `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            isRecommended
          }
        };
      })
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1f2937',
            'border-width': 2,
            'border-color': '#3b82f6',
            'label': 'data(label)',
            'color': '#e2e8f0',
            'font-size': '12px',
            'text-valign': 'bottom',
            'text-margin-y': 5
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'edge[?isRecommended]',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 3,
            'line-style': 'dashed'
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'width': 4
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 10
      },
      userZoomingEnabled: true,
      userPanningEnabled: true
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      onEdgeClick(edge.data('source'), edge.data('target'));
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graph, recommendedEdges, onEdgeClick]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.edges().unselect();
      if (selectedEdge) {
        const edge = cyRef.current.getElementById(`${selectedEdge.source}-${selectedEdge.target}`);
        if (edge) edge.select();
      }
    }
  }, [selectedEdge]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "500px", backgroundColor: "#0f1623", borderRadius: "12px", border: "1px solid #1e2d42" }} />;
}
