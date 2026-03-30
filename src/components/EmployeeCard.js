import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ROLE_COLORS = {
  owner: '#FF6B00',
  manager: '#2196F3',
  cashier: '#4CAF50',
  attendant: '#9C27B0',
  stock_keeper: '#FF9800',
};

const EmployeeCard = ({ employee, onPress, onDelete }) => {
  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleColor = (roleType) => {
    return ROLE_COLORS[roleType] || '#6c757d';
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {employee.profile_picture ? (
          <View style={[styles.avatar, { backgroundColor: getRoleColor(employee.role_type) }]}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: getRoleColor(employee.role_type) }]}>
            <Text style={styles.avatarText}>
              {getInitials(employee.first_name, employee.last_name)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>
          {employee.first_name} {employee.last_name}
        </Text>
        <Text style={styles.username}>@{employee.username}</Text>
        
        <View style={styles.roleContainer}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(employee.role_type) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(employee.role_type) }]}>
              {employee.role_name || employee.role_type}
            </Text>
          </View>
          
          {employee.is_current && (
            <View style={styles.currentBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.currentText}>Current</Text>
            </View>
          )}
        </View>
      </View>

      {onDelete && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#dc3545" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  username: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 10,
    color: '#155724',
    fontWeight: '600',
    marginLeft: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default EmployeeCard;