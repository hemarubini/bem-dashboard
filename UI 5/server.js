require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  uploadToS3,
  generateInputId,
  getCurrentDate,
  getCurrentTime,
  checkOutputFiles,
  downloadFromS3,
  listOutputFiles,
  uploadCsvAndJson,
  uploadVariableRepositoryCsv,
  checkVariableRepositoryOutput,
  readVariableRepositoryOutput,
} = require('./services/s3Service');
const { getJobStatus, createInitialJobStatus, isFilesReady } = require('./services/dynamoService');
const { getAllRepositoryNames, getAllVariableRepositories, getVariableRepositoryNames, getRepositoryIdsForVariableRepo } = require('./services/qdrantService');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize DynamoDB client for history table
function buildDynamoCredentials() {
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

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: buildDynamoCredentials(),
});

const ddbDocClient = DynamoDBDocumentClient.from(dynamoClient);

// Middleware
app.use(cors());
app.use(express.json());

// Serve AWS SDK from node_modules (for browser imports)
// This allows the browser to import AWS SDK modules without CDN
// CRITICAL: Handle ES module relative imports by adding .js extension when missing
app.use('/node_modules/@aws-sdk', (req, res, next) => {
  // If request doesn't have .js extension, try adding it
  if (!req.path.endsWith('.js') && !req.path.endsWith('/')) {
    const filePath = path.join(__dirname, 'node_modules/@aws-sdk', req.path + '.js');
    if (fs.existsSync(filePath)) {
      req.url = req.url + '.js';
    }
  }
  next();
}, express.static(path.join(__dirname, 'node_modules/@aws-sdk'), {
  setHeaders: (res, filePath) => {
    // Set proper CORS and content-type headers for ES modules
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

// API routes MUST be defined BEFORE static file serving
// Get AWS credentials endpoint
app.get('/api/aws-credentials', (req, res) => {
  console.log('AWS credentials endpoint called');
  try {
    const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
    const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1';

    console.log('Checking Cognito Identity Pool configuration:', {
      hasIdentityPoolId: !!identityPoolId,
      region: region,
    });

    if (!identityPoolId) {
      console.error('Missing Cognito Identity Pool ID in environment variables');
      return res.status(500).json({
        success: false,
        error: 'AWS credentials not configured in server',
        details: 'Please check your .env file has COGNITO_IDENTITY_POOL_ID',
      });
    }

    console.log('Returning Cognito Identity Pool configuration');
    
    res.json({
      success: true,
      data: {
        region: region,
        identityPoolId: identityPoolId,
      },
    });
  } catch (error) {
    console.error('Error getting AWS credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AWS credentials',
      message: error.message,
    });
  }
});

// Static file serving (must come AFTER API routes)
app.use(express.static('public'));

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Configure multer for CSV uploads
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// Configure multer for Variable Repository CSV uploads
const uploadVariableRepoCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for variable repository
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// Upload endpoint
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get repository_id and client_id from request body
    const { repository_id, client_id } = req.body;

    if (!repository_id || !client_id) {
      return res.status(400).json({ 
        error: 'Repository ID and Client ID are required',
        message: 'Please select a variable repository first'
      });
    }

    // Generate metadata
    const inputId = generateInputId();
    const date = getCurrentDate();
    const time = getCurrentTime();

    // Upload to S3 with repository_id and client_id
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      inputId,
      date,
      time,
      repository_id,
      client_id
    );

    // Create initial DynamoDB record with UPLOADED status
    try {
      await createInitialJobStatus(inputId, date, time);
    } catch (error) {
      console.error('Warning: Failed to create initial DynamoDB record:', error);
      // Continue even if DynamoDB write fails - S3 upload succeeded
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        inputId: result.inputId,
        date: date,
        time: time,
        s3Key: result.s3Key,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message,
    });
  }
});

// Check job status from DynamoDB endpoint
app.get('/api/job-status/:inputId', async (req, res) => {
  try {
    const { inputId } = req.params;
    
    if (!inputId) {
      return res.status(400).json({ 
        success: false,
        error: 'Input ID is required' 
      });
    }

    console.log(`Checking job status for inputId: ${inputId}`);
    const result = await getJobStatus(inputId);
    console.log(`Job status result for ${inputId}:`, result);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Job status check error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to check job status',
      message: error.message,
    });
  }
});

// Check output files endpoint
app.get('/api/check-output/:inputId', async (req, res) => {
  try {
    const { inputId } = req.params;
    
    if (!inputId) {
      return res.status(400).json({ error: 'Input ID is required' });
    }

    const result = await checkOutputFiles(inputId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Check output error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check output files',
      message: error.message,
    });
  }
});

// List versions endpoint (for history page)
app.get('/api/list-versions/:inputId/:rootFileId', async (req, res) => {
  try {
    const { inputId, rootFileId } = req.params;
    
    console.log(`List versions request - Input ID: ${inputId}, Root File ID: ${rootFileId}`);
    
    if (!inputId || !rootFileId) {
      return res.status(400).json({ 
        success: false,
        error: 'Input ID and Root File ID are required' 
      });
    }

    const { listVersions } = require('./services/s3Service');
    const versions = await listVersions(inputId, rootFileId);
    
    res.json({
      success: true,
      data: {
        inputId: inputId,
        rootFileId: rootFileId,
        versions: versions,
      },
    });
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list versions',
      message: error.message,
    });
  }
});

// List files in version endpoint
app.get('/api/list-files/:inputId/:rootFileId/:version/:extension?', async (req, res) => {
  try {
    const { inputId, rootFileId, version, extension } = req.params;
    
    if (!inputId || !rootFileId || !version) {
      return res.status(400).json({ 
        success: false,
        error: 'Input ID, Root File ID, and Version are required' 
      });
    }

    const { listFilesInVersion } = require('./services/s3Service');
    const files = await listFilesInVersion(inputId, rootFileId, version, extension || null);
    
    res.json({
      success: true,
      data: {
        inputId: inputId,
        rootFileId: rootFileId,
        version: version,
        extension: extension || 'all',
        files: files,
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message,
    });
  }
});

// List files endpoint (for history page - backward compatibility)
app.get('/api/list-files/:inputId', async (req, res) => {
  try {
    const { inputId } = req.params;
    const extension = req.query.ext; // This is the "csv" or "json" from the frontend
    
    if (!inputId) {
      return res.status(400).json({ 
        success: false,
        error: 'Input ID is required' 
      });
    }

    const files = await listOutputFiles(inputId, extension || null);
    
    res.json({
      success: true,
      files: files, // Frontend expects files directly, not nested in data
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message,
    });
  }
});

// Save history endpoint
app.post('/api/save-history', async (req, res) => {
  const { inputId, inputName, timestamp } = req.body;

  const params = {
    TableName: "wonderlend-inputDetailStorage",
    Item: {
      inputId: inputId,      // Partition Key
      inputName: inputName,
      timestamp: timestamp,
      userId: "default_user" // You can add user authentication later
    }
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving history to DynamoDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get history endpoint
app.get('/api/get-history', async (req, res) => {
  try {
    const params = {
      TableName: "wonderlend-inputDetailStorage"
    };

    const result = await ddbDocClient.send(new ScanCommand(params));
    
    const history = (result.Items || []).map(item => ({
      inputId: item.inputId,
      inputName: item.inputName,
      timestamp: item.timestamp
    }));

    res.json({
      success: true,
      history: history
    });
  } catch (err) {
    console.error('Error getting history from DynamoDB:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get history',
      message: err.message
    });
  }
});

// Upload CSV endpoint (for history page)
app.post('/api/upload-csv', uploadCsv.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No CSV file uploaded' 
      });
    }

    const rawInputId = req.body.inputId;
    
    if (!rawInputId) {
      return res.status(400).json({ 
        success: false,
        error: 'Input ID is required' 
      });
    }

    // ENSURE .json suffix exactly once
    const inputId = rawInputId.endsWith('.json')
      ? rawInputId
      : `${rawInputId}.json`;

    const { parentVersion } = req.body;

    console.log(`Uploading CSV: ${req.file.originalname} for inputId: ${inputId}, parentVersion: ${parentVersion || 'root'}`);

    // Upload CSV and convert to JSON, then upload both
    const result = await uploadCsvAndJson(
      req.file.buffer,
      req.file.originalname,
      inputId,
      parentVersion || null
    );

    console.log(`Successfully uploaded ${result.csvFileName} and ${result.jsonFileName}`);

    res.json({
      success: true,
      message: 'CSV and JSON files uploaded successfully',
      data: {
        csvFileName: result.csvFileName,
        jsonFileName: result.jsonFileName,
        csvKey: result.csvKey,
        jsonKey: result.jsonKey,
      },
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload CSV file',
      message: error.message,
    });
  }
});

// Download file endpoint (updated to support versioned structure)
// Download endpoint for versioned files (new structure)
app.get('/api/download/:inputId/:rootFileId/:version/:fileName', async (req, res) => {
  try {
    const { inputId, rootFileId, version, fileName } = req.params;
    
    if (!inputId || !rootFileId || !version || !fileName) {
      return res.status(400).json({ error: 'Input ID, Root File ID, Version, and file name are required' });
    }

    // Basic validation to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const s3Key = `output/${inputId}/${rootFileId}/${version}/${fileName}`;
    
    const fileBuffer = await downloadFromS3(s3Key);
    
    // Determine content type based on extension
    const extension = fileName.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream';
    if (extension === 'csv') {
      contentType = 'text/csv';
    } else if (extension === 'json') {
      contentType = 'application/json';
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download error:', error);
    
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message,
    });
  }
});

// Download endpoint for legacy files (old structure)
app.get('/api/download/:inputId/:fileName', async (req, res) => {
  try {
    const { inputId, fileName } = req.params;
    
    if (!inputId || !fileName) {
      return res.status(400).json({ error: 'Input ID and file name are required' });
    }

    // Basic validation to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const s3Key = `output/${inputId}.json/${fileName}`;
    
    const fileBuffer = await downloadFromS3(s3Key);
    
    // Determine content type based on extension
    const extension = fileName.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream';
    if (extension === 'csv') {
      contentType = 'text/csv';
    } else if (extension === 'json') {
      contentType = 'application/json';
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download error (legacy):', error);
    
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint to verify API routes work
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API routes are working' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/history.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/variable-repository.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'variable-repository.html'));
});

// Variable Repository - Upload CSV endpoint
app.post('/api/variable-repo/upload', uploadVariableRepoCsv.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No CSV file uploaded' 
      });
    }

    // Generate unique upload ID
    const uploadId = generateInputId();
    const date = getCurrentDate();
    const time = getCurrentTime();

    console.log(`Uploading Variable Repository CSV: ${req.file.originalname} with uploadId: ${uploadId}`);

    // Upload to S3 with original filename
    const result = await uploadVariableRepositoryCsv(
      req.file.buffer,
      uploadId,
      req.file.originalname
    );

    res.json({
      success: true,
      message: 'CSV file uploaded successfully',
      data: {
        uploadId: uploadId,
        date: date,
        time: time,
        s3Key: result.s3Key,
      },
    });
  } catch (error) {
    console.error('Variable Repository upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload CSV file',
      message: error.message,
    });
  }
});

// Variable Repository - Check output status endpoint (backend polling)
app.get('/api/variable-repo/status/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    if (!uploadId) {
      return res.status(400).json({ 
        success: false,
        error: 'Upload ID is required' 
      });
    }

    // Check if output JSON exists
    const outputExists = await checkVariableRepositoryOutput(uploadId);
    
    if (outputExists) {
      // Read the JSON file
      const outputData = await readVariableRepositoryOutput(uploadId);
      
      return res.json({
        success: true,
        ready: true,
        data: outputData,
      });
    } else {
      return res.json({
        success: true,
        ready: false,
        message: 'Processing...',
      });
    }
  } catch (error) {
    console.error('Variable Repository status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
      message: error.message,
    });
  }
});

// Variable Repository - Get all repository names from Qdrant
app.get('/api/variable-repo/repositories', async (req, res) => {
  try {
    const repositoryNames = await getAllRepositoryNames();
    
    res.json({
      success: true,
      data: {
        repositories: repositoryNames,
        count: repositoryNames.length,
      },
    });
  } catch (error) {
    console.error('Error fetching repository names:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repository names',
      message: error.message,
    });
  }
});

// IMPORTANT: More specific routes must come BEFORE parameterized routes
// Get variable repository names quickly (for fast initial display)
app.get('/api/variable-repositories/names', async (req, res) => {
  try {
    const repositoryNames = await getVariableRepositoryNames();
    
    res.json({
      success: true,
      data: {
        repositories: repositoryNames,
        count: repositoryNames.length,
      },
    });
  } catch (error) {
    console.error('Error fetching variable repository names:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variable repository names',
      message: error.message,
    });
  }
});

// Get all variable repositories with repository_id and client_id (for main page dropdown - kept for backward compatibility)
// This must come AFTER /names but BEFORE /:variableRepo/ids
app.get('/api/variable-repositories', async (req, res) => {
  try {
    const repositories = await getAllVariableRepositories();
    
    res.json({
      success: true,
      data: {
        repositories: repositories,
        count: repositories.length,
      },
    });
  } catch (error) {
    console.error('Error fetching variable repositories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variable repositories',
      message: error.message,
    });
  }
});

// Get repository_id and client_id for a specific variable_repository
// This MUST come AFTER /names and /api/variable-repositories routes
app.get('/api/variable-repositories/:variableRepo/ids', async (req, res) => {
  try {
    const { variableRepo } = req.params;
    
    if (!variableRepo) {
      return res.status(400).json({
        success: false,
        error: 'Variable repository name is required',
      });
    }

    const decodedRepoName = decodeURIComponent(variableRepo);
    const repositoryData = await getRepositoryIdsForVariableRepo(decodedRepoName);
    
    res.json({
      success: true,
      data: repositoryData,
    });
  } catch (error) {
    console.error('Error fetching repository IDs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repository IDs',
      message: error.message,
    });
  }
});

// Validate AWS credentials on startup
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  
  // Check if Cognito Identity Pool ID is loaded
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1';
  
  if (!identityPoolId) {
    console.warn('\n⚠️  WARNING: Cognito Identity Pool ID not found in environment variables.');
    console.warn('   Please ensure you have a .env file with COGNITO_IDENTITY_POOL_ID\n');
  } else {
    console.log('\n✅ Cognito Identity Pool configuration loaded successfully');
    console.log(`   Identity Pool ID: ${identityPoolId.substring(0, 20)}...`);
    console.log(`   Region: ${region}`);
    console.log('');
  }
});

