import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InputField = ({
  // Label & Icon
  label,
  icon,
  iconPosition = 'left',
  iconColor = '#6c757d',
  iconSize = 20,

  // Input
  value,
  onChangeText,
  placeholder,
  defaultValue,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoCompleteType = 'off',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  selectTextOnFocus = false,
  
  // Validation & Error
  error,
  required = false,
  validate,
  onValidation,
  
  // Style
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  containerStyle,
  
  // Suffix/Prefix
  prefix,
  suffix,
  
  // Other Props
  onFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType = 'done',
  blurOnSubmit = true,
  inputRef,
  testID,
  
  // Password toggle
  showPasswordToggle = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    
    // Validate on blur
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setLocalError(validationError);
        onValidation && onValidation(false, validationError);
      } else {
        setLocalError(null);
        onValidation && onValidation(true);
      }
    }
    
    onBlur && onBlur(e);
  };

  const handleChangeText = (text) => {
    // Clear error on change
    if (localError || error) {
      setLocalError(null);
      onValidation && onValidation(true);
    }
    
    onChangeText && onChangeText(text);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <View style={[
        styles.iconContainer,
        iconPosition === 'right' && styles.iconRight,
      ]}>
        <Ionicons
          name={icon}
          size={iconSize}
          color={isFocused ? '#FF6B00' : iconColor}
        />
      </View>
    );
  };

  const renderPasswordToggle = () => {
    if (!showPasswordToggle || !secureTextEntry) return null;
    
    return (
      <TouchableOpacity
        style={styles.passwordToggle}
        onPress={togglePasswordVisibility}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#6c757d"
        />
      </TouchableOpacity>
    );
  };

  const hasError = error || localError;
  const displayError = error || localError;

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

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        hasError && styles.inputContainerError,
        !editable && styles.inputContainerDisabled,
        multiline && styles.inputContainerMultiline,
        style,
      ]}>
        {/* Left Icon */}
        {icon && iconPosition === 'left' && renderIcon()}
        
        {/* Prefix */}
        {prefix && (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            icon && iconPosition === 'left' && styles.inputWithLeftIcon,
            icon && iconPosition === 'right' && styles.inputWithRightIcon,
            prefix && styles.inputWithPrefix,
            suffix && styles.inputWithSuffix,
            showPasswordToggle && styles.inputWithPasswordToggle,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            inputStyle,
          ]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor="#adb5bd"
          defaultValue={defaultValue}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={Platform.OS === 'ios' ? autoCompleteType : undefined}
          autoCompleteType={Platform.OS === 'android' ? autoCompleteType : undefined}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          selectTextOnFocus={selectTextOnFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          textAlignVertical={multiline ? 'top' : 'center'}
          testID={testID}
        />

        {/* Right Icon */}
        {icon && iconPosition === 'right' && renderIcon()}
        
        {/* Suffix */}
        {suffix && (
          <View style={styles.suffixContainer}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        )}

        {/* Password Toggle */}
        {renderPasswordToggle()}
      </View>

      {/* Error Message */}
      {displayError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={14} color="#dc3545" />
          <Text style={[styles.errorText, errorStyle]}>
            {displayError}
          </Text>
        </View>
      )}

      {/* Character Counter */}
      {maxLength && (
        <Text style={styles.counterText}>
          {value?.length || 0} / {maxLength}
        </Text>
      )}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#FF6B00',
    borderWidth: 2,
    backgroundColor: '#FFF7F0',
  },
  inputContainerError: {
    borderColor: '#dc3545',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  inputContainerDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#ced4da',
    opacity: 0.6,
  },
  inputContainerMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  iconRight: {
    marginRight: 0,
    marginLeft: 8,
  },
  prefixContainer: {
    marginRight: 8,
  },
  prefixText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  suffixContainer: {
    marginLeft: 8,
  },
  suffixText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 48,
  },
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  inputWithRightIcon: {
    marginRight: 0,
  },
  inputWithPrefix: {
    marginLeft: 0,
  },
  inputWithSuffix: {
    marginRight: 0,
  },
  inputWithPasswordToggle: {
    paddingRight: 40,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 100,
  },
  inputDisabled: {
    color: '#6c757d',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
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
  counterText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 2,
  },
});

// Export with pre-defined validators
InputField.Validators = {
  required: (value, message = 'This field is required') => {
    if (!value || value.trim() === '') return message;
    return null;
  },
  email: (value, message = 'Please enter a valid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) return message;
    return null;
  },
  minLength: (value, min, message = `Must be at least ${min} characters`) => {
    if (value && value.length < min) return message;
    return null;
  },
  maxLength: (value, max, message = `Must be no more than ${max} characters`) => {
    if (value && value.length > max) return message;
    return null;
  },
  phone: (value, message = 'Please enter a valid phone number') => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
    if (value && !phoneRegex.test(value)) return message;
    return null;
  },
  match: (value, compareValue, message = 'Values do not match') => {
    if (value !== compareValue) return message;
    return null;
  },
  numeric: (value, message = 'Must be a number') => {
    if (value && isNaN(Number(value))) return message;
    return null;
  },
};

// Export with pre-defined keyboard types for common use cases
InputField.KeyboardType = {
  DEFAULT: 'default',
  NUMERIC: 'numeric',
  EMAIL: 'email-address',
  PHONE: 'phone-pad',
  DECIMAL: 'decimal-pad',
  NUMBER: 'number-pad',
  URL: 'url',
};

// Export with pre-defined return key types
InputField.ReturnKeyType = {
  DONE: 'done',
  GO: 'go',
  NEXT: 'next',
  SEARCH: 'search',
  SEND: 'send',
  DEFAULT: 'default',
};

// Export with pre-defined auto complete types
InputField.AutoCompleteType = {
  OFF: 'off',
  NAME: 'name',
  EMAIL: 'email',
  TEL: 'tel',
  PASSWORD: 'password',
  STREET_ADDRESS: 'street-address',
  POSTAL_CODE: 'postal-code',
  COUNTRY: 'country',
};

export default InputField;