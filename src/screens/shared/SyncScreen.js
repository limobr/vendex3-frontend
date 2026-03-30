import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';

export default function SyncScreen({ navigation }) {
  const { 
    manualSync, 
    refreshFromServer, 
    clearSyncQueue, 
    getSyncStats,
    updateSyncSettings,
    syncStatus,
    hasPendingChanges,
    isInitialized,
  } = useSync();
  
  const { isOnline } = useAuth();
  const [stats, setStats] = useState(null);
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    wifiOnly: false,
    syncOnBackground: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsData = await getSyncStats();
      setStats(statsData);
      
      // Load saved settings
      if (statsData) {
        setSyncSettings({
          autoSync: statsData.autoSyncEnabled,
          wifiOnly: statsData.wifiOnly,
          syncOnBackground: true,
        });
      }
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to sync with the server.');
      return;
    }

    Alert.alert(
      'Sync Now',
      'Are you sure you want to sync all pending changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          style: 'default',
          onPress: async () => {
            const result = await manualSync();
            
            if (result.success) {
              Alert.alert(
                'Sync Complete',
                `Successfully synced ${result.synced || 0} items.`,
                [{ text: 'OK' }]
              );
              await loadData();
            } else if (result.error) {
              Alert.alert('Sync Failed', result.error);
            }
          },
        },
      ]
    );
  };

  const handleRefreshFromServer = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to refresh from server.');
      return;
    }

    Alert.alert(
      'Refresh from Server',
      'This will overwrite local changes with server data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          style: 'destructive',
          onPress: async () => {
            const result = await refreshFromServer();
            
            if (result.success) {
              Alert.alert('Success', 'Data refreshed from server.');
              await loadData();
            } else {
              Alert.alert('Error', result.error || 'Failed to refresh from server.');
            }
          },
        },
      ]
    );
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Sync Queue',
      'Are you sure you want to clear all pending sync changes? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const result = await clearSyncQueue();
            if (result.success) {
              Alert.alert('Success', 'Sync queue cleared.');
              await loadData();
            } else {
              Alert.alert('Error', result.error || 'Failed to clear queue.');
            }
          },
        },
      ]
    );
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...syncSettings, [key]: value };
    setSyncSettings(newSettings);
    
    const result = await updateSyncSettings({ [key]: value });
    if (!result.success) {
      // Revert on error
      setSyncSettings({ ...syncSettings, [key]: !value });
      Alert.alert('Error', result.error || 'Failed to update setting');
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading sync data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="cloud-upload" size={60} color="#FF6B00" />
        <Text style={styles.title}>Data Sync</Text>
        <Text style={styles.subtitle}>
          {!isInitialized ? 'Initializing...' : 
           !isOnline ? 'Offline - changes saved locally' :
           'Manage how your data syncs between device and server'}
        </Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Status</Text>
        
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Ionicons name="wifi" size={24} color={isOnline ? "#4CAF50" : "#f44336"} />
            <Text style={styles.statusItemLabel}>Network</Text>
            <Text style={[styles.statusItemValue, isOnline ? styles.onlineText : styles.offlineText]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
            <Text style={styles.statusItemLabel}>Last Sync</Text>
            <Text style={styles.statusItemValue}>
              {formatTime(stats?.lastSync)}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons name="sync-outline" size={24} color="#2196F3" />
            <Text style={styles.statusItemLabel}>Pending</Text>
            <Text style={[styles.statusItemValue, styles.pendingText]}>
              {stats?.pendingChanges || 0}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Ionicons name={syncStatus.isSyncing ? "refresh-circle" : "checkmark-circle"} 
                     size={24} 
                     color={syncStatus.isSyncing ? "#FF9800" : "#4CAF50"} />
            <Text style={styles.statusItemLabel}>Status</Text>
            <Text style={styles.statusItemValue}>
              {syncStatus.isSyncing ? 'Syncing...' : 'Ready'}
            </Text>
          </View>
        </View>
      </View>

      {/* Detailed Stats */}
      {stats && stats.pendingChanges > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Changes</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User Profiles:</Text>
            <Text style={styles.detailValue}>{stats.usersPending || 0}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shops:</Text>
            <Text style={styles.detailValue}>{stats.shopsPending || 0}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Employees:</Text>
            <Text style={styles.detailValue}>{stats.employeesPending || 0}</Text>
          </View>
          
          {stats.queuePending > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Queue Items:</Text>
              <Text style={styles.detailValue}>{stats.queuePending || 0}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, (!isOnline || syncStatus.isSyncing) && styles.actionButtonDisabled]}
          onPress={handleManualSync}
          disabled={!isOnline || syncStatus.isSyncing}
        >
          {syncStatus.isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="sync-outline" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton, !isOnline && styles.actionButtonDisabled]}
          onPress={handleRefreshFromServer}
          disabled={!isOnline}
        >
          <Ionicons name="refresh-outline" size={20} color="#FF6B00" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Refresh from Server
          </Text>
        </TouchableOpacity>

        {hasPendingChanges && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]}
            onPress={handleClearQueue}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              Clear Sync Queue ({stats?.pendingChanges})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="timer-outline" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Auto Sync</Text>
              <Text style={styles.settingSubtitle}>
                Automatically sync when online (every 5 minutes)
              </Text>
            </View>
          </View>
          <Switch
            value={syncSettings.autoSync}
            onValueChange={(value) => handleSettingChange('autoSync', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFCCBC' }}
            thumbColor={syncSettings.autoSync ? '#FF6B00' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="wifi-outline" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Wi-Fi Only</Text>
              <Text style={styles.settingSubtitle}>
                Sync only when connected to Wi-Fi
              </Text>
            </View>
          </View>
          <Switch
            value={syncSettings.wifiOnly}
            onValueChange={(value) => handleSettingChange('wifiOnly', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFCCBC' }}
            thumbColor={syncSettings.wifiOnly ? '#FF6B00' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="phone-portrait-outline" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Background Sync</Text>
              <Text style={styles.settingSubtitle}>
                Sync in background (when app is not active)
              </Text>
            </View>
          </View>
          <Switch
            value={syncSettings.syncOnBackground}
            onValueChange={(value) => handleSettingChange('syncOnBackground', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFCCBC' }}
            thumbColor={syncSettings.syncOnBackground ? '#FF6B00' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.card, styles.infoCard]}>
        <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
        <Text style={styles.infoTitle}>How Sync Works</Text>
        <Text style={styles.infoText}>
          1. Changes made offline are saved locally{'\n'}
          2. When you're back online, sync happens automatically{'\n'}
          3. Data is encrypted during transfer{'\n'}
          4. Conflicts are resolved with server data taking priority{'\n'}
          5. You can work completely offline
        </Text>
      </View>

      {/* Connection Info */}
      <View style={[styles.card, styles.connectionCard]}>
        <Text style={styles.cardTitle}>Connection Info</Text>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionLabel}>Type:</Text>
          <Text style={styles.connectionValue}>{stats?.connectionType || 'Unknown'}</Text>
        </View>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionLabel}>Auto-sync:</Text>
          <Text style={styles.connectionValue}>{syncSettings.autoSync ? 'Enabled' : 'Disabled'}</Text>
        </View>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionLabel}>Wi-Fi only:</Text>
          <Text style={styles.connectionValue}>{syncSettings.wifiOnly ? 'Yes' : 'No'}</Text>
        </View>
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
  },
  loadingText: {
    marginTop: 20,
    color: '#FF6B00',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 10,
  },
  statusItemLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statusItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  onlineText: {
    color: '#4CAF50',
  },
  offlineText: {
    color: '#f44336',
  },
  pendingText: {
    color: '#FF9800',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  secondaryButtonText: {
    color: '#FF6B00',
  },
  warningButton: {
    backgroundColor: '#f44336',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
  },
  connectionCard: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  connectionLabel: {
    fontSize: 16,
    color: '#666',
  },
  connectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});