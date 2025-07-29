// Mod Data Processor Helper
// Utility functions for processing and validating mod data from JSON files

class ModDataProcessor {
    constructor() {
        this.abyssJewelsData = null;
        this.abyssJewelModsData = null;
        this.modStatMappings = null; // For mapping mod keys to actual stat values
    }

    // Load and validate data files
    async loadDataFiles() {
        try {
            // Load abyss jewels data
            const jewelResponse = await fetch(chrome.runtime.getURL('data/abyss_jewels.json'));
            this.abyssJewelsData = await jewelResponse.json();

            // Load abyss jewel mods data  
            const modsResponse = await fetch(chrome.runtime.getURL('data/abyss_jewel_mods.json'));
            this.abyssJewelModsData = await modsResponse.json();

            // Validate data structure
            this.validateDataStructure();
            
            return true;
        } catch (error) {
            console.error('Failed to load data files:', error);
            throw error;
        }
    }

    // Validate that the data has the expected structure
    validateDataStructure() {
        if (!this.abyssJewelModsData || !this.abyssJewelModsData['Abyss Jewels']) {
            throw new Error('Invalid abyss_jewel_mods.json structure - missing "Abyss Jewels" section');
        }

        // Check for expected tag combinations
        const expectedTags = [
            'not_for_sale,abyss_jewel_melee,abyss_jewel,default',
            'not_for_sale,abyss_jewel_ranged,abyss_jewel,default', 
            'not_for_sale,abyss_jewel_caster,abyss_jewel,default',
            'not_for_sale,abyss_jewel_minion,abyss_jewel,default'
        ];

        const abyssJewelsSection = this.abyssJewelModsData['Abyss Jewels'];
        expectedTags.forEach(tagCombo => {
            if (!abyssJewelsSection[tagCombo]) {
                console.warn(`Missing expected tag combination: ${tagCombo}`);
            }
        });

        console.log('✅ Data structure validation passed');
    }

    // Get all available tag combinations from the data
    getAvailableTagCombinations() {
        if (!this.abyssJewelModsData) return [];
        
        const abyssJewelsSection = this.abyssJewelModsData['Abyss Jewels'];
        return Object.keys(abyssJewelsSection);
    }

    // Process mods for a specific tag combination
    processModsForTags(tagString) {
        if (!this.abyssJewelModsData) return {};

        const abyssJewelsSection = this.abyssJewelModsData['Abyss Jewels'];
        const jewelData = abyssJewelsSection[tagString];
        
        if (!jewelData || !jewelData.mods) {
            return {};
        }

        const processedMods = {};

        // Process each category (prefix, suffix, corrupted, etc.)
        Object.entries(jewelData.mods).forEach(([category, categoryMods]) => {
            Object.entries(categoryMods).forEach(([modGroup, modVariants]) => {
                const modKey = `${category}_${modGroup}`.toLowerCase();
                
                // Process tiers from mod variants
                const tiers = this.extractTiersFromVariants(modVariants);
                
                // Create processed mod entry
                processedMods[modKey] = {
                    name: this.formatModName(modGroup),
                    category: category,
                    group: modGroup,
                    confidence: 95, // High confidence for exact matches
                    tiers: tiers,
                    variants: modVariants
                };
            });
        });

        return processedMods;
    }

    // Extract tier information from mod variants
    extractTiersFromVariants(modVariants) {
        const tiers = {};
        
        // Sort variants by name to try to identify tier order
        const sortedVariants = Object.entries(modVariants).sort(([a], [b]) => a.localeCompare(b));
        
        sortedVariants.forEach(([variantKey, weight], index) => {
            // Try to extract tier number from variant key
            const tierMatches = [
                variantKey.match(/(\d+)$/), // Ends with number
                variantKey.match(/Tier(\d+)/i), // Contains "Tier"
                variantKey.match(/T(\d+)/i), // Contains "T"
                variantKey.match(/(\d+)/) // Any number
            ];
            
            let tierNum = null;
            for (const match of tierMatches) {
                if (match) {
                    tierNum = parseInt(match[1]);
                    break;
                }
            }
            
            // If no tier number found, use position + 1
            if (!tierNum) {
                tierNum = index + 1;
            }
            
            const tierKey = `T${tierNum}`;
            
            // For now, use placeholder values - these should be replaced with actual stat ranges
            // In a real implementation, you'd need another data source or parsing logic for stat values
            tiers[tierKey] = {
                min: this.getDefaultMinValue(tierNum),
                max: this.getDefaultMaxValue(tierNum),
                weight: weight,
                variantKey: variantKey
            };
        });
        
        return tiers;
    }

    // Get default min value for tier (placeholder - replace with real data)
    getDefaultMinValue(tierNum) {
        // Higher tier = better values, so T1 should have highest values
        const baseMins = { 1: 8, 2: 6, 3: 4, 4: 2, 5: 1 };
        return baseMins[tierNum] || 1;
    }

    // Get default max value for tier (placeholder - replace with real data)  
    getDefaultMaxValue(tierNum) {
        // Higher tier = better values, so T1 should have highest values
        const baseMaxs = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };
        return baseMaxs[tierNum] || 2;
    }

    // Format mod group name into readable text
    formatModName(modGroup) {
        return modGroup
            .replace(/([A-Z])/g, ' $1') // Add space before capitals
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace(/\s+/g, ' ') // Clean up spaces
            .trim();
    }

    // Get detailed statistics about the mod database
    getModDatabaseStats() {
        if (!this.abyssJewelModsData) return null;

        const stats = {
            totalTagCombinations: 0,
            totalModGroups: 0,
            totalVariants: 0,
            categoryCounts: {},
            jewelTypeBreakdown: {}
        };

        const abyssJewelsSection = this.abyssJewelModsData['Abyss Jewels'];
        stats.totalTagCombinations = Object.keys(abyssJewelsSection).length;

        Object.entries(abyssJewelsSection).forEach(([tagCombo, jewelData]) => {
            const jewelType = this.identifyJewelTypeFromTags(tagCombo);
            stats.jewelTypeBreakdown[jewelType] = stats.jewelTypeBreakdown[jewelType] || {
                modGroups: 0,
                variants: 0,
                categories: {}
            };

            if (jewelData.mods) {
                Object.entries(jewelData.mods).forEach(([category, categoryMods]) => {
                    stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + Object.keys(categoryMods).length;
                    stats.jewelTypeBreakdown[jewelType].categories[category] = Object.keys(categoryMods).length;
                    
                    Object.entries(categoryMods).forEach(([modGroup, variants]) => {
                        stats.totalModGroups++;
                        stats.jewelTypeBreakdown[jewelType].modGroups++;
                        
                        const variantCount = Object.keys(variants).length;
                        stats.totalVariants += variantCount;
                        stats.jewelTypeBreakdown[jewelType].variants += variantCount;
                    });
                });
            }
        });

        return stats;
    }

    // Identify jewel type from tag combination
    identifyJewelTypeFromTags(tagCombo) {
        if (tagCombo.includes('abyss_jewel_melee')) return 'Murderous Eye Jewel';
        if (tagCombo.includes('abyss_jewel_ranged')) return 'Searching Eye Jewel';
        if (tagCombo.includes('abyss_jewel_caster')) return 'Hypnotic Eye Jewel';
        if (tagCombo.includes('abyss_jewel_minion')) return 'Ghastly Eye Jewel';
        return 'Unknown';
    }

    // Search for mods across all jewel types
    searchModsGlobally(query, maxResults = 10) {
        const allMods = [];
        const tagCombos = this.getAvailableTagCombinations();

        tagCombos.forEach(tagCombo => {
            const mods = this.processModsForTags(tagCombo);
            const jewelType = this.identifyJewelTypeFromTags(tagCombo);
            
            Object.entries(mods).forEach(([key, mod]) => {
                allMods.push({
                    ...mod,
                    key: key,
                    jewelType: jewelType,
                    tagCombo: tagCombo
                });
            });
        });

        // Perform fuzzy search
        return this.performFuzzySearch(allMods, query, maxResults);
    }

    // Perform fuzzy search on mod collection
    performFuzzySearch(mods, query, maxResults) {
        const queryLower = query.toLowerCase();
        const results = [];

        // Abbreviation expansions
        const abbreviations = {
            'es': 'energy shield',
            'hp': 'life',
            'mp': 'mana',
            'res': 'resistance',
            'dmg': 'damage',
            'inc': 'increased',
            'att': 'attack',
            'def': 'defence',
            'crit': 'critical',
            'multi': 'multiplier'
        };

        let expandedQuery = queryLower;
        Object.entries(abbreviations).forEach(([abbr, expansion]) => {
            expandedQuery = expandedQuery.replace(new RegExp(`\\b${abbr}\\b`, 'g'), expansion);
        });

        mods.forEach(mod => {
            const modNameLower = mod.name.toLowerCase();
            let confidence = 0;

            // Exact match
            if (modNameLower === queryLower || modNameLower === expandedQuery) {
                confidence = 100;
            }
            // Starts with query
            else if (modNameLower.startsWith(queryLower) || modNameLower.startsWith(expandedQuery)) {
                confidence = 95;
            }
            // Contains query
            else if (modNameLower.includes(queryLower) || modNameLower.includes(expandedQuery)) {
                confidence = 85;
            }
            // Word matching
            else {
                const queryWords = expandedQuery.split(' ');
                let matchingWords = 0;
                
                queryWords.forEach(word => {
                    if (word.length > 2 && modNameLower.includes(word)) {
                        matchingWords++;
                    }
                });
                
                if (matchingWords > 0) {
                    confidence = Math.min(80, (matchingWords / queryWords.length) * 80);
                }
            }

            if (confidence > 70) {
                results.push({
                    ...mod,
                    confidence: confidence
                });
            }
        });

        return results
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxResults);
    }

    // Validate mod data completeness for a specific jewel type
    validateJewelTypeMods(jewelType) {
        const tagMap = {
            'murderous': 'not_for_sale,abyss_jewel_melee,abyss_jewel,default',
            'searching': 'not_for_sale,abyss_jewel_ranged,abyss_jewel,default',
            'hypnotic': 'not_for_sale,abyss_jewel_caster,abyss_jewel,default',
            'ghastly': 'not_for_sale,abyss_jewel_minion,abyss_jewel,default'
        };

        const tagString = tagMap[jewelType];
        if (!tagString) {
            return { valid: false, error: 'Unknown jewel type' };
        }

        const mods = this.processModsForTags(tagString);
        const modCount = Object.keys(mods).length;

        return {
            valid: modCount > 0,
            modCount: modCount,
            categories: this.getCategoriesForJewelType(tagString),
            sampleMods: Object.keys(mods).slice(0, 5)
        };
    }

    // Get categories available for a jewel type
    getCategoriesForJewelType(tagString) {
        if (!this.abyssJewelModsData) return [];

        const abyssJewelsSection = this.abyssJewelModsData['Abyss Jewels'];
        const jewelData = abyssJewelsSection[tagString];
        
        return jewelData && jewelData.mods ? Object.keys(jewelData.mods) : [];
    }

    // Export processed data for debugging
    exportProcessedData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            stats: this.getModDatabaseStats(),
            jewelTypes: {}
        };

        const jewelTypes = ['murderous', 'searching', 'hypnotic', 'ghastly'];
        const tagMap = {
            'murderous': 'not_for_sale,abyss_jewel_melee,abyss_jewel,default',
            'searching': 'not_for_sale,abyss_jewel_ranged,abyss_jewel,default',
            'hypnotic': 'not_for_sale,abyss_jewel_caster,abyss_jewel,default',
            'ghastly': 'not_for_sale,abyss_jewel_minion,abyss_jewel,default'
        };

        jewelTypes.forEach(jewelType => {
            const tagString = tagMap[jewelType];
            exportData.jewelTypes[jewelType] = {
                tagString: tagString,
                mods: this.processModsForTags(tagString),
                validation: this.validateJewelTypeMods(jewelType)
            };
        });

        return exportData;
    }

    // Generate human-readable report
    generateReport() {
        const stats = this.getModDatabaseStats();
        if (!stats) return 'No data loaded';

        let report = '=== Abyss Jewel Mod Database Report ===\n\n';
        report += `Total Tag Combinations: ${stats.totalTagCombinations}\n`;
        report += `Total Mod Groups: ${stats.totalModGroups}\n`;
        report += `Total Variants: ${stats.totalVariants}\n\n`;

        report += '--- Category Breakdown ---\n';
        Object.entries(stats.categoryCounts).forEach(([category, count]) => {
            report += `${category}: ${count} mod groups\n`;
        });

        report += '\n--- Jewel Type Breakdown ---\n';
        Object.entries(stats.jewelTypeBreakdown).forEach(([jewelType, data]) => {
            report += `\n${jewelType}:\n`;
            report += `  Mod Groups: ${data.modGroups}\n`;
            report += `  Variants: ${data.variants}\n`;
            report += `  Categories: ${Object.keys(data.categories).join(', ')}\n`;
        });

        return report;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModDataProcessor;
} else if (typeof window !== 'undefined') {
    window.ModDataProcessor = ModDataProcessor;
}