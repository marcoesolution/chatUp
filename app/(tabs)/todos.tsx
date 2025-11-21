import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useState } from 'react';
import { useTodos } from '@/modules/todos/hooks/useTodos';
import { TodoItem } from '@/modules/todos/components';
import { Button, Card } from '@/shared/components';
import type { CreateTodoData } from '@/modules/todos/types';

export default function TodosScreen() {
  const { todos, isLoading, createTodo, updateTodo, deleteTodo, isCreating } = useTodos();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;

    const data: CreateTodoData = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    createTodo(data, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
      },
    });
  };

  const handleToggle = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo({
        id,
        data: { completed: !todo.completed },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Nova Tarefa</Text>
        <TextInput
          style={styles.input}
          placeholder="Título da tarefa"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
        <Button
          title="Adicionar Tarefa"
          onPress={handleCreate}
          loading={isCreating}
          disabled={!title.trim()}
        />
      </Card>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            onToggle={handleToggle}
            onDelete={deleteTodo}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    margin: 16,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
});

