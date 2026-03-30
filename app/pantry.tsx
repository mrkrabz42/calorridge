import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { usePantryStore } from '../store/pantryStore';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { PantryCategory, PantryItem } from '../types/pantry';

const CATEGORIES: { key: PantryCategory; label: string; icon: string }[] = [
  { key: 'protein', label: 'Protein', icon: 'Pr' },
  { key: 'carb', label: 'Carb', icon: 'Ca' },
  { key: 'fat', label: 'Fat', icon: 'Fa' },
  { key: 'dairy', label: 'Dairy', icon: 'Da' },
  { key: 'vegetable', label: 'Vegetable', icon: 'Ve' },
  { key: 'fruit', label: 'Fruit', icon: 'Fr' },
  { key: 'grain', label: 'Grain', icon: 'Gr' },
  { key: 'spice', label: 'Spice', icon: 'Sp' },
  { key: 'sauce', label: 'Sauce', icon: 'Sa' },
  { key: 'other', label: 'Other', icon: 'Ot' },
];

export default function PantryScreen() {
  const { items, isLoading, fetchItems, addItem, removeItem } = usePantryStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<PantryCategory>('other');
  const [newQuantity, setNewQuantity] = useState('');
  const [isStaple, setIsStaple] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addItem({
      name: newName.trim(),
      category: newCategory,
      quantity: newQuantity.trim() || undefined,
      is_staple: isStaple,
    });
    setNewName('');
    setNewQuantity('');
    setIsStaple(false);
    setShowAdd(false);
  };

  const handleDelete = (item: PantryItem) => {
    Alert.alert('Remove', `Remove ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
    ]);
  };

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => (i.category ?? 'other') === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Pantry</Text>
            <Text style={styles.subtitle}>{items.length} items</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>Empty</Text>
            <Text style={styles.emptyTitle}>Pantry is empty</Text>
            <Text style={styles.emptyText}>
              Add ingredients you have at home. They will be used for meal suggestions.
            </Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupIcon}>{group.icon}</Text>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <Text style={styles.groupCount}>{group.items.length}</Text>
            </View>
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                {item.quantity && <Text style={styles.itemQty}>{item.quantity}</Text>}
                {item.is_staple && <Text style={styles.staple}>staple</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Add Item</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Pantry Item</Text>

            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Item name (e.g. Chicken breast)"
              placeholderTextColor={Colors.text.muted}
              autoFocus
            />

            <TextInput
              style={styles.input}
              value={newQuantity}
              onChangeText={setNewQuantity}
              placeholder="Quantity (e.g. 500g, 2 cans)"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={styles.catLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catChip, newCategory === cat.key && styles.catChipActive]}
                  onPress={() => setNewCategory(cat.key)}
                >
                  <Text style={styles.catChipIcon}>{cat.icon}</Text>
                  <Text style={[styles.catChipText, newCategory === cat.key && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.stapleToggle}
              onPress={() => setIsStaple(!isStaple)}
            >
              <Text style={styles.stapleCheck}>{isStaple ? '☑' : '☐'}</Text>
              <Text style={styles.stapleLabel}>Staple item (always in stock)</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                <Text style={styles.confirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  list: { padding: Spacing.md, paddingBottom: 100 },
  header: { marginBottom: Spacing.md },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  subtitle: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 24, color: Colors.text.muted, fontWeight: Typography.weights.bold },
  emptyTitle: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold },
  emptyText: { color: Colors.text.muted, fontSize: Typography.sizes.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
  group: { marginBottom: Spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  groupIcon: { fontSize: 16 },
  groupTitle: { flex: 1, color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  groupCount: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  itemName: { flex: 1, color: Colors.text.primary, fontSize: Typography.sizes.base },
  itemQty: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  staple: { color: Colors.brand.primary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  addBtn: {
    position: 'absolute',
    bottom: 32,
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  addBtnText: { color: Colors.text.inverse, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  modalTitle: { color: Colors.text.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  input: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  catLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  catChipActive: { backgroundColor: Colors.brand.primary + '20', borderColor: Colors.brand.primary },
  catChipIcon: { fontSize: 14 },
  catChipText: { color: Colors.text.secondary, fontSize: Typography.sizes.xs },
  catChipTextActive: { color: Colors.brand.primary },
  stapleToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stapleCheck: { color: Colors.brand.primary, fontSize: 18 },
  stapleLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.bg.primary, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  cancelText: { color: Colors.text.secondary, fontWeight: Typography.weights.medium },
  confirmBtn: { flex: 2, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.brand.primary, alignItems: 'center' },
  confirmText: { color: Colors.text.inverse, fontWeight: Typography.weights.semibold },
});
