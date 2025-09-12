'use client';

import { useState } from 'react';

export default function TestFundCreation() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBasicFund = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const formData = new FormData();
      formData.append('name', 'Test Fund');
      formData.append('description', 'Testing basic fund creation');

      const response = await fetch('/api/funds-direct-simple', {
        method: 'POST',
        body: formData,
      });

      const data = await response.text(); // Get as text first to see what we actually receive
      
      setResult(`Status: ${response.status}\nResponse: ${data}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testWithSingleFile = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Create a simple test file
      const testFile = new File(['Test document content'], 'test.txt', { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('name', 'Test Fund With File');
      formData.append('applicationForm', testFile);

      const response = await fetch('/api/funds-direct-sequential', {
        method: 'POST',
        body: formData,
      });

      const data = await response.text();
      
      setResult(`Status: ${response.status}\nResponse: ${data}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fund Creation Debug Test</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={testBasicFund}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Basic Fund (No Files)'}
        </button>
        
        <button
          onClick={testWithSingleFile}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test With Single File'}
        </button>
      </div>
      
      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
}