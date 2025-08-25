interface AppConfig {
  apiUrl: string;
  environment: string;
  version: string;
}

class ConfigService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  async getConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    return this.configPromise;
  }

  private async fetchConfig(): Promise<AppConfig> {
    try {
      // Try different potential backend URLs for flexibility
      const possibleUrls = [
        'http://localhost:3001/config',
        'http://localhost:3000/config',
        // Add production URL when available
        // 'https://your-production-api.com/config'
      ];

      let lastError: Error | null = null;

      for (const url of possibleUrls) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            this.config = await response.json();
            return this.config!;
          }
        } catch (error) {
          lastError = error as Error;
          continue; // Try next URL
        }
      }

      throw lastError || new Error('Failed to fetch configuration from any backend URL');
    } catch (error) {
      console.error('Failed to fetch app configuration:', error);
      
      // Fallback configuration for development
      this.config = {
        apiUrl: 'http://localhost:3001',
        environment: 'development',
        version: '1.0.0'
      };
      
      return this.config;
    }
  }

  getApiUrl(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call getConfig() first.');
    }
    return this.config.apiUrl;
  }

  isProduction(): boolean {
    return this.config?.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config?.environment === 'development';
  }
}

export const configService = new ConfigService();
export default configService;
