
import React, { useState } from 'react';
import Variant from './components/Variant';
import Parts from './components/Parts';

function App() {
  const [selectedVariant, setSelectedVariant] = useState(null);

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hierarchical Editor</h1>
          <p className="text-gray-600">Manage Variants, Parts, and Captures</p>
        </header>
        
        <main>
          <Variant onVariantSelect={handleVariantSelect} />
          
          <div className="transition-all duration-300 ease-in-out">
            <Parts 
              selectedVariant={selectedVariant} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
