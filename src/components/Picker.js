import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Picker = ({
  label,
  selectedValue,
  onValueChange,
  items = [],
  placeholder = 'Select an option',
  icon,
  iconColor = '#6c757d',
  iconSize = 20,
  error,
  required = false,
  style,
  labelStyle,
  errorStyle,
  containerStyle,
  disabled = false,
  testID,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find(item => item.value === selectedValue);

  const handleSelect = (item) => {
    onValueChange(item.value);
    setModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        {item.icon && (
          <Ionicons
            name={item.icon}
            size={20}
            color={item.color || '#6c757d'}
            style={styles.itemIcon}
          />
        )}
        <Text style={styles.itemText}>{item.label}</Text>
      </View>
      {selectedValue === item.value && (
        <Ionicons name="checkmark" size={20} color="#FF6B00" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {(label || required) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.label, labelStyle]}>
              {label}
            </Text>
          )}
          {required && (
            <Text style={styles.required}> *</Text>
          )}
        </View>
      )}

      {/* Picker Button */}
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          disabled && styles.pickerButtonDisabled,
          style,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        testID={testID}
        activeOpacity={0.7}
      >
        <View style={styles.pickerContent}>
          {icon && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={styles.icon}
            />
          )}
          
          <Text
            style={[
              styles.pickerText,
              !selectedItem && styles.pickerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
        </View>
        
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? '#adb5bd' : '#6c757d'}
        />
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={14} color="#dc3545" />
          <Text style={[styles.errorText, errorStyle]}>
            {error}
          </Text>
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select an option'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-outline" size={24} color="#212529" />
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="list-outline" size={48} color="#adb5bd" />
                  <Text style={styles.emptyText}>No options available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  required: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc3545',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    minHeight: 48,
  },
  pickerButtonError: {
    borderColor: '#dc3545',
    backgroundColor: '#FFF5F5',
  },
  pickerButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#ced4da',
    opacity: 0.6,
  },
  pickerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
  },
  pickerPlaceholder: {
    color: '#adb5bd',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginLeft: 4,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#212529',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
  },
});

// Export with pre-defined item creators for common use cases
Picker.Item = (label, value, icon, color) => ({
  label,
  value,
  icon,
  color,
});

export default Picker;