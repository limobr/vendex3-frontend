// src/screens/shared/MessagesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { messageAPI, employeeAPI } from '../../services/api';
import tokenService from '../../services/tokenService';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';

export default function MessagesScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { currentBusiness } = useBusiness();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [folder, setFolder] = useState('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Compose state
  const [composeRecipientId, setComposeRecipientId] = useState(null);
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const checkToken = useCallback(async () => {
    const token = await tokenService.getAccessToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return false;
    }
    return true;
  }, []);

  const fetchMessages = useCallback(async (refresh = false) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return;

      if (refresh) setRefreshing(true);
      const res = await messageAPI.getMessages({ folder, page: 1, page_size: 50 });
      if (res.success) {
        setMessages(res.messages);
        setUnread(res.unread);
        setAuthError(false);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      if (e.message === 'No refresh token' || e.response?.status === 401) {
        setAuthError(true);
        Alert.alert('Session Expired', 'Please log in again to view messages.', [
          { text: 'Login', onPress: () => logout() }
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folder, checkToken, logout]);

  useEffect(() => {
    checkToken().then(hasToken => {
      if (hasToken) fetchMessages();
    });
  }, [fetchMessages, checkToken]);

  // Load employees for recipient picker
  useEffect(() => {
    if (showEmployeePicker && currentBusiness) {
      loadEmployees();
    }
  }, [showEmployeePicker, currentBusiness]);

  const loadEmployees = async () => {
    if (!currentBusiness) return;
    setLoadingEmployees(true);
    try {
      const res = await employeeAPI.getEmployeesByBusiness(currentBusiness.id);
      if (res && Array.isArray(res)) {
        setEmployees(res.filter(emp => emp.user_id !== user?.id));
      }
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await messageAPI.markRead(id);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Mark read error:', e);
    }
  };

  const handleSend = async () => {
    if (!composeRecipientId || !composeText.trim()) {
      Alert.alert('Error', 'Please select a recipient and type a message.');
      return;
    }
    if (!currentBusiness) {
      Alert.alert('Error', 'No business selected. Cannot send message.');
      return;
    }
    setSending(true);
    try {
      const res = await messageAPI.sendMessage({
        recipient_id: composeRecipientId,
        business_id: currentBusiness.id,
        message: composeText.trim(),
      });
      if (res.success) {
        setShowCompose(false);
        setComposeText('');
        setComposeRecipientId(null);
        setComposeRecipientName('');
        fetchMessages(true);
        Alert.alert('Sent', 'Your message has been sent.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }) => {
    const isInbox = folder === 'inbox';
    const otherName = isInbox ? item.sender_name : item.recipient_name;
    const initials = otherName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, isInbox && !item.is_read && styles.cardUnread]}
        onPress={() => isInbox && !item.is_read && handleMarkRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardName, isInbox && !item.is_read && styles.cardNameUnread]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.cardBiz}>{item.business_name}</Text>
        </View>
        {isInbox && !item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmployeePicker = () => (
    <Modal visible={showEmployeePicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Recipient</Text>
            <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
              <Ionicons name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>
          {loadingEmployees ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#667eea" />
          ) : employees.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyText}>No other employees found in this business.</Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.employeeItem}
                  onPress={() => {
                    setComposeRecipientId(item.user_id);
                    setComposeRecipientName(`${item.first_name} ${item.last_name}`.trim() || item.email);
                    setShowEmployeePicker(false);
                  }}
                >
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.avatarText}>
                      {(item.first_name?.[0] || item.email?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.employeeEmail}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  if (authError) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Messages" showBackButton />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={56} color="#f56565" />
          <Text style={styles.errorText}>Unable to load messages</Text>
          <Text style={styles.errorSubtext}>Please check your connection or log in again.</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {
              setAuthError(false);
              setLoading(true);
              fetchMessages();
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
        title="Messages"
        showBackButton
        extraButtons={[{ icon: 'create-outline', onPress: () => setShowCompose(true) }]}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, folder === 'inbox' && styles.tabActive]}
          onPress={() => setFolder('inbox')}
        >
          <Text style={[styles.tabText, folder === 'inbox' && styles.tabTextActive]}>
            Inbox {unread > 0 ? `(${unread})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, folder === 'sent' && styles.tabActive]}
          onPress={() => setFolder('sent')}
        >
          <Text style={[styles.tabText, folder === 'sent' && styles.tabTextActive]}>Sent</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color="#dee2e6" />
          <Text style={styles.emptyText}>No messages in {folder}</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMessages(true)} colors={['#667eea']} />}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.composeSheet}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Ionicons name="close" size={24} color="#495057" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.recipientPicker}
              onPress={() => setShowEmployeePicker(true)}
            >
              <Ionicons name="person-outline" size={20} color="#6c757d" />
              <Text style={styles.recipientText}>
                {composeRecipientName || 'Select recipient'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.composeInput}
              multiline
              placeholder="Type your message..."
              value={composeText}
              onChangeText={setComposeText}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {renderEmployeePicker()}
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
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20,
    backgroundColor: '#e9ecef', marginRight: 8,
  },
  tabActive: { backgroundColor: '#667eea' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6c757d' },
  tabTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4,
    borderRadius: 12, padding: 14,
  },
  cardUnread: { backgroundColor: '#f0f4ff' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#667eea',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '500', color: '#495057', flex: 1, marginRight: 8 },
  cardNameUnread: { fontWeight: '700', color: '#212529' },
  cardTime: { fontSize: 12, color: '#adb5bd' },
  cardMessage: { fontSize: 13, color: '#6c757d', marginTop: 3, lineHeight: 18 },
  cardBiz: { fontSize: 11, color: '#adb5bd', marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#667eea', marginLeft: 8 },
  // Compose
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  composeSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  composeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  composeTitle: { fontSize: 18, fontWeight: '700', color: '#212529' },
  recipientPicker: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  recipientText: { marginLeft: 10, fontSize: 15, color: '#6c757d', flex: 1 },
  composeInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, fontSize: 15,
    color: '#212529', minHeight: 100, marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: '#667eea', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Employee picker modal
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%', marginTop: 'auto',
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#212529' },
  employeeItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  employeeAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#667eea',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600', color: '#212529' },
  employeeEmail: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  emptyPicker: { alignItems: 'center', paddingVertical: 40 },
});