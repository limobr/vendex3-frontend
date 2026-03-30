// src/components/AppHeader.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI, messageAPI } from '../services/api';
import tokenService from '../services/tokenService';

const BADGE_POLL_INTERVAL = 60000; // poll every 60s

export default function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  extraButtons = [],    // additional right-side buttons
  backgroundColor = '#fff',
}) {
  const navigation = useNavigation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = await tokenService.getAccessToken();
    setIsAuthenticated(!!token);
  }, []);

  const fetchBadges = useCallback(async () => {
    // Don't attempt if no token
    if (!isAuthenticated) return;

    try {
      const [notifRes, msgRes] = await Promise.all([
        notificationAPI.getNotifications({ page: 1, page_size: 1 }).catch(() => null),
        messageAPI.getMessages({ folder: 'inbox', page: 1, page_size: 1 }).catch(() => null),
      ]);
      if (notifRes?.unread != null) setUnreadNotifications(notifRes.unread);
      if (msgRes?.unread != null) setUnreadMessages(msgRes.unread);
    } catch (e) {
      // Silently ignore – badges are non-critical
      console.warn('Failed to fetch badges:', e.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBadges();
      const interval = setInterval(fetchBadges, BADGE_POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchBadges]);

  const handleBack = () => {
    if (onBackPress) onBackPress();
    else navigation.goBack();
  };

  const BadgeIcon = ({ name, count, onPress }) => (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name={name} size={24} color="#212529" />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ backgroundColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={styles.container}>
        {/* Left */}
        <View style={styles.left}>
          {showBackButton && (
            <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                size={24}
                color="#212529"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right – Notifications, Messages, then any extras */}
        <View style={styles.right}>
          <BadgeIcon
            name="notifications-outline"
            count={unreadNotifications}
            onPress={() => navigation.navigate('Notifications')}
          />
          <BadgeIcon
            name="chatbubbles-outline"
            count={unreadMessages}
            onPress={() => navigation.navigate('Messages')}
          />
          {extraButtons.map((btn, i) => (
            <TouchableOpacity key={i} style={styles.iconBtn} onPress={btn.onPress}>
              <Ionicons name={btn.icon} size={btn.size || 24} color={btn.color || '#212529'} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 52,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  left: { flexDirection: 'row', alignItems: 'center', minWidth: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  right: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#212529', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6c757d', textAlign: 'center', marginTop: 1 },
  iconBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19,
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: 2, right: 0,
    backgroundColor: '#f56565', borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});