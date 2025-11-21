import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Button, Card } from '@/shared/components';

export default function TabsHomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>Navegação por Tabs</Text>
          <Text style={styles.description}>
            Use as abas abaixo para navegar entre as diferentes seções do app.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Módulos Disponíveis</Text>
          
          <View style={styles.moduleList}>
            <View style={styles.moduleItem}>
              <Text style={styles.moduleName}>📝 Todos</Text>
              <Text style={styles.moduleDescription}>
                Gerenciamento de tarefas com TanStack Query
              </Text>
              <Link href="/(tabs)/todos" asChild>
                <Button title="Abrir" variant="outline" style={styles.moduleButton} />
              </Link>
            </View>

            <View style={styles.moduleItem}>
              <Text style={styles.moduleName}>👤 Perfil</Text>
              <Text style={styles.moduleDescription}>
                Visualização e edição de perfil do usuário
              </Text>
              <Link href="/(tabs)/profile" asChild>
                <Button title="Abrir" variant="outline" style={styles.moduleButton} />
              </Link>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  moduleList: {
    gap: 16,
  },
  moduleItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  moduleButton: {
    alignSelf: 'flex-start',
  },
});

