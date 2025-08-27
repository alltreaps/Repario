#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readCurrentVersion(versionFilePath) {
  try {
    if (fs.existsSync(versionFilePath)) {
      const content = fs.readFileSync(versionFilePath, 'utf8');
      const match = content.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/);
      if (match) {
        return {
          major: parseInt(match[1]),
          minor: parseInt(match[2]),
          patch: parseInt(match[3])
        };
      }
    }
  } catch (error) {
    console.log('Could not read existing version, starting from 1.0.0');
  }
  return { major: 1, minor: 0, patch: 0 };
}

function generateVersion() {
  try {
    const versionFilePath = path.join(__dirname, '../frontend/src/version.ts');
    const currentVersion = readCurrentVersion(versionFilePath);
    
    // Auto-increment patch version for each deployment
    const newVersion = {
      major: currentVersion.major,
      minor: currentVersion.minor,
      patch: currentVersion.patch + 1
    };
    
    // Try to get git commit hash (short)
    let gitHash = '';
    try {
      gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      // If git is not available or not a git repo, use a random string
      gitHash = Math.random().toString(36).substring(2, 8);
    }
    
    // Generate semantic version
    const version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
    
    return {
      version,
      buildTime: new Date().toISOString(),
      gitHash
    };
  } catch (error) {
    console.error('Error generating version:', error);
    // Fallback version
    return {
      version: '1.0.1',
      buildTime: new Date().toISOString(),
      gitHash: 'unknown'
    };
  }
}

function writeVersionFile(outputPath, versionInfo) {
  const versionContent = `// Auto-generated version file - DO NOT EDIT MANUALLY
export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)};

export const getVersion = () => VERSION_INFO.version;
export const getBuildTime = () => VERSION_INFO.buildTime;
export const getGitHash = () => VERSION_INFO.gitHash;
`;

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, versionContent, 'utf8');
  console.log(`✅ Version file generated: ${outputPath}`);
  console.log(`📦 Version: ${versionInfo.version}`);
  console.log(`🕒 Build Time: ${versionInfo.buildTime}`);
  console.log(`🔗 Git Hash: ${versionInfo.gitHash}`);
}

// Main execution
if (require.main === module) {
  const outputPath = process.argv[2] || path.join(__dirname, '../frontend/src/version.ts');
  const versionInfo = generateVersion();
  writeVersionFile(outputPath, versionInfo);
}

module.exports = { generateVersion, writeVersionFile };
