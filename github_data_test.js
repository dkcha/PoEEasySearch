// GitHub Data Loading Test Script
// Run this in browser console to test data loading

async function testGitHubDataLoading() {
    console.log('🧪 Testing GitHub data loading...');
    
    const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/';
    
    try {
        // Test abyss_jewels.json
        console.log('🌐 Testing abyss_jewels.json...');
        const jewelResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewels.json`);
        console.log(`Response status: ${jewelResponse.status} ${jewelResponse.statusText}`);
        
        if (jewelResponse.ok) {
            const jewelData = await jewelResponse.json();
            console.log('✅ abyss_jewels.json loaded successfully');
            console.log('📊 Jewel entries:', Object.keys(jewelData).length);
            console.log('📝 Sample keys:', Object.keys(jewelData).slice(0, 3));
        } else {
            console.error('❌ Failed to load abyss_jewels.json');
            return false;
        }
        
        // Test abyss_jewel_mods.json
        console.log('🌐 Testing abyss_jewel_mods.json...');
        const modsResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`);
        console.log(`Response status: ${modsResponse.status} ${modsResponse.statusText}`);
        
        if (modsResponse.ok) {
            const modsData = await modsResponse.json();
            console.log('✅ abyss_jewel_mods.json loaded successfully');
            
            if (modsData['Abyss Jewels']) {
                const tagCombos = Object.keys(modsData['Abyss Jewels']);
                console.log('📊 Tag combinations found:', tagCombos.length);
                console.log('📝 Tag combinations:', tagCombos);
                
                // Test specific tag combinations we expect
                const expectedTags = [
                    'not_for_sale,abyss_jewel_melee,abyss_jewel,default',
                    'not_for_sale,abyss_jewel_ranged,abyss_jewel,default',
                    'not_for_sale,abyss_jewel_caster,abyss_jewel,default',
                    'not_for_sale,abyss_jewel_minion,abyss_jewel,default'
                ];
                
                expectedTags.forEach(tag => {
                    if (modsData['Abyss Jewels'][tag]) {
                        const modData = modsData['Abyss Jewels'][tag];
                        const modCategories = Object.keys(modData.mods || {});
                        const totalMods = Object.values(modData.mods || {}).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
                        console.log(`✅ ${tag}: ${totalMods} mods in categories [${modCategories.join(', ')}]`);
                    } else {
                        console.warn(`⚠️ Missing expected tag combination: ${tag}`);
                    }
                });
            } else {
                console.error('❌ Missing "Abyss Jewels" section in mod data');
                return false;
            }
        } else {
            console.error('❌ Failed to load abyss_jewel_mods.json');
            return false;
        }
        
        console.log('🎉 All GitHub data loading tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ GitHub data loading test failed:', error);
        return false;
    }
}

// Test mod processing for a specific tag combination
async function testModProcessing(tagCombo = 'not_for_sale,abyss_jewel_melee,abyss_jewel,default') {
    console.log(`🔄 Testing mod processing for: ${tagCombo}`);
    
    const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/';
    
    try {
        const modsResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`);
        const modsData = await modsResponse.json();
        
        const jewelData = modsData['Abyss Jewels'][tagCombo];
        if (!jewelData) {
            console.error(`❌ No data found for tag combination: ${tagCombo}`);
            return;
        }
        
        console.log('✅ Found jewel data with mod categories:', Object.keys(jewelData.mods || {}));
        
        // Process and count mods
        let totalMods = 0;
        Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
            const modCount = Object.keys(categoryMods).length;
            totalMods += modCount;
            console.log(`📋 ${category}: ${modCount} mod groups`);
            
            // Show sample mods from this category
            const sampleMods = Object.keys(categoryMods).slice(0, 3);
            console.log(`   Sample mods: ${sampleMods.join(', ')}`);
        });
        
        console.log(`📊 Total processed mods: ${totalMods}`);
        return totalMods;
        
    } catch (error) {
        console.error('❌ Mod processing test failed:', error);
    }
}

// Test fuzzy search simulation
async function testSearchSimulation(searchTerm = 'life') {
    console.log(`🔍 Testing search simulation for: "${searchTerm}"`);
    
    const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/';
    
    try {
        const modsResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`);
        const modsData = await modsResponse.json();
        
        const tagCombo = 'not_for_sale,abyss_jewel_melee,abyss_jewel,default';
        const jewelData = modsData['Abyss Jewels'][tagCombo];
        
        if (!jewelData) {
            console.error('❌ No data found for test');
            return;
        }
        
        // Simple search simulation
        const matches = [];
        const searchLower = searchTerm.toLowerCase();
        
        Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
            Object.keys(categoryMods).forEach(modKey => {
                const modName = modKey.replace(/([A-Z])/g, ' $1').trim();
                if (modName.toLowerCase().includes(searchLower)) {
                    matches.push({
                        name: modName,
                        category: category,
                        key: modKey
                    });
                }
            });
        });
        
        console.log(`✅ Found ${matches.length} matches for "${searchTerm}":`);
        matches.forEach(match => {
            console.log(`   - ${match.name} [${match.category}]`);
        });
        
        return matches;
        
    } catch (error) {
        console.error('❌ Search simulation failed:', error);
    }
}

// Run complete test suite
async function runCompleteGitHubTest() {
    console.log('🚀 Running complete GitHub data test suite...\n');
    
    const results = {
        dataLoading: false,
        modProcessing: 0,
        searchResults: 0
    };
    
    try {
        // Test 1: Data loading
        results.dataLoading = await testGitHubDataLoading();
        console.log('\n' + '='.repeat(50) + '\n');
        
        if (results.dataLoading) {
            // Test 2: Mod processing
            results.modProcessing = await testModProcessing();
            console.log('\n' + '='.repeat(50) + '\n');
            
            // Test 3: Search simulation
            const searchResults = await testSearchSimulation('life');
            results.searchResults = searchResults ? searchResults.length : 0;
            console.log('\n' + '='.repeat(50) + '\n');
            
            // Test different search terms
            const testTerms = ['mana', 'resistance', 'damage', 'speed'];
            for (const term of testTerms) {
                console.log(`\n🔍 Testing search for "${term}":`);
                const termResults = await testSearchSimulation(term);
                console.log(`   Results: ${termResults ? termResults.length : 0} matches`);
            }
        }
        
        console.log('\n' + '🎯 TEST SUMMARY:');
        console.log(`✅ Data loading: ${results.dataLoading ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Mod processing: ${results.modProcessing} mods found`);
        console.log(`✅ Search simulation: ${results.searchResults} matches for 'life'`);
        
        if (results.dataLoading && results.modProcessing > 0) {
            console.log('\n🎉 GitHub data integration ready!');
            console.log('💡 Your extension should now work with real data from GitHub.');
        } else {
            console.log('\n❌ Some tests failed. Check your GitHub repository structure.');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

// Usage instructions
console.log(`
🎯 GitHub Data Loading Test Ready!

Quick test commands:
1. await testGitHubDataLoading() - Test basic data loading
2. await testModProcessing() - Test mod processing
3. await testSearchSimulation('mana') - Test search for specific term
4. await runCompleteGitHubTest() - Run all tests

Run this first to verify your GitHub data is accessible:
await runCompleteGitHubTest()
`);

// Make functions available globally
window.testGitHubDataLoading = testGitHubDataLoading;
window.testModProcessing = testModProcessing;
window.testSearchSimulation = testSearchSimulation;
window.runCompleteGitHubTest = runCompleteGitHubTest;