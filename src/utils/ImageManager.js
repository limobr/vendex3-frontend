// src/utils/ImageManager.js
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import databaseService from '../database';
import { API_URL } from '../../constants'; // Add this import

class ImageManager {
  constructor() {
    this.cacheDirectory = FileSystem.cacheDirectory + 'profile_pictures/';
    this.initializeCache();
  }

  async initializeCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
        console.log('✅ Created profile pictures cache directory');
      }
    } catch (error) {
      console.error('❌ Error initializing cache directory:', error);
    }
  }

  // Generate a unique filename based on URL
  generateFilename(url, userId) {
    if (!url) return null;
    
    // Extract the filename from URL
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];
    
    // If it's a local file URI, generate a unique name
    if (url.startsWith('file://')) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      return `local_${userId}_${timestamp}_${random}.jpg`;
    }
    
    // For server URLs, use the original filename with user ID prefix
    if (filename && userId) {
      // Remove any existing user ID prefix to avoid duplication
      const cleanFilename = filename.replace(/^\d+_/, '');
      return `${userId}_${cleanFilename}`;
    }
    
    return filename;
  }

  // Check if image needs to be downloaded
  shouldDownloadImage(serverUrl, localPath, userId) {
    if (!serverUrl) return false;
    
    // If no local path exists, download
    if (!localPath) return true;
    
    // If local path is a file:// URI, it's already local
    if (localPath.startsWith('file://')) return false;
    
    // If local path is a server URL but different from current server URL, download
    if (localPath.startsWith('http') && localPath !== serverUrl) return true;
    
    // Extract filenames for comparison
    const serverFilename = this.extractFilename(serverUrl);
    const localFilename = this.extractFilename(localPath);
    
    // If filenames are different, download
    if (serverFilename !== localFilename) return true;
    
    return false;
  }

  extractFilename(path) {
    if (!path) return null;
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  // Download image from server and save locally
  async downloadAndSaveImage(serverUrl, userId) {
    try {
      if (!serverUrl) {
        console.log('⚠️ No server URL provided for image download');
        return null;
      }

      // Convert relative URL to absolute if needed
      let absoluteUrl = serverUrl;
      if (serverUrl.startsWith('/media/')) {
        // If it's a relative media URL, prepend the API URL
        const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
        absoluteUrl = `${baseUrl}${serverUrl}`;
        console.log(`🔗 Converted relative URL to absolute: ${absoluteUrl}`);
      } else if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
        // If it's not a valid URL, return null
        console.error('❌ Invalid server URL:', serverUrl);
        return null;
      }

      // Generate filename
      const filename = this.generateFilename(serverUrl, userId);
      if (!filename) {
        console.error('❌ Could not generate filename for:', serverUrl);
        return null;
      }

      const localPath = `${this.cacheDirectory}${filename}`;
      
      console.log(`📥 Downloading image: ${absoluteUrl}`);
      console.log(`💾 Saving to: ${localPath}`);

      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log(`✅ Image already cached: ${localPath}`);
        return localPath;
      }

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(absoluteUrl, localPath, {
        headers: {
          'Cache-Control': 'max-age=86400',
          'Accept': 'image/*',
        },
        timeout: 10000, // 10 second timeout
      });

      if (downloadResult.status === 200) {
        console.log(`✅ Image downloaded successfully: ${localPath}`);
        
        // Verify the downloaded file
        const downloadedInfo = await FileSystem.getInfoAsync(localPath);
        if (downloadedInfo.exists && downloadedInfo.size > 0) {
          return localPath;
        } else {
          console.error('❌ Downloaded file is empty or does not exist');
          await FileSystem.deleteAsync(localPath, { idempotent: true });
          return null;
        }
      } else {
        console.error(`❌ Download failed with status: ${downloadResult.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      return null;
    }
  }

  // Get image URI for display (prioritizes local file)
  async getImageUri(serverUrl, localPath, userId) {
    try {
      console.log(`🔍 Getting image for user ${userId}: server=${serverUrl}, local=${localPath}`);
      
      // If we have a local file path and it exists, use it
      if (localPath && (localPath.startsWith('file://') || localPath.startsWith(FileSystem.cacheDirectory))) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists && fileInfo.size > 0) {
          console.log(`✅ Using cached image: ${localPath}`);
          return localPath;
        } else {
          console.log(`⚠️ Local image doesn't exist: ${localPath}`);
        }
      }

      // If we have a server URL, try to download it
      if (serverUrl) {
        console.log(`⬇️ Need to download image for user ${userId} from: ${serverUrl}`);
        const newLocalPath = await this.downloadAndSaveImage(serverUrl, userId);
        if (newLocalPath) {
          // Update database with new local path
          const db = await databaseService.openDatabase();
          await db.runAsync(
            'UPDATE user_profiles SET local_profile_picture = ? WHERE user_id = ?',
            [newLocalPath, userId]
          );
          return newLocalPath;
        }
      }

      // Fallback to server URL if we have one
      if (serverUrl) {
        console.log(`⚠️ Using server URL as fallback: ${serverUrl}`);
        return serverUrl;
      }

      // No image available
      console.log(`ℹ️ No profile image available for user ${userId}`);
      return null;
    } catch (error) {
      console.error('❌ Error getting image URI:', error);
      return serverUrl || localPath || null;
    }
  }

  // Clean up old cached images for a user
  async cleanupOldImages(userId, keepFilename) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      
      for (const file of files) {
        // Delete old images for this user except the one we want to keep
        if (file.startsWith(`${userId}_`) && file !== keepFilename) {
          const filePath = `${this.cacheDirectory}${file}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`🗑️ Deleted old cached image: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up old images:', error);
    }
  }

  // Delete all cached images
  async clearCache() {
    try {
      await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
      await this.initializeCache();
      console.log('🗑️ Cleared image cache');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  // Check and download missing images for all profiles
  async checkAndDownloadMissingImages() {
    try {
      console.log('🔍 Checking for missing profile pictures...');
      
      const db = await databaseService.openDatabase();
      const profiles = await db.getAllAsync(
        `SELECT up.*, u.id as user_local_id 
        FROM user_profiles up
        INNER JOIN users u ON up.user_id = u.id
        WHERE up.server_profile_picture IS NOT NULL 
        AND (up.local_profile_picture IS NULL OR up.local_profile_picture = '')`
      );
      
      if (profiles.length > 0) {
        console.log(`📥 Found ${profiles.length} profiles without local images`);
        
        for (const profile of profiles) {
          try {
            const localPath = await this.downloadAndSaveImage(
              profile.server_profile_picture,
              profile.user_local_id
            );
            
            if (localPath) {
              // Update database with local path
              await db.runAsync(
                'UPDATE user_profiles SET local_profile_picture = ? WHERE id = ?',
                [localPath, profile.id]
              );
              console.log(`✅ Downloaded missing image for user ${profile.user_local_id}`);
            }
          } catch (error) {
            console.error(`❌ Error downloading image for user ${profile.user_local_id}:`, error);
          }
        }
      } else {
        console.log('✅ All profile images are already downloaded');
      }
    } catch (error) {
      console.error('❌ Error checking missing images:', error);
    }
  }
}

// Create singleton instance
const imageManager = new ImageManager();
export default imageManager;