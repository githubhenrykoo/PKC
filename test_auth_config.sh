#!/bin/bash

echo "🔍 Testing Authentik Configuration..."
echo "======================================"

# Configuration from your .env
AUTHENTIK_URL="https://auth.pkc.pub"
CLIENT_ID="aB0bijEh4VBAQL3rGXsrbcM8ZoJv9OIayUz0rHgo"
REDIRECT_URI="https://dev.pkc.pub/auth/callback"

# For dev.pkc.pub use: /application/o/dev-pkc/
# For localhost use: /application/o/pkc-dev/
OPENID_APP_PATH="/application/o/dev-pkc/"

echo "📍 Authentik URL: $AUTHENTIK_URL"
echo "🆔 Client ID: $CLIENT_ID"
echo "🔄 Redirect URI: $REDIRECT_URI"
echo "🔑 OpenID App Path: $OPENID_APP_PATH"
echo ""

# Test 1: Check if Authentik is accessible
echo "🧪 Test 1: Testing Authentik server accessibility..."
if curl -s -I "$AUTHENTIK_URL" | grep -q "200 OK"; then
    echo "✅ Authentik server is accessible"
else
    echo "❌ Authentik server is not accessible"
fi
echo ""

# Test 2: Check OpenID Configuration
echo "🧪 Test 2: Testing OpenID Configuration..."
OPENID_CONFIG_URL="${AUTHENTIK_URL}${OPENID_APP_PATH}.well-known/openid-configuration"
echo "📋 OpenID Configuration URL: $OPENID_CONFIG_URL"

if curl -s -I "$OPENID_CONFIG_URL" | grep -q "200 OK"; then
    echo "✅ OpenID Configuration is accessible"
    echo "📄 OpenID Configuration content (first 5 lines):"
    curl -s "$OPENID_CONFIG_URL" | head -n 5
else
    echo "❌ OpenID Configuration is not accessible"
fi
echo ""

# Test 3: Build authorization URL
echo "🧪 Test 3: Building authorization URL..."
AUTH_URL="${AUTHENTIK_URL}/application/o/authorize/"
PARAMS="response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=openid%20profile%20email&state=test123"
FULL_AUTH_URL="${AUTH_URL}?${PARAMS}"

echo "🔗 Full Authorization URL:"
echo "$FULL_AUTH_URL"
echo ""

# Test 4: Test token endpoint
echo "🧪 Test 4: Testing token endpoint..."
TOKEN_URL="${AUTHENTIK_URL}/application/o/token/"
if curl -s -I "$TOKEN_URL" | grep -q "405 Method Not Allowed\|200 OK"; then
    echo "✅ Token endpoint is accessible"
else
    echo "❌ Token endpoint is not accessible"
fi
echo ""

# Test 5: Test userinfo endpoint
echo "🧪 Test 5: Testing userinfo endpoint..."
USERINFO_URL="${AUTHENTIK_URL}/application/o/userinfo/"
if curl -s -I "$USERINFO_URL" | grep -q "401 Unauthorized\|200 OK"; then
    echo "✅ Userinfo endpoint is accessible (returns 401 without token, which is expected)"
else
    echo "❌ Userinfo endpoint is not accessible"
fi
echo ""

echo "🎯 Manual Test Instructions:"
echo "1. Copy this URL and paste it in your browser:"
echo "   $FULL_AUTH_URL"
echo ""
echo "2. You should be redirected to Authentik login"
echo "3. After login, you should be redirected to:"
echo "   $REDIRECT_URI?code=XXXXX&state=test123"
echo ""
echo "4. If you get 'Client ID Error', the configuration is wrong"
echo "5. If you get a callback URL with 'code=' parameter, it's working!"

