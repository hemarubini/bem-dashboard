const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');
const { v4: uuidv4 } = require('uuid');
const csv = require('csvtojson');

// Validate Cognito Identity Pool configuration
function validateCredentials() {
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION;

  if (!identityPoolId) {
    throw new Error(
      'Cognito Identity Pool ID is missing. Please set COGNITO_IDENTITY_POOL_ID in your .env file.'
    );
  }

  if (identityPoolId.trim() === '') {
    throw new Error(
      'Cognito Identity Pool ID is empty. Please check your .env file.'
    );
  }

  return true;
}

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

// Validate credentials on module load
try {
  validateCredentials();
} catch (error) {
  console.error('❌ AWS Credentials Error:', error.message);
  console.error('\n📝 Please create a .env file in the root directory with:');
  console.error('   COGNITO_IDENTITY_POOL_ID=your_identity_pool_id_here');
  console.error('   AWS_REGION=us-east-1  # Optional, defaults to us-east-1\n');
}

// Initialize S3 client
const credentials = buildCredentials();
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: credentials,
});

const BUCKET_NAME = 'wonderlend-working-s3-bucket';
const BUCKET_PREFIX = 'input/';
const OUTPUT_PREFIX = 'output/';

// Variable Repository S3 bucket
const VARIABLE_REPO_BUCKET = 'wonderlend-variable-repository';
const VARIABLE_REPO_INPUT_PREFIX = 'input/';
const VARIABLE_REPO_OUTPUT_PREFIX = 'output/';

/**
 * Upload PDF file to S3 with metadata
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} originalFileName - Original filename
 * @param {string} inputId - Unique input ID
 * @param {string} date - Upload date
 * @param {string} time - Upload time
 * @param {string} repositoryId - Repository ID (optional)
 * @param {string} clientId - Client ID (optional)
 * @returns {Promise<Object>} Upload result
 */
async function uploadToS3(fileBuffer, originalFileName, inputId, date, time, repositoryId = null, clientId = null) {
  const fileExtension = originalFileName.split('.').pop();
  const s3Key = `${BUCKET_PREFIX}${inputId}.${fileExtension}`;

  const metadata = {
    input_id: inputId,
    date: date,
    time: time,
  };

  // Add repository_id and client_id to metadata if provided
  if (repositoryId) {
    metadata.repository_id = repositoryId;
  }
  if (clientId) {
    metadata.client_id = clientId;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
    Metadata: metadata,
  });

  try {
    const response = await s3Client.send(command);
    return {
      success: true,
      inputId: inputId,
      s3Key: s3Key,
      etag: response.ETag,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    
    // Provide more helpful error messages
    if (error.name === 'InvalidAccessKeyId') {
      throw new Error(
        'Invalid AWS Access Key ID. Please verify your AWS_ACCESS_KEY_ID in the .env file is correct.'
      );
    } else if (error.name === 'SignatureDoesNotMatch') {
      throw new Error(
        'Invalid AWS Secret Access Key. Please verify your AWS_SECRET_ACCESS_KEY in the .env file is correct.'
      );
    } else if (error.name === 'InvalidToken') {
      throw new Error(
        'Invalid AWS Session Token. Please verify your AWS_SESSION_TOKEN in the .env file is correct or refresh it if expired.'
      );
    } else if (error.$metadata?.httpStatusCode === 403) {
      throw new Error(
        'Access denied. Please check that your AWS credentials have permission to upload to the S3 bucket.'
      );
    }
    
    throw error;
  }
}

/**
 * Generate unique input ID
 * @returns {string} Unique input ID
 */
function generateInputId() {
  return uuidv4();
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time in HH:MM:SS format
 * @returns {string} Current time
 */
function getCurrentTime() {
  return new Date().toTimeString().split(' ')[0];
}

/**
 * Check if a file exists in S3 using HeadObjectCommand (efficient check)
 * @param {string} s3Key - S3 key of the file to check
 * @returns {Promise<boolean>} True if file exists, false otherwise
 */
async function checkFileExists(s3Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if output files exist for a given input_id
 * @param {string} inputId - Input ID to check
 * @returns {Promise<Object>} Object with status of each file (CSV and JSON)
 */
async function checkOutputFiles(inputId) {
  const outputDvCsvKey = `${OUTPUT_PREFIX}${inputId}.json/output_dv.csv`;
  const outputDvJsonKey = `${OUTPUT_PREFIX}${inputId}.json/output_dv.json`;
  const outputSlabCsvKey = `${OUTPUT_PREFIX}${inputId}.json/output_slab.csv`;
  const outputSlabJsonKey = `${OUTPUT_PREFIX}${inputId}.json/output_slab.json`;

  try {
    const [dvCsvExists, dvJsonExists, slabCsvExists, slabJsonExists] = await Promise.all([
      checkFileExists(outputDvCsvKey),
      checkFileExists(outputDvJsonKey),
      checkFileExists(outputSlabCsvKey),
      checkFileExists(outputSlabJsonKey),
    ]);

    return {
      outputDv: {
        csvExists: dvCsvExists,
        jsonExists: dvJsonExists,
        csvKey: outputDvCsvKey,
        jsonKey: outputDvJsonKey,
        ready: dvCsvExists && dvJsonExists,
      },
      outputSlab: {
        csvExists: slabCsvExists,
        jsonExists: slabJsonExists,
        csvKey: outputSlabCsvKey,
        jsonKey: outputSlabJsonKey,
        ready: slabCsvExists && slabJsonExists,
      },
      allReady: dvCsvExists && dvJsonExists && slabCsvExists && slabJsonExists,
    };
  } catch (error) {
    console.error('Error checking output files:', error);
    throw error;
  }
}

/**
 * Download a file from S3
 * @param {string} s3Key - S3 key of the file to download
 * @returns {Promise<Buffer>} File buffer
 */
async function downloadFromS3(s3Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading from S3:', error);
    throw error;
  }
}

/**
 * List versions for a given input_id and root file type
 * @param {string} inputId - Input ID
 * @param {string} rootFileId - Root file ID (dv or slab)
 * @returns {Promise<Array>} Array of version strings (e.g., ['v1', 'v1-1', 'v1-2', 'v2'])
 */
async function listVersions(inputId, rootFileId) {
  if (!inputId) {
    throw new Error('Input ID is required');
  }

  const prefix = `${OUTPUT_PREFIX}${inputId}/${rootFileId}/`;

  try {
    console.log(`Listing versions in S3 with prefix: ${prefix}`);

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    
    const versions = new Set();

    if (response.CommonPrefixes) {
      response.CommonPrefixes.forEach(commonPrefix => {
        const versionFolder = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
        if (versionFolder.match(/^v\d+(-?\d*)*$/)) {
          versions.add(versionFolder);
        }
      });
    }

    const sortedVersions = Array.from(versions).sort();
    console.log(`Found versions:`, sortedVersions);
    return sortedVersions;
  } catch (error) {
    console.error('Error listing versions:', error);
    throw error;
  }
}

/**
 * List files in a specific version folder
 * @param {string} inputId - Input ID
 * @param {string} rootFileId - Root file ID (dv or slab)
 * @param {string} version - Version folder name (e.g., 'v1', 'v1-1')
 * @param {string} fileExtension - Filter by file extension (e.g., 'csv', 'json')
 * @returns {Promise<Array>} Array of file names
 */
async function listFilesInVersion(inputId, rootFileId, version, fileExtension = null) {
  if (!inputId || !rootFileId || !version) {
    throw new Error('Input ID, root file ID, and version are required');
  }

  const prefix = `${OUTPUT_PREFIX}${inputId}/${rootFileId}/${version}/`;

  try {
    console.log(`Listing files in version: ${prefix}, extension filter: ${fileExtension || 'none'}`);

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    // Extract file names from S3 keys
    let files = response.Contents
      .map(item => {
        const fileName = item.Key.replace(prefix, '');
        return fileName;
      })
      .filter(fileName => {
        return fileName.length > 0 && !fileName.endsWith('/');
      });

    // Filter by extension if specified
    if (fileExtension) {
      const extLower = fileExtension.toLowerCase();
      files = files.filter(fileName => {
        const ext = fileName.split('.').pop().toLowerCase();
        return ext === extLower;
      });
    }

    // For JSON, exclude output.json
    if (fileExtension && fileExtension.toLowerCase() === 'json') {
      files = files.filter(fileName => fileName !== 'output.json');
    }

    return files.sort();
  } catch (error) {
    console.error('Error listing files in version:', error);
    throw error;
  }
}

/**
 * List all files in the output directory for a given input_id (backward compatibility - old structure)
 * @param {string} inputId - Input ID
 * @param {string} fileExtension - Filter by file extension (e.g., 'csv', 'json')
 * @returns {Promise<Array>} Array of file names with version info
 */
async function listOutputFiles(inputId, fileExtension = null) {
  // Check old structure: output/<inputId>.json/
  const oldPrefix = `${OUTPUT_PREFIX}${inputId}.json/`;

  try {
    console.log(`Listing files in old structure: ${oldPrefix}, extension filter: ${fileExtension || 'none'}`);

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: oldPrefix,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    // Extract file information from S3 keys
    let files = response.Contents
      .map(item => {
        const fileKey = item.Key;
        const relativePath = fileKey.replace(oldPrefix, '');
        
        // Skip directories
        if (relativePath.length === 0 || relativePath.endsWith('/')) {
          return null;
        }
        
        const parts = relativePath.split('/');
        const fileName = parts[parts.length - 1];
        
        // Format displayName (handle versioning folders like v1, v2)
        let displayName;
        if (parts.length === 1) {
          displayName = fileName;
        } else {
          const parent = parts[parts.length - 2];
          if (/^v\d+(-\d+)*$/.test(parent)) {
            displayName = `${parent}_${fileName}`;
          } else {
            displayName = fileName;
          }
        }
        
        return {
          key: relativePath,
          name: fileName,
          displayName: displayName
        };
      })
      .filter(file => file !== null);

    // Filter by extension if specified
    if (fileExtension) {
      const extLower = fileExtension.toLowerCase();
      files = files.filter(file => {
        const nameLower = file.name.toLowerCase();
        return nameLower.endsWith(`.${extLower}`);
      });
    }

    // Exclude output.json (system file)
    files = files.filter(file => file.name.toLowerCase() !== 'output.json');

    // Sort by display name
    return files.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (error) {
    console.error('Error listing files in old structure:', error);
    return [];
  }
}

/**
 * Generate incremented filename based on pattern
 * Examples:
 * - "output_dv.csv" -> "output1_dv.csv"
 * - "output1_slab.csv" -> "output12_slab.csv"
 * - "output12_slab.csv" -> "output123_slab.csv"
 * @param {string} originalFileName - Original filename (e.g., "output_dv.csv")
 * @returns {string} Incremented filename
 */
function generateIncrementedFileName(originalFileName) {
  // Extract base name and extension
  const parts = originalFileName.split('.');
  const extension = parts.pop();
  const baseName = parts.join('.');
  
  // Find the pattern: "output" or "output123" etc.
  const match = baseName.match(/^(output)(\d*)(.*)$/);
  
  if (!match) {
    // If pattern doesn't match, assume it's "output" + something
    return `output1_${baseName.replace('output', '')}.${extension}`;
  }
  
  const prefix = match[1]; // "output"
  const existingNumber = match[2]; // "" or "1" or "12" etc.
  const suffix = match[3]; // "_dv" or "_slab" etc.
  
  // Get the next sequential number (length + 1)
  const nextNumber = existingNumber.length + 1;
  
  // Build new filename
  const newFileName = `${prefix}${existingNumber}${nextNumber}${suffix}.${extension}`;
  
  return newFileName;
}

/**
 * Convert CSV buffer to JSON
 * @param {Buffer} csvBuffer - CSV file buffer
 * @returns {Promise<string>} JSON string
 */
async function convertCsvToJson(csvBuffer) {
  try {
    const csvString = csvBuffer.toString('utf-8');
    const jsonArray = await csv().fromString(csvString);
    return JSON.stringify(jsonArray, null, 2);
  } catch (error) {
    console.error('Error converting CSV to JSON:', error);
    throw new Error('Failed to convert CSV to JSON: ' + error.message);
  }
}

/**
 * Get existing child versions for a parent version
 * @param {string} inputId - Input ID
 * @param {string} rootFileId - Root file ID (dv or slab)
 * @param {string} parentVersion - Parent version (e.g., 'v1', 'v2-3')
 * @returns {Promise<Array>} Array of child version strings
 */
async function getChildVersions(inputId, rootFileId, parentVersion) {
  // ENSURE .json suffix exactly once
  const inputRoot = inputId.endsWith('.json')
    ? inputId
    : `${inputId}.json`;
  const prefix = `${OUTPUT_PREFIX}${inputRoot}/${rootFileId}/`;
  
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    const childVersions = [];

    if (response.CommonPrefixes) {
      response.CommonPrefixes.forEach(commonPrefix => {
        const versionFolder = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
        // Match direct children only (e.g., v1-1, v1-2 for parent v1)
        const pattern = new RegExp(`^${parentVersion}-\\d+$`);
        if (pattern.test(versionFolder)) {
          childVersions.push(versionFolder);
        }
      });
    }

    return childVersions.sort();
  } catch (error) {
    console.error('Error getting child versions:', error);
    return [];
  }
}

/**
 * Generate new version name based on parent version
 * @param {string} inputId - Input ID
 * @param {string} rootFileId - Root file ID (dv or slab)
 * @param {string} parentVersion - Parent version (null for root, or 'v1', 'v2-3', etc.)
 * @returns {Promise<string>} New version name
 */
async function generateNewVersion(inputId, rootFileId, parentVersion) {
  // ENSURE .json suffix exactly once
  const inputRoot = inputId.endsWith('.json')
    ? inputId
    : `${inputId}.json`;
    
  if (!parentVersion) {
    // Root version: v1, v2, v3, etc.
    const prefix = `${OUTPUT_PREFIX}${inputRoot}/${rootFileId}/`;
    
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        Delimiter: '/',
      });

      const response = await s3Client.send(command);
      let maxRootIndex = 0;

      if (response.CommonPrefixes) {
        response.CommonPrefixes.forEach(commonPrefix => {
          const versionFolder = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
          const match = versionFolder.match(/^v(\d+)$/);
          if (match) {
            const index = parseInt(match[1], 10);
            if (index > maxRootIndex) {
              maxRootIndex = index;
            }
          }
        });
      }

      return `v${maxRootIndex + 1}`;
    } catch (error) {
      console.error('Error generating root version:', error);
      return 'v1';
    }
  } else {
    // Child version: parentVersion-childIndex
    const childVersions = await getChildVersions(inputId, rootFileId, parentVersion);
    const childCount = childVersions.length + 1;
    return `${parentVersion}-${childCount}`;
  }
}

/**
 * Upload CSV file and its JSON conversion to S3 with versioned folder structure
 * @param {Buffer} csvBuffer - CSV file buffer
 * @param {string} originalFileName - Original CSV filename
 * @param {string} inputId - Input ID
 * @param {string} parentVersion - Parent version (null for root, or 'v1', 'v2-3', etc.)
 * @returns {Promise<Object>} Upload result
 */
async function uploadCsvAndJson(csvBuffer, originalFileName, inputId, parentVersion = null) {
  try {
    // ENSURE .json suffix exactly once
    const inputRoot = inputId.endsWith('.json')
      ? inputId
      : `${inputId}.json`;

    // Determine root file ID from filename (dv or slab)
    const rootFileId = originalFileName.includes('_dv') ? 'dv' : 'slab';
    
    // Generate new version name
    const newVersion = await generateNewVersion(inputRoot, rootFileId, parentVersion);
    
    // Use standard filenames based on root file ID
    let csvFileName = 'output_dv.csv';
    let jsonFileName = 'output_dv.json';
    
    if (rootFileId === 'slab') {
      csvFileName = 'output_slab.csv';
      jsonFileName = 'output_slab.json';
    }
    
    // ALL uploads must use basePath with .json suffix
    const basePath = `${OUTPUT_PREFIX}${inputRoot}/`;
    const s3Prefix = `${basePath}${rootFileId}/${newVersion}/`;
    const csvKey = `${s3Prefix}${csvFileName}`;
    const jsonKey = `${s3Prefix}${jsonFileName}`;
    
    console.log(`Uploading CSV: ${csvKey}`);
    console.log(`Uploading JSON: ${jsonKey}`);
    
    // Convert CSV to JSON
    const jsonContent = await convertCsvToJson(csvBuffer);
    
    // Upload CSV file
    const csvCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: csvKey,
      Body: csvBuffer,
      ContentType: 'text/csv',
    });
    
    // Upload JSON file
    const jsonCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: jsonKey,
      Body: Buffer.from(jsonContent, 'utf-8'),
      ContentType: 'application/json',
    });
    
    // Upload both files in parallel
    const [csvResponse, jsonResponse] = await Promise.all([
      s3Client.send(csvCommand),
      s3Client.send(jsonCommand),
    ]);
    
    return {
      success: true,
      csvFileName: csvFileName,
      jsonFileName: jsonFileName,
      csvKey: csvKey,
      jsonKey: jsonKey,
      version: newVersion,
      csvETag: csvResponse.ETag,
      jsonETag: jsonResponse.ETag,
    };
  } catch (error) {
    console.error('Error uploading CSV and JSON:', error);
    throw error;
  }
}

/**
 * Upload CSV file to Variable Repository S3 bucket
 * @param {Buffer} csvBuffer - CSV file buffer
 * @param {string} uploadId - Unique upload ID
 * @param {string} originalFileName - Original filename from UI
 * @returns {Promise<Object>} Upload result
 */
async function uploadVariableRepositoryCsv(csvBuffer, uploadId, originalFileName) {
  // Use original filename as-is
  const s3Key = `${VARIABLE_REPO_INPUT_PREFIX}${originalFileName}`;

  const command = new PutObjectCommand({
    Bucket: VARIABLE_REPO_BUCKET,
    Key: s3Key,
    Body: csvBuffer,
    ContentType: 'text/csv',
    Metadata: {
      upload_id: uploadId,
    },
  });

  try {
    const response = await s3Client.send(command);
    return {
      success: true,
      uploadId: uploadId,
      s3Key: s3Key,
      fileName: originalFileName,
      etag: response.ETag,
    };
  } catch (error) {
    console.error('Error uploading Variable Repository CSV to S3:', error);
    throw error;
  }
}

/**
 * Check if a file exists in a specific S3 bucket
 * @param {string} s3Key - S3 key
 * @param {string} bucketName - Bucket name
 * @returns {Promise<boolean>} True if file exists
 */
async function checkFileExistsInBucket(s3Key, bucketName) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Check if Variable Repository output JSON exists
 * @param {string} uploadId - Upload ID
 * @returns {Promise<boolean>} True if file exists
 */
async function checkVariableRepositoryOutput(uploadId) {
  const s3Key = `${VARIABLE_REPO_OUTPUT_PREFIX}${uploadId}.json`;
  return await checkFileExistsInBucket(s3Key, VARIABLE_REPO_BUCKET);
}

/**
 * Read Variable Repository output JSON file
 * @param {string} uploadId - Upload ID
 * @returns {Promise<Object>} Parsed JSON content
 */
async function readVariableRepositoryOutput(uploadId) {
  const s3Key = `${VARIABLE_REPO_OUTPUT_PREFIX}${uploadId}.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: VARIABLE_REPO_BUCKET,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    // Convert stream to string
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    const jsonString = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error reading Variable Repository output:', error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  generateInputId,
  getCurrentDate,
  getCurrentTime,
  checkFileExists,
  checkOutputFiles,
  downloadFromS3,
  listOutputFiles,
  uploadCsvAndJson,
  generateIncrementedFileName,
  uploadVariableRepositoryCsv,
  checkVariableRepositoryOutput,
  readVariableRepositoryOutput,
};

