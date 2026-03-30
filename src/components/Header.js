import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Header = ({
  title,
  subtitle,
  buttons = [],
  showBackButton = false,
  onBackPress,
  backgroundColor = '#fff',
  titleColor = '#212529',
  subtitleColor = '#6c757d',
  borderBottom = true,
  safeArea = true,
}) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const renderLeftButtons = () => {
    const leftButtons = buttons.filter(btn => btn.position === 'left');
    const defaultButtons = [];

    if (showBackButton) {
      defaultButtons.push({
        icon: Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back',
        onPress: handleBackPress,
        position: 'left',
      });
    }

    const allLeftButtons = [...defaultButtons, ...leftButtons];

    return (
      <View style={styles.leftButtons}>
        {allLeftButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.button, button.style]}
            onPress={button.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={button.icon}
              size={button.size || 24}
              color={button.color || '#212529'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRightButtons = () => {
    const rightButtons = buttons.filter(btn => btn.position === 'right' || !btn.position);

    return (
      <View style={styles.rightButtons}>
        {rightButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.button, button.style]}
            onPress={button.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={button.icon}
              size={button.size || 24}
              color={button.color || '#212529'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const content = (
    <View style={[
      styles.container,
      { backgroundColor },
      borderBottom && styles.borderBottom,
    ]}>
      {/* Left Section */}
      {renderLeftButtons()}

      {/* Center Section */}
      <View style={styles.centerContent}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section */}
      {renderRightButtons()}

      {/* Fallback for when there are no right buttons */}
      {renderRightButtons().props.children.length === 0 && <View style={styles.rightButtons} />}
    </View>
  );

  if (safeArea) {
    return (
      <>
        <SafeAreaView style={{ backgroundColor }}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={backgroundColor}
            translucent={false}
          />
          {content}
        </SafeAreaView>
        {Platform.OS === 'android' && <View style={{ height: StatusBar.currentHeight }} />}
      </>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});

// Export with default props for common use cases
Header.Back = ({ onPress, color, size, style }) => ({
  icon: Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back',
  onPress,
  color,
  size,
  style,
  position: 'left',
});

Header.Close = ({ onPress, color, size, style }) => ({
  icon: 'close-outline',
  onPress,
  color,
  size,
  style,
  position: 'left',
});

Header.Edit = ({ onPress, color, size, style }) => ({
  icon: 'pencil-outline',
  onPress,
  color,
  size,
  style,
});

Header.More = ({ onPress, color, size, style }) => ({
  icon: 'ellipsis-vertical',
  onPress,
  color,
  size,
  style,
});

Header.Search = ({ onPress, color, size, style }) => ({
  icon: 'search-outline',
  onPress,
  color,
  size,
  style,
});

Header.Add = ({ onPress, color, size, style }) => ({
  icon: 'add-outline',
  onPress,
  color,
  size,
  style,
});

Header.Done = ({ onPress, color, size, style }) => ({
  icon: 'checkmark-outline',
  onPress,
  color,
  size,
  style,
});

export default Header;