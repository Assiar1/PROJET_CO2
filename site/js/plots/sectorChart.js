/**
 * Pie Chart: Répartition des émissions par source d'énergie
 * Compatible avec classe State
 */

class SectorChart {
    async initialize() {
        const container = d3.select("#sectorChart");
        const width = 450;
        const height = 280;
        const radius = Math.min(width, height) / 2 - 40;
        
        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);
        
        // Couleurs pour chaque source
        const colors = {
            coal: "#8B4513",
            oil: "#FF4500",
            gas: "#4169E1",
            cement: "#808080"
        };
        
        const sourceLabels = {
            coal: 'Charbon',
            oil: 'Pétrole',
            gas: 'Gaz',
            cement: 'Ciment'
        };
        
        // Arc generator
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);
        
        // Arc for hover effect
        const arcHover = d3.arc()
            .innerRadius(0)
            .outerRadius(radius + 10);
        
        // Pie layout
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);
        
        const tooltip = d3.select("#tooltip");
        
        function update(currentState) {
            // Si aucun pays sélectionné
            if (!currentState.selectedCountry) {
                g.selectAll(".arc").remove();
                g.selectAll(".no-data-message").remove();
                svg.selectAll(".legend").remove();
                
                g.append("text")
                    .attr("class", "no-data-message")
                    .attr("text-anchor", "middle")
                    .style("fill", "#999")
                    .style("font-size", "14px")
                    .text("Sélectionnez un pays");
                
                return;
            }
            
            // Supprimer message
            g.selectAll(".no-data-message").remove();
            
            // Récupérer les données du pays et de l'année sélectionnés
            const countryData = DATA.find(d => 
                d.iso_code === currentState.selectedCountry && 
                d.year === currentState.currentYear
            );
            
            if (!countryData) {
                g.selectAll(".arc").remove();
                svg.selectAll(".legend").remove();
                g.append("text")
                    .attr("class", "no-data-message")
                    .attr("text-anchor", "middle")
                    .style("fill", "#999")
                    .style("font-size", "14px")
                    .text("Pas de données pour cette année");
                return;
            }
            
            // Préparer les données pour le pie chart
            const pieData = [
                { source: 'coal', value: countryData.coal_co2 || 0 },
                { source: 'oil', value: countryData.oil_co2 || 0 },
                { source: 'gas', value: countryData.gas_co2 || 0 },
                { source: 'cement', value: countryData.cement_co2 || 0 }
            ].filter(d => d.value > 0);
            
            if (pieData.length === 0) {
                g.selectAll(".arc").remove();
                svg.selectAll(".legend").remove();
                return;
            }
            
            const total = d3.sum(pieData, d => d.value);
            
            // Bind data
            const arcs = g.selectAll(".arc")
                .data(pie(pieData), d => d.data.source);
            
            // Enter
            const arcsEnter = arcs.enter().append("g")
                .attr("class", "arc");
            
            arcsEnter.append("path")
                .attr("fill", d => colors[d.data.source])
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .style("opacity", 0.9)
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut)
                .transition()
                .duration(500)
                .attrTween("d", function(d) {
                    const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
            
            // Labels
            arcsEnter.append("text")
                .attr("transform", d => `translate(${arc.centroid(d)})`)
                .attr("text-anchor", "middle")
                .style("fill", "white")
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("pointer-events", "none")
                .text(d => {
                    const percent = (d.data.value / total * 100).toFixed(0);
                    return percent > 5 ? `${percent}%` : '';
                });
            
            // Update
            arcs.select("path")
                .transition()
                .duration(500)
                .attrTween("d", function(d) {
                    const current = d3.select(this).datum();
                    const interpolate = d3.interpolate(current, d);
                    d3.select(this).datum(d);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
            
            arcs.select("text")
                .transition()
                .duration(500)
                .attr("transform", d => `translate(${arc.centroid(d)})`)
                .text(d => {
                    const percent = (d.data.value / total * 100).toFixed(0);
                    return percent > 5 ? `${percent}%` : '';
                });
            
            // Exit
            arcs.exit()
                .transition()
                .duration(300)
                .style("opacity", 0)
                .remove();
            
            // Ajouter une légende
            const legend = svg.selectAll(".legend")
                .data(pieData);
            
            const legendEnter = legend.enter().append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(10, ${i * 25 + 10})`);
            
            legendEnter.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", d => colors[d.source]);
            
            legendEnter.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", "0.35em")
                .style("font-size", "12px")
                .text(d => `${sourceLabels[d.source]}: ${utils.formatNumber(d.value, 1)} Mt`);
            
            legend.select("text")
                .text(d => `${sourceLabels[d.source]}: ${utils.formatNumber(d.value, 1)} Mt`);
            
            legend.exit().remove();
        }
        
        function handleMouseOver(event, d) {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("d", arcHover);
            
            const total = d3.sum(d3.select(event.currentTarget.parentNode).data(), dd => dd.data.value);
            const percent = (d.data.value / total * 100).toFixed(1);
            
            tooltip
                .style("display", "block")
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px")
                .html(`
                    <strong>${sourceLabels[d.data.source]}</strong><br>
                    ${utils.formatNumber(d.data.value, 2)} Mt CO₂<br>
                    ${percent}% du total
                `);
        }
        
        function handleMouseOut(event, d) {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("d", arc);
            
            tooltip.style("display", "none");
        }
        
        state.subscribe(update);
        update(state);
    }
}

// Ajouter à la liste des graphiques
graphs.push(SectorChart);