const MinimalFooter = () => {
  return (
    <footer className="py-8 px-4 bg-gray-900 text-white">
      <div className="container mx-auto max-w-6xl text-center">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/AXP_logo_upper_left.png" 
            alt="AXP" 
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Start Executing
        </p>
        <div className="text-gray-500 text-xs space-y-2">
          <p>&copy; 2025 AXP Platform. All rights reserved.</p>
          <p>All trademarks are property of their respective owners.</p>
        </div>
      </div>
    </footer>
  );
};

export default MinimalFooter;