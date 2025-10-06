import { useCallback, useState } from 'react';
import axios from 'axios';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios(config);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Unexpected error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};
