#!/bin/bash
echo "🚀 Setting up Vendex for EAS build..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install EAS CLI globally
echo "🔧 Installing EAS CLI..."
npm install -g eas-cli

# Login to EAS
echo "🔐 Logging into EAS..."
eas login

# Initialize EAS project
echo "🎯 Initializing EAS project..."
eas init

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the projectId in app.json and eas.json"
echo "2. Run: npm run build-dev-android"
echo "3. Install the APK on your device"
echo "4. Run: npm run start:dev-client"
echo "5. Scan QR code with your dev client app"