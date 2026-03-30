// src/hooks/useOfflineData.js
import { useDatabase } from '@nozbe/watermelondb/hooks'
import { useEffect, useState } from 'react'
import { Q } from '@nozbe/watermelondb'
import SyncManager from '../database/syncManager'

export const useOfflineData = (user, authToken) => {
  const database = useDatabase()
  const [isLoading, setIsLoading] = useState(true)
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])

  useEffect(() => {
    const initializeData = async () => {
      if (user && authToken) {
        // Check if we need to initialize data
        const existingShops = await database.get('shops').query().fetch()
        
        if (existingShops.length === 0) {
          await SyncManager.initializeUserData(authToken, user.id)
        }
        
        // Start auto-sync
        SyncManager.startAutoSync(authToken)
        
        setIsLoading(false)
      }
    }

    initializeData()

    return () => {
      SyncManager.stopAutoSync()
    }
  }, [user, authToken])

  // Observe shops
  useEffect(() => {
    const subscription = database.get('shops')
      .query(Q.where('is_active', true))
      .observe()
      .subscribe(setShops)

    return () => subscription.unsubscribe()
  }, [database])

  // Observe products
  useEffect(() => {
    const subscription = database.get('products')
      .query(Q.where('is_active', true))
      .observe()
      .subscribe(setProducts)

    return () => subscription.unsubscribe()
  }, [database])

  return {
    isLoading,
    shops,
    products,
    inventory
  }
}