// src/screens/shared/NotificationsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { notificationAPI } from '../../services/api';
import tokenService from '../../services/tokenService';
import { useAuth } from '../../context/AuthContext';

const ICON_MAP = {
  sale: 'cart',
  inventory: 'cube',
  employee: 'people',
  stock_alert: 'warning',
  receipt: 'receipt',
  sync: 'sync',
  role_change: 'shield-checkmark',
  general: 'notifications',
};

const COLOR_MAP = {
  info: '#4299e1',
  success: '#48bb78',
  warning: '#ed8936',
  error: '#f56565',
  system: '#667eea',
};

export default function NotificationsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [authError, setAuthError] = useState(false);

  const checkToken = useCallback(async () => {
    const token = await tokenService.getAccessToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return false;
    }
    return true;
  }, []);

  const fetchNotifications = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      // Skip if not authenticated
      const hasToken = await checkToken();
      if (!hasToken) return;

      if (refresh) setRefreshing(true);
      const res = await notificationAPI.getNotifications({ page: pageNum, page_size: 20 });
      if (res.success) {
        if (pageNum === 1) {
          setNotifications(res.notifications);
        } else {
          setNotifications((prev) => [...prev, ...res.notifications]);
        }
        setUnread(res.unread);
        setHasMore(res.notifications.length === 20);
        setAuthError(false);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      if (e.message === 'No refresh token' || e.response?.status === 401) {
        setAuthError(true);
        Alert.alert('Session Expired', 'Please log in again to view notifications.', [
          { text: 'Login', onPress: () => logout() }
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkToken, logout]);

  useEffect(() => {
    checkToken().then(hasToken => {
      if (hasToken) fetchNotifications(1);
    });
  }, [fetchNotifications, checkToken]);

  const handleRefresh = () => {
    setPage(1);
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchNotifications(next);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Mark read failed:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const renderItem = ({ item }) => {
    const iconName = ICON_MAP[item.category] || 'notifications';
    const color = COLOR_MAP[item.notification_type] || '#667eea';

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={() => handleMarkRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (authError) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Notifications" showBackButton />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color="#f56565" />
          <Text style={styles.errorText}>Unable to load notifications</Text>
          <Text style={styles.errorSubtext}>Please check your connection or log in again.</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {
              setAuthError(false);
              setLoading(true);
              fetchNotifications(1);
            }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Notifications"
        showBackButton
        extraButtons={
          unread > 0
            ? [{ icon: 'checkmark-done', onPress: handleMarkAllRead }]
            : []
        }
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={56} color="#dee2e6" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#667eea']} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#adb5bd', marginTop: 12 },
  errorText: { fontSize: 18, fontWeight: '600', color: '#f56565', marginTop: 16 },
  errorSubtext: { fontSize: 14, color: '#6c757d', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  buttonRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
  retryBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  logoutBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4,
    borderRadius: 12, padding: 14,
    borderLeftWidth: 0,
  },
  cardUnread: { backgroundColor: '#f0f4ff' },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, marginLeft: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#495057', flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '700', color: '#212529' },
  cardTime: { fontSize: 12, color: '#adb5bd' },
  cardMessage: { fontSize: 13, color: '#6c757d', marginTop: 4, lineHeight: 18 },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#667eea', marginLeft: 8,
  },
});