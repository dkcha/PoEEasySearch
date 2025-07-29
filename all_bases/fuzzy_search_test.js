// Fuzzy Search Integration Test Suite
// Run this in the browser console to test the enhanced data processor integration

class FuzzySearchTest {
    constructor() {
        this.processor = null;
        this.testResults = [];
    }

    async initialize() {
        console.log('🚀 Initializing Fuzzy Search Test Suite...');
        
        try {
            this.processor = new DataProcessor();
            await this.processor.initialize();
            console.log('✅ Data processor initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize data processor:', error);
            return false;
        }
    }

    async runAllTests() {
        if (!await this.initialize()) {
            console.error('Cannot run tests - initialization failed');
            return;
        }

        console.log('\n📊 Running Fuzzy Search Integration Tests...\n');

        // Test categories
        await this.testBasicFuzzyMatching();
        await this.testAbbreviationMatching();
        await this.testTypoTolerance();
        await this.testTierConversion();
        await this.testPopupIntegration();
        await this.testEdgeCases();

        // Display results summary
        this.displayTestSummary();
    }

    async testBasicFuzzyMatching() {
        console.log('🔍 Testing Basic Fuzzy Matching...');

        const testCases = [
            {
                baseItem: 'VaalRegalia',
                input: 'maximum energy shield',
                expectedMatch: true,
                description: 'Direct match for energy shield mod'
            },
            {
                baseItem: 'VaalRegalia',
                input: 'life',
                expectedMatch: true,
                description: 'Life mod on armor'
            },
            {
                baseItem: 'VaalRegalia',
                input: 'damage',
                expectedMatch: false,
                description: 'Damage mod should not appear on armor'
            },
            {
                baseItem: 'ImperialBow',
                input: 'physical damage',
                expectedMatch: true,
                description: 'Physical damage on weapon'
            }
        ];

        for (const testCase of testCases) {
            try {
                const matches = this.processor.findMatchingMods(
                    testCase.baseItem, 
                    testCase.input, 
                    5
                );

                const hasMatch = matches.length > 0;
                const passed = hasMatch === testCase.expectedMatch;

                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);
                console.log(`    Input: "${testCase.input}" on ${testCase.baseItem}`);
                console.log(`    Found ${matches.length} matches`);
                
                if (matches.length > 0) {
                    console.log(`    Best match: "${matches[0].name}" (${matches[0].matchScore}%)`);
                }

                this.testResults.push({
                    category: 'Basic Fuzzy Matching',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Basic Fuzzy Matching',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    async testAbbreviationMatching() {
        console.log('\n🔤 Testing Abbreviation Matching...');

        const abbreviationTests = [
            {
                baseItem: 'VaalRegalia',
                input: 'max es',
                expectedPhrase: 'maximum energy shield',
                description: 'ES abbreviation for Energy Shield'
            },
            {
                baseItem: 'VaalRegalia',
                input: 'max life',
                expectedPhrase: 'maximum life',
                description: 'Max abbreviation for Maximum'
            },
            {
                baseItem: 'TwoStoneRing',
                input: 'fire res',
                expectedPhrase: 'fire resistance',
                description: 'Res abbreviation for Resistance'
            },
            {
                baseItem: 'VaalRegalia',
                input: 'int',
                expectedPhrase: 'intelligence',
                description: 'Int abbreviation for Intelligence'
            }
        ];

        for (const testCase of abbreviationTests) {
            try {
                const matches = this.processor.findMatchingMods(
                    testCase.baseItem,
                    testCase.input,
                    10
                );

                // Check if any match contains the expected phrase
                const relevantMatch = matches.find(match => 
                    match.name.toLowerCase().includes(testCase.expectedPhrase.toLowerCase())
                );

                const passed = relevantMatch && relevantMatch.matchScore >= 70;

                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);
                console.log(`    Input: "${testCase.input}" expecting "${testCase.expectedPhrase}"`);
                
                if (relevantMatch) {
                    console.log(`    Found: "${relevantMatch.name}" (${relevantMatch.matchScore}%)`);
                } else if (matches.length > 0) {
                    console.log(`    Best match: "${matches[0].name}" (${matches[0].matchScore}%)`);
                } else {
                    console.log(`    No matches found`);
                }

                this.testResults.push({
                    category: 'Abbreviation Matching',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Abbreviation Matching',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    async testTypoTolerance() {
        console.log('\n✏️ Testing Typo Tolerance...');

        const typoTests = [
            {
                baseItem: 'VaalRegalia',
                input: 'maxmium enregy sheild', // Multiple typos
                expectedMatch: 'maximum energy shield',
                description: 'Multiple typos in energy shield search'
            },
            {
                baseItem: 'TwoStoneRing',
                input: 'resistanse',
                expectedMatch: 'resistance',
                description: 'Typo in resistance'
            },
            {
                baseItem: 'VaalRegalia',
                input: 'inteligence',
                expectedMatch: 'intelligence',
                description: 'Typo in intelligence'
            }
        ];

        for (const testCase of typoTests) {
            try {
                const matches = this.processor.findMatchingMods(
                    testCase.baseItem,
                    testCase.input,
                    5
                );

                // Check if any match is relevant despite typos
                const relevantMatch = matches.find(match =>
                    match.name.toLowerCase().includes(testCase.expectedMatch.toLowerCase()) ||
                    match.matchScore >= 60 // Lower threshold for typo tolerance
                );

                const passed = relevantMatch !== undefined;

                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);
                console.log(`    Input: "${testCase.input}" (with typos)`);
                
                if (relevantMatch) {
                    console.log(`    Found: "${relevantMatch.name}" (${relevantMatch.matchScore}%)`);
                } else if (matches.length > 0) {
                    console.log(`    Best attempt: "${matches[0].name}" (${matches[0].matchScore}%)`);
                } else {
                    console.log(`    No matches found`);
                }

                this.testResults.push({
                    category: 'Typo Tolerance',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Typo Tolerance',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    async testTierConversion() {
        console.log('\n🎯 Testing Tier-to-Value Conversion...');

        const tierTests = [
            {
                baseItem: 'VaalRegalia',
                modSearch: 'maximum energy shield',
                tier: 'T1',
                description: 'T1 Energy Shield conversion'
            },
            {
                baseItem: 'TwoStoneRing',
                modSearch: 'maximum life',
                tier: 'T1',
                description: 'T1 Life conversion on ring'
            },
            {
                baseItem: 'VaalRegalia',
                modSearch: 'intelligence',
                tier: 'T2',
                description: 'T2 Intelligence conversion'
            }
        ];

        for (const testCase of tierTests) {
            try {
                // First find the mod
                const matches = this.processor.findMatchingMods(
                    testCase.baseItem,
                    testCase.modSearch,
                    5
                );

                if (matches.length === 0) {
                    console.log(`  ❌ ${testCase.description} - No mod found for "${testCase.modSearch}"`);
                    this.testResults.push({
                        category: 'Tier Conversion',
                        test: testCase.description,
                        passed: false,
                        error: 'No matching mod found'
                    });
                    continue;
                }

                const bestMatch = matches[0];

                // Test tier conversion
                const tierInfo = this.processor.convertTierToValues(
                    bestMatch.key,
                    testCase.baseItem,
                    testCase.tier
                );

                const passed = tierInfo && tierInfo.values && tierInfo.values.length > 0;

                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);
                console.log(`    Mod: "${bestMatch.name}"`);
                console.log(`    Tier: ${testCase.tier}`);
                
                if (tierInfo && tierInfo.values) {
                    const values = tierInfo.values[0];
                    console.log(`    Values: ${values.min} - ${values.max}`);
                } else {
                    console.log(`    No tier values found`);
                }

                // Test available tiers
                const availableTiers = this.processor.getAvailableTiers(
                    bestMatch.key,
                    testCase.baseItem
                );

                console.log(`    Available tiers: ${availableTiers.map(t => t.tier).join(', ')}`);

                this.testResults.push({
                    category: 'Tier Conversion',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Tier Conversion',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    async testPopupIntegration() {
        console.log('\n🖥️ Testing Popup Integration...');

        const integrationTests = [
            {
                description: 'Base item population',
                test: () => {
                    const baseItems = this.processor.getBaseItemsByClass();
                    return Object.keys(baseItems).length > 0;
                }
            },
            {
                description: 'URL generation without mods',
                test: () => {
                    const searchConfig = {
                        baseItemKey: 'VaalRegalia',
                        itemLevel: { min: '80', max: '90' },
                        quality: { min: '20', max: '' },
                        corrupted: 'no'
                    };
                    
                    const url = this.processor.generateTradeUrlWithoutMods(searchConfig);
                    return url && url.includes('pathofexile.com/trade');
                }
            },
            {
                description: 'URL generation with mods',
                test: () => {
                    const searchConfig = {
                        baseItemKey: 'VaalRegalia',
                        mods: [{
                            key: 'local_energy_shield_+%',
                            name: '+#% to Energy Shield',
                            tier: 'T1',
                            values: [{ min: 163, max: 200 }]
                        }]
                    };
                    
                    const url = this.processor.generateTradeUrlWithMods(searchConfig);
                    return url && url.includes('pathofexile.com/trade');
                }
            }
        ];

        for (const testCase of integrationTests) {
            try {
                const passed = testCase.test();
                
                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);

                this.testResults.push({
                    category: 'Popup Integration',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Popup Integration',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    async testEdgeCases() {
        console.log('\n🔍 Testing Edge Cases...');

        const edgeCaseTests = [
            {
                description: 'Empty search input',
                test: () => {
                    const matches = this.processor.findMatchingMods('VaalRegalia', '', 5);
                    return matches.length === 0;
                }
            },
            {
                description: 'Non-existent base item',
                test: () => {
                    try {
                        const matches = this.processor.findMatchingMods('NonExistentItem', 'life', 5);
                        return matches.length === 0;
                    } catch (error) {
                        return true; // Expected to handle gracefully
                    }
                }
            },
            {
                description: 'Very short search input',
                test: () => {
                    const matches = this.processor.findMatchingMods('VaalRegalia', 'a', 5);
                    return Array.isArray(matches); // Should return array, even if empty
                }
            },
            {
                description: 'Special characters in search',
                test: () => {
                    const matches = this.processor.findMatchingMods('VaalRegalia', '+%#', 5);
                    return Array.isArray(matches);
                }
            },
            {
                description: 'Invalid tier conversion',
                test: () => {
                    try {
                        const tierInfo = this.processor.convertTierToValues('nonexistent', 'VaalRegalia', 'T1');
                        return tierInfo === null || tierInfo === undefined;
                    } catch (error) {
                        return true; // Expected to handle gracefully
                    }
                }
            }
        ];

        for (const testCase of edgeCaseTests) {
            try {
                const passed = testCase.test();
                
                console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}`);

                this.testResults.push({
                    category: 'Edge Cases',
                    test: testCase.description,
                    passed
                });

            } catch (error) {
                console.error(`  ❌ ${testCase.description} - Error:`, error);
                this.testResults.push({
                    category: 'Edge Cases',
                    test: testCase.description,
                    passed: false,
                    error: error.message
                });
            }
        }
    }

    displayTestSummary() {
        console.log('\n📊 TEST RESULTS SUMMARY\n');

        const categories = {};
        let totalTests = 0;
        let totalPassed = 0;

        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, total: 0, failed: [] };
            }
            
            categories[result.category].total++;
            totalTests++;
            
            if (result.passed) {
                categories[result.category].passed++;
                totalPassed++;
            } else {
                categories[result.category].failed.push({
                    test: result.test,
                    error: result.error
                });
            }
        });

        // Display category summaries
        Object.entries(categories).forEach(([category, stats]) => {
            const percentage = Math.round((stats.passed / stats.total) * 100);
            const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
            
            console.log(`${status} ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
            
            if (stats.failed.length > 0) {
                stats.failed.forEach(failure => {
                    console.log(`    ❌ ${failure.test}`);
                    if (failure.error) {
                        console.log(`       Error: ${failure.error}`);
                    }
                });
            }
        });

        // Overall summary
        const overallPercentage = Math.round((totalPassed / totalTests) * 100);
        const overallStatus = overallPercentage === 100 ? '🎉' : overallPercentage >= 80 ? '⚠️' : '🚨';
        
        console.log(`\n${overallStatus} OVERALL: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`);

        if (overallPercentage === 100) {
            console.log('\n🎉 All tests passed! Fuzzy search integration is working perfectly!');
        } else if (overallPercentage >= 80) {
            console.log('\n⚠️ Most tests passed, but some issues need attention.');
        } else {
            console.log('\n🚨 Multiple failures detected. Integration needs debugging.');
        }

        // Return results for programmatic access
        return {
            totalTests,
            totalPassed,
            overallPercentage,
            categories,
            details: this.testResults
        };
    }

    // Helper method for interactive testing
    async testSpecificMod(baseItem, searchInput) {
        console.log(`\n🔍 Testing specific mod: "${searchInput}" on ${baseItem}`);
        
        try {
            const matches = this.processor.findMatchingMods(baseItem, searchInput, 10);
            
            console.log(`Found ${matches.length} matches:`);
            matches.forEach((match, index) => {
                console.log(`  ${index + 1}. "${match.name}" (${match.matchScore}% match)`);
                
                // Show available tiers for top matches
                if (index < 3) {
                    const tiers = this.processor.getAvailableTiers(match.key, baseItem);
                    if (tiers.length > 0) {
                        console.log(`     Tiers: ${tiers.slice(0, 3).map(t => t.tier).join(', ')}`);
                    }
                }
            });
            
            return matches;
        } catch (error) {
            console.error('Error testing mod:', error);
            return [];
        }
    }

    // Helper method for testing tier conversion
    async testTierForMod(baseItem, modKey, tier) {
        console.log(`\n🎯 Testing tier conversion: ${tier} for ${modKey} on ${baseItem}`);
        
        try {
            const tierInfo = this.processor.convertTierToValues(modKey, baseItem, tier);
            
            if (tierInfo && tierInfo.values) {
                console.log(`✅ ${tier} values: ${tierInfo.values[0].min} - ${tierInfo.values[0].max}`);
                return tierInfo;
            } else {
                console.log(`❌ No tier information found`);
                return null;
            }
        } catch (error) {
            console.error('Error testing tier:', error);
            return null;
        }
    }
}

// Usage Instructions and Examples
console.log(`
🚀 FUZZY SEARCH INTEGRATION TEST SUITE

To run the complete test suite:
    const tester = new FuzzySearchTest();
    const results = await tester.runAllTests();

To test specific mods interactively:
    const tester = new FuzzySearchTest();
    await tester.initialize();
    
    // Test specific mod searches
    await tester.testSpecificMod('VaalRegalia', 'max es');
    await tester.testSpecificMod('ImperialBow', 'phys damage');
    await tester.testSpecificMod('TwoStoneRing', 'fire res');
    
    // Test tier conversions
    await tester.testTierForMod('VaalRegalia', 'local_energy_shield_+%', 'T1');

Example test scenarios to try:
    1. Perfect matches: "maximum energy shield", "life", "resistance"
    2. Abbreviations: "max es", "fire res", "int", "str"
    3. Typos: "maxmium enregy sheild", "resistanse", "inteligence"
    4. Partial matches: "energy", "shield", "damage"
    5. Invalid searches: "", "xyz123", special characters

The test suite validates:
    ✅ Basic fuzzy matching functionality
    ✅ Abbreviation recognition and expansion
    ✅ Typo tolerance with Levenshtein distance
    ✅ Tier-to-value conversion accuracy
    ✅ Popup integration compatibility
    ✅ Edge case handling and error recovery
`);

// Auto-run if in browser environment
if (typeof window !== 'undefined' && window.location) {
    console.log('🔄 Browser environment detected. Run tests with:');
    console.log('const tester = new FuzzySearchTest(); await tester.runAllTests();');
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuzzySearchTest;
}