// Data Migration and Validation Script
// Run this in your browser console to test and validate the new data structure

class DataMigrationTester {
    constructor() {
        this.mockData = {
            'life': {
                name: 'Added Life',
                confidence: 95,
                statId: 'base_maximum_life',
                displayText: '+# to maximum Life',
                tiers: {
                    'T1': { min: 36, max: 40, weight: 1000 },
                    'T2': { min: 31, max: 35, weight: 1000 },
                    'T3': { min: 26, max: 30, weight: 1000 },
                    'T4': { min: 20, max: 25, weight: 500 }
                }
            },
            'es': {
                name: 'Energy Shield',
                confidence: 85,
                statId: 'base_maximum_energy_shield',
                displayText: '+# to maximum Energy Shield',
                tiers: {
                    'T1': { min: 18, max: 20, weight: 1000 },
                    'T2': { min: 15, max: 17, weight: 1000 },
                    'T3': { min: 12, max: 14, weight: 1000 },
                    'T4': { min: 8, max: 11, weight: 500 }
                }
            },
            'mana': {
                name: 'Added Mana',
                confidence: 90,
                statId: 'base_maximum_mana',
                displayText: '+# to maximum Mana',
                tiers: {
                    'T1': { min: 25, max: 30, weight: 1000 },
                    'T2': { min: 20, max: 24, weight: 1000 },
                    'T3': { min: 15, max: 19, weight: 1000 },
                    'T4': { min: 10, max: 14, weight: 500 }
                }
            },
            'fire_res': {
                name: 'Fire Resistance',
                confidence: 90,
                statId: 'base_fire_damage_resistance_%',
                displayText: '+#% to Fire Resistance',
                tiers: {
                    'T1': { min: 18, max: 20, weight: 1000 },
                    'T2': { min: 15, max: 17, weight: 1000 },
                    'T3': { min: 8, max: 14, weight: 500 }
                }
            }
        };
    }

    // Test loading data files
    async testDataLoading() {
        console.log('🧪 Testing data file loading...');
        
        try {
            // Test abyss_jewels.json
            const jewelResponse = await fetch(chrome.runtime.getURL('data/abyss_jewels.json'));
            if (!jewelResponse.ok) {
                throw new Error(`Failed to load abyss_jewels.json: ${jewelResponse.status}`);
            }
            const jewelData = await jewelResponse.json();
            console.log('✅ abyss_jewels.json loaded:', Object.keys(jewelData).length, 'entries');

            // Test abyss_jewel_mods.json
            const modsResponse = await fetch(chrome.runtime.getURL('data/abyss_jewel_mods.json'));
            if (!modsResponse.ok) {
                throw new Error(`Failed to load abyss_jewel_mods.json: ${modsResponse.status}`);
            }
            const modsData = await modsResponse.json();
            console.log('✅ abyss_jewel_mods.json loaded');
            
            // Validate structure
            if (!modsData['Abyss Jewels']) {
                throw new Error('Missing "Abyss Jewels" section in mods data');
            }
            
            const abyssSection = modsData['Abyss Jewels'];
            const tagCombos = Object.keys(abyssSection);
            console.log('✅ Found tag combinations:', tagCombos);
            
            return { jewelData, modsData };
            
        } catch (error) {
            console.error('❌ Data loading failed:', error);
            throw error;
        }
    }

    // Test mod processing for specific jewel type
    testModProcessing(modsData, jewelType = 'murderous') {
        console.log(`🔄 Testing mod processing for ${jewelType}...`);
        
        const tagMap = {
            'murderous': 'not_for_sale,abyss_jewel_melee,abyss_jewel,default',
            'searching': 'not_for_sale,abyss_jewel_ranged,abyss_jewel,default',
            'hypnotic': 'not_for_sale,abyss_jewel_caster,abyss_jewel,default',
            'ghastly': 'not_for_sale,abyss_jewel_minion,abyss_jewel,default'
        };
        
        const tagString = tagMap[jewelType];
        if (!tagString) {
            console.error('❌ Unknown jewel type:', jewelType);
            return null;
        }
        
        const abyssSection = modsData['Abyss Jewels'];
        const jewelData = abyssSection[tagString];
        
        if (!jewelData) {
            console.error('❌ No data found for tag combination:', tagString);
            return null;
        }
        
        console.log('✅ Found jewel data with categories:', Object.keys(jewelData.mods || {}));
        
        // Process mods
        const processedMods = {};
        let totalMods = 0;
        
        Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
            console.log(`📋 Processing category "${category}" with ${Object.keys(categoryMods).length} mod groups`);
            
            Object.entries(categoryMods).forEach(([modGroup, modVariants]) => {
                const modKey = `${category}_${modGroup}`.toLowerCase();
                const variantCount = Object.keys(modVariants).length;
                totalMods++;
                
                processedMods[modKey] = {
                    name: this.formatModName(modGroup),
                    category: category,
                    group: modGroup,
                    variantCount: variantCount,
                    variants: modVariants
                };
            });
        });
        
        console.log(`✅ Processed ${totalMods} mods for ${jewelType}`);
        return processedMods;
    }

    // Compare mock data vs real data coverage
    async compareDataCoverage() {
        console.log('📊 Comparing mock data vs real data coverage...');
        
        try {
            const { modsData } = await this.testDataLoading();
            
            // Test all jewel types
            const jewelTypes = ['murderous', 'searching', 'hypnotic', 'ghastly'];
            const coverage = {};
            
            jewelTypes.forEach(jewelType => {
                const processedMods = this.testModProcessing(modsData, jewelType);
                if (processedMods) {
                    coverage[jewelType] = Object.keys(processedMods).length;
                    
                    // Show sample mods
                    const sampleMods = Object.keys(processedMods).slice(0, 5);
                    console.log(`📝 Sample mods for ${jewelType}:`, sampleMods);
                }
            });
            
            console.log('📊 Coverage summary:');
            console.log('Mock data mods:', Object.keys(this.mockData).length);
            Object.entries(coverage).forEach(([jewelType, count]) => {
                console.log(`${jewelType}: ${count} mods`);
            });
            
            return coverage;
            
        } catch (error) {
            console.error('❌ Coverage comparison failed:', error);
        }
    }

    // Test fuzzy search on real data
    async testFuzzySearch(searchTerm = 'life') {
        console.log(`🔍 Testing fuzzy search for "${searchTerm}"...`);
        
        try {
            const { modsData } = await this.testDataLoading();
            const processedMods = this.testModProcessing(modsData, 'murderous');
            
            if (!processedMods) {
                console.error('❌ No mods to search');
                return;
            }
            
            // Simple fuzzy search implementation
            const results = [];
            const queryLower = searchTerm.toLowerCase();
            
            Object.entries(processedMods).forEach(([key, mod]) => {
                const modNameLower = mod.name.toLowerCase();
                let confidence = 0;
                
                if (modNameLower.includes(queryLower)) {
                    if (modNameLower.startsWith(queryLower)) {
                        confidence = 95;
                    } else {
                        confidence = 85;
                    }
                    
                    results.push({
                        key: key,
                        name: mod.name,
                        confidence: confidence,
                        category: mod.category
                    });
                }
            });
            
            results.sort((a, b) => b.confidence - a.confidence);
            
            console.log(`✅ Found ${results.length} matches for "${searchTerm}":`, 
                results.slice(0, 5).map(r => `${r.name} (${r.confidence}%)`));
            
            return results;
            
        } catch (error) {
            console.error('❌ Fuzzy search test failed:', error);
        }
    }

    // Generate sample data files if they don't exist
    generateSampleDataFiles() {
        console.log('📁 Generating sample data file structures...');
        
        const sampleAbyssJewels = {
            "murderous_eye_jewel": {
                "name": "Murderous Eye Jewel",
                "tags": ["not_for_sale", "abyss_jewel_melee", "abyss_jewel", "default"],
                "description": "Melee builds"
            },
            "searching_eye_jewel": {
                "name": "Searching Eye Jewel", 
                "tags": ["not_for_sale", "abyss_jewel_ranged", "abyss_jewel", "default"],
                "description": "Ranged builds"
            },
            "hypnotic_eye_jewel": {
                "name": "Hypnotic Eye Jewel",
                "tags": ["not_for_sale", "abyss_jewel_caster", "abyss_jewel", "default"],
                "description": "Caster builds"
            },
            "ghastly_eye_jewel": {
                "name": "Ghastly Eye Jewel",
                "tags": ["not_for_sale", "abyss_jewel_minion", "abyss_jewel", "default"],
                "description": "Summoner builds"
            }
        };
        
        const sampleAbyssJewelMods = {
            "Abyss Jewels": {
                "not_for_sale,abyss_jewel_melee,abyss_jewel,default": {
                    "bases": ["Metadata/Items/Jewels/JewelAbyssMelee"],
                    "mods": {
                        "prefix": {
                            "AbyssJewelLife": {
                                "AbyssJewelAddedLife1": 3000,
                                "AbyssJewelAddedLife2": 3000,
                                "AbyssJewelAddedLife3": 1000,
                                "AbyssJewelAddedLife4": 500
                            },
                            "AbyssJewelMana": {
                                "AbyssJewelAddedMana1": 1000,
                                "AbyssJewelAddedMana2": 1000,
                                "AbyssJewelAddedMana3": 1000,
                                "AbyssJewelAddedMana4": 500
                            }
                        },
                        "suffix": {
                            "AbyssJewelFireResistance": {
                                "AbyssJewelFireResistance1": 1000,
                                "AbyssJewelFireResistance2": 1000,
                                "AbyssJewelFireResistance3": 500
                            }
                        }
                    }
                }
            }
        };
        
        console.log('📝 Sample abyss_jewels.json structure:');
        console.log(JSON.stringify(sampleAbyssJewels, null, 2));
        
        console.log('\n📝 Sample abyss_jewel_mods.json structure (abbreviated):');
        console.log(JSON.stringify(sampleAbyssJewelMods, null, 2));
        
        return { sampleAbyssJewels, sampleAbyssJewelMods };
    }

    // Format mod name helper
    formatModName(modGroup) {
        return modGroup
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Run complete test suite
    async runCompleteTest() {
        console.log('🚀 Running complete data migration test suite...');
        
        try {
            // Test 1: Data loading
            await this.testDataLoading();
            
            // Test 2: Coverage comparison
            await this.compareDataCoverage();
            
            // Test 3: Fuzzy search tests
            const searchTerms = ['life', 'mana', 'resistance', 'damage'];
            for (const term of searchTerms) {
                await this.testFuzzySearch(term);
            }
            
            console.log('✅ All tests completed successfully!');
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            console.log('💡 If data files are missing, run generateSampleDataFiles() to see expected structure');
        }
    }
}

// Usage instructions
console.log(`
🎯 Data Migration Tester Ready!

Usage:
1. const tester = new DataMigrationTester();
2. await tester.runCompleteTest(); // Run all tests
3. await tester.testDataLoading(); // Test file loading only
4. await tester.compareDataCoverage(); // Compare mock vs real data
5. await tester.testFuzzySearch('mana'); // Test search for specific term
6. tester.generateSampleDataFiles(); // Show expected file structure

Make sure your data files are in the data/ directory before testing!
`);

// Make available globally
window.DataMigrationTester = DataMigrationTester;