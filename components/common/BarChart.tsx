import React, { useRef, useEffect } from 'react';
import * as d3 from 'https://esm.sh/d3@7';

export interface BarChartData {
    label: string;
    value: number;
    emoji?: string;
}

interface BarChartProps {
    data: BarChartData[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    useEffect(() => {
        if (!svgRef.current || sortedData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 10, right: 30, bottom: 10, left: 40 };
        const containerWidth = svgRef.current.parentElement!.clientWidth;
        const height = sortedData.length * 35; 
        const width = containerWidth - margin.left - margin.right;

        svg.attr("width", containerWidth)
           .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "bar-gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", width) 
            .attr("y2", 0);
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--color-primary-light)");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--color-primary)");


        const xScale = d3.scaleLinear()
            .domain([0, d3.max(sortedData, d => d.value) || 10])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(sortedData.map(d => d.label))
            .range([0, height])
            .padding(0.25);
            
        const tooltip = d3.select(tooltipRef.current);

        g.selectAll(".bar")
            .data(sortedData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.label)!)
            .attr("height", yScale.bandwidth())
            .attr("x", 0)
            .attr("width", 0)
            .on("mouseover", function(event, d) {
                d3.select(this).style("filter", "brightness(1.2)");
                tooltip.style("opacity", 1)
                       .html(`<strong>${d.label}</strong>: ${d.value} fois`)
                       .style("left", `${event.pageX + 15}px`)
                       .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", function() {
                d3.select(this).style("filter", "brightness(1)");
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("width", d => xScale(d.value));
            
        const yAxis = g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale).tickSize(0))
            .call(g => g.select(".domain").remove());

        yAxis.selectAll("text").remove(); 
        
        yAxis.selectAll(".tick")
            .append("text")
            .attr("class", "y-axis-emoji")
            .attr("x", -15)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => sortedData.find(item => item.label === d)?.emoji || '?');
            
        g.selectAll(".bar-value-label")
            .data(sortedData)
            .enter()
            .append("text")
            .attr("class", "bar-value-label")
            .attr("x", d => xScale(d.value) + 5)
            .attr("y", d => yScale(d.label)! + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("opacity", 0)
            .text(d => d.value)
            .transition()
            .delay(800)
            .duration(400)
            .attr("opacity", 1);


    }, [sortedData]);

    return (
        <div className="d3-bar-chart-container">
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef} className="d3-tooltip"></div>
        </div>
    );
};
