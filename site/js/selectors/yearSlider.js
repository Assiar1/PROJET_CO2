selectors.push(class YearSlider {
    constructor() {
        this.containerId = "yearSlider";
        this.container = d3.select(`#${this.containerId}`);
        this.isPlaying = false;
        this.playInterval = null;
        this.initialize();
    }

    initialize() {
        const wrapper = this.container.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        // Bouton play/pause
        this.playButton = wrapper.append('button')
            .attr('id', 'playButton')
            .style('font-size', '20px')
            .style('padding', '5px 15px')
            .text('▶')
            .on('click', () => this.togglePlay());

        // Bouton année précédente
        this.prevButton = wrapper.append('button')
            .text('◀')
            .style('font-size', '16px')
            .on('click', () => {
                const newYear = Math.max(state.currentYear - 1, DATA_RANGES.years[0]);
                state.setYear(newYear);
            });

        // Slider
        this.slider = wrapper.append('input')
            .attr('type', 'range')
            .attr('min', DATA_RANGES.years[0])
            .attr('max', DATA_RANGES.years[1])
            .attr('value', state.currentYear)
            .style('flex', '1')
            .style('min-width', '200px')
            .on('input', (event) => {
                const year = +event.target.value;
                state.setYear(year);
                if (this.isPlaying) this.stop();
            });

        // Bouton année suivante
        this.nextButton = wrapper.append('button')
            .text('▶')
            .style('font-size', '16px')
            .on('click', () => {
                const newYear = Math.min(state.currentYear + 1, DATA_RANGES.years[1]);
                state.setYear(newYear);
            });

        // Label année
        this.yearLabel = wrapper.append('span')
            .style('font-weight', 'bold')
            .style('font-size', '18px')
            .style('min-width', '50px')
            .text(state.currentYear);

        state.subscribe(this.update.bind(this));
    }

    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.playButton.text('⏸');
        
        this.playInterval = setInterval(() => {
            let nextYear = state.currentYear + 1;
            
            if (nextYear > DATA_RANGES.years[1]) {
                nextYear = DATA_RANGES.years[0]; // Boucler
            }
            
            state.setYear(nextYear);
        }, 100); // Change d'année toutes les 800ms
    }

    stop() {
        this.isPlaying = false;
        this.playButton.text('▶');
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    update(state) {
        this.slider.property('value', state.currentYear);
        this.yearLabel.text(state.currentYear);

        // Désactiver les boutons aux limites
        this.prevButton.property('disabled', state.currentYear === DATA_RANGES.years[0]);
        this.nextButton.property('disabled', state.currentYear === DATA_RANGES.years[1]);
    }
});