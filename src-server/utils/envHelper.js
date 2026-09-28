import fs from 'fs'
//import path from 'path'
import { getEnvPath } from './getEnvPath.js'

// ==========================================
// ⚙️ ENVIRONMENT VARIABLE HELPER
// ==========================================
/**
 * Safely reads, updates, and writes variables to the .env file.
 * Also dynamically updates process.env at runtime.
 * * @param {Object} envPayload - Key-value pairs of environment variables to update.
 * @returns {boolean} True if successful, false if an error occurred.
 */
export const updateEnvVariables = envPayload => {
  if (!envPayload || Object.keys(envPayload).length === 0) return true

  // 1. Locate the correct .env file using our smart router
  const envFilePath = getEnvPath()
  let envContent = ''

  // 2. Read the existing .env file if it exists
  try {
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8')
    }
  } catch (error) {
    console.error('❌ [EnvHelper] Error reading .env file:', error.message)
    return false
  }

  // 3. Split the file into an array of lines
  const envLines = envContent.split('\n')

  // 4. Process each key in the incoming payload
  Object.entries(envPayload).forEach(([key, rawValue]) => {
    // A. Update the running Node process immediately (Use raw value, NO quotes!)
    process.env[key] = rawValue

    // B. Prepare value for the .env file
    // (Wrap in quotes ONLY if it contains spaces and isn't already quoted)
    let fileValue = rawValue
    if (typeof fileValue === 'string' && fileValue.includes(' ') && !fileValue.startsWith('"')) {
      fileValue = `"${fileValue}"`
    }

    const newEnvLine = `${key}=${fileValue}`

    // C. Look for the key in the existing lines
    const existingLineIndex = envLines.findIndex(line => line.startsWith(`${key}=`))

    if (existingLineIndex !== -1) {
      // Replace existing line
      envLines[existingLineIndex] = newEnvLine
    } else {
      // Append new line to the end of the array
      envLines.push(newEnvLine)
    }
  })

  // 5. Write the lines back to the .env file
  try {
    // Join the array, trim trailing empty space, and ensure exactly one newline at the end
    const finalContent = envLines.join('\n').trim() + '\n'
    fs.writeFileSync(envFilePath, finalContent)

    return true
  } catch (error) {
    console.error('❌ [EnvHelper] Error writing to .env file:', error.message)
    return false
  }
}
