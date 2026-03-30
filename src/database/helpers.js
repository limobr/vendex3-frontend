// src/database/helpers.js
export const checkLocalDataExists = async (userId) => {
  try {
    const businesses = await databaseService.BusinessService.getBusinessesByOwner(userId);
    const shops = businesses.length > 0 
      ? await databaseService.ShopService.getShopsByBusiness(businesses[0].id) 
      : [];
    
    return {
      hasBusinessData: businesses.length > 0,
      businessesCount: businesses.length,
      shopsCount: shops.length,
    };
  } catch (error) {
    console.error('Error checking local data:', error);
    return { hasBusinessData: false, businessesCount: 0, shopsCount: 0 };
  }
};

export const clearLocalBusinessData = async (userId) => {
  try {
    console.log('🧹 Clearing local business data...');
    
    // Get all businesses for user
    const businesses = await databaseService.BusinessService.getBusinessesByOwner(userId);
    
    // Delete each business and its shops
    for (const business of businesses) {
      // Delete shops first
      await databaseService.ShopService.deleteShopByBusiness(business.id);
      // Delete business
      await databaseService.BusinessService.deleteBusiness(business.id);
    }
    
    console.log('✅ Local business data cleared');
    return { success: true };
  } catch (error) {
    console.error('Error clearing local business data:', error);
    return { success: false, error: error.message };
  }
};

export const forceDownloadBusinessData = async (syncManager) => {
  try {
    console.log('📥 Force downloading business data...');
    
    // Clear existing data first
    const currentUser = await databaseService.UserService.getCurrentUser();
    if (currentUser) {
      await clearLocalBusinessData(currentUser.id);
    }
    
    // Download fresh data
    const result = await syncManager.downloadUserBusinessData();
    
    if (result.success) {
      console.log('✅ Business data force download completed');
      return {
        success: true,
        businesses: result.businessesSaved,
        shops: result.shopsSaved,
      };
    } else {
      throw new Error(result.error || 'Download failed');
    }
  } catch (error) {
    console.error('❌ Force download error:', error);
    return { success: false, error: error.message };
  }
};