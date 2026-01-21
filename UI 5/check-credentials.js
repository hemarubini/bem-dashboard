/**
 * Script to verify AWS credentials configuration
 * Run with: node check-credentials.js
 */

require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');

async function checkCredentials() {
  console.log('🔍 Checking AWS Credentials Configuration...\n');

  // Check if Cognito Identity Pool ID exists
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1';

  console.log('Environment Variables:');
  console.log(`  COGNITO_IDENTITY_POOL_ID: ${identityPoolId ? identityPoolId.substring(0, 20) + '...' : '❌ NOT SET'}`);
  console.log(`  AWS_REGION: ${region}\n`);

  if (!identityPoolId) {
    console.error('❌ ERROR: COGNITO_IDENTITY_POOL_ID must be set in .env file');
    console.error('\n📝 Create a .env file in the root directory with:');
    console.error('   COGNITO_IDENTITY_POOL_ID=your_identity_pool_id_here');
    console.error('   AWS_REGION=us-east-1  # Optional, defaults to us-east-1\n');
    process.exit(1);
  }

  // Try to initialize S3 client and test connection
  try {
    const credentials = fromCognitoIdentityPool({
      identityPoolId: identityPoolId.trim(),
      region: region,
    });

    const s3Client = new S3Client({
      region: region,
      credentials: credentials,
    });

    console.log('🔄 Testing AWS S3 connection...\n');

    // Try to list buckets (this will verify credentials)
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    console.log('✅ SUCCESS: AWS credentials are valid!');
    console.log(`   Connected to AWS account successfully`);
    console.log(`   Number of buckets accessible: ${response.Buckets?.length || 0}\n`);

    // Check if target bucket exists
    const targetBucket = 'wonderlend-working-s3-bucket';
    const bucketExists = response.Buckets?.some(b => b.Name === targetBucket);
    
    if (bucketExists) {
      console.log(`✅ Target bucket "${targetBucket}" is accessible\n`);
    } else {
      console.log(`⚠️  Target bucket "${targetBucket}" not found in accessible buckets`);
      console.log(`   Make sure the bucket exists and your credentials have access to it\n`);
    }

  } catch (error) {
    console.error('❌ ERROR: Failed to connect to AWS S3\n');
    
    if (error.name === 'NotAuthorizedException' || error.name === 'ResourceNotFoundException') {
      console.error('   The Cognito Identity Pool ID you provided is invalid or not found.');
      console.error('   Please verify your COGNITO_IDENTITY_POOL_ID is correct.\n');
    } else if (error.name === 'UnauthorizedOperation') {
      console.error('   The Cognito Identity Pool does not have permission to access S3.');
      console.error('   Please check the IAM roles associated with your Identity Pool.\n');
    } else {
      console.error(`   Error: ${error.message}`);
      console.error(`   Error Code: ${error.name}\n`);
    }

    console.error('💡 Troubleshooting Tips:');
    console.error('   1. Verify your COGNITO_IDENTITY_POOL_ID is correct in the .env file');
    console.error('   2. Check for extra spaces or quotes in your .env file');
    console.error('   3. Ensure your Cognito Identity Pool has the correct IAM roles with S3 access permissions');
    console.error('   4. Verify the Identity Pool is in the correct region');
    console.error('   5. Verify the bucket "wonderlend-working-s3-bucket" exists in the specified region\n');
    
    process.exit(1);
  }
}

checkCredentials();

