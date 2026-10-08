'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export interface ProgramTrendPoint {
  label: string;
  programs: number;
  participants: number;
}

interface ProgramTrendD3Props {
  data: ProgramTrendPoint[];
}

export default function ProgramTrendD3({ data }: ProgramTrendD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(720, data.length * 48);
    const height = 260;
    const margin = { top: 20, right: 18, bottom: 34, left: 38 };
    const x = d3.scalePoint<string>().domain(data.map((point) => point.label)).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (point) => point.participants) || 1]).nice().range([height - margin.bottom, margin.top]);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', 'Program participation trend');

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((axis) => axis.select('.domain').attr('stroke', '#e2e8f0'))
      .call((axis) => axis.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px'));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)))
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3 3'))
      .call((axis) => axis.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px'));

    const line = d3.line<ProgramTrendPoint>()
      .x((point) => x(point.label) || margin.left)
      .y((point) => y(point.participants))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    svg.selectAll('circle.point')
      .data(data)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', (point) => x(point.label) || margin.left)
      .attr('cy', (point) => y(point.participants))
      .attr('r', 4)
      .attr('fill', '#091d64')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
  }, [data]);

  return (
    <Card className="overflow-hidden border-slate-200 shadow-xs">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-[#091d64]">Participation Trend</CardTitle>
          <p className="mt-1 text-[10px] font-medium text-slate-400">Custom program analytics</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">D3</span>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg ref={svgRef} className="min-w-[560px] w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
