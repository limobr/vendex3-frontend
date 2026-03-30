import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 40, // py-10
  },
  title: {
    fontSize: 32, // text-4xl
    fontWeight: 'bold', // font-bold
    color: colors.blue600,
    textAlign: 'center',
    marginBottom: 8, // mb-2
  },
  subtitle: {
    fontSize: 18, // text-lg
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24, // mb-6
  },
  button: {
    backgroundColor: colors.blue600,
    paddingVertical: 14, // py-3.5
    paddingHorizontal: 32, // px-8
    borderRadius: 12, // rounded-xl
    shadowColor: colors.black, // shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5, // for Android shadow
  },
  buttonPressed: {
    backgroundColor: colors.blue700, // darker on press
    transform: [{ scale: 0.95 }], // slight scale-down effect
  },
  buttonText: {
    color: colors.white,
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    textAlign: 'center',
  },
  featureContainer: {
    backgroundColor: colors.gray200,
    borderRadius: 12, // rounded-xl
    padding: 16, // p-4
    marginVertical: 8, // my-2
    width: '100%',
    maxWidth: 340, // max-w-md
  },
  featureText: {
    fontSize: 16, // text-base
    color: colors.gray600,
    textAlign: 'center',
  },
  highlightText: {
    fontSize: 16, // text-base
    fontWeight: '600', // font-semibold
    color: colors.green500,
  },
});