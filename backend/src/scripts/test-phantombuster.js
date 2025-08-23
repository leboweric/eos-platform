import dotenv from 'dotenv';
import PhantomBusterService from '../services/phantomBusterService.js';

dotenv.config();

async function testPhantomBuster() {
  console.log('🚀 Testing PhantomBuster API integration...\n');
  
  const phantomBuster = new PhantomBusterService();
  
  try {
    // List all phantoms
    console.log('📋 Listing all phantoms...');
    const phantoms = await phantomBuster.listPhantoms();
    
    if (phantoms && phantoms.length > 0) {
      console.log(`Found ${phantoms.length} phantoms:\n`);
      
      phantoms.forEach((phantom, index) => {
        console.log(`${index + 1}. ${phantom.name}`);
        console.log(`   ID: ${phantom.id}`);
        console.log(`   Script: ${phantom.script || 'N/A'}`);
        console.log(`   Last run: ${phantom.lastEndedAt || 'Never'}`);
        console.log(`   Output count: ${phantom.outputCount || 0}`);
        console.log(`   Container ID: ${phantom.containerId || 'N/A'}`);
        console.log('');
      });
      
      // Try specific phantom ID from the user (7057234367166084)
      const specificPhantomId = '7057234367166084';
      console.log(`\n🔍 Looking for phantom with ID: ${specificPhantomId}`);
      
      // Also check if it's in the container ID or other fields
      const specificPhantom = phantoms.find(p => 
        p.id === specificPhantomId || 
        p.id === parseInt(specificPhantomId) ||
        p.containerId === specificPhantomId ||
        (p.argument && p.argument.includes && p.argument.includes(specificPhantomId))
      );
      
      if (specificPhantom) {
        console.log(`✅ Found matching phantom: ${specificPhantom.name} (ID: ${specificPhantom.id})`);
      } else {
        console.log(`⚠️ No phantom found with ID ${specificPhantomId}`);
        console.log('This might be a container ID or URL ID, not an agent ID');
      }
      
      // Try to fetch results from the first phantom with output
      const phantomWithOutput = phantoms.find(p => p.outputCount > 0);
      
      if (phantomWithOutput) {
        console.log(`\n📥 Fetching results from "${phantomWithOutput.name}" (ID: ${phantomWithOutput.id})...`);
        const results = await phantomBuster.fetchPhantomResults(phantomWithOutput.id, 10);
        
        console.log(`\nFetched ${results.length} results`);
        
        if (results.length > 0) {
          console.log('\nSample result:');
          console.log(JSON.stringify(results[0], null, 2));
          
          // Process the data
          console.log('\n💾 Processing and saving to database...');
          const importResult = await phantomBuster.processPhantomBusterData(results);
          
          console.log('\n✅ Import complete:');
          console.log(`   Imported: ${importResult.imported} new prospects`);
          console.log(`   Skipped: ${importResult.skipped} existing prospects`);
        }
      } else {
        console.log('\n⚠️ No phantoms have output data to fetch');
      }
    } else {
      console.log('❌ No phantoms found. Check your PHANTOMBUSTER_API_KEY');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    }
    console.error('\nMake sure PHANTOMBUSTER_API_KEY is set in your .env file');
  }
}

// Run the test
testPhantomBuster();