/**
 * Enhanced Data Processor for Path of Exile Trade Helper - Abyss Jewels Focus
 * Handles fuzzy search, tier conversion, and data processing for Abyss Jewels only
 */

class AbyssJewelDataProcessor {
    constructor() {
        this.baseItems = {};
        this.mods = {};
        this.modsByBase = {};
        this.abbreviations = {
            // Life and Defenses
            'life': ['life', 'maximum life', 'to maximum life'],
            'es': ['energy shield', 'maximum energy shield', 'to maximum energy shield'],
            'mana': ['mana', 'maximum mana', 'to maximum mana'],
            'armour': ['armour', 'physical damage reduction rating'],
            'evasion': ['evasion', 'evasion rating'],
            
            // Damage
            'phys': ['physical', 'physical damage'],
            'fire': ['fire', 'fire damage'],
            'cold': ['cold', 'cold damage'],
            'lightning': ['lightning', 'lightning damage'],
            'chaos': ['chaos', 'chaos damage'],
            'added fire': ['added fire damage', 'adds fire damage'],
            'added cold': ['added cold damage', 'adds cold damage'],
            'added lightning': ['added lightning damage', 'adds lightning damage'],
            'added phys': ['added physical damage', 'adds physical damage'],
            'added chaos': ['added chaos damage', 'adds chaos damage'],
            
            // Speed and Critical
            'attack speed': ['increased attack speed', 'attack speed'],
            'cast speed': ['increased cast speed', 'cast speed'],
            'crit': ['critical strike chance', 'critical strike'],
            'crit multi': ['critical strike multiplier', 'critical multiplier'],
            
            // Resistances
            'fire res': ['fire resistance'],
            'cold res': ['cold resistance'],
            'lightning res': ['lightning resistance'],
            'chaos res': ['chaos resistance'],
            'all res': ['all resistances', 'elemental resistances'],
            
            // Attributes
            'str': ['strength'],
            'dex': ['dexterity'],
            'int': ['intelligence'],
            
            // Minions
            'minion': ['minion', 'minions'],
            'minion damage': ['minion damage'],
            'minion life': ['minion life', 'minion maximum life'],
            'minion speed': ['minion attack speed', 'minion cast speed'],
            
            // Avoidance
            'avoid': ['chance to avoid', 'avoid'],
            'stun': ['stun', 'avoid stun'],
            'bleed': ['bleeding', 'avoid bleeding'],
            'poison': ['poison', 'avoid poison'],
            'ignite': ['ignite', 'avoid ignite'],
            'shock': ['shock', 'avoid shock'],
            'freeze': ['freeze', 'avoid freeze'],
            'chill': ['chill', 'avoid chill'],
        };
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load the abyss jewel data files
            const baseItemsData = await this.loadJSONFile('abyss_jewels.json');
            const modsData = await this.loadJSONFile('abyss_jewels_mods.json');
            
            this.baseItems = baseItemsData;
            this.mods = modsData;
            
            // Process the data structure for easier access
            this.processAbyssJewelData();
            
            this.initialized = true;
            console.log('✅ Abyss Jewel Data Processor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize data processor:', error);
            throw error;
        }
    }

    async loadJSONFile(filename) {
        try {
            const data = await window.fs.readFile(filename, { encoding: 'utf8' });
            return JSON.parse(data);
        } catch (error) {
            console.error(`Failed to load ${filename}:`, error);
            throw error;
        }
    }

    processAbyssJewelData() {
        // Create a simplified structure for easier mod searching
        this.modsByBase = {};
        
        // Process each jewel type
        const abyssJewelData = this.mods["Abyss Jewels"];
        
        Object.entries(abyssJewelData).forEach(([jewelTags, jewelData]) => {
            if (jewelTags === 'synthesis') return; // Skip synthesis for now
            
            const bases = jewelData.bases;
            const mods = jewelData.mods;
            
            bases.forEach(baseKey => {
                if (!this.modsByBase[baseKey]) {
                    this.modsByBase[baseKey] = {
                        name: this.baseItems[baseKey]?.name || baseKey,
                        mods: {}
                    };
                }
                
                // Merge all mod types (prefix, suffix, etc.)
                Object.entries(mods).forEach(([modType, modGroups]) => {
                    Object.entries(modGroups).forEach(([modName, modTiers]) => {
                        const modKey = `${modType}_${modName}`;
                        this.modsByBase[baseKey].mods[modKey] = {
                            name: modName,
                            type: modType,
                            tiers: modTiers,
                            displayName: this.formatModDisplayName(modName)
                        };
                    });
                });
            });
        });
        
        console.log('📊 Processed mod data for bases:', Object.keys(this.modsByBase));
    }

    formatModDisplayName(modName) {
        // Convert camelCase mod names to readable format
        return modName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/For Jewel$/, '')
            .replace(/Abyss Jewel/, '')
            .replace(/Abyss/, '')
            .trim();
    }

    getBaseItems() {
        const items = {};
        Object.entries(this.baseItems).forEach(([key, item]) => {
            items[key] = {
                name: item.name,
                itemClass: item.item_class,
                tags: item.tags
            };
        });
        return items;
    }

    getBaseItemsByClass() {
        const itemsByClass = {
            'AbyssJewel': {}
        };
        
        Object.entries(this.baseItems).forEach(([key, item]) => {
            const className = item.item_class;
            if (className === 'AbyssJewel') {
                itemsByClass[className][key] = item.name;
            }
        });
        
        return itemsByClass;
    }

    findMatchingMods(baseItemKey, searchQuery, maxResults = 10) {
        if (!this.initialized) {
            throw new Error('Data processor not initialized');
        }
        
        if (!baseItemKey || !searchQuery || searchQuery.length < 2) {
            return [];
        }
        
        const baseData = this.modsByBase[baseItemKey];
        if (!baseData) {
            console.warn(`No mods found for base item: ${baseItemKey}`);
            return [];
        }
        
        const query = searchQuery.toLowerCase().trim();
        const results = [];
        
        // Search through all mods for this base
        Object.entries(baseData.mods).forEach(([modKey, modData]) => {
            const score = this.calculateMatchScore(query, modData);
            if (score > 0) {
                results.push({
                    modKey,
                    modName: modData.name,
                    displayName: modData.displayName,
                    type: modData.type,
                    score,
                    tiers: Object.keys(modData.tiers)
                });
            }
        });
        
        // Sort by score (descending) and return top results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    calculateMatchScore(query, modData) {
        const searchTerms = [
            modData.displayName.toLowerCase(),
            modData.name.toLowerCase()
        ];
        
        let bestScore = 0;
        
        searchTerms.forEach(term => {
            // Exact match gets highest score
            if (term === query) {
                bestScore = Math.max(bestScore, 100);
                return;
            }
            
            // Contains query gets high score
            if (term.includes(query)) {
                bestScore = Math.max(bestScore, 90);
                return;
            }
            
            // Check abbreviation matches
            const abbreviationScore = this.checkAbbreviationMatch(query, term);
            if (abbreviationScore > 0) {
                bestScore = Math.max(bestScore, abbreviationScore);
                return;
            }
            
            // Fuzzy match using Levenshtein distance
            const fuzzyScore = this.calculateFuzzyScore(query, term);
            bestScore = Math.max(bestScore, fuzzyScore);
        });
        
        return bestScore;
    }

    checkAbbreviationMatch(query, term) {
        // Check if query matches any abbreviation
        for (const [abbrev, expansions] of Object.entries(this.abbreviations)) {
            if (query === abbrev || query.includes(abbrev)) {
                for (const expansion of expansions) {
                    if (term.includes(expansion.toLowerCase())) {
                        return 85; // High score for abbreviation match
                    }
                }
            }
        }
        
        // Check partial word matches
        const queryWords = query.split(' ');
        const termWords = term.split(' ');
        
        let matchingWords = 0;
        queryWords.forEach(queryWord => {
            termWords.forEach(termWord => {
                if (termWord.startsWith(queryWord) || queryWord.startsWith(termWord)) {
                    matchingWords++;
                }
            });
        });
        
        if (matchingWords > 0) {
            return Math.min(75, matchingWords * 25);
        }
        
        return 0;
    }

    calculateFuzzyScore(query, term) {
        const distance = this.levenshteinDistance(query, term);
        const maxLength = Math.max(query.length, term.length);
        
        // Convert distance to similarity score (0-100)
        const similarity = (1 - distance / maxLength) * 100;
        
        // Only return scores above threshold
        return similarity > 60 ? Math.round(similarity) : 0;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    getAvailableTiers(modKey, baseItemKey) {
        const baseData = this.modsByBase[baseItemKey];
        if (!baseData || !baseData.mods[modKey]) {
            return [];
        }
        
        const modData = baseData.mods[modKey];
        const allTierKeys = Object.keys(modData.tiers);
        
        return allTierKeys.map(tierKey => {
            const correctTierNum = this.getCorrectTierNumber(tierKey, allTierKeys);
            return {
                tierKey,
                displayName: `T${correctTierNum}`,
                weight: modData.tiers[tierKey],
                tierNumber: correctTierNum
            };
        }).sort((a, b) => a.tierNumber - b.tierNumber); // Sort T1, T2, T3, etc.
    }

    formatTierName(tierKey) {
        // Extract tier number if possible
        const tierMatch = tierKey.match(/(\d+)$/);
        if (tierMatch) {
            const tierNum = parseInt(tierMatch[1]);
            return `T${tierNum}`;
        }
        return tierKey;
    }

    getCorrectTierNumber(tierKey, allTierKeys) {
        // Extract the number from the tier key
        const tierMatch = tierKey.match(/(\d+)$/);
        if (!tierMatch) return 1;
        
        const tierNum = parseInt(tierMatch[1]);
        
        // Find the highest tier number in this mod group
        const allNumbers = allTierKeys.map(key => {
            const match = key.match(/(\d+)$/);
            return match ? parseInt(match[1]) : 1;
        }).sort((a, b) => b - a);
        
        const maxTier = allNumbers[0];
        
        // Convert to correct tier: highest number = T1, lowest number = T(max)
        return maxTier - tierNum + 1;
    }

    convertTierToValues(modKey, baseItemKey, tierKey) {
        // For Abyss Jewels, we'll need actual value ranges
        // This is a placeholder - you'll need the actual mod value data
        const baseData = this.modsByBase[baseItemKey];
        if (!baseData || !baseData.mods[modKey]) {
            return null;
        }
        
        // Mock tier conversion - replace with actual value data
        const tierNum = tierKey.match(/(\d+)$/)?.[1];
        if (tierNum) {
            const tier = parseInt(tierNum);
            // These are example ranges - replace with actual data
            const mockRanges = {
                1: [80, 100],
                2: [60, 79],
                3: [40, 59],
                4: [20, 39],
                5: [1, 19]
            };
            
            const range = mockRanges[tier];
            if (range) {
                return {
                    min: range[0],
                    max: range[1],
                    tier: `T${tier}`
                };
            }
        }
        
        return {
            min: 1,
            max: 100,
            tier: tierKey
        };
    }

    generateTradeUrlWithMods(searchConfig) {
        const baseUrl = 'https://www.pathofexile.com/trade/search/Settlers';
        
        // Build the search query object
        const query = {
            status: { option: 'online' },
            type: {},
            stats: [{ type: 'and', filters: [] }]
        };
        
        // Add base item filter
        if (searchConfig.baseItem) {
            const baseName = this.baseItems[searchConfig.baseItem]?.name;
            if (baseName) {
                query.type = { option: baseName };
            }
        }
        
        // Add mod filters
        if (searchConfig.selectedMods && searchConfig.selectedMods.length > 0) {
            searchConfig.selectedMods.forEach(mod => {
                const statFilter = {
                    id: mod.modKey, // You'll need actual stat IDs
                    value: {
                        min: mod.values?.min || null,
                        max: mod.values?.max || null
                    }
                };
                query.stats[0].filters.push(statFilter);
            });
        }
        
        // Encode the query
        const encodedQuery = encodeURIComponent(JSON.stringify(query));
        return `${baseUrl}?q=${encodedQuery}`;
    }
}

// Test suite for integration validation
class AbyssJewelFuzzySearchTest {
    constructor() {
        this.processor = new AbyssJewelDataProcessor();
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Abyss Jewel Integration Tests...');
        
        await this.processor.initialize();
        
        const tests = [
            () => this.testBasicModSearch(),
            () => this.testAbbreviationSearch(),
            () => this.testFuzzyMatching(),
            () => this.testTierConversion(),
            () => this.testUrlGeneration()
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('Test failed:', error);
                this.testResults.push({ test: test.name, status: 'FAILED', error: error.message });
            }
        }
        
        this.printTestResults();
        return this.testResults;
    }

    async testBasicModSearch() {
        console.log('📝 Testing basic mod search...');
        
        const baseKey = 'Metadata/Items/Jewels/JewelAbyssMelee';
        const results = this.processor.findMatchingMods(baseKey, 'life', 5);
        
        const passed = results.length > 0 && results[0].score > 80;
        this.testResults.push({
            test: 'Basic Mod Search',
            status: passed ? 'PASSED' : 'FAILED',
            details: `Found ${results.length} results, top score: ${results[0]?.score || 0}`
        });
    }

    async testAbbreviationSearch() {
        console.log('📝 Testing abbreviation search...');
        
        const baseKey = 'Metadata/Items/Jewels/JewelAbyssCaster';
        const results = this.processor.findMatchingMods(baseKey, 'es', 5);
        
        const passed = results.length > 0;
        this.testResults.push({
            test: 'Abbreviation Search',
            status: passed ? 'PASSED' : 'FAILED',
            details: `ES abbreviation found ${results.length} results`
        });
    }

    async testFuzzyMatching() {
        console.log('📝 Testing fuzzy matching...');
        
        const baseKey = 'Metadata/Items/Jewels/JewelAbyssRanged';
        const results = this.processor.findMatchingMods(baseKey, 'accurracy', 5); // Typo intentional
        
        const passed = results.length > 0;
        this.testResults.push({
            test: 'Fuzzy Matching',
            status: passed ? 'PASSED' : 'FAILED',
            details: `Typo 'accurracy' found ${results.length} results`
        });
    }

    async testTierConversion() {
        console.log('📝 Testing tier conversion...');
        
        const baseKey = 'Metadata/Items/Jewels/JewelAbyssMelee';
        const modKey = 'prefix_AbyssJewelLife';
        const values = this.processor.convertTierToValues(modKey, baseKey, 'AbyssJewelAddedLife1');
        
        const passed = values && values.min !== undefined && values.max !== undefined;
        this.testResults.push({
            test: 'Tier Conversion',
            status: passed ? 'PASSED' : 'FAILED',
            details: `Converted to range: ${values?.min}-${values?.max}`
        });
    }

    async testUrlGeneration() {
        console.log('📝 Testing URL generation...');
        
        const config = {
            baseItem: 'Metadata/Items/Jewels/JewelAbyssMelee',
            selectedMods: [{
                modKey: 'prefix_AbyssJewelLife',
                values: { min: 30, max: 50 }
            }]
        };
        
        const url = this.processor.generateTradeUrlWithMods(config);
        const passed = url.includes('pathofexile.com/trade') && url.includes('?q=');
        
        this.testResults.push({
            test: 'URL Generation',
            status: passed ? 'PASSED' : 'FAILED',
            details: `Generated URL: ${url.length} characters`
        });
    }

    printTestResults() {
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('=' .repeat(50));
        
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(result => {
            const status = result.status === 'PASSED' ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.status}`);
            if (result.details) {
                console.log(`   ${result.details}`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            result.status === 'PASSED' ? passed++ : failed++;
        });
        
        console.log('=' .repeat(50));
        console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed! Abyss Jewel integration is ready.');
        } else {
            console.log('⚠️ Some tests failed. Check implementation before proceeding.');
        }
    }
}

// Export for use in popup
window.AbyssJewelDataProcessor = AbyssJewelDataProcessor;
window.AbyssJewelFuzzySearchTest = AbyssJewelFuzzySearchTest;