import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Button = ({
  title,
  onPress,
  type = 'primary', // 'primary', 'secondary', 'outline', 'danger', 'success'
  size = 'medium', // 'small', 'medium', 'large'
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  iconSize = 20,
  style,
  textStyle,
  iconColor,
  testID,
  fullWidth = false,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[type], styles[size]];
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${type}Text`], styles[`${size}Text`]];
    
    if (disabled) {
      baseStyle.push(styles.disabledText);
    }
    
    return baseStyle;
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    
    switch (type) {
      case 'outline':
      case 'secondary':
        return '#FF6B00';
      case 'danger':
        return '#fff';
      case 'success':
        return '#fff';
      default:
        return '#fff';
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <Ionicons
        name={icon}
        size={iconSize}
        color={getIconColor()}
        style={[
          styles.icon,
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
        ]}
      />
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={type === 'outline' ? '#FF6B00' : '#fff'}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && renderIcon()}
          <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && renderIcon()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginHorizontal: 4,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },

  // Types
  primary: {
    backgroundColor: '#FF6B00',
  },
  primaryText: {
    color: '#fff',
  },

  secondary: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  secondaryText: {
    color: '#FF6B00',
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  outlineText: {
    color: '#FF6B00',
  },

  danger: {
    backgroundColor: '#dc3545',
  },
  dangerText: {
    color: '#fff',
  },

  success: {
    backgroundColor: '#28a745',
  },
  successText: {
    color: '#fff',
  },

  // Sizes
  small: {
    paddingVertical: 8,
    minHeight: 36,
  },
  smallText: {
    fontSize: 14,
  },

  medium: {
    paddingVertical: 12,
    minHeight: 48,
  },
  mediumText: {
    fontSize: 16,
  },

  large: {
    paddingVertical: 16,
    minHeight: 56,
  },
  largeText: {
    fontSize: 18,
  },

  // States
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.7,
  },

  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Export with pre-defined types for convenience
Button.Primary = (props) => <Button type="primary" {...props} />;
Button.Secondary = (props) => <Button type="secondary" {...props} />;
Button.Outline = (props) => <Button type="outline" {...props} />;
Button.Danger = (props) => <Button type="danger" {...props} />;
Button.Success = (props) => <Button type="success" {...props} />;

// Export with pre-defined sizes
Button.Small = (props) => <Button size="small" {...props} />;
Button.Medium = (props) => <Button size="medium" {...props} />;
Button.Large = (props) => <Button size="large" {...props} />;

// Export with common icon buttons
Button.Add = (props) => <Button icon="add-outline" {...props} />;
Button.Edit = (props) => <Button icon="pencil-outline" {...props} />;
Button.Delete = (props) => <Button icon="trash-outline" {...props} />;
Button.Save = (props) => <Button icon="save-outline" {...props} />;
Button.Cancel = (props) => <Button icon="close-outline" {...props} />;
Button.Submit = (props) => <Button icon="checkmark-outline" {...props} />;

export default Button;