import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCamera } from '../../hooks/useCamera';
import { barcodeService } from '../../services/barcodeService';
import { Colors, Typography, Spacing, Radius } from '../../constants';

export default function BarcodeScreen() {
  const { hasPermission, requestPermission } = useCamera();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBarcode = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await barcodeService.lookup(data);

      if (result.found && result.product) {
        router.push({
          pathname: '/meal/portion',
          params: {
            productJson: JSON.stringify(result.product),
            barcode: data,
            source: result.source,
          },
        });
      } else {
        Alert.alert(
          'Product not found',
          `Barcode: ${data}\nTry searching by name instead.`,
          [
            { text: 'Search', onPress: () => router.replace('/meal/search') },
            { text: 'Manual Entry', onPress: () => router.replace('/meal/confirm') },
            { text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } },
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to look up barcode.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === false) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.permText}>Camera access needed to scan barcodes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan Barcode</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scan window */}
        <View style={styles.scanWindow}>
          <View style={styles.scanFrame} />
        </View>

        <View style={styles.bottomOverlay}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.brand.primary} size="large" />
              <Text style={styles.loadingText}>Looking up product...</Text>
            </View>
          ) : (
            <Text style={styles.hint}>
              Point camera at a barcode on food packaging
            </Text>
          )}

          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.replace('/meal/search')}
          >
            <Text style={styles.searchBtnText}>Search by name instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20 },
  title: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold },
  scanWindow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingBottom: 50,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
  },
  searchBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.sizes.sm,
  },
  permText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  permBtn: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  permBtnText: { color: Colors.text.inverse, fontWeight: Typography.weights.semibold },
});
