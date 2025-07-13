// Script to compare scorecard data between two pages
// Run debug-scorecard-sync.js on both pages first, then run this script

(function compareScorecardsData() {
  if (!window.__scorecardDebugData) {
    console.error('❌ No debug data found. Run debug-scorecard-sync.js first!');
    return;
  }
  
  const data1 = window.__scorecardDebugData;
  
  // Ask user to paste data from other page
  console.log('📋 Copy the debug data from the other page by running:');
  console.log('copy(JSON.stringify(window.__scorecardDebugData))');
  console.log('\nThen paste it here:');
  
  // Create a function to compare once data is pasted
  window.compareWithOtherPage = function(otherPageDataStr) {
    try {
      const data2 = JSON.parse(otherPageDataStr);
      
      console.log('\n🔄 Comparing Scorecard Data\n');
      console.log('Page 1:', data1.page);
      console.log('Page 2:', data2.page);
      
      // Compare IDs
      console.log('\n🆔 ID Comparison:');
      console.log('Org ID match:', data1.orgId === data2.orgId ? '✅' : '❌');
      console.log('  - Page 1:', data1.orgId);
      console.log('  - Page 2:', data2.orgId);
      console.log('Team ID match:', data1.teamId === data2.teamId ? '✅' : '❌');
      console.log('  - Page 1:', data1.teamId);
      console.log('  - Page 2:', data2.teamId);
      
      // Compare metrics
      console.log('\n📊 Metrics Comparison:');
      console.log('Metrics count match:', data1.metricsCount === data2.metricsCount ? '✅' : '❌');
      console.log('  - Page 1:', data1.metricsCount);
      console.log('  - Page 2:', data2.metricsCount);
      
      // Compare metric IDs
      const metricIds1 = data1.metrics.map(m => m.id).sort();
      const metricIds2 = data2.metrics.map(m => m.id).sort();
      const metricsMatch = JSON.stringify(metricIds1) === JSON.stringify(metricIds2);
      console.log('Metric IDs match:', metricsMatch ? '✅' : '❌');
      
      if (!metricsMatch) {
        console.log('\nMetrics only in Page 1:');
        metricIds1.filter(id => !metricIds2.includes(id)).forEach(id => {
          const metric = data1.metrics.find(m => m.id === id);
          console.log(`  - ${metric.name} (${id})`);
        });
        
        console.log('\nMetrics only in Page 2:');
        metricIds2.filter(id => !metricIds1.includes(id)).forEach(id => {
          const metric = data2.metrics.find(m => m.id === id);
          console.log(`  - ${metric.name} (${id})`);
        });
      }
      
      // Compare scores for each metric
      console.log('\n📈 Score Data Comparison:');
      
      // Get all unique week dates
      const allWeekDates = new Set();
      Object.values(data1.weeklyScores).forEach(scores => {
        Object.keys(scores).forEach(date => allWeekDates.add(date));
      });
      Object.values(data2.weeklyScores).forEach(scores => {
        Object.keys(scores).forEach(date => allWeekDates.add(date));
      });
      
      const sortedWeekDates = Array.from(allWeekDates).sort();
      console.log('Total unique week dates:', sortedWeekDates.length);
      console.log('Last 5 weeks:', sortedWeekDates.slice(-5));
      
      // Compare scores for common metrics
      const commonMetricIds = metricIds1.filter(id => metricIds2.includes(id));
      let differencesFound = false;
      
      commonMetricIds.forEach(metricId => {
        const scores1 = data1.weeklyScores[metricId] || {};
        const scores2 = data2.weeklyScores[metricId] || {};
        const metric = data1.metrics.find(m => m.id === metricId);
        
        sortedWeekDates.slice(-5).forEach(date => {
          const score1 = scores1[date];
          const score2 = scores2[date];
          
          if (score1 !== score2) {
            if (!differencesFound) {
              console.log('\n⚠️  Score Differences Found:');
              differencesFound = true;
            }
            console.log(`  ${metric.name} - ${date}:`);
            console.log(`    - Page 1: ${score1 !== undefined ? score1 : 'No data'}`);
            console.log(`    - Page 2: ${score2 !== undefined ? score2 : 'No data'}`);
          }
        });
      });
      
      if (!differencesFound) {
        console.log('✅ All scores match for the last 5 weeks!');
      }
      
      // Check timing
      console.log('\n⏰ Data Fetch Times:');
      console.log('Page 1:', new Date(data1.timestamp).toLocaleTimeString());
      console.log('Page 2:', new Date(data2.timestamp).toLocaleTimeString());
      
    } catch (error) {
      console.error('❌ Error comparing data:', error);
      console.log('Make sure you copied the JSON data correctly.');
    }
  };
  
  console.log('\nAfter copying the data, run:');
  console.log('compareWithOtherPage(\'<paste data here>\')');
})();