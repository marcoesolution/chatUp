import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { useTranslation } from '@/core/i18n';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.button.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border.secondary,
        },
        headerStyle: {
          backgroundColor: theme.colors.background.secondary,
        },
        headerTintColor: theme.colors.text.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.conversations'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: t('navigation.logout'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="log-out" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Esconder da tab bar
          headerShown: false, // Esconder header do Tabs para o chat
          tabBarStyle: { display: 'none' }, // Esconder tab bar na tela de chat
        }}
      />
    </Tabs>
  );
}

