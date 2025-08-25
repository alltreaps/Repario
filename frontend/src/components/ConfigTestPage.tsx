import { useState, useEffect } from 'react';
import { configService } from '../utils/config';

export default function ConfigTestPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const appConfig = await configService.getConfig();
        setConfig(appConfig);
      } catch (err) {
        setError('Failed to load configuration');
        console.error('Config error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (loading) {
    return <div className="p-8">Loading configuration...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🔒 Secure Configuration Test</h1>
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        ✅ Configuration loaded successfully from backend!
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Configuration Details:</h2>
        <pre className="text-sm">{JSON.stringify(config, null, 2)}</pre>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>🛡️ <strong>Security Note:</strong> The API URL is now fetched securely from the backend's <code>/config</code> endpoint.</p>
        <p>🚫 No sensitive URLs are exposed in the frontend environment variables.</p>
        <p>✨ The configuration is dynamically loaded at runtime, not build time.</p>
      </div>
    </div>
  );
}
