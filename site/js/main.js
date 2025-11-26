// Labels constants
const LABELS = {
    co2: 'Émissions CO₂ (Mt)',
    co2_per_capita: 'CO₂ par habitant (t)',
    gdp: 'PIB (milliards $)',
    population: 'Population',
    year: 'Année'
};

// Main application initialization
async function initialize() {
    console.log('Initialisation de l\'application CO2...');
    
    // Afficher le loader
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
    
    try {
        // Initialiser l'état avec les données
        console.log('Chargement des données...');
        state.initialize(DATA);
        
        // Initialiser tous les graphiques
        console.log('Initialisation des graphiques...');
        for (const GraphClass of graphs) {
            const graph = new GraphClass();
            await graph.initialize();   
        }
        
        // Initialiser tous les sélecteurs
        console.log('Initialisation des contrôles...');
        for (const SelectorClass of selectors) {
            new SelectorClass();
        }
        
        // Première mise à jour
        state.notify();
        
        console.log('Application prête !');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        alert('Erreur lors du chargement des données. Consultez la console.');
    } finally {
        // Masquer le loader
        if (loader) {
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
}

// Navigation entre pages
function setupNavigation() {
    const dataButton = document.getElementById('dataButton');
    const docButton = document.getElementById('docButton');
    const dataSection = document.getElementById('dataSection');
    const docSection = document.getElementById('docSection');
    
    if (dataButton && docButton) {
        dataButton.addEventListener('click', () => {
            dataSection.style.display = 'block';
            docSection.style.display = 'none';
            dataButton.classList.add('active');
            docButton.classList.remove('active');
        });
        
        docButton.addEventListener('click', () => {
            dataSection.style.display = 'none';
            docSection.style.display = 'block';
            docButton.classList.add('active');
            dataButton.classList.remove('active');
        });
    }
}

// Lancer l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    initialize();
});