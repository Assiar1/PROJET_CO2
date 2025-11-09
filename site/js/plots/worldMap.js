graphs.push(class WorldMap {
    constructor() {
        this.containerId = "worldMap";
        this.svg = null;
        this.width = 900;
        this.height = 500;
        this.margin = { top: 20, right: 20, bottom: 40, left: 20 };
        this.geojson = null;
        this.path = null;
    }

    async initialize() {
        // Créer le conteneur SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        this.mapGroup = this.svg.append('g');

        // Projection
        this.projection = d3.geoNaturalEarth1()
            .scale(150)
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Charger GeoJSON monde
        console.log('📍 Chargement de la carte mondiale...');
        try {
            this.geojson = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            
            // Convertir TopoJSON en GeoJSON
            this.features = topojson.feature(this.geojson, this.geojson.objects.countries).features;
            
            // Dessiner les pays
            this.mapGroup.selectAll('path')
                .data(this.features)
                .enter()
                .append('path')
                .attr('d', this.path)
                .attr('class', 'country')
                .attr('stroke', '#fff')
                .attr('stroke-width', 0.5)
                .on('click', (event, d) => this.handleCountryClick(d))
                .on('mouseover', function() {
                    d3.select(this)
                        .attr('stroke', '#333')
                        .attr('stroke-width', 2)
                        .raise();
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 0.5);
                });

            // Légende
            this.createLegend();
            
            // S'abonner aux changements
            state.subscribe(this.update.bind(this));
            
            console.log('✅ Carte mondiale chargée');
        } catch (error) {
            console.error('❌ Erreur chargement carte:', error);
        }
    }

    createLegend() {
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 180}, ${this.height - 120})`);

        // Rectangle de fond
        this.legendGroup.append('rect')
            .attr('width', 160)
            .attr('height', 100)
            .attr('fill', 'white')
            .attr('stroke', '#ccc')
            .attr('rx', 5);

        // Gradient pour la légende
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#fee5d9');
        gradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#fc9272');
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#a50f15');

        this.legendRect = this.legendGroup.append('rect')
            .attr('x', 10)
            .attr('y', 20)
            .attr('width', 20)
            .attr('height', 60)
            .style('fill', 'url(#legend-gradient)');

        this.legendAxis = this.legendGroup.append('g')
            .attr('transform', 'translate(30, 20)');
    }

    handleCountryClick(feature) {
        // Trouver le nom du pays correspondant
        const isoCode = feature.id; // format numérique dans world-atlas
        
        // Mapping ISO numeric -> alpha-3 (à enrichir selon tes données)
        const dataEntry = state.getCurrentYearData()
            .find(d => d.iso_code === isoCode);
        
        if (dataEntry) {
            const countryName = COUNTRIES[dataEntry.country_code];
            state.toggleCountry(countryName);
        }
    }

    update(state) {
        const yearData = state.getCurrentYearData();
        const metric = state.metric;
        
        // Créer un Map pour accès rapide
        const dataMap = new Map();
        yearData.forEach(d => {
            dataMap.set(d.iso_code, d[metric] || 0);
        });

        // Échelle de couleur
        const values = Array.from(dataMap.values()).filter(v => v > 0);
        const colorScale = d3.scaleSequential(d3.interpolateOrRd)
            .domain([0, d3.max(values)]);

        // Mettre à jour les couleurs
        this.mapGroup.selectAll('path.country')
            .transition()
            .duration(500)
            .attr('fill', d => {
                const value = dataMap.get(d.id);
                if (!value || value === 0) return '#e0e0e0';
                return colorScale(value);
            });

        // Mettre à jour la légende
        const legendScale = d3.scaleLinear()
            .domain([d3.max(values), 0])
            .range([0, 60]);

        const legendAxis = d3.axisRight(legendScale)
            .ticks(4)
            .tickFormat(d => {
                if (metric === 'co2_per_capita') return d.toFixed(1);
                return d > 1000 ? (d / 1000).toFixed(1) + 'k' : d.toFixed(0);
            });

        this.legendAxis.call(legendAxis);

        // Tooltip
        const getCountryName = (feature) => {
            const data = yearData.find(d => d.iso_code === feature.id);
            if (data) return COUNTRIES[data.country_code];
            return feature.properties?.name || 'Unknown';
        };

        tooltip(this.mapGroup.selectAll('path.country'), d => {
            const value = dataMap.get(d.id);
            const name = getCountryName(d);
            const label = metric === 'co2_per_capita' ? 
                'CO₂/hab' : 'CO₂ total';
            const unit = metric === 'co2_per_capita' ? 't' : 'Mt';
            
            if (!value || value === 0) {
                return `<strong>${name}</strong><br/>Pas de données`;
            }
            
            return `<strong>${name}</strong><br/>${label}: ${value.toFixed(2)} ${unit}`;
        });
    }
});