const { QdrantClient } = require('@qdrant/js-client-rest');

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_ENDPOINT || 'https://6d0b685d-5433-42ee-930e-33280233b1f5.us-east-1-1.aws.cloud.qdrant.io',
  apiKey: process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.Nro76SpmjLw42zBBi-vxbwXZpnxnMX-a1Gat9SXPpew',
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || 'Variable Repository';

/**
 * Get all repository names from Qdrant
 * @returns {Promise<Array>} Array of unique repository names
 */
async function getAllRepositoryNames() {
  try {
    console.log(`Fetching repository names from Qdrant collection: ${COLLECTION_NAME}`);
    
    // Scroll through all points to get repository names
    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 10000, // Adjust based on your data size
      with_payload: true,
      with_vectors: false,
    });

    const repositoryNames = new Set();
    
    if (scrollResult.points && scrollResult.points.length > 0) {
      scrollResult.points.forEach(point => {
        if (point.payload && point.payload.repository_name) {
          repositoryNames.add(point.payload.repository_name);
        }
      });
    }

    const uniqueRepositories = Array.from(repositoryNames).sort();
    console.log(`Found ${uniqueRepositories.length} unique repository names`);
    
    return uniqueRepositories;
  } catch (error) {
    console.error('Error fetching repository names from Qdrant:', error);
    throw error;
  }
}

/**
 * Get all variable repository names quickly (without IDs)
 * Checks both variable_repository and repository_name fields
 * @returns {Promise<Array>} Array of unique variable_repository names
 */
async function getVariableRepositoryNames() {
  try {
    console.log(`Fetching variable repository names from Qdrant collection: ${COLLECTION_NAME}`);
    
    // Scroll through all points to get variable repository names
    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 10000, // Adjust based on your data size
      with_payload: true,
      with_vectors: false,
    });

    const repositoryNames = new Set();
    
    if (scrollResult.points && scrollResult.points.length > 0) {
      scrollResult.points.forEach(point => {
        if (point.payload) {
          // Check for variable_repository first, then fallback to repository_name
          const repoName = point.payload.variable_repository || point.payload.repository_name;
          if (repoName) {
            repositoryNames.add(repoName);
          }
        }
      });
    }

    const uniqueRepositories = Array.from(repositoryNames).sort();
    console.log(`Found ${uniqueRepositories.length} unique variable repository names`);
    
    return uniqueRepositories;
  } catch (error) {
    console.error('Error fetching variable repository names from Qdrant:', error);
    throw error;
  }
}

/**
 * Get repository_id and client_id for a specific variable_repository
 * Checks both variable_repository and repository_name fields
 * @param {string} variableRepo - Variable repository name
 * @returns {Promise<Object>} Object with repository_id and client_id
 */
async function getRepositoryIdsForVariableRepo(variableRepo) {
  try {
    console.log(`Fetching IDs for variable repository: ${variableRepo}`);
    
    // Scroll through all points to find the matching variable_repository
    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 10000,
      with_payload: true,
      with_vectors: false,
    });

    if (scrollResult.points && scrollResult.points.length > 0) {
      for (const point of scrollResult.points) {
        if (point.payload) {
          // Check both variable_repository and repository_name fields
          const repoName = point.payload.variable_repository || point.payload.repository_name;
          
          if (repoName === variableRepo &&
              point.payload.repository_id &&
              point.payload.client_id) {
            return {
              variable_repository: variableRepo,
              repository_id: point.payload.repository_id,
              client_id: point.payload.client_id,
            };
          }
        }
      }
    }

    throw new Error(`Repository IDs not found for: ${variableRepo}`);
  } catch (error) {
    console.error(`Error fetching IDs for variable repository ${variableRepo}:`, error);
    throw error;
  }
}

/**
 * Get all variable repositories with their repository_id and client_id
 * @returns {Promise<Array>} Array of objects with variable_repository, repository_id, and client_id
 */
async function getAllVariableRepositories() {
  try {
    console.log(`Fetching variable repositories from Qdrant collection: ${COLLECTION_NAME}`);
    
    // Scroll through all points to get variable repositories
    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 10000, // Adjust based on your data size
      with_payload: true,
      with_vectors: false,
    });

    const repositoryMap = new Map();
    
    if (scrollResult.points && scrollResult.points.length > 0) {
      scrollResult.points.forEach(point => {
        if (point.payload) {
          // Check both variable_repository and repository_name fields
          const variableRepo = point.payload.variable_repository || point.payload.repository_name;
          const repositoryId = point.payload.repository_id;
          const clientId = point.payload.client_id;
          
          if (variableRepo && repositoryId && clientId) {
            // Use variable_repository as key to avoid duplicates
            // Store the first occurrence or update if needed
            if (!repositoryMap.has(variableRepo)) {
              repositoryMap.set(variableRepo, {
                variable_repository: variableRepo,
                repository_id: repositoryId,
                client_id: clientId,
              });
            }
          }
        }
      });
    }

    const repositories = Array.from(repositoryMap.values()).sort((a, b) => {
      return a.variable_repository.localeCompare(b.variable_repository);
    });
    
    console.log(`Found ${repositories.length} unique variable repositories`);
    
    return repositories;
  } catch (error) {
    console.error('Error fetching variable repositories from Qdrant:', error);
    throw error;
  }
}

module.exports = {
  getAllRepositoryNames,
  getAllVariableRepositories,
  getVariableRepositoryNames,
  getRepositoryIdsForVariableRepo,
};

