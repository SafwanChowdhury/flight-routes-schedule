import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface Config {
  api: {
    baseUrl: string;
    timeout: number;
  };
  server: {
    port: number;
    env: string;
  };
}

const config: Config = {
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://flight-api.thesocialbutterflies.co',
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
};

export default config;