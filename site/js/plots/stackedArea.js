/**
 * Stacked Area Chart: Composition des émissions par source d'énergie
 * Compatible avec classe State
 */

class StackedArea {
    async initialize() {
        const container = d3.select("#stackedArea");
        const margin = {top: 50, right: 100, bottom: 50, left: 60};
        const width = 450 - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;
        
        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Titre du pays sélectionné
        const countryTitle = svg.append("text")
            .attr("class", "country-title")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text("");
        
        // Échelles
        const xScale = d3.scaleLinear().range([0, width]);
        const yScale = d3.scaleLinear().range([height, 0]);
        
        // Axes
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
        const yAxis = d3.axisLeft(yScale).tickFormat(d => utils.formatCompact(d));
        
        const xAxisG = g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`);
        
        const yAxisG = g.append("g")
            .attr("class", "axis");
        
        // Labels
        g.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .text("Année");
        
        g.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -45)
            .text("Émissions CO₂ (Mt)");
        
        // Couleurs pour chaque source
        const colors = {
            coal: "#8B4513",
            oil: "#FF4500",
            gas: "#4169E1",
            cement: "#808080"
        };
        
        const sources = ['coal', 'oil', 'gas', 'cement'];
        const sourceLabels = {
            coal: 'Charbon',
            oil: 'Pétrole',
            gas: 'Gaz',
            cement: 'Ciment'
        };
        
        // Légende
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);
        
        sources.forEach((source, i) => {
            const legendItem = legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, ${i * 25})`);
            
            legendItem.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", colors[source]);
            
            legendItem.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", "0.35em")
                .text(sourceLabels[source]);
        });
        
        const tooltip = d3.select("#tooltip");
        
        function update(currentState) {
            // Si aucun pays sélectionné
            if (!currentState.selectedCountry) {
                g.selectAll(".area").remove();
                g.selectAll(".no-data-message").remove();
                countryTitle.text("");
                
                g.append("text")
                    .attr("class", "no-data-message")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("fill", "#999")
                    .style("font-size", "20px")
                    .text("Sélectionnez un pays sur la carte ==>");
                
                return;
            }
            
            // Afficher le nom du pays
            const countryName = currentState.getCountryName(currentState.selectedCountry);
            countryTitle.text(`${countryName}`);
            
            // Supprimer le message
            g.selectAll(".no-data-message").remove();
            
            // Filtrer données pour le pays sélectionné
            let data = currentState.getTemporalData();
            
            if (data.length === 0) {
                g.selectAll(".area").remove();
                return;
            }
            
            // Grouper par année
            const byYear = d3.rollup(
                data,
                v => ({
                    coal: d3.sum(v, d => d.coal_co2 || 0),
                    oil: d3.sum(v, d => d.oil_co2 || 0),
                    gas: d3.sum(v, d => d.gas_co2 || 0),
                    cement: d3.sum(v, d => d.cement_co2 || 0)
                }),
                d => d.year
            );
            
            const chartData = Array.from(byYear, ([year, emissions]) => ({
                year,
                ...emissions
            })).sort((a, b) => a.year - b.year);
            
            if (chartData.length === 0) return;
            
            // Stack les données
            const stack = d3.stack()
                .keys(sources)
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);
            
            const series = stack(chartData);
            
            // Mettre à jour les échelles
            xScale.domain(d3.extent(chartData, d => d.year));
            yScale.domain([0, d3.max(series, s => d3.max(s, d => d[1]))]);
            
            // Mettre à jour les axes
            xAxisG.call(xAxis);
            yAxisG.call(yAxis);
            
            // Area generator
            const area = d3.area()
                .x(d => xScale(d.data.year))
                .y0(d => yScale(d[0]))
                .y1(d => yScale(d[1]))
                .curve(d3.curveMonotoneX);
            
            // Dessiner les areas
            const areas = g.selectAll(".area")
                .data(series, d => d.key);
            
            // Enter
            areas.enter().append("path")
                .attr("class", "area")
                .attr("fill", d => colors[d.key])
                .attr("d", area)
                .style("opacity", 0)
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut)
                .transition()
                .duration(500)
                .style("opacity", 0.8);
            
            // Update
            areas.transition()
                .duration(500)
                .attr("d", area)
                .attr("fill", d => colors[d.key]);
            
            // Exit
            areas.exit()
                .transition()
                .duration(300)
                .style("opacity", 0)
                .remove();
        }
        
        function handleMouseOver(event, d) {
            const [x, y] = d3.pointer(event);
            const year = Math.round(xScale.invert(x));
            const dataPoint = d.find(p => p.data.year === year);
            
            if (dataPoint) {
                const value = dataPoint[1] - dataPoint[0];
                tooltip
                    .style("display", "block")
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px")
                    .html(`
                        <strong>${sourceLabels[d.key]}</strong><br>
                        Année: ${year}<br>
                        Émissions: ${utils.formatNumber(value, 2)} Mt
                    `);
            }
            
            d3.select(event.currentTarget).style("opacity", 1);
        }
        
        function handleMouseOut() {
            tooltip.style("display", "none");
            d3.selectAll(".area").style("opacity", 0.8);
        }
        
        state.subscribe(update);
        update(state);
    }
}

// Ajouter à la liste des graphiques
graphs.push(StackedArea);
