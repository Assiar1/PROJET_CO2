/**
 * Carte mondiale avec dégradé radial montrant l'évolution temporelle
 * Bord du pays = 2000 (début) → Centre = 2023 (récent)
 */

class WorldMap {
    async initialize() {
        const container = d3.select("#worldMap");
        const width = 800;
        const height = 600;
        
        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const defs = svg.append("defs");
        const g = svg.append("g");
        
        // Projection
        const projection = d3.geoNaturalEarth1()
            .scale(150)
            .translate([width / 2, height / 2]);
        
        const path = d3.geoPath().projection(projection);
        
        // Échelle de couleur pour l'évolution temporelle
        const timeColorScale = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([2000, 2023]);
        
        const tooltip = d3.select("#tooltip");
        
        // Message de chargement
        container.append("div")
            .attr("class", "loading")
            .style("text-align", "center")
            .style("padding", "50px")
            .text("Chargement de la carte...");
        
        // Charger le GeoJSON
        await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
            .then(world => {
                container.select(".loading").remove();
                
                console.log("✅ GeoJSON chargé:", world.features.length, "pays");
                
                // Dessiner les pays
                const countries = g.selectAll("path")
                    .data(world.features)
                    .enter().append("path")
                    .attr("d", path)
                    .attr("class", "country")
                    .attr("data-iso", d => d.id)
                    .on("mouseover", handleMouseOver)
                    .on("mouseout", handleMouseOut)
                    .on("click", handleClick);
                
                function update(currentState) {
                    countries.each(function(d) {
                        const iso = d.id;
                        const countryPath = d3.select(this);
                        const temporalData = getCountryTemporalData(iso);
                        
                        if (temporalData.length === 0) {
                            countryPath
                                .attr("fill", "#e0e0e0")
                                .classed("no-data", true);
                            return;
                        }
                        
                        // Calculer le centroïde du pays
                        const centroid = path.centroid(d);
                        
                        // Créer un gradient radial unique pour ce pays
                        const gradientId = `radial-gradient-${iso}`;
                        
                        // Supprimer l'ancien gradient s'il existe
                        defs.select(`#${gradientId}`).remove();
                        
                        const gradient = defs.append("radialGradient")
                            .attr("id", gradientId)
                            .attr("cx", "50%")
                            .attr("cy", "50%")
                            .attr("r", "50%");
                        
                        // Créer les stops du gradient basés sur l'évolution des émissions
                        const years = [2000, 2005, 2010, 2015, 2020, 2023];
                        const yearData = years.map(year => {
                            const data = temporalData.find(d => d.year === year);
                            return data ? data.co2 : 0;
                        });
                        
                        // Normaliser les valeurs pour l'intensité
                        const maxEmission = d3.max(yearData);
                        const minEmission = d3.min(yearData);
                        
                        // Échelle pour l'intensité de couleur
                        const intensityScale = d3.scaleLinear()
                            .domain([minEmission, maxEmission])
                            .range([0.3, 1]);
                        
                        // Créer les stops du gradient
                        // Centre (2023) → Bord (2000)
                        const recentData = temporalData[temporalData.length - 1]; // 2023
                        const oldData = temporalData[0]; // 2000
                        
                        const recentIntensity = intensityScale(recentData.co2);
                        const oldIntensity = intensityScale(oldData.co2);
                        
                        // Centre = année récente (rouge si élevé)
                        gradient.append("stop")
                            .attr("offset", "0%")
                            .attr("stop-color", getEmissionColor(recentData.co2, maxEmission))
                            .attr("stop-opacity", recentIntensity);
                        
                        // Milieu = transition
                        if (temporalData.length > 2) {
                            const midIndex = Math.floor(temporalData.length / 2);
                            const midData = temporalData[midIndex];
                            const midIntensity = intensityScale(midData.co2);
                            
                            gradient.append("stop")
                                .attr("offset", "50%")
                                .attr("stop-color", getEmissionColor(midData.co2, maxEmission))
                                .attr("stop-opacity", midIntensity);
                        }
                        
                        // Bord = année ancienne (vert/jaune si faible)
                        gradient.append("stop")
                            .attr("offset", "100%")
                            .attr("stop-color", getEmissionColor(oldData.co2, maxEmission))
                            .attr("stop-opacity", oldIntensity);
                        
                        // Appliquer le gradient
                        countryPath
                            .attr("fill", `url(#${gradientId})`)
                            .attr("stroke", "#fff")
                            .attr("stroke-width", 0.5)
                            .classed("no-data", false)
                            .classed("selected", currentState.selectedCountry === iso)
                            .style("cursor", "pointer");
                    });
                }
                
                function getEmissionColor(value, max) {
                    // Échelle de couleur : Vert (faible) → Jaune → Orange → Rouge (élevé)
                    const normalizedValue = value / max;
                    
                    if (normalizedValue < 0.25) return "#4ade80"; // Vert
                    if (normalizedValue < 0.5) return "#fbbf24";  // Jaune
                    if (normalizedValue < 0.75) return "#fb923c"; // Orange
                    return "#ef4444"; // Rouge
                }
                
                function handleMouseOver(event, d) {
                    const iso = d.id;
                    const temporalData = getCountryTemporalData(iso);
                    
                    if (temporalData.length === 0) return;
                    
                    const oldestData = temporalData[0];
                    const recentData = temporalData[temporalData.length - 1];
                    const name = state.getCountryName(iso);
                    
                    // Calculer la tendance
                    const change = recentData.co2 - oldestData.co2;
                    const changePercent = ((change / oldestData.co2) * 100).toFixed(1);
                    const trend = change > 0 ? "📈" : "📉";
                    const trendColor = change > 0 ? "#ef4444" : "#4ade80";
                    
                    tooltip
                        .style("display", "block")
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px")
                        .html(`
                            <strong>${name}</strong><br>
                            <div style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 4px;">
                                <strong>Évolution 2000-2023 ${trend}</strong><br>
                                <span style="color: #4ade80;">2000: ${utils.formatNumber(oldestData.co2, 2)} Mt</span><br>
                                <span style="color: ${trendColor};">2023: ${utils.formatNumber(recentData.co2, 2)} Mt</span><br>
                                <span style="color: ${trendColor}; font-weight: bold;">
                                    ${change > 0 ? '+' : ''}${changePercent}%
                                </span>
                            </div>
                            <small style="color: #999;">
                                💡 Centre = 2023, Bord = 2000<br>
                                Cliquez pour voir les détails
                            </small>
                        `);
                    
                    d3.select(event.currentTarget)
                        .attr("stroke", "#667eea")
                        .attr("stroke-width", 2);
                }
                
                function handleMouseOut(event, d) {
                    tooltip.style("display", "none");
                    
                    const iso = d.id;
                    const isSelected = state.selectedCountry === iso;
                    
                    d3.select(event.currentTarget)
                        .attr("stroke", isSelected ? "#667eea" : "#fff")
                        .attr("stroke-width", isSelected ? 2 : 0.5);
                }
                
                function handleClick(event, d) {
                    const iso = d.id;
                    const temporalData = getCountryTemporalData(iso);
                    
                    if (temporalData.length > 0) {
                        console.log("🖱️ Clic sur:", state.getCountryName(iso));
                        state.selectCountryForEnergy(iso);
                    }
                }
                
                // S'abonner aux changements
                state.subscribe(update);
                update(state);
                
                // Ajouter légende spéciale
                createRadialLegend();
            })
            .catch(error => {
                console.error("❌ Erreur chargement GeoJSON:", error);
                container.select(".loading")
                    .text("Erreur de chargement de la carte");
            });
        
        function createRadialLegend() {
            const legendGroup = svg.append("g")
                .attr("class", "legend-group")
                .attr("transform", `translate(${width - 250}, ${height - 150})`);
            
            // Fond blanc
            legendGroup.append("rect")
                .attr("x", -10)
                .attr("y", -10)
                .attr("width", 240)
                .attr("height", 140)
                .attr("fill", "white")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1)
                .attr("rx", 8)
                .attr("opacity", 0.95);
            
            // Titre
            legendGroup.append("text")
                .attr("x", 110)
                .attr("y", 10)
                .attr("text-anchor", "middle")
                .style("font-size", "13px")
                .style("font-weight", "bold")
                .style("fill", "#333")
                .text("Évolution temporelle");
            
            // Exemple de gradient radial
            const exampleGradient = defs.append("radialGradient")
                .attr("id", "legend-radial-example");
            
            exampleGradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#ef4444");
            
            exampleGradient.append("stop")
                .attr("offset", "50%")
                .attr("stop-color", "#fb923c");
            
            exampleGradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#4ade80");
            
            // Cercle d'exemple
            legendGroup.append("circle")
                .attr("cx", 110)
                .attr("cy", 60)
                .attr("r", 35)
                .attr("fill", "url(#legend-radial-example)")
                .attr("stroke", "#999")
                .attr("stroke-width", 1);
            
            // Labels
            legendGroup.append("text")
                .attr("x", 110)
                .attr("y", 60)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("fill", "white")
                .style("text-shadow", "0 0 3px rgba(0,0,0,0.5)")
                .text("2023");
            
            legendGroup.append("text")
                .attr("x", 15)
                .attr("y", 60)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#4ade80")
                .style("font-weight", "bold")
                .text("2000");
            
            // Flèche
            legendGroup.append("path")
                .attr("d", "M 50 60 L 70 60")
                .attr("stroke", "#666")
                .attr("stroke-width", 2)
                .attr("marker-end", "url(#arrow)");
            
            // Définir la flèche
            defs.append("marker")
                .attr("id", "arrow")
                .attr("viewBox", "0 0 10 10")
                .attr("refX", 5)
                .attr("refY", 5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto-start-reverse")
                .append("path")
                .attr("d", "M 0 0 L 10 5 L 0 10 z")
                .attr("fill", "#666");
            
            // Explication
            legendGroup.append("text")
                .attr("x", 110)
                .attr("y", 115)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#666")
                .text("Bord → Centre = 2000 → 2023");
        }
        
        // Obtenir les données temporelles d'un pays
        function getCountryTemporalData(isoCode) {
            return DATA
                .filter(d => d.iso_code === isoCode)
                .sort((a, b) => a.year - b.year);
        }
    }
}

// Ajouter à la liste des graphiques
graphs.push(WorldMap);