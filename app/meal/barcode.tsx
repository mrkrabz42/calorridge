import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCamera } from '../../hooks/useCamera';
import { barcodeService } from '../../services/barcodeService';
import { Colors, Typography, Spacing, Radius } from '../../constants';

const SCAN_SIZE = 280;
const CORNER_LEN = 40;
const CORNER_WIDTH = 3;

export default function BarcodeScreen() {
  const { hasPermission, requestPermission } = useCamera();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

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

  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    handleBarcode({ data: code } as BarcodeScanningResult);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan a Barcode</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scan window with corner brackets */}
        <View style={styles.scanWindow}>
          <View style={styles.scanArea}>
            {/* Top-left corner */}
            <View style={[styles.corner, styles.cornerTL]} />
            {/* Top-right corner */}
            <View style={[styles.corner, styles.cornerTR]} />
            {/* Bottom-left corner */}
            <View style={[styles.corner, styles.cornerBL]} />
            {/* Bottom-right corner */}
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
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

          {/* Manual barcode input */}
          <TextInput
            style={styles.manualInput}
            placeholder="Manually enter barcode"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={manualBarcode}
            onChangeText={setManualBarcode}
            keyboardType="numeric"
            returnKeyType="go"
            onSubmitEditing={handleManualSubmit}
          />
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 22 },
  title: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold },
  scanWindow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
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
  manualInput: {
    width: '85%',
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    color: '#fff',
    fontSize: Typography.sizes.base,
    marginTop: Spacing.xs,
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
