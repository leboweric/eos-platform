// Debug utility to check theme issues
export const debugTheme = () => {
  console.log('=== THEME DEBUG INFO ===');
  
  // Check localStorage
  console.log('📦 localStorage contents:');
  const themeKeys = Object.keys(localStorage).filter(k => 
    k.includes('theme') || k.includes('Theme') || k.includes('organization')
  );
  
  themeKeys.forEach(key => {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value);
      console.log(`  ${key}:`, parsed);
    } catch {
      console.log(`  ${key}:`, value);
    }
  });
  
  // Check issue cards in DOM
  console.log('\n🎯 Issue cards in DOM:');
  const issueCards = document.querySelectorAll('[data-theme-accent]');
  issueCards.forEach((card, index) => {
    const computedStyle = window.getComputedStyle(card);
    console.log(`  Card ${index + 1}:`);
    console.log(`    data-theme-accent: ${card.dataset.themeAccent}`);
    console.log(`    data-theme-primary: ${card.dataset.themePrimary}`);
    console.log(`    data-border-color: ${card.dataset.borderColor}`);
    console.log(`    Actual border color: ${computedStyle.borderColor}`);
    console.log(`    Actual border (all): ${computedStyle.border}`);
  });
  
  // Check for any elements with orange/gold colors
  console.log('\n🔍 Elements with orange/gold colors:');
  const allElements = document.querySelectorAll('*');
  const orangeElements = [];
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const colors = [
      style.borderColor,
      style.backgroundColor,
      style.color
    ];
    
    colors.forEach(color => {
      if (color && (
        color.includes('251, 146') || // Orange RGB
        color.includes('fb92') || // Orange hex
        color.includes('249, 115') || // Orange RGB
        color.includes('f973') || // Orange hex
        color.includes('orange') ||
        color.includes('gold')
      )) {
        orangeElements.push({
          element: el,
          className: el.className,
          borderColor: style.borderColor,
          backgroundColor: style.backgroundColor,
          color: style.color
        });
      }
    });
  });
  
  if (orangeElements.length > 0) {
    console.log('  Found elements with orange/gold colors:', orangeElements);
  } else {
    console.log('  No elements with orange/gold colors found');
  }
  
  console.log('\n💡 To manually test theme change:');
  console.log('  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { primary: "#10B981", secondary: "#059669", accent: "#34D399" }}))');
  
  return {
    localStorage: themeKeys.reduce((acc, key) => {
      acc[key] = localStorage.getItem(key);
      return acc;
    }, {}),
    issueCards: issueCards.length,
    orangeElements: orangeElements.length
  };
};

// Auto-run on page load for debugging
if (typeof window !== 'undefined') {
  window.debugTheme = debugTheme;
  console.log('🔧 Theme debugger loaded. Run debugTheme() in console to check theme issues.');
}