const { analyzeApplicationForm, analyzeSelectionCriteria } = require('../utils/server-document-analyzer');
const { prisma, saveFundWithDocuments, getAllFunds, fileToBuffer } = require('../lib/database-s3');

// Helper to parse multipart form data
const parseMultipartFormData = (event) => {
  // This is a simplified parser - in production you'd use a library like 'busboy'
  try {
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    // For now, return parsed JSON - this needs proper multipart parsing
    return JSON.parse(body.toString());
  } catch (error) {
    throw new Error('Failed to parse form data');
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    if (event.httpMethod === 'GET') {
      // Get all funds
      const funds = await getAllFunds();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          funds: funds.map(fund => ({
            id: fund.id,
            name: fund.name,
            description: fund.description,
            status: fund.status,
            createdAt: fund.createdAt,
            updatedAt: fund.updatedAt,
            documentsCount: fund._count.documents
          }))
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Create new fund - simplified for Lambda
      const data = parseMultipartFormData(event);
      
      if (!data.name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Fund name is required' })
        };
      }

      // For Lambda deployment, we'll need proper file handling
      // This is a simplified version
      const fund = await prisma.fund.create({
        data: {
          name: data.name,
          description: data.description || undefined
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          fund: {
            id: fund.id,
            name: fund.name,
            description: fund.description,
            status: fund.status,
            createdAt: fund.createdAt
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};