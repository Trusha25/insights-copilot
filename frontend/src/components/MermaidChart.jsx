import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#e0e7ff',
    primaryTextColor: '#1e1b4b',
    primaryBorderColor: '#6366f1',
    lineColor: '#6366f1',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#ffffff',
  },
});

export default function MermaidChart({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!chart) return;

    let isMounted = true;
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    const renderChart = async () => {
      try {
        setError(false);
        // Await parsing first to validate
        await mermaid.parse(chart);
        const { svg } = await mermaid.render(id, chart);
        
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (isMounted) {
          setError(true);
        }
        // Cleanup any error SVG Mermaid injected into the body
        const errorNode = document.getElementById(`d${id}`);
        if (errorNode) errorNode.remove();
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (!chart) return null;

  if (error) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm text-center">
        Unable to render architecture diagram.
      </div>
    );
  }

  return (
    <div 
      className="mermaid-container w-full overflow-x-auto flex justify-center py-4 bg-slate-50 rounded-xl border border-slate-100"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
