const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');

// Build credentials provider using Cognito Identity Pool
function buildCredentials() {
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID?.trim();
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1';

  if (!identityPoolId) {
    throw new Error('COGNITO_IDENTITY_POOL_ID is required in .env file');
  }

  return fromCognitoIdentityPool({
    identityPoolId: identityPoolId,
    region: region,
  });
}

// Initialize DynamoDB client
const credentials = buildCredentials();
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: credentials,
});

const TABLE_NAME = 'JobStatusTable';

/**
 * Get job status from DynamoDB
 * @param {string} inputId - Input ID to query
 * @returns {Promise<Object>} Job status object with status and last_updated
 */
async function getJobStatus(inputId) {
  try {
    console.log(`Querying DynamoDB table "${TABLE_NAME}" for input_id: "${inputId}"`);
    
    const command = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        input_id: { S: inputId },
      },
    });

    const response = await dynamoClient.send(command);
    console.log(`DynamoDB response for ${inputId}:`, {
      hasItem: !!response.Item,
      itemKeys: response.Item ? Object.keys(response.Item) : [],
    });

    if (!response.Item) {
      console.log(`No item found in DynamoDB for inputId: ${inputId}`);
      return {
        exists: false,
        status: null,
        lastUpdated: null,
      };
    }

    // Extract status and last_updated from DynamoDB response
    const status = response.Item.status?.S || null;
    const lastUpdated = response.Item.last_updated?.S || response.Item.last_updated?.N || null;

    console.log(`Extracted status for ${inputId}:`, { status, lastUpdated });

    // Check if job is finished
    const terminalStates = ['SUCCEEDED', 'FAILED', 'COMPLETED'];
    const isFinished = terminalStates.includes(status);

    return {
      exists: true,
      status: status,
      lastUpdated: lastUpdated,
      isFinished: isFinished,
    };
  } catch (error) {
    console.error('Error getting job status from DynamoDB:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      tableName: TABLE_NAME,
      inputId: inputId,
    });
    throw error;
  }
}

/**
 * Create initial job status record in DynamoDB after upload
 * @param {string} inputId - Input ID
 * @param {string} date - Upload date
 * @param {string} time - Upload time
 * @returns {Promise<Object>} Result of the operation
 */
async function createInitialJobStatus(inputId, date, time) {
  try {
    const timestamp = new Date().toISOString();
    
    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        input_id: { S: inputId },
        status: { S: 'UPLOADED' },
        last_updated: { S: timestamp },
        upload_date: { S: date },
        upload_time: { S: time },
      },
    });

    await dynamoClient.send(command);
    
    return {
      success: true,
      status: 'UPLOADED',
    };
  } catch (error) {
    console.error('Error creating initial job status:', error);
    throw error;
  }
}

/**
 * Check if job status indicates completion
 * @param {string} status - Job status
 * @returns {boolean} True if job is in terminal state
 */
function isJobFinished(status) {
  const terminalStates = ['SUCCEEDED', 'FAILED', 'COMPLETED'];
  return terminalStates.includes(status);
}

/**
 * Check if status indicates files are ready
 * @param {string} status - Job status
 * @returns {boolean} True if status indicates files are ready
 */
function isFilesReady(status) {
  // Check for various completion status formats
  return status === 'SUCCEEDED' || 
         status === 'COMPLETED' || 
         status.includes('Completed') || 
         status.includes('ready');
}

module.exports = {
  getJobStatus,
  createInitialJobStatus,
  isJobFinished,
  isFilesReady,
};

