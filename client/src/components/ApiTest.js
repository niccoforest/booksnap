import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import apiService from '../services/api.service';

const ApiTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    try {
      const result = await apiService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test fallito: ' + (error.message || 'Errore sconosciuto')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Test Integrazione API
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testApiConnection}
        disabled={loading}
        sx={{ my: 2 }}
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </Button>
      
      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'}>
          {testResult.message}
        </Alert>
      )}
    </Box>
  );
};

export default ApiTest;